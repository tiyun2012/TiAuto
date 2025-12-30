
import { GoogleGenAI } from "@google/genai";

// Ensure API key is present
const API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Using gemini-3-pro-preview for complex coding tasks as per guidelines
const CODE_MODEL = 'gemini-3-pro-preview';
// Using gemini-3-flash-preview for faster, simpler checks
const CHECK_MODEL = 'gemini-3-flash-preview';

export const generateCode = async (prompt: string, systemInstruction?: string): Promise<string> => {
  if (!API_KEY) throw new Error("API Key is missing");

  try {
    const response = await ai.models.generateContent({
      model: CODE_MODEL,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "You are an expert software engineer. Output only the requested code or explanation. If generating multiple files, separate them clearly with '### filename.ext'.",
        temperature: 0.2, // Lower temperature for more deterministic code
      },
    });
    return response.text || "No response generated.";
  } catch (error: any) {
    console.error("Gemini Generate Error:", error);
    throw new Error(error.message || "Failed to generate code.");
  }
};

export const checkCode = async (code: string, criteria: string): Promise<string> => {
  if (!API_KEY) throw new Error("API Key is missing");

  try {
    const fullPrompt = `
      CODE TO ANALYZE:
      \`\`\`
      ${code}
      \`\`\`

      ANALYSIS CRITERIA:
      ${criteria}

      Please provide a structured review.
    `;

    const response = await ai.models.generateContent({
      model: CHECK_MODEL,
      contents: fullPrompt,
      config: {
        systemInstruction: "You are a senior QA engineer and security analyst. Be strict and specific.",
      }
    });
    return response.text || "No analysis generated.";
  } catch (error: any) {
    console.error("Gemini Check Error:", error);
    throw new Error(error.message || "Failed to check code.");
  }
};

export const simulateExecution = async (code: string, inputs: string = ""): Promise<string> => {
  if (!API_KEY) throw new Error("API Key is missing");

  try {
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

    const response = await ai.models.generateContent({
      model: CODE_MODEL,
      contents: fullPrompt,
    });
    return response.text || "No output simulated.";
  } catch (error: any) {
    console.error("Gemini Simulation Error:", error);
    throw new Error(error.message || "Failed to simulate execution.");
  }
};
