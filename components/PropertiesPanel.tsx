

import React, { useState, useEffect } from 'react';
import { Node, NodeType, NodeShape, AISettings, AIProvider } from '../types';
import { X, Copy, Trash2, Maximize2, Square, Circle, RectangleHorizontal, Monitor, Terminal, FileText, ChevronDown, Sparkles, Wand2, AlertTriangle, AlertCircle, Info, CheckCircle2, Bot, Brain, Globe, ExternalLink, Wrench, Server, Zap, Lightbulb, BookOpen, Download, FileCode, FileJson, FileType, Code2 } from 'lucide-react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { GEMINI_MODELS, DEEPSEEK_MODELS, QWEN_MODELS, OPENAI_MODELS } from '../constants';

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

  const currentShape = node.data.shape || 'rectangle';
  const hasMultipleFiles = node.data.files && Object.keys(node.data.files).length > 0;
  const isGenerative = [NodeType.GEMINI_GENERATE, NodeType.GEMINI_CHECK, NodeType.AI_UNIT_TEST, NodeType.SIMULATE_RUN].includes(node.type);

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
                 {/* Provider Select */}
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

                 {/* Model Select */}
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
                <div className="flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        id="aiSim" 
                        checked={node.data.useAiSimulation ?? true}
                        onChange={(e) => onUpdateNode(node.id, { useAiSimulation: e.target.checked })}
                    />
                    <label htmlFor="aiSim" className="text-xs text-gray-400 cursor-pointer">Simulate in Browser (AI)</label>
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
                <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Original Text (Optional)</label>
                <div className="flex-1 border border-gray-700 rounded overflow-hidden">
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
                   {node.type === NodeType.GEMINI_CHECK ? 'Check Criteria' : 'Prompt / Instructions'}
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
            {isGenerative && onRefineNode && (
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