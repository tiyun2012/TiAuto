

import { Node, Edge, NodeType } from '../types';

export interface Template {
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
}

export const APP_TEMPLATES: Template[] = [
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
    name: "ti3d Autonomous Manager",
    description: "Safe, senior-level workflow for ti3d. Enforces ECS architecture, uses AI Debate for code review, and performs atomic git commits per file.",
    nodes: [
      // PHASE 1: SAFETY & SETUP
      {
        id: 'ti-trigger',
        type: NodeType.TRIGGER,
        position: { x: 50, y: 100 },
        data: { label: 'Start Task', status: 'idle', shape: 'circle' }
      },
      {
        id: 'ti-git-status',
        type: NodeType.GIT_CONTROL,
        position: { x: 250, y: 100 },
        data: { 
          label: 'Check Git Status', 
          shape: 'rectangle', 
          status: 'idle',
          gitCommand: 'status',
          gitStopOnDirty: true,
          useLocalBridge: true, // Requires Bridge
          prompt: "Ensure working directory is clean before starting."
        }
      },
      {
        id: 'ti-index',
        type: NodeType.PROJECT_INDEX,
        position: { x: 450, y: 100 },
        data: { 
          label: 'Scan Project', 
          shape: 'rectangle', 
          status: 'idle',
          useLocalBridge: true,
          localPath: '.'
        }
      },
      // PHASE 2: ARCHITECT
      {
        id: 'ti-architect',
        type: NodeType.ARCHITECT,
        position: { x: 650, y: 100 },
        data: { 
          label: 'ECS Architect', 
          shape: 'square', 
          status: 'idle',
          provider: 'deepseek', // DeepSeek is great for logic/planning
          prompt: `You are the Lead Engine Architect for ti3d.
User Goal: Implement the requested feature.

STRICT ARCHITECTURE RULES:
1. ECS Pattern Only: Logic belongs in Systems. State belongs in Components. Do NOT create Object-Oriented classes with methods.
2. React UI: Use React.memo() and careful dependency management to prevent WebGL frame drops.
3. Directory Structure: Respect the existing /src/services/ecs folder structure.

Output a JSON task list for every file that needs to be created or modified.`
        }
      },
      // PHASE 3: EXECUTION LOOP
      {
        id: 'ti-iterator',
        type: NodeType.TASK_ITERATOR,
        position: { x: 50, y: 400 },
        data: { 
          label: 'Execution Loop', 
          shape: 'square', 
          status: 'idle',
          iteratorIndex: 0
        }
      },
      {
        id: 'ti-read',
        type: NodeType.READ_FILE,
        position: { x: 300, y: 400 },
        data: { 
          label: 'Read Context', 
          shape: 'rectangle', 
          status: 'idle',
          useLocalBridge: true,
          // Empty path implies dynamic reading based on Iterator output
          localPath: '' 
        }
      },
      {
        id: 'ti-gen',
        type: NodeType.GEMINI_GENERATE,
        position: { x: 550, y: 400 },
        data: { 
          label: 'Write ECS Code', 
          shape: 'square', 
          status: 'idle',
          provider: 'gemini', // Gemini 1.5 Pro has large context window
          model: 'gemini-1.5-pro',
          prompt: "Implement the file content based on the Architect's instructions. Ensure code is performant and strictly typed."
        }
      },
      {
        id: 'ti-debate',
        type: NodeType.AI_DEBATE,
        position: { x: 800, y: 400 },
        data: { 
          label: 'Strict Code Review', 
          shape: 'square', 
          status: 'idle',
          personaA: "ECS Purist",
          personaB: "Performance Optimizer",
          debateRounds: 2,
          prompt: "Review the generated code. \n1. Does it violate ECS principles (e.g., logic inside a component)? \n2. Are there React anti-patterns (e.g., missing dependency arrays)? \n3. Are there potential memory leaks?"
        }
      },
      // PHASE 4: HUMAN GATE & SAVE
      {
        id: 'ti-approve',
        type: NodeType.APPROVAL,
        position: { x: 50, y: 700 },
        data: { 
          label: 'Human Gate', 
          shape: 'rectangle', 
          status: 'idle'
        }
      },
      {
        id: 'ti-write',
        type: NodeType.WRITE_FILE,
        position: { x: 300, y: 700 },
        data: { 
          label: 'Save File', 
          shape: 'rectangle', 
          status: 'idle',
          useLocalBridge: true,
          // Empty path implies dynamic writing based on Iterator/Gen output
          localPath: ''
        }
      },
      {
        id: 'ti-commit',
        type: NodeType.GIT_CONTROL,
        position: { x: 550, y: 700 },
        data: { 
          label: 'Atomic Commit', 
          shape: 'rectangle', 
          status: 'idle',
          gitCommand: 'commit',
          gitMessage: 'AI: Implemented atomic task',
          useLocalBridge: true
        }
      }
    ],
    edges: [
      // Setup Phase
      { id: 'te-1', source: 'ti-trigger', target: 'ti-git-status' },
      { id: 'te-2', source: 'ti-git-status', target: 'ti-index' },
      { id: 'te-3', source: 'ti-index', target: 'ti-architect' },
      
      // Loop Start
      { id: 'te-4', source: 'ti-architect', target: 'ti-iterator' },
      { id: 'te-5', source: 'ti-iterator', target: 'ti-read' },
      
      // Coding Phase
      { id: 'te-6', source: 'ti-read', target: 'ti-gen' },
      { id: 'te-7', source: 'ti-gen', target: 'ti-debate' },
      
      // Review & Save
      { id: 'te-8', source: 'ti-debate', target: 'ti-approve' },
      { id: 'te-9', source: 'ti-approve', target: 'ti-write' },
      { id: 'te-10', source: 'ti-write', target: 'ti-commit' }
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