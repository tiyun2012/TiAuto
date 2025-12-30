
import { Node, Edge, NodeType } from '../types';
import { generateCode, checkCode, simulateExecution, generateUnitTests } from './geminiService';
import { runPythonCode } from './pyodideService';
import { executeShellCommand } from './commandService';
import { parseOutputToFiles, formatFilesForPrompt } from './fileParsingService';

// Helper to find nodes that target a specific node
const getParentNodes = (nodeId: string, nodes: Node[], edges: Edge[]): Node[] => {
  const incomingEdges = edges.filter(e => e.target === nodeId);
  return incomingEdges.map(e => nodes.find(n => n.id === e.source)).filter((n): n is Node => !!n);
};

// Helper to accumulate context from parent nodes (For AI Prompts)
// NOW ENHANCED: Collects FILES from parents first, then text output.
const getContextFromParents = (parents: Node[]): { textContext: string, fileContext: Record<string, string> } => {
  let textContext = "";
  let fileContext: Record<string, string> = {};

  parents.forEach(p => {
    // 1. Gather Files
    if (p.data.files && Object.keys(p.data.files).length > 0) {
        Object.assign(fileContext, p.data.files);
    }
    
    // 2. Gather Text Output (Legacy/Analysis nodes)
    // Only add text output if it's NOT just a single file we already captured in 'files'
    // or if the node is specifically a note/check/trigger
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

// Execute a single node
export const executeNode = async (
  node: Node, 
  allNodes: Node[], 
  allEdges: Edge[],
  updateNodeData: (id: string, data: Partial<Node['data']>) => void
): Promise<void> => {
  
  console.log(`[Engine] Executing node: ${node.id} (${node.type})`);
  updateNodeData(node.id, { status: 'running', errorMessage: undefined });

  try {
    const parents = getParentNodes(node.id, allNodes, allEdges);
    const { textContext, fileContext } = getContextFromParents(parents);
    
    // Construct the "Virtual File System" string for the prompt
    const vfsString = Object.keys(fileContext).length > 0 
        ? `\nCURRENT PROJECT FILES:\n${formatFilesForPrompt(fileContext)}\n` 
        : "";

    let result = "";
    let extractedFiles: Record<string, string> = {};

    switch (node.type) {
      case NodeType.TRIGGER:
        result = "Workflow started manually.";
        await new Promise(r => setTimeout(r, 500));
        break;

      case NodeType.GEMINI_GENERATE:
        // Pass existing files + text context + instructions
        const genPrompt = `${vfsString}\n${textContext}\n\nTask: ${node.data.prompt || 'Generate code based on previous context.'}`;
        
        // Append instruction to force file format if we suspect multi-file need
        const fileInstruction = "If creating multiple files, separate them with '### filename.ext' header.";
        
        result = await generateCode(genPrompt, (node.data.systemInstruction || "") + " " + fileInstruction);
        
        // Auto-Parse Files
        extractedFiles = parseOutputToFiles(result);
        break;

      case NodeType.GEMINI_CHECK:
        if (!vfsString.trim() && !textContext.trim()) {
          throw new Error("No input code found from previous nodes to check.");
        }
        // Check sees everything
        const checkCriteria = node.data.prompt || "Check for bugs and best practices.";
        const fullContext = `${vfsString}\n\n${textContext}`;
        result = await checkCode(fullContext, checkCriteria);
        extractedFiles = parseOutputToFiles(result); // Maybe it suggests a fixed file
        break;
      
      case NodeType.AI_UNIT_TEST:
        if (!vfsString.trim() && !textContext.trim()) {
            throw new Error("No input code found to generate tests for.");
        }
        const testContext = `${vfsString}\n\n${textContext}`;
        const instructions = node.data.prompt || "Write unit tests for the provided code.";
        result = await generateUnitTests(testContext, instructions);
        extractedFiles = parseOutputToFiles(result);
        break;

      case NodeType.SIMULATE_RUN:
         if (!vfsString.trim() && !textContext.trim()) {
            throw new Error("No code found to simulate.");
         }
         const simContext = `${vfsString}\n\n${textContext}`;
         result = await simulateExecution(simContext);
         break;
      
      case NodeType.SHELL_EXEC:
         const command = node.data.prompt || "echo 'No command'";
         const shellContext = `${vfsString}\n\n${textContext}`;
         result = await executeShellCommand(command, shellContext, node.data.useAiSimulation ?? true);
         break;

      case NodeType.PYTHON_EXEC:
         // PRIORITIZE: Files from VFS
         const codeParts: string[] = [];
         
         // 1. Gather all python files from context
         Object.entries(fileContext).forEach(([fname, content]) => {
             if (fname.endsWith('.py')) {
                 codeParts.push(`# File: ${fname}\n${content}`);
             }
         });
         
         // 2. Fallback to raw output if VFS is empty
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
        // VS Code logic remains similar, mostly signal based
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
            console.error("VS Code Launch Error", e);
            throw new Error("Failed to launch URI scheme: " + e.message);
        }
        result = launchMsg;
        await new Promise(r => setTimeout(r, 1000)); 
        break;

      case NodeType.NOTE:
        result = node.data.prompt || "Note";
        break;
    }

    // Merge new files with existing file context? 
    // Usually a node produces its own set of files, but conceptually 
    // it might be nice to say "This node outputs these files".
    // We update the node's data.files.
    
    // If extractedFiles is empty but we have result, maybe result IS a file (if python exec output)
    // We generally leave files undefined if not explicitly parsed, unless it's a generator.
    
    updateNodeData(node.id, { 
        status: 'success', 
        output: result,
        files: Object.keys(extractedFiles).length > 0 ? extractedFiles : undefined
    });

  } catch (error: any) {
    console.error(`Error executing node ${node.id}:`, error);
    updateNodeData(node.id, { status: 'error', errorMessage: error.message });
    throw error; // Stop propagation
  }
};