import React, { useState, useCallback } from 'react';
import Canvas from './components/Canvas';
import Sidebar from './components/Sidebar';
import PropertiesPanel from './components/PropertiesPanel';
import { Node, Edge, INITIAL_NODES, INITIAL_EDGES, NodeType } from './types';
import { executeNode } from './services/workflowEngine';
import { Box, Code2, MousePointer2, Move, ZoomIn } from 'lucide-react';

export default function App() {
  const [nodes, setNodes] = useState<Node[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<Edge[]>(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // --- Node Operations ---

  const handleAddNode = (type: NodeType) => {
    const id = `${type.toLowerCase()}-${Date.now()}`;
    // Simple grid placement logic or center of screen
    const newNode: Node = {
      id,
      type,
      position: { x: 300 + Math.random() * 50, y: 300 + Math.random() * 50 },
      data: {
        label: type === NodeType.GEMINI_GENERATE ? 'AI Generate' : 
               type === NodeType.GEMINI_CHECK ? 'AI Check' : 
               type === NodeType.SIMULATE_RUN ? 'Run Simulation' : 
               type === NodeType.VS_CODE ? 'Open VS Code' : 'Note',
        status: 'idle',
        prompt: type === NodeType.GEMINI_GENERATE ? 'Write code to...' :
                type === NodeType.GEMINI_CHECK ? 'Check for security flaws.' : 
                type === NodeType.VS_CODE ? '' : ''
      }
    };
    setNodes([...nodes, newNode]);
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

  // --- Execution Engine ---

  const handleRunWorkflow = async () => {
    if (isExecuting) return;
    setIsExecuting(true);

    // Reset statuses
    setNodes(prev => prev.map(n => ({ 
        ...n, 
        data: { ...n.data, status: 'idle', output: undefined, errorMessage: undefined } 
    })));

    try {
      // 1. Identify start nodes (triggers)
      const startNodes = nodes.filter(n => n.type === NodeType.TRIGGER);
      if (startNodes.length === 0) throw new Error("No Start Trigger found.");

      // 2. Simple Topological Execution (BFS)
      // For a real engine, we'd do a topological sort. 
      // Here, we use a queue to process nodes level by level.
      const queue = [...startNodes];
      const visited = new Set<string>();
      const executed = new Set<string>();

      while (queue.length > 0) {
        const currentNode = queue.shift()!;
        if (executed.has(currentNode.id)) continue;

        // Check if all parents have executed
        const parents = edges
            .filter(e => e.target === currentNode.id)
            .map(e => e.source);
        
        const allParentsExecuted = parents.every(pid => executed.has(pid));
        
        if (!allParentsExecuted && parents.length > 0) {
            // Re-queue to end if waiting for dependencies
            queue.push(currentNode);
            // Safety break for cycles could be added here
            continue; 
        }

        // Execute current node
        // We pass a state setter wrapper to allow the service to update React state
        await executeNode(currentNode, nodes, edges, (id, data) => {
           setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n));
        });
        
        executed.add(currentNode.id);
        visited.add(currentNode.id);

        // Add children to queue
        const childrenEdges = edges.filter(e => e.source === currentNode.id);
        childrenEdges.forEach(e => {
            const childNode = nodes.find(n => n.id === e.target);
            if (childNode && !visited.has(childNode.id)) {
                queue.push(childNode);
            }
        });
        
        // Small delay for visual effect
        await new Promise(r => setTimeout(r, 600));
      }

    } catch (error: any) {
      console.error("Workflow halted:", error);
      alert("Workflow Error: " + error.message);
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
                />
                
                {/* Empty State Helper */}
                {nodes.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-gray-700 text-center">
                            <Code2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-medium">Drag nodes from the sidebar to start</p>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Status Bar */}
            <div className="h-8 bg-gray-900 border-t border-gray-800 flex items-center px-4 gap-6 text-[11px] text-gray-500 select-none z-30 shrink-0">
                <div className="flex items-center gap-1.5">
                    <MousePointer2 className="w-3 h-3 opacity-70" />
                    <span>Select Node</span>
                </div>
                 <div className="flex items-center gap-1.5">
                    <Move className="w-3 h-3 opacity-70" />
                    <span>Pan: Shift + Drag / Middle Click</span>
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
      </div>
    </div>
  );
}