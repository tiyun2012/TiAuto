
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Canvas from './components/Canvas';
import Sidebar from './components/Sidebar';
import PropertiesPanel from './components/PropertiesPanel';
import JsonViewModal from './components/JsonViewModal';
import { Node, Edge, INITIAL_NODES, INITIAL_EDGES, NodeType, AISettings, AIProvider } from './types';
import { executeNode } from './services/workflowEngine';
import { refineCode } from './services/geminiService';
import { parseOutputToFiles } from './services/fileParsingService';
import { Box, Code2, MousePointer2, Move, ZoomIn, CheckCircle2, AlertCircle, Save, FolderOpen, Download, Trash, LayoutTemplate, X, FileJson, Settings, Key, Server, Link, Network } from 'lucide-react';
import { APP_TEMPLATES, Template } from './data/templates';

export default function App() {
  const [nodes, setNodes] = useState<Node[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<Edge[]>(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showJsonView, setShowJsonView] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Reference to nodes state for async access in loops
  const nodesRef = useRef(nodes);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  // Expanded AI Settings State
  const [aiSettings, setAiSettings] = useState<AISettings>({
      provider: 'gemini',
      
      geminiKey: process.env.API_KEY || '',
      
      deepseekKey: process.env.DEEPSEEK_API_KEY || '',
      deepseekModel: 'deepseek-coder',
      
      qwenKey: '',
      qwenUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      qwenModel: 'qwen-max',

      openaiKey: '',
      openaiUrl: 'https://api.openai.com/v1',
      openaiModel: 'gpt-4o',

      localBridgeEnabled: false,
      localBridgeUrl: 'http://localhost:3000'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence
  useEffect(() => {
    const savedData = localStorage.getItem('flowgen-workflow-autosave');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
           setNodes(parsed.nodes);
           setEdges(parsed.edges);
           console.log("Restored session from LocalStorage");
        }
      } catch (e) {}
    }

    const savedSettings = localStorage.getItem('flowgen-ai-settings-v2');
    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            setAiSettings(prev => ({...prev, ...parsed}));
        } catch(e) {}
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const timeoutId = setTimeout(() => {
      const state = { nodes, edges, timestamp: Date.now() };
      localStorage.setItem('flowgen-workflow-autosave', JSON.stringify(state));
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [nodes, edges, isLoaded]);

  useEffect(() => {
      if(isLoaded) {
          localStorage.setItem('flowgen-ai-settings-v2', JSON.stringify(aiSettings));
      }
  }, [aiSettings, isLoaded]);

  // File Handlers
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
    setToast({ message: "Workflow saved.", type: 'success' });
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (!parsed.nodes || !parsed.edges) throw new Error("Invalid file format");
        setNodes(parsed.nodes);
        setEdges(parsed.edges);
        setToast({ message: "Loaded successfully.", type: 'success' });
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err: any) {
        setToast({ message: `Load failed: ${err.message}`, type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const handleClearCanvas = () => {
    if (window.confirm("Clear canvas? Cannot be undone.")) {
      setNodes([]);
      setEdges([]);
      setSelectedNodeId(null);
      setToast({ message: "Canvas cleared.", type: 'info' });
    }
  };
  
  const handleLoadTemplate = (template: Template) => {
      if (window.confirm(`Load "${template.name}"? Replaces current workflow.`)) {
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
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Node Actions
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
               type === NodeType.APPROVAL ? 'Wait for Approval' :
               type === NodeType.LOOP ? 'Loop Controller' :
               type === NodeType.READ_FILE ? 'Read File' :
               type === NodeType.WRITE_FILE ? 'Write File' :
               type === NodeType.SHELL_EXEC ? 'Shell Cmd' : 'Note',
        status: 'idle',
        shape: defaultShape, 
        prompt: type === NodeType.GEMINI_GENERATE ? 'Write code to...' : '',
        todo: '',
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

  const handleRefineNode = async (id: string, instructions: string) => {
      const node = nodes.find(n => n.id === id);
      if (!node || !node.data.output) return;
      setToast({ message: "Refining code...", type: 'info' });
      try {
        handleUpdateNode(id, { status: 'running' });
        // Pass provider overrides
        const refinedCode = await refineCode(node.data.output, instructions, aiSettings, node.data.model, node.data.provider);
        const extractedFiles = parseOutputToFiles(refinedCode);
        handleUpdateNode(id, { 
            status: 'success', 
            output: refinedCode,
            files: Object.keys(extractedFiles).length > 0 ? extractedFiles : undefined
        });
        setToast({ message: "Refined successfully.", type: 'success' });
      } catch (error: any) {
        setToast({ message: "Refine failed: " + error.message, type: 'error' });
        handleUpdateNode(id, { status: 'error', errorMessage: error.message });
      }
  };

  const handleAutoFix = (checkNodeId: string) => {
    const checkNode = nodes.find(n => n.id === checkNodeId);
    if (!checkNode || !checkNode.data.output) return;
    const fixNodeId = `gen-fix-${Date.now()}`;
    const fixNode: Node = {
        id: fixNodeId,
        type: NodeType.GEMINI_GENERATE,
        position: { x: checkNode.position.x + 200, y: checkNode.position.y },
        data: {
            label: 'Auto-Fix',
            shape: 'square',
            status: 'idle',
            prompt: `I ran a check on the code and found these issues:\n\n${checkNode.data.output}\n\nPlease apply fixes to the code based on these issues.`,
            systemInstruction: "You are an automated code fixer. Fix the identified issues."
        }
    };
    const newEdge: Edge = {
        id: `e-fix-${Date.now()}`,
        source: checkNode.id,
        target: fixNode.id,
        sourceHandle: 'right',
        targetHandle: 'left'
    };
    setNodes(prev => [...prev, fixNode]);
    setEdges(prev => [...prev, newEdge]);
    setSelectedNodeId(fixNodeId);
    setToast({ message: "Created Auto-Fix Node", type: "success" });
  };

  const getDownstreamNodes = (nodeId: string, currentNodes: Node[], currentEdges: Edge[]) => {
      const downstreamIds = new Set<string>();
      const queue = [nodeId];
      
      while(queue.length > 0) {
          const current = queue.shift()!;
          const children = currentEdges.filter(e => e.source === current).map(e => e.target);
          children.forEach(child => {
              if(!downstreamIds.has(child)) {
                  downstreamIds.add(child);
                  queue.push(child);
              }
          });
      }
      return downstreamIds;
  };

  // Execution
  const executeGraph = async (startNodes: Node[], initialNodes: Node[]) => {
    setIsExecuting(true);
    // Use nodesRef.current to get the most up-to-date state for execution
    await runExecutionLoop(startNodes, initialNodes);
  };

  const runExecutionLoop = async (queue: Node[], initialNodes: Node[]) => {
      let currentNodes = [...initialNodes];
      const visited = new Set<string>();
      const executed = new Set<string>();
      
      while (queue.length > 0) {
        const currentNodeRef = queue.shift()!;
        const currentNode = currentNodes.find(n => n.id === currentNodeRef.id);
        if (!currentNode) continue;
        
        // If node already successfully executed this run, skip re-execution but check children
        if (executed.has(currentNode.id) || currentNode.data.status === 'success') {
             const childrenEdges = edges.filter(e => e.source === currentNode.id);
             childrenEdges.forEach(e => {
                 const childNode = currentNodes.find(n => n.id === e.target);
                 if (childNode && !visited.has(childNode.id)) {
                     queue.push(childNode);
                 }
             });
             continue;
        }

        const parents = edges.filter(e => e.target === currentNode.id).map(e => e.source);
        const allParentsReady = parents.every(pid => {
            const p = currentNodes.find(n => n.id === pid);
            return p && (executed.has(pid) || p.data.status === 'success');
        });
        
        if (!allParentsReady && parents.length > 0) continue;

        try {
            await executeNode(currentNode, currentNodes, edges, aiSettings, (id, data) => {
                // Update local loop state
                currentNodes = currentNodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n);
                // Update React state
                setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n));
            });
        } catch (error: any) {
             if (error.message === "LOOP_TRIGGERED") {
                 setToast({ message: "Loop Triggered: Issues found, rewinding...", type: 'info' });
                 const idleNodes = currentNodes.filter(n => n.data.status === 'idle');
                 idleNodes.forEach(n => {
                     if (!queue.find(q => q.id === n.id)) {
                         queue.unshift(n); 
                     }
                     visited.delete(n.id);
                     executed.delete(n.id);
                 });
                 continue; 
             }
             if (error.message === "WAIT_FOR_APPROVAL") {
                 setToast({ message: "Workflow Paused for Approval", type: 'info' });
                 break; 
             }
             throw error;
        }
        
        // Refetch node to check status after execution
        const executedNode = currentNodes.find(n => n.id === currentNode.id);
        
        if (executedNode?.data.status === 'success') {
            executed.add(currentNode.id);
            visited.add(currentNode.id);

            const childrenEdges = edges.filter(e => e.source === currentNode.id);
            childrenEdges.forEach(e => {
                const childNode = currentNodes.find(n => n.id === e.target);
                if (childNode && !visited.has(childNode.id)) {
                    queue.push(childNode);
                }
            });
        }
        
        await new Promise(r => setTimeout(r, 600));
      }
  };

  const handleRunWorkflow = async (resume = false) => {
    if (isExecuting) return;
    setToast({ message: resume ? "Resuming Workflow..." : "Workflow Started...", type: "info" });
    setIsExecuting(true);
    
    // 1. Reset State (if not resuming)
    if (!resume) {
        setNodes(prev => prev.map(n => ({ 
            ...n, 
            data: { 
                ...n.data, 
                status: 'idle', 
                errorMessage: undefined, 
                currentIteration: 0, 
                feedback: undefined,
                iteratorIndex: 0,
                iteratorFinished: false,
                iteratorTotal: 0
            } 
        })));
        // Allow state to settle before starting
        await new Promise(r => setTimeout(r, 100));
    }

    setTimeout(async () => {
        try {
            let activeIteratorId: string | null = null;
            let flowComplete = false;
            let cycleCount = 0;
            const MAX_CYCLES = 50; // Safety limit

            while (!flowComplete && cycleCount < MAX_CYCLES) {
                cycleCount++;
                
                // Fetch fresh state from ref at start of loop
                let currentNodes = nodesRef.current;
                let startNodes: Node[] = [];

                if (activeIteratorId) {
                    // Loop Mode: Start from the Iterator
                    
                    const downstreamIds = getDownstreamNodes(activeIteratorId, currentNodes, edges);
                    
                    // Reset downstream nodes to 'idle' so they can run again
                    setNodes(prev => prev.map(n => {
                        // Keep success/approval/architect/index history intact
                        if (n.type === NodeType.APPROVAL || n.type === NodeType.PROJECT_INDEX || n.type === NodeType.ARCHITECT) return n;
                        
                        // Reset downstream + iterator itself to idle
                        if (downstreamIds.has(n.id) || n.id === activeIteratorId) {
                            return { ...n, data: { ...n.data, status: 'idle', output: undefined, files: undefined } };
                        }
                        return n;
                    }));
                    
                    // Allow UI to update and state to settle
                    await new Promise(r => setTimeout(r, 400)); 
                    
                    // REFRESH state from ref after the wait
                    currentNodes = nodesRef.current;
                    
                    const readyIterator = currentNodes.find(n => n.id === activeIteratorId);
                    if (readyIterator) startNodes = [readyIterator];
                    
                } else {
                    // Standard Mode: Start from Triggers
                    startNodes = currentNodes.filter(n => n.type === NodeType.TRIGGER || (resume && n.type === NodeType.APPROVAL && n.data.status === 'success'));
                }

                if (startNodes.length === 0 && cycleCount === 1) throw new Error("No Start Trigger found.");
                if (startNodes.length === 0) break; 

                // Execute Graph (Linear Pass) - Pass currentNodes to ensure we use the reset state
                await executeGraph(startNodes, currentNodes);
                
                // Check if we entered an iterator phase (The "Auto" Logic)
                // We must fetch fresh state again to see if Iterator finished
                currentNodes = nodesRef.current;
                const iterator = currentNodes.find(n => n.type === NodeType.TASK_ITERATOR);
                
                if (iterator && !iterator.data.iteratorFinished && iterator.data.status === 'success') {
                    activeIteratorId = iterator.id;
                    setToast({ message: `Cycle ${iterator.data.iteratorIndex} / ${iterator.data.iteratorTotal || '?'}: Processing...`, type: 'info' });
                    // Loop continues...
                } else {
                    flowComplete = true;
                }
            }
            
            if (cycleCount >= MAX_CYCLES) setToast({ message: "Max cycles reached.", type: 'error' });
            else setToast({ message: "Workflow Completed.", type: "success" });

        } catch (error: any) {
            if (error.message !== "WAIT_FOR_APPROVAL") {
                 setToast({ message: error.message, type: "error" });
            }
        } finally {
            setIsExecuting(false);
        }
    }, 100);
  };

  const handleRunNode = async (nodeId: string, action?: string) => {
      // Special Handling for Approval Node Buttons
      if (action === 'approve' || action === 'reject') {
          if (action === 'approve') {
               handleUpdateNode(nodeId, { status: 'success' });
               // Trigger resume
               setTimeout(() => handleRunWorkflow(true), 100);
          } else {
               handleUpdateNode(nodeId, { status: 'error', errorMessage: 'Rejected by User' });
          }
          return;
      }

      if (isExecuting) return;
      setToast({ message: "Executing node...", type: "info" });
      setIsExecuting(true);
      try {
          // Reset just this node
          setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'idle', errorMessage: undefined } } : n));
          const targetNode = nodes.find(n => n.id === nodeId);
          if (!targetNode) throw new Error("Node not found");
          
          let currentNodes = [...nodes];
          await executeNode(targetNode, currentNodes, edges, aiSettings, (id, data) => {
               setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n));
          });
          setToast({ message: "Node Executed.", type: "success" });
      } catch (error: any) {
          if(error.message === "LOOP_TRIGGERED") {
              setToast({ message: "Loop triggered. Run Full Workflow to process loops.", type: "info" });
          } else if (error.message !== "WAIT_FOR_APPROVAL") {
              setToast({ message: error.message, type: "error" });
          }
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
            
            <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowTemplates(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded text-xs font-medium transition-colors mr-2"
                >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    Templates
                </button>
                <div className="flex items-center gap-1 mr-4 border-r border-gray-800 pr-4">
                  <button onClick={() => setShowJsonView(true)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded">
                    <FileJson className="w-4 h-4" />
                  </button>
                  <button onClick={handleExport} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded">
                    <Save className="w-4 h-4" />
                  </button>
                  <button onClick={handleImportClick} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded">
                    <FolderOpen className="w-4 h-4" />
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                  <button onClick={handleClearCanvas} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded">
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Visual Separator */}
                <div className="h-6 w-px bg-gray-800 mx-1"></div>

                {/* Enhanced Provider Status Button */}
                <button 
                    onClick={() => setShowSettings(true)}
                    className="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-gray-800 hover:bg-gray-800 transition-all group"
                    title="Configure AI Providers"
                >
                    <div className="flex items-center -space-x-2">
                        {/* Gemini Dot */}
                        <div className={`w-3 h-3 rounded-full border-2 border-gray-900 ${aiSettings.geminiKey ? 'bg-blue-500' : 'bg-gray-700'}`} title="Gemini"></div>
                        {/* Local Bridge Dot */}
                        <div className={`w-3 h-3 rounded-full border-2 border-gray-900 ${aiSettings.localBridgeEnabled ? 'bg-green-500' : 'bg-gray-700'}`} title="Local Bridge"></div>
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-white leading-none uppercase tracking-wider">Providers</span>
                        <span className="text-[9px] text-gray-600 group-hover:text-gray-500 leading-none mt-0.5 capitalize">Default: {aiSettings.provider}</span>
                    </div>
                    <Settings className="w-4 h-4 text-gray-500 group-hover:text-gray-300 ml-1" />
                </button>
            </div>
        </div>

      <div className="flex flex-1 relative overflow-hidden">
        <Sidebar onAddNode={handleAddNode} onRunWorkflow={() => handleRunWorkflow(false)} isExecuting={isExecuting} />
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
            <div className="h-8 bg-gray-900 border-t border-gray-800 flex items-center px-4 gap-6 text-[11px] text-gray-500 select-none z-30 shrink-0">
                <div className="flex items-center gap-1.5"><MousePointer2 className="w-3 h-3 opacity-70" /><span>Select Node</span></div>
                 <div className="flex items-center gap-1.5"><Move className="w-3 h-3 opacity-70" /><span>Pan: Shift + Drag</span></div>
                 <div className="flex items-center gap-1.5"><ZoomIn className="w-3 h-3 opacity-70" /><span>Zoom: Wheel</span></div>
                <div className="ml-auto text-gray-600">{isLoaded ? 'Auto-save enabled' : 'Loading...'}</div>
            </div>
        </div>

        {selectedNode && (
          <PropertiesPanel
            node={selectedNode}
            aiSettings={aiSettings}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onClose={() => setSelectedNodeId(null)}
            onRefineNode={handleRefineNode}
            onAutoFix={handleAutoFix}
          />
        )}

        {showTemplates && (
            <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
                <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
                    <div className="p-4 border-b border-gray-800 flex justify-between"><h2 className="text-lg font-semibold flex gap-2"><LayoutTemplate /> Templates</h2><button onClick={() => setShowTemplates(false)}><X /></button></div>
                    <div className="p-4 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                        {APP_TEMPLATES.map((t, i) => (
                            <div key={i} className="group relative flex flex-col rounded-lg bg-gray-800 border border-gray-700 hover:border-blue-500">
                                <button onClick={() => handleLoadTemplate(t)} className="flex-1 p-4 text-left"><div className="font-bold text-blue-400">{t.name}</div><div className="text-sm text-gray-400">{t.description}</div></button>
                                <button onClick={() => handleDownloadTemplate(t)} className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100"><Download className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {showJsonView && <JsonViewModal data={{ nodes, edges, version: 1 }} onClose={() => setShowJsonView(false)} />}

        {/* Enhanced Settings Modal */}
        {showSettings && (
            <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
                <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-4 border-b border-gray-800 flex justify-between">
                         <h2 className="text-lg font-semibold flex items-center gap-2"><Settings className="w-5 h-5" /> Settings</h2>
                        <button onClick={() => setShowSettings(false)}><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-6 overflow-y-auto space-y-8">
                        
                        {/* Global Default */}
                        <div className="space-y-3 pb-6 border-b border-gray-800">
                             <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Default Provider</label>
                             <div className="grid grid-cols-4 gap-2">
                                 {['gemini', 'deepseek', 'qwen', 'openai'].map((p) => (
                                     <button 
                                        key={p}
                                        onClick={() => setAiSettings(s => ({...s, provider: p as AIProvider}))}
                                        className={`p-3 rounded-lg border text-sm font-medium capitalize ${aiSettings.provider === p ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'}`}
                                     >
                                         {p}
                                     </button>
                                 ))}
                             </div>
                        </div>

                        {/* Local Bridge Config - Highlighting this for Project Management */}
                        <div className="space-y-3 pb-6 border-b border-gray-800 bg-gray-850/50 p-4 rounded-lg border border-indigo-900/30">
                            <h3 className="font-medium text-white flex items-center gap-2"><Network className="w-4 h-4 text-indigo-400" /> Local Bridge (Game Engine Mode)</h3>
                            <p className="text-xs text-gray-400">Enables Read/Write/Run on your local machine via a local server.</p>
                            
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={aiSettings.localBridgeEnabled} 
                                        onChange={(e) => setAiSettings(s => ({...s, localBridgeEnabled: e.target.checked}))}
                                        className="rounded bg-gray-700 border-gray-600 text-indigo-500 focus:ring-indigo-500/20"
                                    />
                                    Enable Bridge
                                </label>
                                <input 
                                    type="text" 
                                    value={aiSettings.localBridgeUrl} 
                                    onChange={(e) => setAiSettings(s => ({...s, localBridgeUrl: e.target.value}))} 
                                    className="flex-1 bg-gray-800 border border-gray-700 rounded p-2 text-sm" 
                                    placeholder="http://localhost:3000" 
                                />
                            </div>
                        </div>

                        {/* Gemini Config */}
                        <div className="space-y-3">
                            <h3 className="font-medium text-white flex items-center gap-2"><span className="w-2 h-6 bg-blue-500 rounded-full"></span> Google Gemini</h3>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-400">API Key</label>
                                <input type="password" value={aiSettings.geminiKey} onChange={(e) => setAiSettings(s => ({...s, geminiKey: e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm" placeholder="AIzaSy..." />
                            </div>
                        </div>

                        {/* DeepSeek Config */}
                        <div className="space-y-3">
                            <h3 className="font-medium text-white flex items-center gap-2"><span className="w-2 h-6 bg-purple-500 rounded-full"></span> DeepSeek</h3>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400">API Key</label>
                                    <input type="password" value={aiSettings.deepseekKey} onChange={(e) => setAiSettings(s => ({...s, deepseekKey: e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm" placeholder="sk-..." />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400">Model Name</label>
                                    <input type="text" value={aiSettings.deepseekModel} onChange={(e) => setAiSettings(s => ({...s, deepseekModel: e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm" />
                                </div>
                            </div>
                        </div>

                    </div>
                    <div className="p-4 bg-gray-950 border-t border-gray-800 flex justify-end">
                        <button onClick={() => setShowSettings(false)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-medium">Save & Close</button>
                    </div>
                </div>
            </div>
        )}

        {toast && (
            <div className={`absolute bottom-12 right-6 px-4 py-3 rounded-lg shadow-xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50 ${toast.type === 'success' ? 'bg-green-900/90 border-green-700' : 'bg-red-900/90 border-red-700'}`}>
                {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <span className="text-sm font-medium">{toast.message}</span>
            </div>
        )}
      </div>
    </div>
  );
}