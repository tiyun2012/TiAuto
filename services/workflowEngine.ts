import { Node, Edge, NodeType } from '../types';
import { generateCode, checkCode, simulateExecution } from './geminiService';

// Helper to find nodes that target a specific node
const getParentNodes = (nodeId: string, nodes: Node[], edges: Edge[]): Node[] => {
  const incomingEdges = edges.filter(e => e.target === nodeId);
  return incomingEdges.map(e => nodes.find(n => n.id === e.source)).filter((n): n is Node => !!n);
};

// Helper to accumulate context from parent nodes
const getContextFromParents = (parents: Node[]): string => {
  if (parents.length === 0) return "";
  
  return parents.map(p => {
    let content = "";
    if (p.data.output) content = `Output from ${p.data.label}:\n${p.data.output}`;
    else if (p.data.code) content = `Code from ${p.data.label}:\n${p.data.code}`;
    
    return content;
  }).join("\n\n---\n\n");
};

// Execute a single node
export const executeNode = async (
  node: Node, 
  allNodes: Node[], 
  allEdges: Edge[],
  updateNodeData: (id: string, data: Partial<Node['data']>) => void
): Promise<void> => {
  
  updateNodeData(node.id, { status: 'running', errorMessage: undefined });

  try {
    const parents = getParentNodes(node.id, allNodes, allEdges);
    const context = getContextFromParents(parents);
    let result = "";

    switch (node.type) {
      case NodeType.TRIGGER:
        result = "Workflow started manually.";
        // Minimal delay to show visual feedback
        await new Promise(r => setTimeout(r, 500));
        break;

      case NodeType.GEMINI_GENERATE:
        const genPrompt = `${context}\n\nTask: ${node.data.prompt || 'Generate code based on previous context.'}`;
        result = await generateCode(genPrompt, node.data.systemInstruction);
        break;

      case NodeType.GEMINI_CHECK:
        // We assume the context contains the code to check
        const codeToCheck = context; 
        const checkCriteria = node.data.prompt || "Check for bugs and best practices.";
        
        if (!codeToCheck.trim()) {
          throw new Error("No input code found from previous nodes to check.");
        }
        result = await checkCode(codeToCheck, checkCriteria);
        break;

      case NodeType.SIMULATE_RUN:
         const codeToRun = context;
         if (!codeToRun.trim()) {
            throw new Error("No code found to simulate.");
         }
         result = await simulateExecution(codeToRun);
         break;

      case NodeType.VS_CODE:
        const path = node.data.prompt?.trim();
        if (!path) throw new Error("No file path specified.");
        
        // Deep link strategy
        result = `Attempting to open VS Code at: ${path}`;
        
        // Use window.location to trigger the protocol handler
        // Using a hidden link is often safer for popup blockers, but direct location assignment works for protocols
        // We wrap in try/catch although protocol launch failures are hard to catch in JS
        try {
            const url = `vscode://file/${path}`;
            window.location.assign(url);
            result += "\n\nSuccess: Signal sent to OS.";
        } catch (e: any) {
            throw new Error("Failed to launch URI scheme: " + e.message);
        }
        await new Promise(r => setTimeout(r, 1000)); // Delay for visual feedback
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