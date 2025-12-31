

import { Node, Edge, NodeType, AISettings, AIProvider } from '../types';
import { generateCode, checkCodeStructured, simulateExecution, generateUnitTests } from './geminiService';
import { runPythonCode } from './pyodideService';
import { executeShellCommand } from './commandService';
import { parseOutputToFiles, formatFilesForPrompt } from './fileParsingService';

const getParentNodes = (nodeId: string, nodes: Node[], edges: Edge[]): Node[] => {
  const incomingEdges = edges.filter(e => e.target === nodeId);
  return incomingEdges.map(e => nodes.find(n => n.id === e.source)).filter((n): n is Node => !!n);
};

const getContextFromParents = (parents: Node[]): { textContext: string, fileContext: Record<string, string> } => {
  let textContext = "";
  let fileContext: Record<string, string> = {};

  parents.forEach(p => {
    if (p.data.files && Object.keys(p.data.files).length > 0) {
        Object.assign(fileContext, p.data.files);
    }
    let content = "";
    if (p.data.output) {
        content = `Output from ${p.data.label}:\n${p.data.output}`;
    } else if (p.data.code) {
        content = `Code from ${p.data.label}:\n${p.data.code}`;
    }
    if (content) textContext += content + "\n\n";
  });

  return { textContext, fileContext };
};

// Helper to handle AI calls with automatic fallback
const runAiWithFallback = async (
    action: (provider: AIProvider | undefined) => Promise<any>,
    requestedProvider: AIProvider | undefined,
    aiSettings: AISettings
): Promise<any> => {
    try {
        return await action(requestedProvider);
    } catch (error: any) {
        const errMsg = error.message.toLowerCase();
        const isBalanceError = errMsg.includes('balance') || errMsg.includes('402') || errMsg.includes('insufficient');
        const isQuotaError = errMsg.includes('429') || errMsg.includes('quota');
        
        // If it's a balance/quota issue and we aren't already using Gemini (the safe default), try fallback
        if ((isBalanceError || isQuotaError) && requestedProvider !== 'gemini' && aiSettings.geminiKey) {
            console.warn(`[Engine] Provider ${requestedProvider || aiSettings.provider} failed. Falling back to Gemini.`);
            return await action('gemini');
        }
        throw error;
    }
};

export const executeNode = async (
  node: Node, 
  allNodes: Node[], 
  allEdges: Edge[],
  aiSettings: AISettings,
  updateNodeData: (id: string, data: Partial<Node['data']>) => void
): Promise<void> => {
  
  console.log(`[Engine] Executing node: ${node.id} (${node.type})`);
  
  // APPROVAL NODE LOGIC
  if (node.type === NodeType.APPROVAL) {
      if (node.data.status === 'success') {
          // Already approved, pass through
          return; 
      }
      updateNodeData(node.id, { status: 'waiting' });
      // Throwing string to indicate pause, not failure
      throw new Error("WAIT_FOR_APPROVAL");
  }

  updateNodeData(node.id, { status: 'running', errorMessage: undefined, groundingSources: undefined });

  try {
    const parents = getParentNodes(node.id, allNodes, allEdges);
    const { textContext, fileContext } = getContextFromParents(parents);
    
    const vfsString = Object.keys(fileContext).length > 0 
        ? `\nCURRENT PROJECT FILES:\n${formatFilesForPrompt(fileContext)}\n` 
        : "";

    let result = "";
    let extractedFiles: Record<string, string> = {};
    let sources: Array<{ title: string; uri: string }> | undefined = undefined;

    // Extract Overrides
    const modelOverride = node.data.model;
    const providerOverride = node.data.provider;

    switch (node.type) {
      case NodeType.TRIGGER:
        result = "Workflow started manually.";
        await new Promise(r => setTimeout(r, 500));
        break;

      case NodeType.GEMINI_GENERATE:
        const genPrompt = `${vfsString}\n${textContext}\n\nTask: ${node.data.prompt || 'Generate code based on previous context.'}`;
        // Enhanced instruction for reliable multi-file parsing
        const fileInstruction = `
IMPORTANT: When generating multiple files, you MUST separate them exactly like this:

### filename.extension
\`\`\`language
code here...
\`\`\`

### another_file.extension
\`\`\`language
code here...
\`\`\`

Do not use any other format for file separation.
`;
        
        const genResult = await runAiWithFallback(async (p) => {
            return await generateCode(
                genPrompt, 
                (node.data.systemInstruction || "") + "\n" + fileInstruction, 
                aiSettings, 
                modelOverride,
                node.data.useSearch,
                p // provider
            );
        }, providerOverride, aiSettings);
        
        result = genResult.text;
        sources = genResult.groundingSources;
        extractedFiles = parseOutputToFiles(result);
        break;

      case NodeType.GEMINI_CHECK:
        if (!vfsString.trim() && !textContext.trim()) {
          throw new Error("No input code found from previous nodes to check.");
        }
        const checkCriteria = node.data.prompt || "Check for bugs and best practices.";
        const fullContext = `${vfsString}\n\n${textContext}`;
        
        result = await runAiWithFallback(async (p) => {
             return await checkCodeStructured(fullContext, checkCriteria, aiSettings, modelOverride, p);
        }, providerOverride, aiSettings);
        break;
      
      case NodeType.AI_UNIT_TEST:
        if (!vfsString.trim() && !textContext.trim()) {
            throw new Error("No input code found to generate tests for.");
        }
        const testContext = `${vfsString}\n\n${textContext}`;
        const instructions = node.data.prompt || "Write unit tests for the provided code.";
        
        result = await runAiWithFallback(async (p) => {
             return await generateUnitTests(testContext, instructions, aiSettings, modelOverride, p);
        }, providerOverride, aiSettings);
        
        extractedFiles = parseOutputToFiles(result);
        break;

      case NodeType.SIMULATE_RUN:
         if (!vfsString.trim() && !textContext.trim()) {
            throw new Error("No code found to simulate.");
         }
         const simContext = `${vfsString}\n\n${textContext}`;
         result = await runAiWithFallback(async (p) => {
             return await simulateExecution(simContext, aiSettings, "", modelOverride, p);
         }, providerOverride, aiSettings);
         break;
      
      case NodeType.SHELL_EXEC:
         const command = node.data.prompt || "echo 'No command'";
         const shellContext = `${vfsString}\n\n${textContext}`;
         result = await executeShellCommand(command, aiSettings, shellContext, node.data.useAiSimulation ?? true);
         break;

      case NodeType.PYTHON_EXEC:
         const codeParts: string[] = [];
         Object.entries(fileContext).forEach(([fname, content]) => {
             if (fname.endsWith('.py')) {
                 codeParts.push(`# File: ${fname}\n${content}`);
             }
         });
         if (codeParts.length === 0 && textContext) {
             const match = textContext.match(/```(?:python)?\s*([\s\S]*?)\s*```/);
             if (match) codeParts.push(match[1]);
         }
         const manualCode = node.data.code ? `\n# User Code\n${node.data.code}` : "";
         const finalCode = codeParts.join('\n\n') + manualCode;

         if (!finalCode.trim()) {
            result = "No executable Python code found in project files or properties.";
         } else {
            result = await runPythonCode(finalCode, node.data.dependencies);
         }
         break;
      
      case NodeType.TODO_LIST:
        result = node.data.todo || "No tasks defined.";
        await new Promise(r => setTimeout(r, 300));
        break;

      case NodeType.VS_CODE:
        const path = node.data.prompt?.trim();
        if (!path) throw new Error("No file path specified.");
        let launchMsg = `Attempting to open VS Code at: ${path}`;
        try {
            const url = `vscode://file/${path}`;
            const link = document.createElement('a');
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            launchMsg += "\n\nSuccess: Signal sent to OS.";
        } catch (e: any) {
            throw new Error("Failed to launch URI scheme: " + e.message);
        }
        result = launchMsg;
        await new Promise(r => setTimeout(r, 1000)); 
        break;
      
      case NodeType.DIFF:
        if (parents.length === 0) {
             updateNodeData(node.id, { diffOriginal: node.data.prompt || "", diffModified: "" });
             result = "Warning: No input nodes to compare.";
        } else if (parents.length === 1) {
            const parentOut = parents[0].data.output || parents[0].data.code || "";
            updateNodeData(node.id, { diffOriginal: node.data.prompt || "", diffModified: parentOut });
            result = "Diff computed: Static Text (Original) vs Input Node (Modified).";
        } else {
            const original = parents[0].data.output || parents[0].data.code || "";
            const modified = parents[1].data.output || parents[1].data.code || "";
             updateNodeData(node.id, { diffOriginal: original, diffModified: modified });
             result = `Diff computed between ${parents[0].data.label} and ${parents[1].data.label}.`;
        }
        break;

      case NodeType.NOTE:
        result = node.data.prompt || "Note";
        break;
    }
    
    updateNodeData(node.id, { 
        status: 'success', 
        output: result,
        files: Object.keys(extractedFiles).length > 0 ? extractedFiles : undefined,
        groundingSources: sources
    });

  } catch (error: any) {
      if (error.message === "WAIT_FOR_APPROVAL") {
          console.log("Node paused for approval.");
          return;
      }
      console.error(`Error executing node ${node.id}:`, error);
      updateNodeData(node.id, { status: 'error', errorMessage: error.message });
      throw error;
  }
};