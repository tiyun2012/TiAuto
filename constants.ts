import { NodeShape, NodeType } from './types';

// Dimensions
export const NODE_DIMENSIONS = {
  rectangle: { width: 240, height: 80 }, // Slightly taller for inputs
  square: { width: 140, height: 140 },
  circle: { width: 120, height: 120 }
};

export const NODE_BORDER_WIDTH = 2; // px

// --- PORT CONFIGURATION ---
// Handles on 'left' are Inputs. Handles on 'right', 'top', 'bottom' are Outputs.

export interface PortDefinition {
  id: string;
  label?: string; // Optional label to show on hover/UI
  style?: string; // Optional color override
  side?: 'top' | 'right' | 'bottom' | 'left'; // Defaults: inputs->left, outputs->right
}

export const NODE_PORTS: Record<NodeType, { inputs: PortDefinition[], outputs: PortDefinition[] }> = {
  // Triggers (Source Only)
  [NodeType.TRIGGER]: { inputs: [], outputs: [{ id: 'right' }] },
  
  // Logic Flow (Complex)
  [NodeType.DIFF]: { 
    inputs: [
      { id: 'original', label: 'Original' }, 
      { id: 'modified', label: 'Modified' }
    ], 
    outputs: [{ id: 'right', label: 'Diff Result' }] 
  },
  [NodeType.LOOP]: { 
    inputs: [
      { id: 'code', label: 'Code Input' }, 
      { id: 'feedback', label: 'Issues/Check' }
    ], 
    outputs: [
      { id: 'retry', label: 'Retry Code' }, 
      { id: 'done', label: 'Final Result' }
    ] 
  },
  [NodeType.ROUTER]: { 
    inputs: [{ id: 'left', label: 'Input' }], 
    outputs: [
      { id: 'true', label: 'True', style: 'bg-green-500' }, 
      { id: 'false', label: 'False', style: 'bg-red-500' }
    ] 
  },
  [NodeType.APPROVAL]: {
    inputs: [{ id: 'left', label: 'Request' }],
    outputs: [
      { id: 'approve', label: 'Approved', style: 'bg-green-500' },
      { id: 'reject', label: 'Rejected', style: 'bg-red-500' }
    ]
  },
  [NodeType.ARCHITECT]: {
    inputs: [
      { id: 'context', label: 'Context' },
      { id: 'reqs', label: 'Requirements' }
    ],
    outputs: [{ id: 'right', label: 'Plan' }]
  },
  [NodeType.TASK_ITERATOR]: {
    inputs: [{ id: 'plan', label: 'Plan JSON' }],
    outputs: [{ id: 'right', label: 'Current Task' }]
  },

  // Standard 1-In 1-Out
  [NodeType.GEMINI_GENERATE]: { inputs: [{ id: 'left' }], outputs: [{ id: 'right' }] },
  [NodeType.GEMINI_CHECK]: { inputs: [{ id: 'left' }], outputs: [{ id: 'right' }] },
  [NodeType.AI_DEBATE]: { inputs: [{ id: 'left' }], outputs: [{ id: 'right' }] },
  [NodeType.MULTI_CHECK]: { inputs: [{ id: 'left' }], outputs: [{ id: 'right' }] },
  [NodeType.AI_UNIT_TEST]: { inputs: [{ id: 'left' }], outputs: [{ id: 'right' }] },
  [NodeType.SIMULATE_RUN]: { inputs: [{ id: 'left' }], outputs: [{ id: 'right' }] },
  [NodeType.PYTHON_EXEC]: { inputs: [{ id: 'left' }], outputs: [{ id: 'right' }] },
  [NodeType.SHELL_EXEC]: { inputs: [{ id: 'left' }], outputs: [{ id: 'right' }] },
  [NodeType.GIT_CONTROL]: { inputs: [{ id: 'left' }], outputs: [{ id: 'right' }] },
  [NodeType.VS_CODE]: { inputs: [{ id: 'left' }], outputs: [{ id: 'right' }] },
  [NodeType.TODO_LIST]: { inputs: [{ id: 'left' }], outputs: [{ id: 'right' }] },
  [NodeType.PROJECT_INDEX]: { inputs: [{ id: 'left' }], outputs: [{ id: 'right' }] },
  
  // IO
  [NodeType.READ_FILE]: { inputs: [{ id: 'left', label: 'Path (Opt)' }], outputs: [{ id: 'right', label: 'Content' }] },
  [NodeType.WRITE_FILE]: { inputs: [{ id: 'left', label: 'Content' }], outputs: [{ id: 'right', label: 'Success' }] },
  
  // Misc
  [NodeType.NOTE]: { inputs: [], outputs: [] }
};

export const GEMINI_MODELS = [
  { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro (Preview)' },
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (Preview)' },
  { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Exp' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }
];

export const DEEPSEEK_MODELS = [
  { value: 'deepseek-coder', label: 'DeepSeek Coder' },
  { value: 'deepseek-chat', label: 'DeepSeek Chat' }
];

export const QWEN_MODELS = [
  { value: 'qwen-max', label: 'Qwen Max' },
  { value: 'qwen-plus', label: 'Qwen Plus' },
  { value: 'qwen-turbo', label: 'Qwen Turbo' },
  { value: 'qwen-coder-turbo', label: 'Qwen Coder Turbo' }
];

export const OPENAI_MODELS = [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
];

// Helper to get absolute port coordinates and side
export const getPortPosition = (
  nodeX: number, 
  nodeY: number, 
  shape: NodeShape = 'rectangle', 
  handleId: string = 'right',
  type?: NodeType
) => {
  const dims = NODE_DIMENSIONS[shape] || NODE_DIMENSIONS.rectangle;
  const w = dims.width;
  const h = dims.height; 

  const config = type && NODE_PORTS[type] ? NODE_PORTS[type] : { inputs: [{id:'left'}], outputs: [{id:'right'}] };
  
  // Flatten all ports with their intended side
  // Inputs force 'left', Outputs default to 'right' but can be overridden
  const allPorts = [
      ...config.inputs.map(p => ({ ...p, type: 'input', side: p.side || 'left' })),
      ...config.outputs.map(p => ({ ...p, type: 'output', side: p.side || 'right' }))
  ];

  // Find the specific port we are looking for
  const targetPort = allPorts.find(p => p.id === handleId);
  
  // Fallback side logic if port not found (legacy edges)
  let side = targetPort ? targetPort.side : 'right';
  if (!targetPort) {
      if (handleId === 'left') side = 'left';
      if (handleId === 'top') side = 'top';
      if (handleId === 'bottom') side = 'bottom';
  }

  // Filter all ports on this specific side to determine distribution spacing
  const portsOnSide = allPorts.filter(p => p.side === side);
  
  // Determine index (default 0) and total count
  const index = targetPort ? portsOnSide.indexOf(targetPort) : 0; 
  const count = portsOnSide.length || 1;

  // Calculate 0-1 percentage for spacing. 
  // 1 port -> 50%
  // 2 ports -> 33%, 66%
  const ratio = (index + 1) / (count + 1);

  let x = 0;
  let y = 0;

  switch (side) {
      case 'left':
          x = nodeX;
          y = nodeY + h * ratio;
          break;
      case 'right':
          x = nodeX + w;
          y = nodeY + h * ratio;
          break;
      case 'top':
          x = nodeX + w * ratio;
          y = nodeY;
          break;
      case 'bottom':
          x = nodeX + w * ratio;
          y = nodeY + h;
          break;
  }

  return { x, y, side };
};