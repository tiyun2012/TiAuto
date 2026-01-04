import React from 'react';
import { Node, NodeType, NodeShape, AISettings } from '../types';
import { X, Trash2, Square, Circle, RectangleHorizontal, BookOpen, Sparkles, AlertTriangle } from 'lucide-react';
import Editor from '@monaco-editor/react';

// Import Modular Panels
import ShellPanel from './panels/ShellPanel';
import FilePanel from './panels/FilePanel';
import GitPanel from './panels/GitPanel';
import GenAIPanel from './panels/GenAIPanel';
import OutputPanel from './panels/OutputPanel';

interface PropertiesPanelProps {
  node: Node | null;
  aiSettings: AISettings;
  onUpdateNode: (id: string, data: any) => void;
  onDeleteNode: (id: string) => void;
  onClose: () => void;
  onRefineNode?: (id: string, instructions: string) => void;
  onAutoFix?: (nodeId: string) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ node, aiSettings, onUpdateNode, onDeleteNode, onClose, onRefineNode, onAutoFix }) => {
  if (!node) return null;

  const currentShape = node.data.shape || 'rectangle';
  const isAI = [NodeType.GEMINI_GENERATE, NodeType.GEMINI_CHECK, NodeType.AI_UNIT_TEST, NodeType.SIMULATE_RUN, NodeType.LOOP, NodeType.AI_DEBATE, NodeType.MULTI_CHECK, NodeType.ARCHITECT, NodeType.ROUTER].includes(node.type);
  const isFile = [NodeType.READ_FILE, NodeType.WRITE_FILE].includes(node.type);
  const isShell = node.type === NodeType.SHELL_EXEC;
  const isGit = node.type === NodeType.GIT_CONTROL;

  const renderBridgeWarning = () => {
      if (node.data.useLocalBridge && !aiSettings.localBridgeEnabled) {
          return (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg flex items-center gap-3 animate-in fade-in">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <div className="flex-1">
                    <p className="text-xs text-red-300 font-bold">Local Bridge Disabled</p>
                    <p className="text-[10px] text-gray-400">Enable "Local Bridge" in Settings to use this feature.</p>
                </div>
            </div>
          );
      }
      return null;
  };

  const getNodeHint = (type: NodeType) => {
      switch(type) {
          case NodeType.GEMINI_GENERATE: return "Best for creative tasks: writing new code from scratch, refactoring, or generating documentation.";
          case NodeType.GEMINI_CHECK: return "Best for QA: Analyzes input code for security flaws, bugs, and style issues without executing it.";
          case NodeType.AI_UNIT_TEST: return "Best for Stability: Automatically writes Pytest/Jest test cases to verify your code's logic.";
          case NodeType.SIMULATE_RUN: return "Best for Prediction: Acts as a 'Virtual Terminal' to predict output safely without running code locally.";
          case NodeType.PYTHON_EXEC: return "Executes Python code in the browser (via Pyodide). Use this to actually run data analysis or logic.";
          case NodeType.SHELL_EXEC: return "Runs system commands. Choose PowerShell for robust Windows file handling or Bash for Linux/Mac.";
          case NodeType.DIFF: return "Compares the text output of two parent nodes to show what changed.";
          case NodeType.LOOP: return "Requires 2 Inputs: Code + Check Result. It uses AI to fix the code based on the result and retries.";
          case NodeType.READ_FILE: return "Reads the content of local files. Supports multiple paths separated by commas (e.g. 'src/a.ts, src/b.ts').";
          case NodeType.WRITE_FILE: return "Writes the input content to a file on your local disk (via Local Bridge).";
          case NodeType.AI_DEBATE: return "Simulates a conversation between two AI Personas to refine ideas before output.";
          case NodeType.MULTI_CHECK: return "Runs the check against multiple AI providers simultaneously for robust consensus.";
          case NodeType.ROUTER: return "Evaluates a condition using AI and returns TRUE or FALSE.";
          case NodeType.ARCHITECT: return "Analyzes requirements and creates a structured plan for downstream nodes.";
          case NodeType.GIT_CONTROL: return "Manages version control operations (Commit, Push) via the Local Bridge.";
          case NodeType.PROJECT_INDEX: return "Lists files in the directory (recursive). DOES NOT read file content. Use Read File for content.";
          case NodeType.TASK_ITERATOR: return "Takes a JSON plan from the Architect and executes the downstream nodes once for each task in the list.";
          default: return "Configure the settings above to control this node.";
      }
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
            node.type === NodeType.AI_UNIT_TEST ? 'bg-cyan-500' :
            node.type === NodeType.SIMULATE_RUN ? 'bg-pink-500' : 
            node.type === NodeType.PYTHON_EXEC ? 'bg-yellow-600' :
            node.type === NodeType.SHELL_EXEC ? 'bg-gray-500' :
            node.type === NodeType.VS_CODE ? 'bg-blue-500' : 
            node.type === NodeType.DIFF ? 'bg-indigo-500' :
            node.type === NodeType.LOOP ? 'bg-violet-500' :
            node.type === NodeType.READ_FILE ? 'bg-blue-300' :
            node.type === NodeType.WRITE_FILE ? 'bg-red-300' :
            node.type === NodeType.AI_DEBATE ? 'bg-pink-400' :
            node.type === NodeType.MULTI_CHECK ? 'bg-indigo-300' :
            node.type === NodeType.ROUTER ? 'bg-yellow-200' :
            node.type === NodeType.ARCHITECT ? 'bg-emerald-300' :
            node.type === NodeType.GIT_CONTROL ? 'bg-orange-300' :
            node.type === NodeType.PROJECT_INDEX ? 'bg-cyan-300' :
            node.type === NodeType.TASK_ITERATOR ? 'bg-violet-300' :
            node.type === NodeType.TODO_LIST ? 'bg-teal-500' : 'bg-yellow-500'
          }`}></span>
          {node.type.replace('_', ' ')}
        </h2>
        <div className="flex gap-2">
             <button onClick={() => onDeleteNode(node.id)} className="p-2 hover:bg-red-900/30 rounded text-gray-400 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
             </button>
             <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        
        {/* Warning Banner */}
        {renderBridgeWarning()}

        {/* Basic Node Info */}
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
                    {['rectangle', 'square', 'circle'].map((s) => (
                        <button 
                            key={s}
                            onClick={() => onUpdateNode(node.id, { shape: s as NodeShape })}
                            className={`flex-1 flex justify-center p-1 rounded ${currentShape === s ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            {s === 'rectangle' ? <RectangleHorizontal className="w-4 h-4" /> : s === 'square' ? <Square className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* --- MODULAR PANELS --- */}
        
        {/* 1. Gen AI Panel */}
        {isAI && <GenAIPanel node={node} aiSettings={aiSettings} onUpdateNode={onUpdateNode} />}

        {/* 2. Shell Panel */}
        {isShell && <ShellPanel node={node} aiSettings={aiSettings} onUpdateNode={onUpdateNode} />}

        {/* 3. File Panel */}
        {isFile && <FilePanel node={node} aiSettings={aiSettings} onUpdateNode={onUpdateNode} />}

        {/* 4. Git Panel */}
        {isGit && <GitPanel node={node} onUpdateNode={onUpdateNode} />}

        {/* Remaining Inline Logic (Simple Nodes) */}
        {node.type === NodeType.PYTHON_EXEC && (
             <div className="space-y-2">
                <label className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Dependencies</label>
                <input
                    type="text"
                    value={node.data.dependencies || ''}
                    placeholder="numpy, pandas"
                    onChange={(e) => onUpdateNode(node.id, { dependencies: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm font-mono"
                />
                
                <div className="mt-4 space-y-2 flex flex-col h-40">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Code</label>
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

        {node.type === NodeType.VS_CODE && (
            <>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-blue-400 uppercase tracking-wider">Project Path</label>
                    <input
                        type="text"
                        value={node.data.prompt || ''}
                        placeholder="/Users/username/project"
                        onChange={(e) => onUpdateNode(node.id, { prompt: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm font-mono"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-teal-400 uppercase tracking-wider">Instructions</label>
                    <textarea
                        value={node.data.todo || ''}
                        onChange={(e) => onUpdateNode(node.id, { todo: e.target.value })}
                        className="w-full h-32 bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                    />
                </div>
            </>
        )}

        {node.type === NodeType.TODO_LIST && (
            <div className="space-y-2">
                <label className="text-xs font-bold text-teal-400 uppercase tracking-wider">Checklist</label>
                <textarea
                    value={node.data.todo || ''}
                    onChange={(e) => onUpdateNode(node.id, { todo: e.target.value })}
                    className="w-full h-64 bg-gray-800 border border-gray-700 rounded p-2 text-sm font-sans"
                />
            </div>
        )}

        {node.type === NodeType.DIFF && (
            <div className="space-y-2 flex flex-col h-48">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Input Config</label>
                </div>
                <div className="flex-1 border border-gray-700 rounded overflow-hidden mt-1">
                    <Editor
                        height="100%"
                        defaultLanguage="markdown"
                        value={node.data.prompt || ''}
                        onChange={(value) => onUpdateNode(node.id, { prompt: value })}
                        theme="vs-dark"
                        options={{ minimap: { enabled: false }, fontSize: 12 }}
                    />
                </div>
            </div>
        )}

        {node.type === NodeType.NOTE && (
             <div className="space-y-2 flex flex-col h-64">
                <label className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Content</label>
                <div className="flex-1 border border-gray-700 rounded overflow-hidden">
                    <Editor
                        height="100%"
                        defaultLanguage="markdown"
                        value={node.data.prompt || ''}
                        onChange={(value) => onUpdateNode(node.id, { prompt: value })}
                        theme="vs-dark"
                        options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on' }}
                    />
                </div>
             </div>
        )}

        {/* Output & Results (Modularized) */}
        {node.data.output && (
            <OutputPanel 
                node={node} 
                onUpdateNode={onUpdateNode} 
                onRefineNode={onRefineNode} 
                onAutoFix={onAutoFix} 
            />
        )}

        {node.data.errorMessage && (
             <div className="p-3 bg-red-900/20 border border-red-900/50 rounded text-xs text-red-400">
                <span className="font-bold">Error:</span> {node.data.errorMessage}
             </div>
        )}

        {/* Node & Provider Insights (HINT) */}
        <div className="mt-6 pt-4 border-t border-gray-800 pb-2">
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
                <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-blue-900/30 rounded-md shrink-0 mt-0.5">
                        <BookOpen className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="space-y-3">
                        <div>
                            <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider block mb-1">Node Purpose</span>
                            <p className="text-xs text-gray-300 leading-relaxed">
                                {getNodeHint(node.type)}
                            </p>
                        </div>
                        {isAI && (
                            <div className="pt-2 border-t border-gray-700/50">
                                <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                    <Sparkles className="w-3 h-3" />
                                    Active Provider: <span className="text-white capitalize">{node.data.provider || aiSettings.provider}</span>
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default PropertiesPanel;