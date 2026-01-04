import { Node, Edge, NodeType } from '../types';

export interface Template {
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
}

export const APP_TEMPLATES: Template[] = [
  {
    name: "Game Gizmo / Feature Creator",
    description: "Analyzes engine structure, finds related base classes/types, plans the Gizmo, implements it, and verifies it.",
    nodes: [
      {
        id: 'g-trigger',
        type: NodeType.TRIGGER,
        position: { x: 50, y: 100 },
        data: { label: 'New Gizmo Request', status: 'idle', shape: 'circle' }
      },
      {
        id: 'g-index',
        type: NodeType.PROJECT_INDEX,
        position: { x: 250, y: 100 },
        data: { 
          label: 'Scan Engine', 
          shape: 'rectangle', 
          status: 'idle',
          useLocalBridge: true,
          localPath: '.' // Root
        }
      },
      {
        id: 'g-ctx-finder',
        type: NodeType.GEMINI_GENERATE,
        position: { x: 250, y: 300 },
        data: { 
          label: 'Context Finder', 
          shape: 'square', 
          status: 'idle',
          provider: 'gemini',
          model: 'gemini-3-flash-preview',
          prompt: "Look at the file tree.\nIdentify the Base Gizmo class, Math Utilities, and any Type definitions needed to create a new 'Transform Gizmo'.\n\nOUTPUT JSON format:\n{ \"related_files\": [\"src/core/Gizmo.ts\", \"src/math/Vector3.ts\"] }"
        }
      },
      {
        id: 'g-read',
        type: NodeType.READ_FILE,
        position: { x: 500, y: 300 },
        data: { 
          label: 'Read Related', 
          shape: 'rectangle', 
          status: 'idle',
          useLocalBridge: true,
          // Empty path implies it will wait for the 'Context Finder' to provide the list
          localPath: '' 
        }
      },
      {
        id: 'g-architect',
        type: NodeType.ARCHITECT,
        position: { x: 750, y: 100 },
        data: { 
          label: 'Gizmo Architect', 
          shape: 'square', 
          status: 'idle',
          provider: 'gemini', 
          model: 'gemini-3-pro-preview',
          prompt: "We need a new Transform Gizmo.\nBased on the 'Read Related' files (Base classes):\n1. Create a plan to implement 'TransformGizmo.ts'.\n2. Ensure it inherits correctly and implements required methods (update, draw).\n3. Output a task list."
        }
      },
      {
        id: 'g-iterator',
        type: NodeType.TASK_ITERATOR,
        position: { x: 50, y: 550 },
        data: { 
          label: 'Execution Loop', 
          shape: 'square', 
          status: 'idle',
          iteratorIndex: 0
        }
      },
      {
        id: 'g-gen',
        type: NodeType.GEMINI_GENERATE,
        position: { x: 300, y: 550 },
        data: { 
          label: 'Coder', 
          shape: 'square', 
          status: 'idle',
          provider: 'deepseek', // Good for coding
          model: 'deepseek-coder',
          prompt: "Implement the file requested by the Iterator.\nUse the context from 'Read Related' to ensure correct imports and inheritance."
        }
      },
      {
        id: 'g-check',
        type: NodeType.GEMINI_CHECK,
        position: { x: 550, y: 550 },
        data: { 
          label: 'Compile Check', 
          shape: 'square', 
          status: 'idle',
          prompt: "Check for TypeScript errors, missing imports, or logic flaws."
        }
      },
      {
        id: 'g-write',
        type: NodeType.WRITE_FILE,
        position: { x: 800, y: 550 },
        data: { 
          label: 'Save Gizmo', 
          shape: 'rectangle', 
          status: 'idle',
          useLocalBridge: true,
          localPath: '' // Dynamic
        }
      }
    ],
    edges: [
      { id: 'ge-1', source: 'g-trigger', target: 'g-index' },
      { id: 'ge-2', source: 'g-index', target: 'g-ctx-finder' },
      { id: 'ge-3', source: 'g-ctx-finder', target: 'g-read' },
      { id: 'ge-4', source: 'g-read', target: 'g-architect' },
      
      { id: 'ge-5', source: 'g-architect', target: 'g-iterator' },
      { id: 'ge-6', source: 'g-iterator', target: 'g-gen' },
      
      // Pass Context to Generator too
      { id: 'ge-ctx', source: 'g-read', target: 'g-gen' },

      { id: 'ge-7', source: 'g-gen', target: 'g-check' },
      { id: 'ge-8', source: 'g-check', target: 'g-write' }
    ]
  },
  {
    name: "Feature Implementer (Loop)",
    description: "The 'God Mode' workflow. Scans your project, plans a complex feature, and implements it file-by-file automatically.",
    nodes: [
      {
        id: 'f-trigger',
        type: NodeType.TRIGGER,
        position: { x: 50, y: 100 },
        data: { label: 'Start Feature', status: 'idle', shape: 'circle' }
      },
      {
        id: 'f-index',
        type: NodeType.PROJECT_INDEX,
        position: { x: 250, y: 100 },
        data: { 
          label: 'Scan Project', 
          shape: 'rectangle', 
          status: 'idle',
          useLocalBridge: true,
          localPath: '.' // Root
        }
      },
      {
        id: 'f-context',
        type: NodeType.READ_FILE,
        position: { x: 500, y: 300 },
        data: { 
          label: 'Global Context', 
          shape: 'rectangle', 
          status: 'idle',
          useLocalBridge: true,
          localPath: 'src/types.ts', // Placeholder for user to update
          prompt: "Load this file to give the AI context about your engine (e.g. types.ts, EntitySystem.ts)"
        }
      },
      {
        id: 'f-architect',
        type: NodeType.ARCHITECT,
        position: { x: 500, y: 100 },
        data: { 
          label: 'Architect Plan', 
          shape: 'square', 
          status: 'idle',
          provider: 'gemini', 
          model: 'gemini-3-pro-preview', // Strong reasoning model
          prompt: "We need to implement a new feature.\n\nCONTEXT:\n[The file list is provided above]\n[Global Context is provided via the connected Read File node]\n\nTASK:\n1. Analyze the file structure.\n2. Create a plan to implement the requested feature.\n3. Output a JSON list of tasks. For existing files, specify 'Modify'. For new files, specify 'Create'."
        }
      },
      {
        id: 'f-iterator',
        type: NodeType.TASK_ITERATOR,
        position: { x: 50, y: 500 },
        data: { 
          label: 'Task Loop', 
          shape: 'square', 
          status: 'idle',
          iteratorIndex: 0
        }
      },
      {
        id: 'f-read',
        type: NodeType.READ_FILE,
        position: { x: 300, y: 500 },
        data: { 
          label: 'Read Target', 
          shape: 'rectangle', 
          status: 'idle',
          useLocalBridge: true,
          localPath: '' // Dynamic: Comes from Iterator
        }
      },
      {
        id: 'f-gen',
        type: NodeType.GEMINI_GENERATE,
        position: { x: 550, y: 500 },
        data: { 
          label: 'Implement Code', 
          shape: 'square', 
          status: 'idle',
          provider: 'gemini',
          model: 'gemini-3-pro-preview',
          prompt: "Implement the changes requested by the Architect for this specific file. \n- Use the 'Global Context' to understand available types/APIs.\n- If the target file exists, Apply the changes/extensions.\n- If it's new, write the full code.\n- Maintain existing coding style."
        }
      },
      {
        id: 'f-write',
        type: NodeType.WRITE_FILE,
        position: { x: 800, y: 500 },
        data: { 
          label: 'Save to Disk', 
          shape: 'rectangle', 
          status: 'idle',
          useLocalBridge: true,
          localPath: '' // Dynamic: Comes from Iterator/Gen
        }
      }
    ],
    edges: [
      // Planning Phase
      { id: 'fe-1', source: 'f-trigger', target: 'f-index' },
      { id: 'fe-2', source: 'f-index', target: 'f-architect' },
      
      // Context Connection (Architect needs to know types to plan correctly)
      { id: 'fe-ctx-1', source: 'f-context', target: 'f-architect' },
      
      // Handoff to Loop
      { id: 'fe-3', source: 'f-architect', target: 'f-iterator' },
      
      // Execution Loop
      { id: 'fe-4', source: 'f-iterator', target: 'f-read' },
      { id: 'fe-5', source: 'f-read', target: 'f-gen' },
      
      // Context Connection (Generator needs to know types to write correct code)
      { id: 'fe-ctx-2', source: 'f-context', target: 'f-gen' },

      { id: 'fe-6', source: 'f-gen', target: 'f-write' }
    ]
  },
  {
    name: "Project Admin Dashboard",
    description: "A control center for managing your local project. Includes Git status, file indexing, and shell execution.",
    nodes: [
      {
        id: 'admin-trigger',
        type: NodeType.TRIGGER,
        position: { x: 50, y: 300 },
        data: { label: 'Refresh Dashboard', status: 'idle', shape: 'circle' }
      },
      {
        id: 'admin-git',
        type: NodeType.GIT_CONTROL,
        position: { x: 300, y: 100 },
        data: { 
          label: 'Git Status', 
          shape: 'rectangle', 
          status: 'idle',
          gitCommand: 'status',
          useLocalBridge: true,
          gitStopOnDirty: false 
        }
      },
      {
        id: 'admin-index',
        type: NodeType.PROJECT_INDEX,
        position: { x: 300, y: 300 },
        data: { 
          label: 'File System Index', 
          shape: 'rectangle', 
          status: 'idle',
          useLocalBridge: true,
          localPath: '.' // Root of the project
        }
      },
      {
        id: 'admin-shell',
        type: NodeType.SHELL_EXEC,
        position: { x: 300, y: 500 },
        data: { 
          label: 'Terminal Command', 
          shape: 'square', 
          status: 'idle',
          useLocalBridge: true, // Execute on real machine
          prompt: "dir" // Default to listing dir on Windows
        }
      },
      {
        id: 'admin-todo',
        type: NodeType.TODO_LIST,
        position: { x: 600, y: 300 },
        data: { 
          label: 'Project Roadmap', 
          shape: 'rectangle', 
          status: 'idle',
          todo: "- [ ] Fix Git Status errors\n- [ ] Run Build\n- [ ] Implement new feature" 
        }
      }
    ],
    edges: [
      { id: 'ae-1', source: 'admin-trigger', target: 'admin-git' },
      { id: 'ae-2', source: 'admin-trigger', target: 'admin-index' },
      { id: 'ae-3', source: 'admin-trigger', target: 'admin-shell' }
    ]
  },
  {
    name: "Python Data Analysis",
    description: "Generates a dummy CSV dataset and uses Python (Pandas) to analyze it. Tests VFS and Pyodide.",
    nodes: [
      {
        id: 't-trigger',
        type: NodeType.TRIGGER,
        position: { x: 50, y: 300 },
        data: { label: 'Start', status: 'idle', shape: 'circle' }
      },
      {
        id: 't-gen-data',
        type: NodeType.GEMINI_GENERATE,
        position: { x: 250, y: 200 },
        data: { 
          label: 'Create Data & Script', 
          shape: 'rectangle',
          status: 'idle',
          prompt: "1. Create a file 'sales_data.csv' with columns: Date, Product, Amount. Include 10 rows of dummy data.\n2. Create a file 'analyze.py' that reads 'sales_data.csv' using python (standard csv lib or string manipulation if pandas not installed) and calculates the total sales amount."
        }
      },
      {
        id: 't-run-py',
        type: NodeType.PYTHON_EXEC,
        position: { x: 600, y: 200 },
        data: { 
          label: 'Run Analysis', 
          shape: 'rectangle', 
          status: 'idle',
          dependencies: 'pandas', // Request pandas
          code: "# The AI generated 'analyze.py' will be loaded automatically from VFS.\n# You can also write glue code here.\n\nprint('Running analysis...')" 
        }
      }
    ],
    edges: [
      { id: 'te-1', source: 't-trigger', target: 't-gen-data' },
      { id: 'te-2', source: 't-gen-data', target: 't-run-py' }
    ]
  },
  {
    name: "Web App Scaffolder",
    description: "Generates a multi-file frontend project. Tests AI multi-file parsing and Tabbed Output.",
    nodes: [
      {
        id: 'w-trigger',
        type: NodeType.TRIGGER,
        position: { x: 50, y: 300 },
        data: { label: 'Start', status: 'idle', shape: 'circle' }
      },
      {
        id: 'w-gen',
        type: NodeType.GEMINI_GENERATE,
        position: { x: 300, y: 200 },
        data: { 
          label: 'Scaffold Login Page', 
          shape: 'rectangle', 
          status: 'idle',
          prompt: "Create a modern login page. \nOutput 3 files:\n1. index.html\n2. style.css (dark mode)\n3. app.js (form validation)" 
        }
      },
      {
        id: 'w-check',
        type: NodeType.GEMINI_CHECK,
        position: { x: 650, y: 200 },
        data: { 
          label: 'Accessibility Audit', 
          shape: 'rectangle', 
          status: 'idle',
          prompt: "Review the HTML and CSS for WCAG compliance. Check color contrast and aria-labels." 
        }
      }
    ],
    edges: [
      { id: 'we-1', source: 'w-trigger', target: 'w-gen' },
      { id: 'we-2', source: 'w-gen', target: 'w-check' }
    ]
  },
  {
    name: "DevOps Simulator",
    description: "Simulates CLI commands. Tests the Shell Node and Command Service.",
    nodes: [
      {
        id: 'd-trigger',
        type: NodeType.TRIGGER,
        position: { x: 50, y: 300 },
        data: { label: 'Start', status: 'idle', shape: 'circle' }
      },
      {
        id: 'd-shell',
        type: NodeType.SHELL_EXEC,
        position: { x: 300, y: 200 },
        data: { 
          label: 'Simulate Deploy', 
          shape: 'square', 
          status: 'idle',
          useAiSimulation: true,
          prompt: "npm install && npm run build && docker build -t myapp ." 
        }
      },
      {
        id: 'd-note',
        type: NodeType.NOTE,
        position: { x: 300, y: 400 },
        data: { 
          label: 'Info', 
          shape: 'rectangle', 
          status: 'idle',
          prompt: "Since we are in the browser, the Shell node uses AI to predict what the terminal output would look like." 
        }
      }
    ],
    edges: [
      { id: 'de-1', source: 'd-trigger', target: 'd-shell' }
    ]
  },
  {
    name: "Full Quality Assurance",
    description: "End-to-end coding workflow. Generates code, creates unit tests, and performs a security audit.",
    nodes: [
      {
        id: 'qa-trigger',
        type: NodeType.TRIGGER,
        position: { x: 50, y: 300 },
        data: { label: 'Start QA', status: 'idle', shape: 'circle' }
      },
      {
        id: 'qa-gen',
        type: NodeType.GEMINI_GENERATE,
        position: { x: 250, y: 200 },
        data: {
          label: 'Generate Function',
          shape: 'square',
          status: 'idle',
          prompt: "Write a Python function 'parse_user_data' that takes a raw JSON string, parses it, and validates 'email' and 'age' fields."
        }
      },
      {
        id: 'qa-test',
        type: NodeType.AI_UNIT_TEST,
        position: { x: 550, y: 100 },
        data: {
          label: 'Generate Tests',
          shape: 'square',
          status: 'idle',
          prompt: "Write pytest unit tests. Include edge cases for malformed JSON and invalid emails."
        }
      },
      {
        id: 'qa-check',
        type: NodeType.GEMINI_CHECK,
        position: { x: 550, y: 300 },
        data: {
          label: 'Security Scan',
          shape: 'square',
          status: 'idle',
          prompt: "Check for denial of service vulnerabilities in regex or exception handling."
        }
      }
    ],
    edges: [
      { id: 'qae-1', source: 'qa-trigger', target: 'qa-gen' },
      { id: 'qae-2', source: 'qa-gen', target: 'qa-test' },
      { id: 'qae-3', source: 'qa-gen', target: 'qa-check' }
    ]
  },
  {
    name: "Algorithm Diff Check",
    description: "Generates two different implementations of an algorithm and uses the Diff node to compare them.",
    nodes: [
      {
        id: 'diff-trigger',
        type: NodeType.TRIGGER,
        position: { x: 50, y: 300 },
        data: { label: 'Start Diff', status: 'idle', shape: 'circle' }
      },
      {
        id: 'diff-v1',
        type: NodeType.GEMINI_GENERATE,
        position: { x: 300, y: 150 },
        data: {
          label: 'Bubble Sort (V1)',
          shape: 'square',
          status: 'idle',
          prompt: "Write a Python function for Bubble Sort."
        }
      },
      {
        id: 'diff-v2',
        type: NodeType.GEMINI_GENERATE,
        position: { x: 300, y: 450 },
        data: {
          label: 'Quick Sort (V2)',
          shape: 'square',
          status: 'idle',
          prompt: "Write a Python function for Quick Sort."
        }
      },
      {
        id: 'diff-node',
        type: NodeType.DIFF,
        position: { x: 600, y: 300 },
        data: {
          label: 'Compare Algos',
          shape: 'square',
          status: 'idle',
          prompt: ""
        }
      }
    ],
    edges: [
      { id: 'diffe-1', source: 'diff-trigger', target: 'diff-v1' },
      { id: 'diffe-2', source: 'diff-trigger', target: 'diff-v2' },
      { id: 'diffe-3', source: 'diff-v1', target: 'diff-node' },
      { id: 'diffe-4', source: 'diff-v2', target: 'diff-node' }
    ]
  },
  {
    name: "Structured Code Audit",
    description: "Demonstrates richer checking capabilities with JSON-based structured output (Line, Severity, Suggestion).",
    nodes: [
      {
        id: 's-trigger',
        type: NodeType.TRIGGER,
        position: { x: 50, y: 300 },
        data: { label: 'Start Audit', status: 'idle', shape: 'circle' }
      },
      {
        id: 's-gen',
        type: NodeType.GEMINI_GENERATE,
        position: { x: 250, y: 200 },
        data: {
          label: 'Vulnerable Code',
          shape: 'square',
          status: 'idle',
          prompt: "Write a Python script that uses `subprocess.call` to ping a host provided by user input without any validation. Also use a weak hash function."
        }
      },
      {
        id: 's-check',
        type: NodeType.GEMINI_CHECK,
        position: { x: 600, y: 200 },
        data: {
          label: 'Security Auditor',
          shape: 'square',
          status: 'idle',
          prompt: "Identify security vulnerabilities (OWASP Top 10)."
        }
      }
    ],
    edges: [
      { id: 'se-1', source: 's-trigger', target: 's-gen' },
      { id: 'se-2', source: 's-gen', target: 's-check' }
    ]
  }
];