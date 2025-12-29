export enum NodeType {
  TRIGGER = 'TRIGGER',
  GEMINI_GENERATE = 'GEMINI_GENERATE',
  GEMINI_CHECK = 'GEMINI_CHECK',
  SIMULATE_RUN = 'SIMULATE_RUN',
  VS_CODE = 'VS_CODE',
  NOTE = 'NOTE'
}

export interface NodeData {
  label: string;
  prompt?: string; // For AI nodes
  code?: string; // For output or static code
  systemInstruction?: string;
  model?: string;
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
  target: string;
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
    data: { label: 'Start Trigger', status: 'idle' }
  },
  {
    id: 'gen-1',
    type: NodeType.GEMINI_GENERATE,
    position: { x: 300, y: 200 },
    data: { 
      label: 'Generate Python Script', 
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
      prompt: 'Analyze the code for any infinite loops or security issues.',
      status: 'idle' 
    }
  }
];

export const INITIAL_EDGES: Edge[] = [
  { id: 'e1', source: 'start-1', target: 'gen-1' },
  { id: 'e2', source: 'gen-1', target: 'check-1' }
];