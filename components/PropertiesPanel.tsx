import React from 'react';
import { Node, NodeType, NodeShape } from '../types';
import { X, Copy, Trash2, Maximize2, Square, Circle } from 'lucide-react';
import Editor from '@monaco-editor/react';

interface PropertiesPanelProps {
  node: Node | null;
  onUpdateNode: (id: string, data: any) => void;
  onDeleteNode: (id: string) => void;
  onClose: () => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ node, onUpdateNode, onDeleteNode, onClose }) => {
  if (!node) return null;

  // Determine language based on node type and context
  const getLanguage = (isOutput: boolean) => {
    if (node.type === NodeType.GEMINI_GENERATE && isOutput) return 'python';
    if (node.type === NodeType.GEMINI_CHECK && !isOutput) return 'text'; // Criteria
    if (node.type === NodeType.SIMULATE_RUN) return 'python';
    if (node.type === NodeType.PYTHON_EXEC && !isOutput) return 'python';
    return 'markdown';
  };

  return (
    <div className="absolute right-0 top-0 h-full w-[500px] bg-gray-900 border-l border-gray-800 shadow-2xl z-40 flex flex-col animate-slide-in">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900 shrink-0">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <span className={`w-2 h-6 rounded-full ${
            node.type === NodeType.TRIGGER ? 'bg-green-500' :
            node.type === NodeType.GEMINI_GENERATE ? 'bg-purple-500' :
            node.type === NodeType.GEMINI_CHECK ? 'bg-orange-500' :
            node.type === NodeType.SIMULATE_RUN ? 'bg-pink-500' : 
            node.type === NodeType.PYTHON_EXEC ? 'bg-yellow-600' :
            node.type === NodeType.VS_CODE ? 'bg-blue-500' : 
            node.type === NodeType.TODO_LIST ? 'bg-teal-500' : 'bg-yellow-500'
          }`}></span>
          {node.type === NodeType.GEMINI_GENERATE ? 'Code Generator' :
           node.type === NodeType.GEMINI_CHECK ? 'Security Auditor' :
           node.type === NodeType.SIMULATE_RUN ? 'Simulator' : 
           node.type === NodeType.PYTHON_EXEC ? 'Python Runner' :
           node.type === NodeType.VS_CODE ? 'VS Code Launcher' :
           node.type === NodeType.TODO_LIST ? 'Task List' :
           node.type.replace('_', ' ')}
        </h2>
        <div className="flex gap-2">
             <button onClick={() => onDeleteNode(node.id)} className="p-2 hover:bg-red-900/30 rounded text-gray-400 hover:text-red-400 transition-colors" title="Delete Node">
                <Trash2 className="w-4 h-4" />
             </button>
             <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        
        {/* Label & Shape Input */}
        <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Node Name</label>
                <input
                    type="text"
                    value={node.data.label}
                    onChange={(e) => onUpdateNode(node.id, { label: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Shape</label>
                <div className="flex rounded-lg bg-gray-800 border border-gray-700 p-1">
                    <button 
                        onClick={() => onUpdateNode(node.id, { shape: 'square' })}
                        className={`flex-1 flex justify-center p-1 rounded ${!node.data.shape || node.data.shape === 'square' ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                        title="Square"
                    >
                        <Square className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => onUpdateNode(node.id, { shape: 'circle' })}
                        className={`flex-1 flex justify-center p-1 rounded ${node.data.shape === 'circle' ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                         title="Circle"
                    >
                        <Circle className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>

        {/* Python Execution Specific Input */}
        {node.type === NodeType.PYTHON_EXEC && (
             <div className="space-y-2">
                <label className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Environment Setup (Pip)</label>
                <input
                    type="text"
                    value={node.data.dependencies || ''}
                    placeholder="numpy, pandas, pytz"
                    onChange={(e) => onUpdateNode(node.id, { dependencies: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
                <p className="text-[10px] text-gray-500">
                    Comma separated list of pure-python packages to install via micropip (e.g. <code>numpy, pandas</code>).
                </p>
                
                <div className="mt-4 space-y-2 flex flex-col h-40">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Additional Code</label>
                    <div className="flex-1 border border-gray-700 rounded overflow-hidden">
                        <Editor
                            height="100%"
                            defaultLanguage="python"
                            value={node.data.code || ''}
                            onChange={(value) => onUpdateNode(node.id, { code: value })}
                            theme="vs-dark"
                            options={{ minimap: { enabled: false }, fontSize: 13 }}
                        />
                    </div>
                </div>
            </div>
        )}

        {/* VS Code Specific Input */}
        {node.type === NodeType.VS_CODE ? (
            <>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-blue-400 uppercase tracking-wider">Local Project Path</label>
                    <input
                        type="text"
                        value={node.data.prompt || ''}
                        placeholder="/Users/username/projects/my-app"
                        onChange={(e) => onUpdateNode(node.id, { prompt: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    />
                    <p className="text-[10px] text-gray-500">
                        Enter absolute path. Opens <code>vscode://file/path</code>.
                    </p>
                </div>
                
                <div className="space-y-2">
                    <label className="text-xs font-bold text-teal-400 uppercase tracking-wider">Instructions / Tasks</label>
                    <textarea
                        value={node.data.todo || ''}
                        placeholder="- [ ] Review main.py&#10;- [ ] Run unit tests"
                        onChange={(e) => onUpdateNode(node.id, { todo: e.target.value })}
                        className="w-full h-32 bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-sans"
                    />
                    <p className="text-[10px] text-gray-500">
                        These instructions will be displayed in the output when the node runs.
                    </p>
                </div>
            </>
        ) : node.type === NodeType.TODO_LIST ? (
            <div className="space-y-2">
                <label className="text-xs font-bold text-teal-400 uppercase tracking-wider">Checklist Items</label>
                <textarea
                    value={node.data.todo || ''}
                    placeholder="- [ ] Step 1&#10;- [ ] Step 2"
                    onChange={(e) => onUpdateNode(node.id, { todo: e.target.value })}
                    className="w-full h-64 bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-sans"
                />
            </div>
        ) : (
             /* Prompt / Configuration Input for Other Nodes */
             node.type !== NodeType.TRIGGER && node.type !== NodeType.PYTHON_EXEC && (
              <div className="space-y-2 flex flex-col h-64">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between">
                   <span>{node.type === NodeType.GEMINI_CHECK ? 'Check Criteria' : 'Prompt / Input'}</span>
                   <span className="text-[10px] bg-gray-800 px-1 rounded border border-gray-700">Editor Mode</span>
                </label>
                <div className="flex-1 border border-gray-700 rounded overflow-hidden">
                    <Editor
                        height="100%"
                        defaultLanguage={getLanguage(false)}
                        value={node.data.prompt || ''}
                        onChange={(value) => onUpdateNode(node.id, { prompt: value })}
                        theme="vs-dark"
                        options={{
                            minimap: { enabled: false },
                            fontSize: 13,
                            lineNumbers: 'on',
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            padding: { top: 10, bottom: 10 },
                            wordWrap: 'on'
                        }}
                    />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                   {node.type === NodeType.GEMINI_GENERATE && "Instructions for the AI to generate code."}
                   {node.type === NodeType.GEMINI_CHECK && "Security policies and bugs to check for."}
                   {node.type === NodeType.NOTE && "Markdown supported."}
                </p>
              </div>
            )
        )}

        {/* Output Display */}
        {node.data.output && (
          <div className="space-y-2 flex flex-col h-64 border-t border-gray-800 pt-4">
            <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-green-500 uppercase tracking-wider">Result</label>
                <button 
                  onClick={() => navigator.clipboard.writeText(node.data.output || '')}
                  className="text-xs text-gray-500 hover:text-white flex items-center gap-1 bg-gray-800 px-2 py-1 rounded"
                >
                    <Copy className="w-3 h-3" /> Copy
                </button>
            </div>
            <div className="flex-1 border border-gray-700 rounded overflow-hidden relative group">
                 <Editor
                    height="100%"
                    defaultLanguage={getLanguage(true)}
                    value={node.data.output}
                    theme="vs-dark"
                    options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 10, bottom: 10 },
                        wordWrap: 'on'
                    }}
                />
            </div>
          </div>
        )}
        
        {/* Error Display */}
        {node.data.errorMessage && (
             <div className="p-3 bg-red-900/20 border border-red-900/50 rounded text-xs text-red-400">
                <span className="font-bold">Error:</span> {node.data.errorMessage}
             </div>
        )}
      </div>
    </div>
  );
};

export default PropertiesPanel;