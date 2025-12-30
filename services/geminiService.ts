
import { GoogleGenAI, Type, Schema } from "@google/genai";
import OpenAI from "openai";
import { AISettings, AIProvider } from "../types";

// --- GEMINI IMPLEMENTATION ---

const getGeminiClient = (apiKey: string) => new GoogleGenAI({ apiKey });

// Using gemini-3-pro-preview for complex coding tasks as per guidelines
const GEMINI_CODE_MODEL = 'gemini-3-pro-preview';
// Using gemini-3-flash-preview for faster, simpler checks
const GEMINI_CHECK_MODEL = 'gemini-3-flash-preview';


// --- DEEPSEEK IMPLEMENTATION (Via OpenAI SDK) ---

const callDeepSeek = async (apiKey: string, model: string, messages: any[], jsonMode: boolean = false): Promise<string> => {
    if (!apiKey) throw new Error("DeepSeek API Key is missing. Please check Settings.");

    const client = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: apiKey,
        dangerouslyAllowBrowser: true 
    });

    try {
        const completion = await client.chat.completions.create({
            messages: messages,
            model: model || "deepseek-coder",
            response_format: jsonMode ? { type: "json_object" } : undefined
        });

        return completion.choices[0].message.content || "";
    } catch (error: any) {
        // Extract error details
        const status = error?.status || error?.response?.status;
        const msg = error?.error?.message || error?.message || "";
        const code = error?.error?.code || error?.code;

        // Robust check for Insufficient Balance (Status 402)
        // Checks status code, error code string, and message content
        const isInsufficientBalance = 
            status === 402 || 
            String(status) === '402' || 
            code === 'insufficient_quota' || 
            msg.toLowerCase().includes("insufficient balance");

        if (isInsufficientBalance) {
             console.warn("DeepSeek API: Insufficient Balance detected (402). Attempting to handle or fallback.");
             throw new Error("DeepSeek: Insufficient Balance (402).");
        }
        
        // 401 is Invalid Key
        if (status === 401) {
            console.warn("DeepSeek API: Invalid Key (401).");
            throw new Error("DeepSeek: Invalid API Key (401).");
        }

        // For other errors, log to console for debugging
        console.error("DeepSeek API Unexpected Error:", error);
        throw new Error(msg || "DeepSeek API Failed");
    }
};


// --- HELPER: FALLBACK RUNNER ---

const runWithFallback = async (
    settings: AISettings,
    deepSeekFn: () => Promise<string>,
    geminiFn: () => Promise<string>
): Promise<string> => {
    if (settings.provider === 'deepseek') {
        try {
            return await deepSeekFn();
        } catch (error: any) {
            // Check if we can fall back (Check settings or global process env)
            // Safety check for process.env in browser
            const envKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
            const geminiKey = settings.geminiKey || envKey;
            
            if (geminiKey) {
                console.warn(`[AI Service] DeepSeek failed (${error.message}). Falling back to Gemini.`);
                return await geminiFn();
            }
            
            // No fallback available, throw the original error with clear instructions
             const errMsg = error.message || "";
             if (errMsg.includes("Insufficient Balance")) {
                throw new Error("DeepSeek Error: Insufficient Balance. Please add funds at deepseek.com or configure a Gemini API Key in Settings for automatic fallback.");
            }
            throw error;
        }
    }
    // Provider is Gemini
    return await geminiFn();
};


// --- UNIFIED SERVICE EXPORTS ---

export const generateCode = async (prompt: string, systemInstruction: string, settings: AISettings, modelOverride?: string): Promise<string> => {
  const geminiTask = async () => {
    const envKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
    const apiKey = settings.geminiKey || envKey || '';
    if (!apiKey) throw new Error("Gemini API Key is missing");
    const ai = getGeminiClient(apiKey);
    
    // Only use model override if it looks like a gemini model (starts with gemini)
    const model = (modelOverride && modelOverride.startsWith('gemini')) ? modelOverride : GEMINI_CODE_MODEL;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "You are an expert software engineer. Output only the requested code or explanation. If generating multiple files, separate them clearly with '### filename.ext'.",
        temperature: 0.2,
      },
    });
    return response.text || "No response generated.";
  };

  const deepSeekTask = async () => {
      const messages = [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
      ];
      // Only use override if it looks like a deepseek model
      const model = (modelOverride && modelOverride.startsWith('deepseek')) ? modelOverride : settings.deepseekModel;
      return await callDeepSeek(settings.deepseekKey, model, messages);
  };

  return runWithFallback(settings, deepSeekTask, geminiTask);
};

export const refineCode = async (originalCode: string, instructions: string, settings: AISettings, modelOverride?: string): Promise<string> => {
    const prompt = `
        ORIGINAL CONTENT:
        ${originalCode}
  
        REFINEMENT INSTRUCTIONS:
        ${instructions}
  
        TASK:
        Rewrite the content based strictly on the instructions. Keep the same format (e.g., file separators) if present.
    `;

    const geminiTask = async () => {
        const envKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
        const apiKey = settings.geminiKey || envKey || '';
        if (!apiKey) throw new Error("Gemini API Key is missing");
        const ai = getGeminiClient(apiKey);
        
        const model = (modelOverride && modelOverride.startsWith('gemini')) ? modelOverride : GEMINI_CODE_MODEL;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
              systemInstruction: "You are an expert code refactorer. Output only the updated code.",
              temperature: 0.2,
            },
        });
        return response.text || "No response generated.";
    };

    const deepSeekTask = async () => {
        const messages = [
            { role: "system", content: "You are an expert code refactorer. Output only the updated code." },
            { role: "user", content: prompt }
        ];
        const model = (modelOverride && modelOverride.startsWith('deepseek')) ? modelOverride : settings.deepseekModel;
        return await callDeepSeek(settings.deepseekKey, model, messages);
    };

    return runWithFallback(settings, deepSeekTask, geminiTask);
  };

export const generateUnitTests = async (context: string, instructions: string, settings: AISettings, modelOverride?: string): Promise<string> => {
    const prompt = `
      CONTEXT (Code to test):
      ${context}

      INSTRUCTIONS:
      ${instructions}

      TASK:
      Write comprehensive unit tests for the provided code. 
      If the language is Python, use 'unittest' or 'pytest'.
      If JavaScript/TypeScript, use 'Jest' syntax unless specified otherwise.
      Separate files using '### filename' format.
    `;
    const sysMsg = "You are a Senior QA Automation Engineer. Write robust, edge-case covering unit tests. Output code only.";

    const geminiTask = async () => {
        const envKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
        const apiKey = settings.geminiKey || envKey || '';
        if (!apiKey) throw new Error("Gemini API Key is missing");
        const ai = getGeminiClient(apiKey);
        
        const model = (modelOverride && modelOverride.startsWith('gemini')) ? modelOverride : GEMINI_CODE_MODEL;

        const response = await ai.models.generateContent({
          model: model,
          contents: prompt,
          config: {
            systemInstruction: sysMsg,
            temperature: 0.2,
          },
        });
        return response.text || "No tests generated.";
    };

    const deepSeekTask = async () => {
        const messages = [
            { role: "system", content: sysMsg },
            { role: "user", content: prompt }
        ];
        const model = (modelOverride && modelOverride.startsWith('deepseek')) ? modelOverride : settings.deepseekModel;
        return await callDeepSeek(settings.deepseekKey, model, messages);
    };

    return runWithFallback(settings, deepSeekTask, geminiTask);
};

export const checkCodeStructured = async (code: string, criteria: string, settings: AISettings, modelOverride?: string): Promise<string> => {
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

    const geminiTask = async () => {
        const envKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
        const apiKey = settings.geminiKey || envKey || '';
        if (!apiKey) throw new Error("Gemini API Key is missing");
        const ai = getGeminiClient(apiKey);

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

        const model = (modelOverride && modelOverride.startsWith('gemini')) ? modelOverride : GEMINI_CHECK_MODEL;

        const response = await ai.models.generateContent({
            model: model,
            contents: fullPrompt,
            config: {
                systemInstruction: "You are a senior QA engineer and security analyst. Be strict and specific. Return a raw JSON array of issues.",
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });
        return response.text || "[]";
    };

    const deepSeekTask = async () => {
        const sysMsg = "You are a senior QA engineer. Return ONLY a raw JSON array of issues. No markdown formatting. Do not include '```json' code fences.";
        const messages = [
            { role: "system", content: sysMsg },
            { role: "user", content: fullPrompt }
        ];
        const model = (modelOverride && modelOverride.startsWith('deepseek')) ? modelOverride : settings.deepseekModel;
        const raw = await callDeepSeek(settings.deepseekKey, model, messages, true);
        
        // Cleanup response if DeepSeek adds markdown
        let clean = raw.trim();
        if (clean.startsWith('```')) {
            clean = clean.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        return clean;
    };

    try {
        return await runWithFallback(settings, deepSeekTask, geminiTask);
    } catch (e: any) {
         console.error("Check Error:", e);
         // Return a structured error so the UI handles it gracefully
         return JSON.stringify([{ severity: "High", line: 0, issue: "Analysis Failed", suggestion: e.message }]);
    }
};

export const simulateExecution = async (code: string, settings: AISettings, inputs: string = "", modelOverride?: string): Promise<string> => {
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

    const geminiTask = async () => {
        const envKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
        const apiKey = settings.geminiKey || envKey || '';
        if (!apiKey) throw new Error("Gemini API Key is missing");
        const ai = getGeminiClient(apiKey);
        const model = (modelOverride && modelOverride.startsWith('gemini')) ? modelOverride : GEMINI_CODE_MODEL;
        const response = await ai.models.generateContent({
            model: model,
            contents: fullPrompt,
        });
        return response.text || "No output simulated.";
    };

    const deepSeekTask = async () => {
         const messages = [
            { role: "system", content: "You are a terminal emulator. Output raw logs only." },
            { role: "user", content: fullPrompt }
        ];
        const model = (modelOverride && modelOverride.startsWith('deepseek')) ? modelOverride : settings.deepseekModel;
        return await callDeepSeek(settings.deepseekKey, model, messages);
    };

    return runWithFallback(settings, deepSeekTask, geminiTask);
};
