import React, { useState, useEffect } from 'react';
import { Node, NodeType, NodeShape, AISettings, AIProvider } from '../types';
import { X, Copy, Trash2, Maximize2, Square, Circle, RectangleHorizontal, Monitor, Terminal, FileText, ChevronDown, Sparkles, Wand2, AlertTriangle, AlertCircle, Info, CheckCircle2, Bot, Brain, Globe, ExternalLink, Wrench, Server, Zap, Lightbulb, BookOpen, Download, FileCode, FileJson, FileType, Code2, Repeat, FolderOpen, Users, Layers, GitFork, Network, Save, Briefcase, GitBranch, ArrowRightLeft } from 'lucide-react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { GEMINI_MODELS, DEEPSEEK_MODELS, QWEN_MODELS, OPENAI_MODELS } from '../constants';
import { bridgeWriteFile } from '../services/localBridgeService';

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
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [refinementInput, setRefinementInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [targetDiffPath, setTargetDiffPath] = useState("");

  // Set default active file
  useEffect(() => {
    if (node?.data.files && Object.keys(node.data.files).length > 0) {
        if (!activeFile || !node.data.files[activeFile]) {
            setActiveFile(Object.keys(node.data.files)[0]);
        }
    } else {
        setActiveFile(null);
    }
  }, [node?.id, node?.data.files]);

  if (!node) return null;

  const getLanguage = (isOutput: boolean, fileName?: string) => {
    if (fileName) {
        if (fileName.endsWith('.py')) return 'python';
        if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return 'javascript';
        if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return 'typescript';
        if (fileName.endsWith('.json')) return 'json';
        if (fileName.endsWith('.html')) return 'html';
        if (fileName.endsWith('.css')) return 'css';
        if (fileName.endsWith('.sh')) return 'shell';
        if (fileName.endsWith('.md')) return 'markdown';
        if (fileName.endsWith('.cpp') || fileName.endsWith('.c') || fileName.endsWith('.h')) return 'cpp';
        if (fileName.endsWith('.cs')) return 'csharp';
    }
    if (node.type === NodeType.GEMINI_GENERATE && isOutput) return 'python';
    if (node.type === NodeType.GEMINI_CHECK && !isOutput) return 'text';
    if (node.type === NodeType.AI_UNIT_TEST && !isOutput) return 'text';
    if (node.type === NodeType.SIMULATE_RUN) return 'python';
    if (node.type === NodeType.PYTHON_EXEC && !isOutput) return 'python';
    if (node.type === NodeType.SHELL_EXEC) return 'shell';
    return 'markdown';
  };

  const getFileIcon = (fileName: string) => {
      if (fileName.endsWith('.py')) return <FileCode className="w-3.5 h-3.5 text-yellow-400" />;
      if (fileName.endsWith('.js') || fileName.endsWith('.ts')) return <Code2 className="w-3.5 h-3.5 text-blue-400" />;
      if (fileName.endsWith('.json')) return <FileJson className="w-3.5 h-3.5 text-green-400" />;
      if (fileName.endsWith('.html')) return <Globe className="w-3.5 h-3.5 text-orange-400" />;
      return <FileText className="w-3.5 h-3.5 text-gray-400" />;
  };

  const handleRefine = () => {
      if (!onRefineNode || !refinementInput.trim()) return;
      setIsRefining(true);
      onRefineNode(node.id, refinementInput);
      setRefinementInput("");
      setTimeout(() => setIsRefining(false), 2000);
  };
  
  const handleDownloadFile = (fileName: string, content: string) => {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const handleMergeDiff = async () => {
      if (!node.data.diffModified) return;
      if (!targetDiffPath && !aiSettings.localBridgeEnabled) {
          alert("Cannot merge: No target path or Bridge disabled.");
          return;
      }
      if(aiSettings.localBridgeEnabled && targetDiffPath) {
          try {
              await bridgeWriteFile(targetDiffPath, node.data.diffModified, aiSettings);
              alert("Successfully merged to local disk.");
          } catch(e: any) {
              alert("Merge failed: " + e.message);
          }
      } else {
          // Simulation
          alert("Simulation: Merged content would be written to disk.");
      }
  };

  // Handle local file selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const content = ev.target?.result as string;
        onUpdateNode(node.id, { 
            code: content, 
            label: file.name,
            output: content // Pre-fill output so it's visible immediately
        });
    };
    reader.readAsText(file);
  };

  const currentShape = node.data.shape || 'rectangle';
  const hasMultipleFiles = node.data.files && Object.keys(node.data.files).length > 0;
  const isGenerative = [NodeType.GEMINI_GENERATE, NodeType.GEMINI_CHECK, NodeType.AI_UNIT_TEST, NodeType.SIMULATE_RUN, NodeType.LOOP, NodeType.AI_DEBATE, NodeType.MULTI_CHECK, NodeType.ARCHITECT].includes(node.type);

  // Determine active provider for this node (Override > Global)
  const activeProvider = node.data.provider || aiSettings.provider;
  
  // Get available models based on active provider
  let availableModels: { value: string, label: string }[] = [];
  if (activeProvider === 'gemini') availableModels = GEMINI_MODELS;
  else if (activeProvider === 'deepseek') availableModels = DEEPSEEK_MODELS;
  else if (activeProvider === 'qwen') availableModels = QWEN_MODELS;
  else if (activeProvider === 'openai') availableModels = OPENAI_MODELS;

  // --- HINT HELPERS ---

  const getNodeHint = (type: NodeType) => {
      switch(type) {
          case NodeType.GEMINI_GENERATE: return "Best for creative tasks: writing new code from scratch, refactoring, or generating documentation.";
          case NodeType.GEMINI_CHECK: return "Best for QA: Analyzes input code for security flaws, bugs, and style issues without executing it.";
          case NodeType.AI_UNIT_TEST: return "Best for Stability: Automatically writes Pytest/Jest test cases to verify your code's logic.";
          case NodeType.SIMULATE_RUN: return "Best for Prediction: Acts as a 'Virtual Terminal' to predict output safely without running code locally.";
          case NodeType.PYTHON_EXEC: return "Executes Python code in the browser (via Pyodide). Use this to actually run data analysis or logic.";
          case NodeType.SHELL_EXEC: return "Simulates shell commands. In a desktop version, this would run actual system commands.";
          case NodeType.DIFF: return "Compares the text output of two parent nodes to show what changed.";
          case NodeType.LOOP: return "Requires 2 Inputs: Code + Check Result. It uses AI to fix the code based on the result and retries.";
          case NodeType.READ_FILE: return "Reads the content of a local file. Use this to feed existing code into a workflow.";
          case NodeType.WRITE_FILE: return "Writes the input content to a file on your local disk (via Local Bridge).";
          case NodeType.AI_DEBATE: return "Simulates a conversation between two AI Personas to refine ideas before output.";
          case NodeType.MULTI_CHECK: return "Runs the check against multiple AI providers simultaneously for robust consensus.";
          case NodeType.ROUTER: return "Evaluates a condition using AI and returns TRUE or FALSE.";
          case NodeType.ARCHITECT: return "Analyzes requirements and creates a structured plan for downstream nodes.";
          case NodeType.GIT_CONTROL: return "Manages version control operations (Commit, Push) via the Local Bridge.";
          case NodeType.PROJECT_INDEX: return "Scans the local directory via Bridge and lists files. Feed this into the Architect so it knows the project structure.";
          case NodeType.TASK_ITERATOR: return "Takes a JSON plan from the Architect and executes the downstream nodes once for each task in the list.";
          default: return "Configure the settings above to control this node.";
      }
  };

  const getProviderHint = (provider: string) => {
      switch(provider) {
          case 'gemini': return "Massive Context Window. Ideal for analyzing large files or entire projects at once.";
          case 'deepseek': return "Coding Specialist. Highly optimized for complex logic and reasoning tasks.";
          case 'qwen': return "Math & Logic Powerhouse. Excellent reasoning capabilities, often rivaling top-tier models.";
          case 'openai': return "The Standard. Reliable instruction following and versatile general knowledge.";
          default: return "";
      }
  };
  
  // Render Warning if Bridge is disabled but node needs it
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

  // --------------------

  // Render check results
  const renderCheckResults = (output: string) => {
      try {
          const issues = JSON.parse(output);
          if (!Array.isArray(issues)) throw new Error("Not an array");
          if (issues.length === 0) {
              return (
                  <div className="flex flex-col items-center justify-center h-full text-green-400">
                      <CheckCircle2 className="w-12 h-12 mb-2" />
                      <p>No issues found!</p>
                  </div>
              )
          }
          const highCount = issues.filter((i: any) => i.severity === 'High').length;
          return (
              <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
                     <span className="text-xs text-gray-400 font-medium">{issues.length} Issues Found ({highCount} High)</span>
                     {onAutoFix && issues.length > 0 && (
                        <button 
                            onClick={() => onAutoFix(node.id)}
                            className="flex items-center gap-1.5 px-2 py-1 bg-green-700 hover:bg-green-600 text-white rounded text-xs font-bold transition-colors"
                        >
                            <Wrench className="w-3 h-3" />
                            Auto-Fix
                        </button>
                     )}
                  </div>
                  <div className="flex flex-col gap-2 p-2 bg-gray-950 overflow-y-auto flex-1">
                    {issues.map((issue: any, idx: number) => (
                        <div key={idx} className="p-3 bg-gray-800 rounded border border-gray-700 flex gap-3">
                            <div className="shrink-0 pt-0.5">
                                {issue.severity === 'High' ? <AlertCircle className="w-5 h-5 text-red-500" /> :
                                issue.severity === 'Medium' ? <AlertTriangle className="w-5 h-5 text-yellow-500" /> :
                                <Info className="w-5 h-5 text-blue-500" />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                        issue.severity === 'High' ? 'bg-red-900/50 text-red-400' :
                                        issue.severity === 'Medium' ? 'bg-yellow-900/50 text-yellow-400' :
                                        'bg-blue-900/50 text-blue-400'
                                    }`}>{issue.severity}</span>
                                    {issue.line && <span className="text-xs text-gray-500">Line {issue.line}</span>}
                                </div>
                                <p className="text-sm text-gray-200 font-medium mb-1">{issue.issue}</p>
                                <p className="text-xs text-gray-400">{issue.suggestion}</p>
                            </div>
                        </div>
                    ))}
                  </div>
              </div>
          );
      } catch (e) {
          return (
            <Editor
                height="100%"
                defaultLanguage="markdown"
                value={output}
                theme="vs-dark"
                options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, wordWrap: 'on' }}
            />
          );
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

        {/* AI Configuration (Rich Feature: Provider Selection) */}
        {isGenerative && (
            <div className="space-y-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
                 {/* Provider Select - Hidden for Multi-Check as it selects many */}
                 {node.type !== NodeType.MULTI_CHECK && (
                     <div className="space-y-2">
                         <label className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                            <Server className="w-3.5 h-3.5" />
                            AI Provider
                         </label>
                         <select 
                            value={node.data.provider || ''}
                            onChange={(e) => {
                                const val = e.target.value as AIProvider | '';
                                // When provider changes, clear specific model override to avoid mismatch
                                onUpdateNode(node.id, { provider: val || undefined, model: undefined });
                            }}
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                         >
                             <option value="">Use Global Default ({aiSettings.provider})</option>
                             <option value="gemini">Google Gemini</option>
                             <option value="deepseek">DeepSeek</option>
                             <option value="qwen">Qwen (Alibaba)</option>
                             <option value="openai">OpenAI / Compatible</option>
                         </select>
                     </div>
                 )}

                 {/* Model Select */}
                 {node.type !== NodeType.MULTI_CHECK && (
                     <div className="space-y-2">
                         <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5" />
                            Model
                         </label>
                         <select 
                            value={node.data.model || ''}
                            onChange={(e) => onUpdateNode(node.id, { model: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                         >
                             <option value="">Default Provider Model</option>
                             {availableModels.map(m => (
                                 <option key={m.value} value={m.value}>{m.label}</option>
                             ))}
                         </select>
                     </div>
                 )}

                 {/* Gemini Grounding */}
                 {node.type === NodeType.GEMINI_GENERATE && activeProvider === 'gemini' && (
                     <div className="flex items-center justify-between pt-2">
                         <div className="flex items-center gap-2">
                             <Globe className="w-4 h-4 text-blue-400" />
                             <span className="text-xs text-gray-300">Google Search Grounding</span>
                         </div>
                         <input 
                            type="checkbox" 
                            checked={node.data.useSearch || false}
                            onChange={(e) => onUpdateNode(node.id, { useSearch: e.target.checked })}
                            className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500/20" 
                        />
                     </div>
                 )}
            </div>
        )}

        {/* AI DEBATE CONFIG */}
        {node.type === NodeType.AI_DEBATE && (
            <div className="space-y-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-pink-400 uppercase tracking-wider flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" />
                        Personas
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <input 
                           type="text" 
                           placeholder="Persona A (e.g. Architect)"
                           value={node.data.personaA || ''}
                           onChange={(e) => onUpdateNode(node.id, { personaA: e.target.value })}
                           className="bg-gray-800 border border-gray-700 rounded p-2 text-xs"
                        />
                        <input 
                           type="text" 
                           placeholder="Persona B (e.g. Security)"
                           value={node.data.personaB || ''}
                           onChange={(e) => onUpdateNode(node.id, { personaB: e.target.value })}
                           className="bg-gray-800 border border-gray-700 rounded p-2 text-xs"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-pink-400 uppercase tracking-wider">Rounds</label>
                    <input 
                        type="number" 
                        min="1" 
                        max="5"
                        value={node.data.debateRounds || 2}
                        onChange={(e) => onUpdateNode(node.id, { debateRounds: parseInt(e.target.value) })}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                    />
                </div>
            </div>
        )}

        {/* MULTI CHECK CONFIG */}
        {node.type === NodeType.MULTI_CHECK && (
            <div className="space-y-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
                <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" />
                    Active Providers
                </label>
                <div className="space-y-2">
                    {['gemini', 'deepseek', 'qwen', 'openai'].map((p) => (
                        <label key={p} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                            <input 
                                type="checkbox"
                                checked={node.data.enabledProviders?.includes(p as AIProvider) || false}
                                onChange={(e) => {
                                    const current = node.data.enabledProviders || [];
                                    const next = e.target.checked 
                                        ? [...current, p as AIProvider]
                                        : current.filter(cp => cp !== p);
                                    onUpdateNode(node.id, { enabledProviders: next });
                                }}
                                className="rounded bg-gray-700 border-gray-600 text-indigo-500 focus:ring-indigo-500/20"
                            />
                            <span className="capitalize">{p}</span>
                        </label>
                    ))}
                </div>
                <p className="text-[10px] text-gray-500">Selected providers will run in parallel. Ensure keys are set in settings.</p>
            </div>
        )}

        {/* LOOP NODE CONFIG */}
        {node.type === NodeType.LOOP && (
            <div className="space-y-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
                        <Repeat className="w-3.5 h-3.5" />
                        Max Retries
                    </label>
                    <div className="flex items-center gap-3">
                         <input 
                            type="range" 
                            min="1" 
                            max="10" 
                            value={node.data.maxIterations || 3}
                            onChange={(e) => onUpdateNode(node.id, { maxIterations: parseInt(e.target.value) })}
                            className="flex-1 accent-violet-500 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-sm font-mono w-6 text-center">{node.data.maxIterations || 3}</span>
                    </div>
                    <div className="mt-2 text-[10px] text-gray-400 bg-gray-800 p-2 rounded border border-gray-700">
                        <span className="font-bold text-violet-400">Logic:</span> If input check fails, this node will 
                        use AI to fix the code using the issue report, then update the upstream code and retry.
                        <br/>
                        <span className="text-gray-500 mt-1 block">Requires: 1 Code Input + 1 Check Input</span>
                    </div>
                </div>
            </div>
        )}

        {/* GIT_CONTROL Config */}
        {node.type === NodeType.GIT_CONTROL && (
            <div className="space-y-4 p-4 bg-orange-900/20 border border-orange-800/50 rounded-lg">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-orange-400 uppercase tracking-wider">Command</label>
                    <select 
                        value={node.data.gitCommand || 'status'}
                        onChange={(e) => onUpdateNode(node.id, { gitCommand: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white"
                    >
                        <option value="status">Status</option>
                        <option value="add">Add All (git add .)</option>
                        <option value="commit">Commit</option>
                        <option value="push">Push</option>
                        <option value="log">Log</option>
                    </select>
                </div>
                
                {node.data.gitCommand === 'status' && (
                     <div className="flex items-center gap-2 mt-2">
                        <input 
                            type="checkbox" 
                            checked={node.data.gitStopOnDirty || false}
                            onChange={(e) => onUpdateNode(node.id, { gitStopOnDirty: e.target.checked })}
                            className="rounded bg-gray-700 border-gray-600 text-orange-500"
                        />
                        <span className="text-xs text-orange-300">Stop workflow if dirty</span>
                    </div>
                )}

                {node.data.gitCommand === 'commit' && (
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-orange-400 uppercase tracking-wider">Message</label>
                        <input 
                            type="text"
                            placeholder="Commit message..."
                            value={node.data.gitMessage || ''}
                            onChange={(e) => onUpdateNode(node.id, { gitMessage: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                        />
                    </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                    <input 
                        type="checkbox" 
                        checked={node.data.useLocalBridge || true}
                        disabled
                        className="rounded bg-gray-700 border-gray-600 text-orange-500"
                    />
                    <span className="text-xs text-gray-400">Always uses Local Bridge</span>
                </div>
            </div>
        )}

        {/* READ_FILE Config */}
        {node.type === NodeType.READ_FILE && (
            <div className="space-y-4">
                {aiSettings.localBridgeEnabled && (
                    <div className="space-y-2 pb-2 border-b border-gray-700">
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="localRead"
                                checked={node.data.useLocalBridge || false}
                                onChange={(e) => onUpdateNode(node.id, { useLocalBridge: e.target.checked })}
                            />
                            <label htmlFor="localRead" className="text-xs text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer">
                                <Network className="w-3 h-3" /> Read from Local Path
                            </label>
                        </div>
                        {node.data.useLocalBridge && (
                            <div className="space-y-1">
                                <input 
                                    type="text"
                                    placeholder="/path/to/file.txt"
                                    value={node.data.localPath || ''}
                                    onChange={(e) => onUpdateNode(node.id, { localPath: e.target.value })}
                                    className="w-full bg-gray-800 border border-indigo-900/50 rounded p-2 text-sm font-mono focus:ring-1 focus:ring-indigo-500"
                                />
                                <p className="text-[10px] text-gray-500">Leave blank to auto-read from Task Iterator.</p>
                            </div>
                        )}
                    </div>
                )}

                {!node.data.useLocalBridge && (
                    <div className="p-4 bg-gray-800 border-2 border-dashed border-gray-700 rounded-lg text-center hover:border-blue-500 transition-colors">
                        <label className="cursor-pointer block">
                            <FolderOpen className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                            <span className="text-sm font-medium text-gray-300">
                                {node.data.label !== 'Read File' ? node.data.label : 'Select Local File (Browser Upload)'}
                            </span>
                            <input type="file" className="hidden" onChange={handleFileUpload} />
                        </label>
                    </div>
                )}
            </div>
        )}

        {/* WRITE_FILE Config */}
        {node.type === NodeType.WRITE_FILE && (
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-red-300 uppercase tracking-wider flex items-center gap-2">
                        <Save className="w-3.5 h-3.5" /> Output Path
                    </label>
                    <input 
                        type="text"
                        placeholder="/path/to/output_file.ext"
                        value={node.data.localPath || ''}
                        onChange={(e) => onUpdateNode(node.id, { localPath: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm font-mono"
                    />
                </div>
                
                {aiSettings.localBridgeEnabled ? (
                    <div className="flex items-center gap-2 p-2 bg-indigo-900/20 rounded border border-indigo-900/50">
                        <input 
                            type="checkbox" 
                            id="localWrite"
                            checked={node.data.useLocalBridge || true} // Default true if bridge enabled
                            onChange={(e) => onUpdateNode(node.id, { useLocalBridge: e.target.checked })}
                        />
                        <label htmlFor="localWrite" className="text-xs text-indigo-300 cursor-pointer">Write to real disk via Bridge</label>
                    </div>
                ) : (
                    <div className="p-2 bg-yellow-900/20 text-yellow-500 text-xs rounded border border-yellow-900/50">
                        Local Bridge disabled. File write will be simulated.
                    </div>
                )}

                <div className="mt-4 space-y-2 flex flex-col h-40">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Content Override (Optional)</label>
                    <div className="flex-1 border border-gray-700 rounded overflow-hidden">
                        <Editor
                            height="100%"
                            defaultLanguage="text"
                            value={node.data.code || ''}
                            onChange={(value) => onUpdateNode(node.id, { code: value })}
                            theme="vs-dark"
                            options={{ minimap: { enabled: false }, fontSize: 13 }}
                        />
                    </div>
                </div>
            </div>
        )}

        {/* Specific Inputs (Python, Shell, VSCode, Diff, Todo) */}
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

        {node.type === NodeType.SHELL_EXEC && (
            <div className="space-y-4">
                {aiSettings.localBridgeEnabled && (
                    <div className="flex items-center gap-2 p-2 bg-indigo-900/20 rounded border border-indigo-900/50 mb-2">
                        <input 
                            type="checkbox" 
                            id="localShell" 
                            checked={node.data.useLocalBridge || false}
                            onChange={(e) => onUpdateNode(node.id, { useLocalBridge: e.target.checked })}
                        />
                        <label htmlFor="localShell" className="text-xs text-indigo-300 font-bold uppercase tracking-wider cursor-pointer flex items-center gap-2">
                            <Network className="w-3 h-3" /> Run on Host (Real)
                        </label>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        id="aiSim" 
                        checked={!node.data.useLocalBridge && (node.data.useAiSimulation ?? true)}
                        disabled={node.data.useLocalBridge}
                        onChange={(e) => onUpdateNode(node.id, { useAiSimulation: e.target.checked })}
                    />
                    <label htmlFor="aiSim" className={`text-xs ${node.data.useLocalBridge ? 'text-gray-600' : 'text-gray-400'} cursor-pointer`}>Simulate in Browser (AI)</label>
                </div>
                <div className="space-y-2 flex flex-col h-48">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Command</label>
                    <div className="flex-1 border border-gray-700 rounded overflow-hidden">
                        <Editor
                            height="100%"
                            defaultLanguage="shell"
                            value={node.data.prompt || ''}
                            onChange={(value) => onUpdateNode(node.id, { prompt: value })}
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
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Target Path (optional)"
                            className="bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-xs w-32"
                            value={targetDiffPath}
                            onChange={(e) => setTargetDiffPath(e.target.value)}
                        />
                        <button 
                            onClick={handleMergeDiff}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-0.5 rounded text-xs flex items-center gap-1"
                            title="Write Modified to Disk"
                        >
                            <ArrowRightLeft className="w-3 h-3" /> Merge
                        </button>
                    </div>
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

        {/* Standard Editor for Prompts (Generative Nodes) */}
        {isGenerative && (
             <div className="space-y-2 flex flex-col h-64">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                   {node.type === NodeType.GEMINI_CHECK ? 'Check Criteria' : 
                    node.type === NodeType.LOOP ? 'Fix Instructions (Optional)' : 
                    node.type === NodeType.AI_DEBATE ? 'Debate Topic' :
                    node.type === NodeType.MULTI_CHECK ? 'Instruction for All Providers' :
                    node.type === NodeType.ROUTER ? 'Condition (e.g. Is code correct?)' :
                    node.type === NodeType.ARCHITECT ? 'Project Requirements' :
                    'Prompt / Instructions'}
                </label>
                <div className="flex-1 border border-gray-700 rounded overflow-hidden">
                    <Editor
                        height="100%"
                        defaultLanguage={getLanguage(false)}
                        value={node.data.prompt || ''}
                        onChange={(value) => onUpdateNode(node.id, { prompt: value })}
                        theme="vs-dark"
                        options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on' }}
                    />
                </div>
             </div>
        )}

        {/* NOTE Node */}
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

        {/* Output Display Section */}
        {node.data.output && (
          <div className="space-y-2 flex flex-col h-80 border-t border-gray-800 pt-4 animate-in fade-in">
            <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-green-500 uppercase tracking-wider flex items-center gap-2">
                    Result
                    {isRefining && <span className="text-gray-400 font-normal normal-case animate-pulse">Refining...</span>}
                </label>
                <div className="flex items-center gap-1">
                    {/* Single File Actions */}
                    {!hasMultipleFiles && (
                         <button 
                            onClick={() => {
                                const content = node.data.output || '';
                                const fileName = `output-${node.id}.txt`;
                                handleDownloadFile(fileName, content);
                            }}
                            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 bg-gray-800 px-2 py-1 rounded border border-gray-700 hover:border-gray-500 transition-colors"
                            title="Download Output"
                         >
                             <Download className="w-3 h-3" />
                         </button>
                    )}
                    {/* Active Tab Actions */}
                    {hasMultipleFiles && activeFile && (
                        <button 
                            onClick={() => {
                                const content = node.data.files?.[activeFile] || '';
                                handleDownloadFile(activeFile, content);
                            }}
                            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 bg-gray-800 px-2 py-1 rounded border border-gray-700 hover:border-gray-500 transition-colors"
                            title={`Download ${activeFile}`}
                        >
                            <Download className="w-3 h-3" />
                        </button>
                    )}

                    <button 
                        onClick={() => {
                            const content = hasMultipleFiles && activeFile ? node.data.files?.[activeFile] : node.data.output;
                            navigator.clipboard.writeText(content || '');
                        }}
                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1 bg-gray-800 px-2 py-1 rounded border border-gray-700 hover:border-gray-500 transition-colors"
                        title="Copy to Clipboard"
                    >
                        <Copy className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Refinement Input */}
            {isGenerative && onRefineNode && node.type !== NodeType.ROUTER && (
                <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700 flex gap-2">
                     <input 
                        type="text" 
                        className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none"
                        placeholder="Refine instruction..."
                        value={refinementInput}
                        onChange={(e) => setRefinementInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                     />
                     <button 
                        onClick={handleRefine}
                        disabled={isRefining || !refinementInput.trim()}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs"
                     >
                        <Wand2 className="w-3 h-3" />
                     </button>
                </div>
            )}

            {/* File Tabs - IDE Style */}
            {hasMultipleFiles && (
                <div className="flex overflow-x-auto gap-0.5 border-b border-gray-700 bg-gray-950">
                    {Object.keys(node.data.files!).map(fname => (
                        <button
                            key={fname}
                            onClick={() => setActiveFile(fname)}
                            className={`px-3 py-2 text-xs font-mono flex items-center gap-2 transition-colors border-r border-gray-800 min-w-[100px] max-w-[180px] ${
                                activeFile === fname 
                                ? 'bg-gray-800 text-white border-t-2 border-t-blue-500' 
                                : 'bg-gray-900 text-gray-500 hover:bg-gray-850 hover:text-gray-300'
                            }`}
                            title={fname}
                        >
                            {getFileIcon(fname)}
                            <span className="truncate">{fname}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Editor Output */}
            <div className={`flex-1 border-x border-b border-gray-700 rounded-b overflow-hidden relative group ${!hasMultipleFiles ? 'border-t rounded-t' : ''}`}>
                 {node.type === NodeType.DIFF ? (
                     <DiffEditor 
                        height="100%"
                        original={node.data.diffOriginal || ""}
                        modified={node.data.diffModified || ""}
                        language="python"
                        theme="vs-dark"
                        options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12 }}
                     />
                 ) : node.type === NodeType.GEMINI_CHECK ? (
                    renderCheckResults(node.data.output || "")
                 ) : (
                    <Editor
                        height="100%"
                        defaultLanguage={getLanguage(true, activeFile || undefined)}
                        value={hasMultipleFiles && activeFile ? node.data.files?.[activeFile] : node.data.output}
                        theme="vs-dark"
                        options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, wordWrap: 'on' }}
                    />
                 )}
            </div>
            
            {/* Grounding Sources */}
            {node.data.groundingSources && (
                <div className="bg-gray-800 border border-gray-700 rounded p-2">
                    <div className="text-[10px] font-bold text-blue-400 mb-1">Sources</div>
                    {node.data.groundingSources.map((s, i) => (
                        <a key={i} href={s.uri} target="_blank" className="block text-[10px] text-gray-400 hover:text-blue-300 truncate">{s.title}</a>
                    ))}
                </div>
            )}
          </div>
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
                        {isGenerative && (
                            <div className="pt-2 border-t border-gray-700/50">
                                <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                    <Sparkles className="w-3 h-3" />
                                    Provider Power: <span className="text-white capitalize">{activeProvider}</span>
                                </span>
                                <p className="text-xs text-gray-400 leading-relaxed italic">
                                    {getProviderHint(activeProvider)}
                                </p>
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