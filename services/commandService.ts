import { generateCode } from './geminiService';

// Type definition for a potential Electron/Desktop bridge
declare global {
  interface Window {
    electronAPI?: {
      executeCommand: (command: string, cwd?: string) => Promise<string>;
    };
  }
}

export const executeShellCommand = async (
  command: string, 
  context: string = "", 
  useAiSimulation: boolean = true
): Promise<string> => {
  
  // 1. Desktop Mode: Check for Bridge
  if (window.electronAPI) {
    try {
      console.log(`[CommandService] Dispatching to Desktop: ${command}`);
      return await window.electronAPI.executeCommand(command);
    } catch (error: any) {
      throw new Error(`Desktop Shell Error: ${error.message}`);
    }
  }

  // 2. Browser Mode: Fallback
  console.log(`[CommandService] Browser Mode detected.`);

  if (useAiSimulation) {
    // AI Simulation
    const prompt = `
      You are a specialized Shell Simulator.
      The user wants to run the following command line instruction:
      
      COMMAND:
      \`\`\`bash
      ${command}
      \`\`\`

      CONTEXT (Files/Code generated previously):
      ${context.slice(0, 2000)}

      INSTRUCTION:
      Simulate the standard output (stdout) and standard error (stderr) that would appear in a real terminal.
      Do not explain what the command does. Just provide the raw log output.
      If the command creates a file, simulate the "File created" confirmation or silent success.
      If the command creates an error based on the context, show the error.
    `;
    
    // We reuse generateCode from geminiService as it fits the "Text-to-Text" pattern
    return await generateCode(prompt, "You are a terminal emulator. Output raw logs only.");
  } else {
    // Static Message
    return `[System] Browser Environment Detected.
    
The command "${command}" cannot be executed natively in the browser for security reasons.

To run this for real:
1. This app must be wrapped in an Electron/Tauri container.
2. A 'window.electronAPI.executeCommand' bridge must be exposed.

To simulate this output:
Enable "AI Simulation Mode" in the node properties.`;
  }
};
