import { GoogleGenAI, Type, Schema } from "@google/genai";
import OpenAI from "openai";
import { AISettings, AIProvider } from "../types";

// --- HELPERS ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- INTERFACES & FACTORY ---

interface GenerateParams {
    prompt: string;
    systemInstruction: string;
    model?: string;
    responseSchema?: any; // For JSON structure
    tools?: any[]; // For Grounding or functions
}

interface AIProviderStrategy {
    generate(params: GenerateParams): Promise<{ text: string; groundingSources?: any[] }>;
}

// --- PROVIDER IMPLEMENTATIONS ---

// 1. Google Gemini Strategy
class GeminiStrategy implements AIProviderStrategy {
    private client: GoogleGenAI;
    private defaultModel = 'gemini-3-pro-preview';

    constructor(apiKey: string) {
        if (!apiKey) throw new Error("Gemini API Key is missing");
        this.client = new GoogleGenAI({ apiKey });
    }

    async generate(params: GenerateParams) {
        // Use model from params, or default. Ensure it's a Gemini model name.
        const model = params.model && params.model.startsWith('gemini') ? params.model : this.defaultModel;
        
        const config: any = {
            systemInstruction: params.systemInstruction,
            temperature: 0.2,
        };

        if (params.responseSchema) {
            config.responseMimeType = "application/json";
            config.responseSchema = params.responseSchema;
        }

        if (params.tools) {
            config.tools = params.tools;
        }

        // Retry Loop for Rate Limiting (429)
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                const response = await this.client.models.generateContent({
                    model: model,
                    contents: params.prompt,
                    config: config
                });

                // Extract grounding
                const sources: any[] = [];
                const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
                if (chunks) {
                    chunks.forEach((chunk: any) => {
                        if (chunk.web?.uri && chunk.web?.title) {
                            sources.push({ title: chunk.web.title, uri: chunk.web.uri });
                        }
                    });
                }

                return { 
                    text: response.text || "No response.",
                    groundingSources: sources.length > 0 ? sources : undefined
                };

            } catch (error: any) {
                attempts++;
                const errMsg = error.message?.toLowerCase() || '';
                const status = error.status || 0;

                // Check for Quota/Rate Limit Errors
                if (errMsg.includes('429') || status === 429 || errMsg.includes('quota') || errMsg.includes('resource exhausted')) {
                    if (attempts >= maxAttempts) throw new Error(`Gemini Rate Limit (429) hit. Max retries exceeded.`);
                    
                    console.warn(`[Gemini] Rate Limit hit. Waiting ~15s... (Attempt ${attempts}/${maxAttempts})`);
                    // Wait 15s + jitter
                    await delay(15000 + Math.random() * 2000);
                    continue; // Retry loop
                }

                // If regular error, throw immediately
                throw error;
            }
        }
        
        throw new Error("Unexpected loop exit in Gemini Strategy.");
    }
}

// 2. OpenAI Compatible Strategy (DeepSeek, Qwen, GPT)
class OpenAICompatibleStrategy implements AIProviderStrategy {
    private client: OpenAI;
    private defaultModel: string;
    private providerName: string;

    constructor(apiKey: string, baseURL: string, defaultModel: string, providerName: string) {
        if (!apiKey) throw new Error(`${providerName} API Key is missing`);
        this.client = new OpenAI({
            baseURL: baseURL,
            apiKey: apiKey,
            dangerouslyAllowBrowser: true
        });
        this.defaultModel = defaultModel;
        this.providerName = providerName;
    }

    async generate(params: GenerateParams) {
        const model = params.model || this.defaultModel;
        
        const messages: any[] = [
            { role: "system", content: params.systemInstruction },
            { role: "user", content: params.prompt }
        ];

        const config: any = {
            messages: messages,
            model: model,
        };

        // Handle JSON Mode
        if (params.responseSchema) {
            config.response_format = { type: "json_object" };
            messages[0].content += "\n\nOutput strictly valid JSON.";
        }

        try {
            const completion = await this.client.chat.completions.create(config);
            return { text: completion.choices[0].message.content || "" };
        } catch (error: any) {
             // DeepSeek specific balance check
             if (error?.status === 402 || error?.message?.includes("insufficient")) {
                 throw new Error(`${this.providerName}: Insufficient Balance.`);
             }
             throw error;
        }
    }
}

// --- FACTORY FUNCTION ---

const getProviderStrategy = (settings: AISettings, overrideProvider?: AIProvider): AIProviderStrategy => {
    // 1. Determine active provider
    const provider = overrideProvider || settings.provider;

    // 2. Return Strategy
    switch (provider) {
        case 'gemini':
            return new GeminiStrategy(settings.geminiKey || (typeof process !== 'undefined' ? process.env.API_KEY || '' : ''));
        
        case 'deepseek':
            return new OpenAICompatibleStrategy(
                settings.deepseekKey || (typeof process !== 'undefined' ? process.env.DEEPSEEK_API_KEY || '' : ''),
                'https://api.deepseek.com',
                settings.deepseekModel || 'deepseek-coder',
                'DeepSeek'
            );
        
        case 'qwen':
            return new OpenAICompatibleStrategy(
                settings.qwenKey,
                settings.qwenUrl || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
                settings.qwenModel || 'qwen-max',
                'Qwen'
            );

        case 'openai':
             return new OpenAICompatibleStrategy(
                settings.openaiKey,
                settings.openaiUrl || 'https://api.openai.com/v1',
                settings.openaiModel || 'gpt-4o',
                'OpenAI'
            );
            
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
};


// --- EXPORTED SERVICE FUNCTIONS ---

export interface GenerationResult {
    text: string;
    groundingSources?: Array<{ title: string; uri: string }>;
}

export const generateCode = async (
    prompt: string, 
    systemInstruction: string, 
    settings: AISettings, 
    modelOverride?: string,
    useSearch?: boolean,
    providerOverride?: AIProvider
): Promise<GenerationResult> => {

    const strategy = getProviderStrategy(settings, providerOverride);
    
    // If Gemini and search is requested, pass tools
    const tools = (useSearch && (providerOverride === 'gemini' || (!providerOverride && settings.provider === 'gemini'))) 
                  ? [{ googleSearch: {} }] 
                  : undefined;

    return await strategy.generate({
        prompt,
        systemInstruction,
        model: modelOverride,
        tools
    });
};

// --- NEW: AI DEBATE LOGIC ---
export const runDebate = async (
    context: string,
    topic: string,
    personaA: string,
    personaB: string,
    rounds: number,
    settings: AISettings,
    modelOverride?: string,
    providerOverride?: AIProvider
): Promise<string> => {
    const strategy = getProviderStrategy(settings, providerOverride);
    
    let conversation = `CONTEXT:\n${context}\n\nTOPIC:\n${topic}\n\n`;
    let currentResponse = "";

    // Simulate rounds
    for (let i = 1; i <= rounds; i++) {
        // Turn A
        const promptA = `
            ${conversation}
            
            ACT AS: ${personaA}
            TASK: Review the current state and provide your input/critique. Be constructive but strict.
        `;
        const resA = await strategy.generate({ prompt: promptA, systemInstruction: `You are ${personaA}.`, model: modelOverride });
        conversation += `\n\n[${personaA}]: ${resA.text}`;

        // Turn B
        const promptB = `
            ${conversation}
            
            ACT AS: ${personaB}
            TASK: Review the previous input from ${personaA}. Agree, disagree, or improve it.
        `;
        const resB = await strategy.generate({ prompt: promptB, systemInstruction: `You are ${personaB}.`, model: modelOverride });
        conversation += `\n\n[${personaB}]: ${resB.text}`;
    }

    // Final Summary
    const summaryPrompt = `
        ${conversation}

        TASK: Based on the debate above, provide the FINAL, OPTIMIZED solution (Code or Text). 
        Ignore the chat history in the final output, just give the result.
    `;
    const finalRes = await strategy.generate({ prompt: summaryPrompt, systemInstruction: "You are the moderator. Consolidate the debate into a final result.", model: modelOverride });

    return `### DEBATE TRANSCRIPT\n${conversation}\n\n### FINAL RESULT\n${finalRes.text}`;
};

// --- NEW: MULTI-PROVIDER CHECK ---
export const runMultiProviderCheck = async (
    prompt: string,
    context: string,
    providers: AIProvider[],
    settings: AISettings
): Promise<string> => {
    
    const results: string[] = [];
    
    // Create an array of promises to run in parallel
    const promises = providers.map(async (provider) => {
        try {
            const strategy = getProviderStrategy(settings, provider);
            // We strip model override to let each strategy use its default or settings default
            const res = await strategy.generate({ 
                prompt: `CONTEXT:\n${context}\n\nTASK: ${prompt}`, 
                systemInstruction: "You are a specialized QA Auditor." 
            });
            return `### REPORT FROM ${provider.toUpperCase()}\n${res.text}`;
        } catch (e: any) {
            return `### REPORT FROM ${provider.toUpperCase()}\nFAILED: ${e.message}`;
        }
    });

    const outcomes = await Promise.all(promises);
    return outcomes.join('\n\n' + '-'.repeat(40) + '\n\n');
};

export const refineCode = async (originalCode: string, instructions: string, settings: AISettings, modelOverride?: string, providerOverride?: AIProvider): Promise<string> => {
    const prompt = `
        ORIGINAL CONTENT:
        ${originalCode}
  
        REFINEMENT INSTRUCTIONS:
        ${instructions}
  
        TASK:
        Rewrite the content based strictly on the instructions. Keep the same format (e.g., file separators) if present.
    `;
    const strategy = getProviderStrategy(settings, providerOverride);
    const result = await strategy.generate({
        prompt,
        systemInstruction: "You are an expert code refactorer. Output only the updated code.",
        model: modelOverride
    });
    return result.text;
};

export const generateUnitTests = async (context: string, instructions: string, settings: AISettings, modelOverride?: string, providerOverride?: AIProvider): Promise<string> => {
    const prompt = `
      CONTEXT (Code to test):
      ${context}

      INSTRUCTIONS:
      ${instructions}

      TASK:
      Write comprehensive unit tests. Output code only.
      Use standard libraries unless specified.
    `;
    const strategy = getProviderStrategy(settings, providerOverride);
    const result = await strategy.generate({
        prompt,
        systemInstruction: "You are a Senior QA Automation Engineer. Write robust, edge-case covering unit tests.",
        model: modelOverride
    });
    return result.text;
};

export const checkCodeStructured = async (code: string, criteria: string, settings: AISettings, modelOverride?: string, providerOverride?: AIProvider): Promise<string> => {
    const fullPrompt = `
      CODE TO ANALYZE:
      \`\`\`
      ${code}
      \`\`\`

      ANALYSIS CRITERIA:
      ${criteria}

      Analyze the code and return a list of issues in JSON format.
      The JSON structure MUST be an array of objects with keys: "severity" (High/Medium/Low), "line" (number), "issue" (string), "suggestion" (string).
    `;

    const strategy = getProviderStrategy(settings, providerOverride);
    
    // Define Schema for Gemini (ignored by others usually)
    const schema: Schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
            severity: { type: Type.STRING, enum: ["High", "Medium", "Low", "Info"] },
            line: { type: Type.INTEGER },
            issue: { type: Type.STRING },
            suggestion: { type: Type.STRING }
            },
            required: ["severity", "issue", "suggestion"]
        }
    };

    try {
        const result = await strategy.generate({
            prompt: fullPrompt,
            systemInstruction: "You are a senior QA engineer. Be strict. Return a raw JSON array of issues. No Markdown.",
            model: modelOverride,
            responseSchema: schema
        });
        
        let text = result.text.trim();
        // Cleanup markdown if present (common with DeepSeek/Qwen even in JSON mode)
        if (text.startsWith('```')) {
            text = text.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        return text;
    } catch (e: any) {
        console.error("Check Error:", e);
        return JSON.stringify([{ severity: "High", line: 0, issue: "Analysis Failed", suggestion: e.message }]);
    }
};

export const simulateExecution = async (code: string, settings: AISettings, inputs: string = "", modelOverride?: string, providerOverride?: AIProvider): Promise<string> => {
    const fullPrompt = `
      Please act as a code interpreter. Simulate the execution of the following code.
      
      CODE:
      \`\`\`
      ${code}
      \`\`\`

      INPUTS (if any):
      ${inputs}

      OUTPUT:
      Show the console output or return value exactly as it would appear. Do not explain the code, just show the runtime output.
    `;

    const strategy = getProviderStrategy(settings, providerOverride);
    const result = await strategy.generate({
        prompt: fullPrompt,
        systemInstruction: "You are a terminal emulator. Output raw logs only.",
        model: modelOverride
    });
    return result.text;
};