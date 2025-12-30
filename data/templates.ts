
import { Node, Edge, NodeType } from '../types';

export interface Template {
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
}

export const APP_TEMPLATES: Template[] = [
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
