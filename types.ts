

export enum NodeType {
  TRIGGER = 'TRIGGER',
  GEMINI_GENERATE = 'GEMINI_GENERATE',
  GEMINI_CHECK = 'GEMINI_CHECK',
  AI_DEBATE = 'AI_DEBATE',       
  MULTI_CHECK = 'MULTI_CHECK',   
  ROUTER = 'ROUTER',             
  ARCHITECT = 'ARCHITECT',       
  PROJECT_INDEX = 'PROJECT_INDEX', // New: Lists files in directory
  TASK_ITERATOR = 'TASK_ITERATOR', // New: Loops through list
  AI_UNIT_TEST = 'AI_UNIT_TEST',
  SIMULATE_RUN = 'SIMULATE_RUN',
  PYTHON_EXEC = 'PYTHON_EXEC',
  SHELL_EXEC = 'SHELL_EXEC',
  GIT_CONTROL = 'GIT_CONTROL',   
  VS_CODE = 'VS_CODE',
  READ_FILE = 'READ_FILE',
  WRITE_FILE = 'WRITE_FILE',     
  TODO_LIST = 'TODO_LIST',
  NOTE = 'NOTE',
  DIFF = 'DIFF',
  APPROVAL = 'APPROVAL',
  LOOP = 'LOOP'
}

export type NodeShape = 'rectangle' | 'square' | 'circle';

export type AIProvider = 'gemini' | 'deepseek' | 'qwen' | 'openai';

export interface NodeData {
  label: string;
  shape?: NodeShape;
  prompt?: string;
  todo?: string;
  dependencies?: string;
  code?: string;
  systemInstruction?: string;
  
  // AI Config Per Node
  provider?: AIProvider; 
  model?: string;        
  
  // Debate Config
  personaA?: string;
  personaB?: string;
  debateRounds?: number;

  // Multi-Check Config
  enabledProviders?: AIProvider[];

  // Local Bridge Config
  useLocalBridge?: boolean;
  localPath?: string;

  // Git Config
  gitCommand?: 'status' | 'add' | 'commit' | 'push' | 'log';
  gitMessage?: string;

  useAiSimulation?: boolean;
  output?: string;
  files?: Record<string, string>;
  status?: 'idle' | 'running' | 'success' | 'error' | 'waiting';
  errorMessage?: string;
  
  diffOriginal?: string;
  diffModified?: string;

  useSearch?: boolean;
  groundingSources?: Array<{ title: string; uri: string }>;

  // Loop / Iteration Logic
  maxIterations?: number;
  currentIteration?: number;
  feedback?: string; 
  lastFixedCode?: string; 
  
  // Task Iterator State
  iteratorIndex?: number;
  iteratorTotal?: number;
  iteratorFinished?: boolean;
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
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
}

export interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  isExecuting: boolean;
}

export interface AISettings {
  provider: AIProvider; // Global active default

  // Gemini
  geminiKey: string;

  // DeepSeek
  deepseekKey: string;
  deepseekModel: string;

  // Qwen (via OpenAI Compatible Endpoint)
  qwenKey: string;
  qwenUrl: string; 
  qwenModel: string;

  // Generic OpenAI
  openaiKey: string;
  openaiUrl: string;
  openaiModel: string;

  // Local Bridge Settings
  localBridgeEnabled: boolean;
  localBridgeUrl: string;
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
      shape: 'square',
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
      shape: 'square',
      prompt: 'Analyze the code for any infinite loops or security issues.',
      status: 'idle' 
    }
  }
];

export const INITIAL_EDGES: Edge[] = [
  { id: 'e1', source: 'start-1', sourceHandle: 'right', target: 'gen-1', targetHandle: 'left' },
  { id: 'e2', source: 'gen-1', sourceHandle: 'right', target: 'check-1', targetHandle: 'left' }
];