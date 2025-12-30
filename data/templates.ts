
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
  }
];
