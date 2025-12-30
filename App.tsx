
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Canvas from './components/Canvas';
import Sidebar from './components/Sidebar';
import PropertiesPanel from './components/PropertiesPanel';
import JsonViewModal from './components/JsonViewModal';
import { Node, Edge, INITIAL_NODES, INITIAL_EDGES, NodeType, AISettings } from './types';
import { executeNode } from './services/workflowEngine';
import { refineCode } from './services/geminiService';
import { parseOutputToFiles } from './services/fileParsingService';
import { Box, Code2, MousePointer2, Move, ZoomIn, CheckCircle2, AlertCircle, Save, FolderOpen, Download, Trash, LayoutTemplate, X, FileJson, Settings, Key } from 'lucide-react';
import { APP_TEMPLATES, Template } from './data/templates';

export default function App() {
  // Initialize with empty first, we will load inside useEffect
  const [nodes, setNodes] = useState<Node[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<Edge[]>(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false); // Track if initial load is done
  const [showTemplates, setShowTemplates] = useState(false);
  const [showJsonView, setShowJsonView] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // AI Settings
  const [aiSettings, setAiSettings] = useState<AISettings>({
      provider: 'gemini',
      geminiKey: process.env.API_KEY || '',
      deepseekKey: process.env.DEEPSEEK_API_KEY || '',
      deepseekModel: 'deepseek-coder'
  });

  // Hidden file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Persistence Logic ---

  // 1. Load from LocalStorage on Mount
  useEffect(() => {
    // Load Workflow
    const savedData = localStorage.getItem('flowgen-workflow-autosave');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
           setNodes(parsed.nodes);
           setEdges(parsed.edges);
           console.log("Restored session from LocalStorage");
        }
      } catch (e) {
        console.error("Failed to parse autosave", e);
      }
    }

    // Load Settings
    const savedSettings = localStorage.getItem('flowgen-ai-settings');
    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            // Merge with default to ensure new keys exist
            setAiSettings(prev => ({...prev, ...parsed}));
        } catch(e) {}
    }

    setIsLoaded(true);
  }, []);

  // 2. Auto-Save to LocalStorage on Change (Debounced)
  useEffect(() => {
    if (!isLoaded) return; // Don't overwrite with empty state before loading

    const timeoutId = setTimeout(() => {
      const state = { nodes, edges, timestamp: Date.now() };
      localStorage.setItem('flowgen-workflow-autosave', JSON.stringify(state));
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, isLoaded]);

  // Save Settings when Changed
  useEffect(() => {
      if(isLoaded) {
          localStorage.setItem('flowgen-ai-settings', JSON.stringify(aiSettings));
      }
  }, [aiSettings, isLoaded]);

  // --- File Operations ---

  const handleExport = () => {
    const dataStr = JSON.stringify({ nodes, edges, version: 1 }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flowgen-workflow-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setToast({ message: "Workflow saved to file.", type: 'success' });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (!parsed.nodes || !parsed.edges) {
             throw new Error("Invalid file format: Missing nodes or edges");
        }

        setNodes(parsed.nodes);
        setEdges(parsed.edges);
        setToast({ message: "Workflow loaded successfully.", type: 'success' });
        
        // Reset input so same file can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err: any) {
        setToast({ message: `Failed to load file: ${err.message}`, type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const handleClearCanvas = () => {
    if (window.confirm("Are you sure you want to clear the canvas? This cannot be undone.")) {
      setNodes([]);
      setEdges([]);
      setSelectedNodeId(null);
      setToast({ message: "Canvas cleared.", type: 'info' });
    }
  };
  
  const handleLoadTemplate = (template: Template) => {
      if (window.confirm(`Load "${template.name}"? This will replace your current workflow.`)) {
          setNodes(template.nodes);
          setEdges(template.edges);
          setShowTemplates(false);
          setToast({ message: `Loaded ${template.name}`, type: 'success' });
      }
  };

  const handleDownloadTemplate = (template: Template) => {
      const dataStr = JSON.stringify({ nodes: template.nodes, edges: template.edges, version: 1 }, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `template-${template.name.toLowerCase().replace(/\s+/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setToast({ message: `Downloaded template: ${template.name}`, type: 'success' });
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // --- Node Operations ---

  const handleAddNode = (type: NodeType, position?: { x: number; y: number }) => {
    const id = `${type.toLowerCase()}-${Date.now()}`;
    const pos = position || { x: 300 + Math.random() * 50, y: 300 + Math.random() * 50 };
    const defaultShape = type === NodeType.NOTE ? 'rectangle' : 'square';

    const newNode: Node = {
      id,
      type,
      position: pos,
      data: {
        label: type === NodeType.GEMINI_GENERATE ? 'AI Generate' : 
               type === NodeType.GEMINI_CHECK ? 'AI Check' : 
               type === NodeType.SIMULATE_RUN ? 'Run Simulation' : 
               type === NodeType.PYTHON_EXEC ? 'Python Runner' :
               type === NodeType.VS_CODE ? 'Open VS Code' : 
               type === NodeType.TODO_LIST ? 'Task List' :
               type === NodeType.TRIGGER ? 'Manual Trigger' : 
               type === NodeType.SHELL_EXEC ? 'Shell Cmd' : 'Note',
        status: 'idle',
        shape: defaultShape, 
        prompt: type === NodeType.GEMINI_GENERATE ? 'Write code to...' :
                type === NodeType.GEMINI_CHECK ? 'Check for security flaws.' : 
                type === NodeType.SHELL_EXEC ? 'echo "Hello World"' :
                type === NodeType.VS_CODE ? '' : '',
        todo: type === NodeType.TODO_LIST ? '- [ ] New Task' : '',
        dependencies: ''
      }
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(id);
  };

  const handleUpdateNode = (id: string, data: any) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n));
  };

  const handleDeleteNode = (id: string) => {
    setNodes(nodes.filter(n => n.id !== id));
    setEdges(edges.filter(e => e.source !== id && e.target !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const handleDeleteEdge = (id: string) => {
      setEdges(prev => prev.filter(e => e.id !== id));
  };

  // --- Rich Feature: AI Refinement ---
  const handleRefineNode = async (id: string, instructions: string) => {
      const node = nodes.find(n => n.id === id);
      if (!node || !node.data.output) return;

      setToast({ message: "Refining code...", type: 'info' });
      
      try {
        handleUpdateNode(id, { status: 'running' });
        
        const refinedCode = await refineCode(node.data.output, instructions, aiSettings);
        const extractedFiles = parseOutputToFiles(refinedCode);
        
        handleUpdateNode(id, { 
            status: 'success', 
            output: refinedCode,
            files: Object.keys(extractedFiles).length > 0 ? extractedFiles : undefined
        });
        setToast({ message: "Code refined successfully.", type: 'success' });

      } catch (error: any) {
        setToast({ message: "Refinement failed: " + error.message, type: 'error' });
        handleUpdateNode(id, { status: 'error', errorMessage: error.message });
      }
  };


  // --- Execution Engine ---

  const executeGraph = async (startNodes: Node[]) => {
    setIsExecuting(true);
    let currentNodes = [...nodes];
    await runExecutionLoop(startNodes, currentNodes);
  };

  const runExecutionLoop = async (queue: Node[], currentNodes: Node[]) => {
      const visited = new Set<string>();
      const executed = new Set<string>();
      let executedCount = 0;

      while (queue.length > 0) {
        const currentNodeRef = queue.shift()!;
        const currentNode = currentNodes.find(n => n.id === currentNodeRef.id);
        if (!currentNode) continue;

        if (executed.has(currentNode.id)) continue;

        const parents = edges
            .filter(e => e.target === currentNode.id)
            .map(e => e.source);
        
        const allParentsReady = parents.every(pid => {
            const p = currentNodes.find(n => n.id === pid);
            return p && (executed.has(pid) || p.data.status === 'success');
        });
        
        if (!allParentsReady && parents.length > 0) {
             continue; 
        }

        // Execute passing aiSettings
        await executeNode(currentNode, currentNodes, edges, aiSettings, (id, data) => {
           currentNodes = currentNodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n);
           setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n));
        });
        
        executed.add(currentNode.id);
        visited.add(currentNode.id);
        executedCount++;

        const childrenEdges = edges.filter(e => e.source === currentNode.id);
        childrenEdges.forEach(e => {
            const childNode = currentNodes.find(n => n.id === e.target);
            if (childNode && !visited.has(childNode.id)) {
                queue.push(childNode);
            }
        });
        
        await new Promise(r => setTimeout(r, 600));
      }
      return executedCount;
  };

  const handleRunWorkflow = async () => {
    if (isExecuting) return;
    
    console.log("Starting full workflow...");
    setToast({ message: "Workflow Started...", type: "info" });
    
    setNodes(prev => prev.map(n => ({ ...n, data: { ...n.data, status: 'idle', errorMessage: undefined } })));
    
    setTimeout(async () => {
        try {
            const startNodes = nodes.filter(n => n.type === NodeType.TRIGGER);
            if (startNodes.length === 0) throw new Error("No Start Trigger found.");
            
            const count = await executeGraph(startNodes);
            setToast({ message: `Workflow Completed. (${count} nodes)`, type: "success" });
        } catch (error: any) {
            setToast({ message: error.message, type: "error" });
        } finally {
            setIsExecuting(false);
        }
    }, 100);
  };

  const handleRunNode = async (nodeId: string) => {
      if (isExecuting) return;
      setToast({ message: "Executing single node...", type: "info" });
      setIsExecuting(true);

      try {
          setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'idle', errorMessage: undefined } } : n));
          
          const targetNode = nodes.find(n => n.id === nodeId);
          if (!targetNode) throw new Error("Node not found");

          const parents = edges.filter(e => e.target === nodeId).map(e => nodes.find(n => n.id === e.source));
          const unreadyParents = parents.filter(p => p && p.data.status !== 'success');
          
          if (unreadyParents.length > 0) {
              throw new Error(`Cannot run node. Parent "${unreadyParents[0]?.data.label}" has not executed successfully yet.`);
          }

          let currentNodes = [...nodes];
          await executeNode(targetNode, currentNodes, edges, aiSettings, (id, data) => {
               setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n));
          });

          setToast({ message: "Node Executed.", type: "success" });

      } catch (error: any) {
          setToast({ message: error.message, type: "error" });
      } finally {
          setIsExecuting(false);
      }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-950 text-white font-sans">
        {/* Top Bar */}
        <div className="h-12 border-b border-gray-800 bg-gray-900 flex items-center px-4 justify-between z-20 shrink-0">
            <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded-lg">
                    <Box className="w-4 h-4 text-white" />
                </div>
                <h1 className="font-bold text-gray-200 tracking-tight">FlowGen AI</h1>
                <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-500 border border-gray-700">Beta</span>
            </div>
            
            {/* Header Actions */}
            <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowTemplates(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded text-xs font-medium transition-colors mr-2"
                >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    Templates
                </button>

                <div className="flex items-center gap-1 mr-4 border-r border-gray-800 pr-4">
                  <button 
                    onClick={() => setShowJsonView(true)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors" 
                    title="View & Verify JSON"
                  >
                    <FileJson className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleExport}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors" 
                    title="Save to File"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleImportClick}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors" 
                    title="Open File"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept=".json" 
                    className="hidden" 
                  />
                  <button 
                    onClick={handleClearCanvas}
                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded transition-colors" 
                    title="Clear Canvas"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <button 
                        onClick={() => setShowSettings(true)}
                        className={`flex items-center gap-2 px-2 py-1 rounded border border-gray-800 hover:bg-gray-800 transition-colors ${!aiSettings.geminiKey && !aiSettings.deepseekKey ? 'text-red-400 border-red-900/50' : ''}`}
                    >
                         <div className={`w-2 h-2 rounded-full ${(aiSettings.geminiKey || aiSettings.deepseekKey) ? 'bg-green-500' : 'bg-red-500'}`}></div>
                         <span>{aiSettings.provider === 'gemini' ? 'Gemini' : 'DeepSeek'}</span>
                         <Settings className="w-3.5 h-3.5 ml-1" />
                    </button>
                </div>
            </div>
        </div>

      {/* Main Content Area */}
      <div className="flex flex-1 relative overflow-hidden">
        <Sidebar 
            onAddNode={handleAddNode} 
            onRunWorkflow={handleRunWorkflow} 
            isExecuting={isExecuting} 
        />
        
        <div className="flex-1 relative flex flex-col h-full">
            <div className="flex-1 relative overflow-hidden">
                <Canvas
                nodes={nodes}
                edges={edges}
                onNodesChange={setNodes}
                onEdgesChange={setEdges}
                onSelectNode={setSelectedNodeId}
                selectedNodeId={selectedNodeId}
                addNode={handleAddNode}
                onDeleteNode={handleDeleteNode}
                onDeleteEdge={handleDeleteEdge}
                onRunNode={handleRunNode}
                />
                
                {nodes.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-gray-700 text-center">
                            <Code2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-medium">Right-click to add nodes</p>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Status Bar */}
            <div className="h-8 bg-gray-900 border-t border-gray-800 flex items-center px-4 gap-6 text-[11px] text-gray-500 select-none z-30 shrink-0">
                <div className="flex items-center gap-1.5">
                    <MousePointer2 className="w-3 h-3 opacity-70" />
                    <span>Select Node / Edge</span>
                </div>
                 <div className="flex items-center gap-1.5">
                    <Move className="w-3 h-3 opacity-70" />
                    <span>Pan: Shift + Drag</span>
                </div>
                 <div className="flex items-center gap-1.5">
                    <ZoomIn className="w-3 h-3 opacity-70" />
                    <span>Zoom: Wheel or Alt+RMB</span>
                </div>
                <div className="ml-auto text-gray-600">
                  {isLoaded ? 'Auto-save enabled' : 'Loading...'}
                </div>
            </div>
        </div>

        {selectedNode && (
          <PropertiesPanel
            node={selectedNode}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onClose={() => setSelectedNodeId(null)}
            onRefineNode={handleRefineNode}
          />
        )}

        {/* Templates Modal */}
        {showTemplates && (
            <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
                <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
                    <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <LayoutTemplate className="w-5 h-5 text-blue-500" />
                            Load Workflow Template
                        </h2>
                        <button onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                        {APP_TEMPLATES.map((t, i) => (
                            <div key={i} className="group relative flex flex-col rounded-lg bg-gray-800 border border-gray-700 transition-all hover:border-blue-500 hover:bg-gray-750">
                                <button 
                                    onClick={() => handleLoadTemplate(t)}
                                    className="flex-1 flex flex-col items-start p-4 text-left w-full"
                                >
                                    <div className="font-bold text-blue-400 mb-1 group-hover:text-blue-300">{t.name}</div>
                                    <div className="text-sm text-gray-400 leading-relaxed">{t.description}</div>
                                    <div className="mt-3 flex gap-2">
                                        {t.nodes.map(n => (
                                            <div key={n.id} className="w-2 h-2 rounded-full bg-gray-600" title={n.type}></div>
                                        ))}
                                    </div>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDownloadTemplate(t); }}
                                    className="absolute top-2 right-2 p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded transition-colors opacity-0 group-hover:opacity-100"
                                    title="Download Template JSON"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* JSON View Modal */}
        {showJsonView && (
            <JsonViewModal 
                data={{ nodes, edges, version: 1 }} 
                onClose={() => setShowJsonView(false)} 
            />
        )}

        {/* Settings Modal */}
        {showSettings && (
            <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
                <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                         <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Settings className="w-5 h-5 text-gray-400" />
                            AI Provider Settings
                        </h2>
                        <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6 space-y-6">
                        {/* Provider Select */}
                        <div className="space-y-2">
                             <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Provider</label>
                             <div className="grid grid-cols-2 gap-2">
                                 <button 
                                    onClick={() => setAiSettings(s => ({...s, provider: 'gemini'}))}
                                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                                        aiSettings.provider === 'gemini' 
                                        ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'
                                    }`}
                                 >
                                     Google Gemini
                                 </button>
                                 <button 
                                    onClick={() => setAiSettings(s => ({...s, provider: 'deepseek'}))}
                                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                                        aiSettings.provider === 'deepseek' 
                                        ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'
                                    }`}
                                 >
                                     DeepSeek
                                 </button>
                             </div>
                        </div>

                        {/* Gemini Config */}
                        {aiSettings.provider === 'gemini' && (
                             <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <Key className="w-3 h-3" /> Gemini API Key
                                </label>
                                <input 
                                    type="password"
                                    value={aiSettings.geminiKey}
                                    onChange={(e) => setAiSettings(s => ({...s, geminiKey: e.target.value}))}
                                    placeholder="AIzaSy..."
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                                <p className="text-[10px] text-gray-500">
                                    Falls back to environment variable if empty.
                                </p>
                            </div>
                        )}

                        {/* DeepSeek Config */}
                        {aiSettings.provider === 'deepseek' && (
                             <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        <Key className="w-3 h-3" /> DeepSeek API Key
                                    </label>
                                    <input 
                                        type="password"
                                        value={aiSettings.deepseekKey}
                                        onChange={(e) => setAiSettings(s => ({...s, deepseekKey: e.target.value}))}
                                        placeholder="sk-..."
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <p className="text-[10px] text-gray-500">
                                        Falls back to DEEPSEEK_API_KEY environment variable if empty.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Model</label>
                                    <select
                                        value={aiSettings.deepseekModel}
                                        onChange={(e) => setAiSettings(s => ({...s, deepseekModel: e.target.value}))}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        <option value="deepseek-coder">deepseek-coder (Recommended)</option>
                                        <option value="deepseek-chat">deepseek-chat</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-gray-950 border-t border-gray-800 flex justify-end">
                        <button 
                            onClick={() => setShowSettings(false)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Toast Notification */}
        {toast && (
            <div className={`absolute bottom-12 right-6 px-4 py-3 rounded-lg shadow-xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 z-50 ${
                toast.type === 'success' ? 'bg-green-900/90 border-green-700 text-green-100' :
                toast.type === 'error' ? 'bg-red-900/90 border-red-700 text-red-100' :
                'bg-blue-900/90 border-blue-700 text-blue-100'
            }`}>
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
                {toast.type === 'info' && <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                <span className="text-sm font-medium">{toast.message}</span>
            </div>
        )}
      </div>
    </div>
  );
}
