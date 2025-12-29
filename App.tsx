import React, { useState, useCallback, useEffect } from 'react';
import Canvas from './components/Canvas';
import Sidebar from './components/Sidebar';
import PropertiesPanel from './components/PropertiesPanel';
import { Node, Edge, INITIAL_NODES, INITIAL_EDGES, NodeType } from './types';
import { executeNode } from './services/workflowEngine';
import { Box, Code2, MousePointer2, Move, ZoomIn, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [nodes, setNodes] = useState<Node[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<Edge[]>(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

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
    // Use provided position or random near center
    const pos = position || { x: 300 + Math.random() * 50, y: 300 + Math.random() * 50 };
    
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
               type === NodeType.TRIGGER ? 'Manual Trigger' : 'Note',
        status: 'idle',
        prompt: type === NodeType.GEMINI_GENERATE ? 'Write code to...' :
                type === NodeType.GEMINI_CHECK ? 'Check for security flaws.' : 
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

  // --- Execution Engine ---

  const handleRunWorkflow = async () => {
    if (isExecuting) return;
    
    console.log("Starting workflow...");
    setIsExecuting(true);
    setToast({ message: "Workflow Started...", type: "info" });

    // Reset statuses
    // Create a local copy of nodes to track state updates synchronously during execution loop
    let currentNodes = nodes.map(n => ({ 
        ...n, 
        data: { ...n.data, status: 'idle', output: undefined, errorMessage: undefined } 
    })) as Node[];

    // Sync UI with initial reset state
    setNodes(currentNodes);

    try {
      // 1. Identify start nodes (triggers)
      const startNodes = currentNodes.filter(n => n.type === NodeType.TRIGGER);
      if (startNodes.length === 0) throw new Error("No Start Trigger found. Add a Trigger node.");

      // 2. Simple Topological Execution (BFS)
      const queue = [...startNodes];
      const visited = new Set<string>();
      const executed = new Set<string>();
      let executedCount = 0;

      while (queue.length > 0) {
        const currentNodeRef = queue.shift()!;
        
        // Always fetch the freshest version of the node from our local state
        const currentNode = currentNodes.find(n => n.id === currentNodeRef.id);
        if (!currentNode) continue;

        if (executed.has(currentNode.id)) continue;

        // Check if all parents have executed
        const parents = edges
            .filter(e => e.target === currentNode.id)
            .map(e => e.source);
        
        const allParentsExecuted = parents.every(pid => executed.has(pid));
        
        if (!allParentsExecuted && parents.length > 0) {
            // Re-queue to end if waiting for dependencies
            queue.push(currentNode);
            continue; 
        }

        // Execute current node using the LOCAL currentNodes array (which contains outputs from previous steps)
        await executeNode(currentNode, currentNodes, edges, (id, data) => {
           // Update Local State (Logic)
           currentNodes = currentNodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n);
           
           // Update UI State (Visual)
           setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n));
        });
        
        executed.add(currentNode.id);
        visited.add(currentNode.id);
        executedCount++;

        // Add children to queue
        const childrenEdges = edges.filter(e => e.source === currentNode.id);
        childrenEdges.forEach(e => {
            const childNode = currentNodes.find(n => n.id === e.target);
            if (childNode && !visited.has(childNode.id)) {
                queue.push(childNode);
            }
        });
        
        // Small delay for visual effect
        await new Promise(r => setTimeout(r, 600));
      }

      setToast({ message: `Workflow Completed. (${executedCount} nodes run)`, type: "success" });

    } catch (error: any) {
      console.error("Workflow halted:", error);
      setToast({ message: error.message || "Workflow Failed", type: "error" });
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
            <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Gemini Powered</span>
                <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${process.env.API_KEY ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    {process.env.API_KEY ? 'API Connected' : 'No API Key'}
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
                />
                
                {/* Empty State Helper */}
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
                    <span>Zoom: Wheel</span>
                </div>
            </div>
        </div>

        {selectedNode && (
          <PropertiesPanel
            node={selectedNode}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onClose={() => setSelectedNodeId(null)}
          />
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