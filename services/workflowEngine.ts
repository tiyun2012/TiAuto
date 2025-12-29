import { Node, Edge, NodeType } from '../types';
import { generateCode, checkCode, simulateExecution } from './geminiService';
import { runPythonCode } from './pyodideService';

// Helper to find nodes that target a specific node
const getParentNodes = (nodeId: string, nodes: Node[], edges: Edge[]): Node[] => {
  const incomingEdges = edges.filter(e => e.target === nodeId);
  return incomingEdges.map(e => nodes.find(n => n.id === e.source)).filter((n): n is Node => !!n);
};

// Helper to accumulate context from parent nodes (For AI Prompts)
const getContextFromParents = (parents: Node[]): string => {
  if (parents.length === 0) return "";
  
  return parents.map(p => {
    let content = "";
    if (p.data.output) content = `Output from ${p.data.label}:\n${p.data.output}`;
    else if (p.data.code) content = `Code from ${p.data.label}:\n${p.data.code}`;
    // Fallback: Check if the 'output' of the previous node looks like code (e.g. from Generate)
    else if (typeof p.data.output === 'string') content = p.data.output;
    
    return content;
  }).join("\n\n");
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
    let result = "";

    switch (node.type) {
      case NodeType.TRIGGER:
        result = "Workflow started manually.";
        // Minimal delay to show visual feedback
        await new Promise(r => setTimeout(r, 500));
        break;

      case NodeType.GEMINI_GENERATE:
        // Use rich context for AI generation
        const genContext = getContextFromParents(parents);
        const genPrompt = `${genContext}\n\nTask: ${node.data.prompt || 'Generate code based on previous context.'}`;
        result = await generateCode(genPrompt, node.data.systemInstruction);
        break;

      case NodeType.GEMINI_CHECK:
        // Use rich context for AI checking
        const checkContext = getContextFromParents(parents);
        if (!checkContext.trim()) {
          throw new Error("No input code found from previous nodes to check.");
        }
        const checkCriteria = node.data.prompt || "Check for bugs and best practices.";
        result = await checkCode(checkContext, checkCriteria);
        break;

      case NodeType.SIMULATE_RUN:
         const simContext = getContextFromParents(parents);
         if (!simContext.trim()) {
            throw new Error("No code found to simulate.");
         }
         result = await simulateExecution(simContext);
         break;

      case NodeType.PYTHON_EXEC:
         // Real Execution: STRICT code extraction
         // Do NOT use getContextFromParents because it adds headers like "Output from..." which breaks Python syntax.
         const parentCodeSegments: string[] = [];

         parents.forEach(p => {
            // Ignore Triggers or non-code nodes to prevent syntax errors
            if (p.type === NodeType.TRIGGER || p.type === NodeType.TODO_LIST) return;

            const content = p.data.output || p.data.code || "";
            if (!content) return;

            // Extract Python block from Markdown if present
            const match = content.match(/```(?:python)?\s*([\s\S]*?)\s*```/);
            if (match) {
                parentCodeSegments.push(match[1]);
            } else {
                // If raw text, treat as code, but ensure it's not likely natural language
                // (Simple heuristic: assumes user wired correctly)
                parentCodeSegments.push(content);
            }
         });

         const importedCode = parentCodeSegments.join('\n\n');
         const manualCode = node.data.code ? `\n# User Code\n${node.data.code}` : "";
         const finalCode = importedCode + manualCode;

         if (!finalCode.trim()) {
            result = "No executable code found. Connect a 'Gen' node or write code in the Properties panel.";
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
            console.error("VS Code Launch Error", e);
            throw new Error("Failed to launch URI scheme: " + e.message);
        }
        
        if (node.data.todo) {
            result = `${launchMsg}\n\n--- INSTRUCTIONS ---\n${node.data.todo}`;
        } else {
            result = launchMsg;
        }

        await new Promise(r => setTimeout(r, 1000)); 
        break;

      case NodeType.NOTE:
        result = node.data.prompt || "Note";
        break;
    }

    updateNodeData(node.id, { status: 'success', output: result });

  } catch (error: any) {
    console.error(`Error executing node ${node.id}:`, error);
    updateNodeData(node.id, { status: 'error', errorMessage: error.message });
    throw error; // Stop propagation
  }
};