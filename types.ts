
export enum NodeType {
  TRIGGER = 'TRIGGER',
  GEMINI_GENERATE = 'GEMINI_GENERATE',
  GEMINI_CHECK = 'GEMINI_CHECK',
  SIMULATE_RUN = 'SIMULATE_RUN',
  PYTHON_EXEC = 'PYTHON_EXEC',
  SHELL_EXEC = 'SHELL_EXEC',
  VS_CODE = 'VS_CODE',
  TODO_LIST = 'TODO_LIST',
  NOTE = 'NOTE'
}

export type NodeShape = 'rectangle' | 'square' | 'circle';

export interface NodeData {
  label: string;
  shape?: NodeShape; // 'rectangle' | 'square' | 'circle'
  prompt?: string; // For AI nodes, or path for VS Code, or Command for Shell
  todo?: string; // For Task Lists or Manual Instructions
  dependencies?: string; // Comma separated list of python packages
  code?: string; // For output or static code
  systemInstruction?: string;
  model?: string;
  useAiSimulation?: boolean; // For Shell Node: Use AI to mock output if in browser
  output?: string; // The result of execution
  status?: 'idle' | 'running' | 'success' | 'error';
  errorMessage?: string;
}

export interface Node {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
}

export interface Edge {
  id: string;
  source: string;
  sourceHandle?: string; // 'top' | 'right' | 'bottom' | 'left'
  target: string;
  targetHandle?: string; // 'top' | 'right' | 'bottom' | 'left'
}

export interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  isExecuting: boolean;
}

export const INITIAL_NODES: Node[] = [
  {
    id: 'start-1',
    type: NodeType.TRIGGER,
    position: { x: 50, y: 300 },
    data: { label: 'Start Trigger', status: 'idle', shape: 'circle' }
  },
  {
    id: 'gen-1',
    type: NodeType.GEMINI_GENERATE,
    position: { x: 300, y: 200 },
    data: { 
      label: 'Generate Python Script', 
      shape: 'rectangle',
      prompt: 'Write a Python script to calculate the Fibonacci sequence up to n=10.',
      status: 'idle' 
    }
  },
  {
    id: 'check-1',
    type: NodeType.GEMINI_CHECK,
    position: { x: 600, y: 200 },
    data: { 
      label: 'Security Audit', 
      shape: 'rectangle',
      prompt: 'Analyze the code for any infinite loops or security issues.',
      status: 'idle' 
    }
  }
];

export const INITIAL_EDGES: Edge[] = [
  { id: 'e1', source: 'start-1', sourceHandle: 'right', target: 'gen-1', targetHandle: 'left' },
  { id: 'e2', source: 'gen-1', sourceHandle: 'right', target: 'check-1', targetHandle: 'left' }
];
