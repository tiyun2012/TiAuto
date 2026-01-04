
import React, { useRef, useState, useEffect } from 'react';
import { Node, Edge, NodeType } from '../types';
import NodeComponent from './NodeComponent';
import { Wire } from './Wire';
import { getPortPosition, NODE_DIMENSIONS } from '../constants';
import { Play, FileCode, ShieldCheck, Terminal, Laptop, StickyNote, Trash2, X, ListTodo, Binary, SquareTerminal, FlaskConical, FileDiff, ThumbsUp, Repeat, FolderOpen, Users, Layers, GitFork, Save, GitBranch, Briefcase, FileSearch, ListRestart } from 'lucide-react';

interface CanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: React.Dispatch<React.SetStateAction<Node[]>>;
  onEdgesChange: (edges: Edge[]) => void;
  onSelectNode: (nodeIds: string[]) => void;
  selectedNodeIds: string[];
  addNode: (type: NodeType, position: { x: number; y: number }) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onRunNode: (id: string, action?: string) => void;
}

// Node definitions for the picker
const NODE_OPTIONS = [
  { type: NodeType.TRIGGER, label: 'Trigger', icon: Play, desc: 'Start workflow', color: 'text-green-400' },
  { type: NodeType.ARCHITECT, label: 'Architect', icon: Briefcase, desc: 'Plan project structure', color: 'text-emerald-300' },
  { type: NodeType.TASK_ITERATOR, label: 'Task Iterator', icon: ListRestart, desc: 'Execute tasks sequentially', color: 'text-violet-300' },
  { type: NodeType.PROJECT_INDEX, label: 'Project Index', icon: FileSearch, desc: 'List files in project', color: 'text-cyan-300' },
  { type: NodeType.READ_FILE, label: 'Read File', icon: FolderOpen, desc: 'Load local content', color: 'text-blue-300' },
  { type: NodeType.WRITE_FILE, label: 'Write File', icon: Save, desc: 'Save to disk (Bridge)', color: 'text-red-300' },
  { type: NodeType.GIT_CONTROL, label: 'Git Control', icon: GitBranch, desc: 'Commit & Push', color: 'text-orange-300' },
  { type: NodeType.GEMINI_GENERATE, label: 'AI Generator', icon: FileCode, desc: 'Write code', color: 'text-purple-400' },
  { type: NodeType.AI_DEBATE, label: 'AI Debate', icon: Users, desc: 'Multi-persona discussion', color: 'text-pink-400' },
  { type: NodeType.GEMINI_CHECK, label: 'AI Security', icon: ShieldCheck, desc: 'Audit code', color: 'text-orange-400' },
  { type: NodeType.MULTI_CHECK, label: 'Group Check', icon: Layers, desc: 'Multiple AIs run in parallel', color: 'text-indigo-300' },
  { type: NodeType.LOOP, label: 'Loop Controller', icon: Repeat, desc: 'Smart Fixer (Takes 2 Inputs)', color: 'text-violet-400' },
  { type: NodeType.ROUTER, label: 'Router', icon: GitFork, desc: 'Conditional Logic (True/False)', color: 'text-yellow-200' },
  { type: NodeType.AI_UNIT_TEST, label: 'Unit Tests', icon: FlaskConical, desc: 'Generate Tests', color: 'text-cyan-400' },
  { type: NodeType.APPROVAL, label: 'Approval', icon: ThumbsUp, desc: 'Wait for Human', color: 'text-rose-400' },
  { type: NodeType.SHELL_EXEC, label: 'Shell Command', icon: SquareTerminal, desc: 'CLI Execution', color: 'text-gray-200' },
  { type: NodeType.SIMULATE_RUN, label: 'Simulator', icon: Terminal, desc: 'AI Simulated Run', color: 'text-pink-400' },
  { type: NodeType.PYTHON_EXEC, label: 'Python Runner', icon: Binary, desc: 'Executes Python in Browser', color: 'text-yellow-400' },
  { type: NodeType.DIFF, label: 'Diff Check', icon: FileDiff, desc: 'Compare node outputs', color: 'text-indigo-400' },
  { type: NodeType.TODO_LIST, label: 'Task List', icon: ListTodo, desc: 'Manual checklist', color: 'text-teal-400' },
  { type: NodeType.VS_CODE, label: 'VS Code', icon: Laptop, desc: 'Open local editor', color: 'text-blue-400' },
  { type: NodeType.NOTE, label: 'Note', icon: StickyNote, desc: 'Add comments', color: 'text-yellow-400' },
];

type ContextMenuType = 
  | { type: 'picker'; x: number; y: number }
  | { type: 'node'; id: string; x: number; y: number }
  | { type: 'edge'; id: string; x: number; y: number };

const Canvas: React.FC<CanvasProps> = ({ 
  nodes, edges, onNodesChange, onEdgesChange, onSelectNode, selectedNodeIds, addNode, onDeleteNode, onDeleteEdge, onRunNode 
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Viewport State
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  
  // Refs for tracking mutable interaction state
  const viewRef = useRef(view);
  const nodesRef = useRef(nodes);
  const selectedNodeIdsRef = useRef(selectedNodeIds);
  
  // Interaction State
  const dragRef = useRef({
      isPanning: false,
      isDraggingNodes: false,
      isSelecting: false,
      isConnecting: false,
      lastMouse: { x: 0, y: 0 },
      selectionStart: { x: 0, y: 0 },
      connectionStart: null as { nodeId: string, handle: string } | null,
  });

  const [selectionBox, setSelectionBox] = useState<{start: {x:number, y:number}, end: {x:number, y:number}} | null>(null);
  const [dragEdge, setDragEdge] = useState<{start: {x:number, y:number, side?: any}, end: {x:number, y:number, side?: any}} | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuType | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  // Sync Refs
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { selectedNodeIdsRef.current = selectedNodeIds; }, [selectedNodeIds]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') return;

        if (selectedNodeIds.length > 0) {
            onDeleteNode(selectedNodeIds[0]); 
        } else if (selectedEdgeId) {
            onDeleteEdge(selectedEdgeId);
            setSelectedEdgeId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeIds, selectedEdgeId, onDeleteNode, onDeleteEdge]);

  // --- Helpers ---
  const screenToWorld = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const v = viewRef.current;
    return {
      x: (clientX - rect.left - v.x) / v.zoom,
      y: (clientY - rect.top - v.y) / v.zoom
    };
  };

  const getCanvasLocal = (clientX: number, clientY: number) => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
  };

  // --- Mouse Handlers (Canvas) ---
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (contextMenu) return;

    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    const v = viewRef.current;
    const newZoom = Math.max(0.1, Math.min(3, v.zoom + delta));

    if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldX = (mouseX - v.x) / v.zoom;
        const worldY = (mouseY - v.y) / v.zoom;

        const newX = mouseX - worldX * newZoom;
        const newY = mouseY - worldY * newZoom;

        setView({ x: newX, y: newY, zoom: newZoom });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (contextMenu) {
        setContextMenu(null);
        setPickerSearch('');
    }
    if (e.button === 2) return;

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        dragRef.current.isPanning = true;
        dragRef.current.lastMouse = { x: e.clientX, y: e.clientY };
        return;
    }

    if (e.button === 0 && (e.target === canvasRef.current || (e.target as HTMLElement).tagName === 'svg')) {
        if (!e.ctrlKey && !e.metaKey) {
            onSelectNode([]);
            setSelectedEdgeId(null);
        }
        
        dragRef.current.isSelecting = true;
        const local = getCanvasLocal(e.clientX, e.clientY);
        dragRef.current.selectionStart = local;
        setSelectionBox({ start: local, end: local });
    }
  };

  // --- Mouse Handlers (Node) ---
  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      e.preventDefault();
      
      if (e.button !== 0 || e.altKey) return;

      const selected = selectedNodeIdsRef.current;
      let newSelected = [...selected];

      if (e.ctrlKey || e.metaKey) {
          if (newSelected.includes(id)) {
              newSelected = newSelected.filter(nid => nid !== id);
          } else {
              newSelected.push(id);
          }
      } else {
          if (!newSelected.includes(id)) {
              newSelected = [id];
          }
      }

      onSelectNode(newSelected);
      setSelectedEdgeId(null); 

      dragRef.current.isDraggingNodes = true;
      dragRef.current.lastMouse = { x: e.clientX, y: e.clientY };
  };

  // --- Mouse Handlers (Port) ---
  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, handle: string) => {
      e.stopPropagation();
      e.preventDefault();
      
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      // 1. Detach Mode: Check if input port has existing connection
      const existingEdgeIdx = edges.findIndex(edge => edge.target === nodeId && edge.targetHandle === handle);

      if (existingEdgeIdx !== -1) {
          const edge = edges[existingEdgeIdx];
          
          // Remove existing edge from graph
          const newEdges = [...edges];
          newEdges.splice(existingEdgeIdx, 1);
          onEdgesChange(newEdges);

          // Start dragging from the original Source
          dragRef.current.isConnecting = true;
          dragRef.current.connectionStart = { 
              nodeId: edge.source, 
              handle: edge.sourceHandle || 'right' 
          };
          
          const sourceNode = nodes.find(n => n.id === edge.source);
          if (sourceNode) {
              const startPos = getPortPosition(
                  sourceNode.position.x, 
                  sourceNode.position.y, 
                  sourceNode.data.shape, 
                  edge.sourceHandle, 
                  sourceNode.type
              );
              const worldMouse = screenToWorld(e.clientX, e.clientY);
              setDragEdge({ 
                  start: { ...startPos, side: startPos.side as any }, 
                  end: { ...worldMouse, side: undefined } 
              });
          }
      } else {
          // 2. New Connection Mode
          dragRef.current.isConnecting = true;
          dragRef.current.connectionStart = { nodeId, handle };
          
          const startPos = getPortPosition(node.position.x, node.position.y, node.data.shape, handle, node.type);
          const worldMouse = screenToWorld(e.clientX, e.clientY);
          setDragEdge({ 
              start: { ...startPos, side: startPos.side as any }, 
              end: { ...worldMouse, side: undefined } 
          });
      }
  };

  // --- Global Mouse Move / Up (Effect) ---
  useEffect(() => {
      const handleWindowMouseMove = (e: MouseEvent) => {
          const { isPanning, isDraggingNodes, isSelecting, isConnecting, lastMouse, selectionStart } = dragRef.current;
          
          if (isPanning) {
              const dx = e.clientX - lastMouse.x;
              const dy = e.clientY - lastMouse.y;
              setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
              dragRef.current.lastMouse = { x: e.clientX, y: e.clientY };
              return;
          }

          if (isDraggingNodes) {
              const v = viewRef.current;
              const dx = (e.clientX - lastMouse.x) / v.zoom;
              const dy = (e.clientY - lastMouse.y) / v.zoom;
              
              const selectedIds = selectedNodeIdsRef.current;
              
              onNodesChange(prevNodes => prevNodes.map(n => 
                  selectedIds.includes(n.id) 
                  ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } 
                  : n
              ));
              
              dragRef.current.lastMouse = { x: e.clientX, y: e.clientY };
              return;
          }

          if (isSelecting && canvasRef.current) {
              const rect = canvasRef.current.getBoundingClientRect();
              const currentX = e.clientX - rect.left;
              const currentY = e.clientY - rect.top;
              
              setSelectionBox({
                  start: selectionStart,
                  end: { x: currentX, y: currentY }
              });
              return;
          }

          if (isConnecting) {
              const v = viewRef.current;
              const rect = canvasRef.current?.getBoundingClientRect();
              if (rect && dragRef.current.connectionStart) {
                  setDragEdge(prev => {
                      if (!prev) return null;
                      const worldX = (e.clientX - rect.left - v.x) / v.zoom;
                      const worldY = (e.clientY - rect.top - v.y) / v.zoom;
                      return { ...prev, end: { x: worldX, y: worldY, side: undefined } };
                  });
              }
          }
      };

      const handleWindowMouseUp = (e: MouseEvent) => {
          const { isSelecting, isConnecting, selectionStart } = dragRef.current;

          if (isSelecting && canvasRef.current) {
              const rect = canvasRef.current.getBoundingClientRect();
              const endX = e.clientX - rect.left;
              const endY = e.clientY - rect.top;
              const v = viewRef.current;
              
              const minX = Math.min(selectionStart.x, endX);
              const maxX = Math.max(selectionStart.x, endX);
              const minY = Math.min(selectionStart.y, endY);
              const maxY = Math.max(selectionStart.y, endY);

              const worldL = (minX - v.x) / v.zoom;
              const worldR = (maxX - v.x) / v.zoom;
              const worldT = (minY - v.y) / v.zoom;
              const worldB = (maxY - v.y) / v.zoom;

              const foundIds: string[] = [];
              nodesRef.current.forEach(n => {
                  const dim = NODE_DIMENSIONS[n.data.shape || 'square'];
                  const nL = n.position.x;
                  const nR = n.position.x + dim.width;
                  const nT = n.position.y;
                  const nB = n.position.y + dim.height;

                  if (nL < worldR && nR > worldL && nT < worldB && nB > worldT) {
                      foundIds.push(n.id);
                  }
              });

              if (e.ctrlKey || e.metaKey) {
                  const current = selectedNodeIdsRef.current;
                  const set = new Set([...current, ...foundIds]);
                  onSelectNode(Array.from(set));
              } else {
                  onSelectNode(foundIds);
              }
              setSelectionBox(null);
          }

          if (isConnecting) {
              setDragEdge(null);
          }

          dragRef.current = {
              ...dragRef.current,
              isPanning: false,
              isDraggingNodes: false,
              isSelecting: false,
              isConnecting: false,
              connectionStart: null
          };
      };

      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
      
      return () => {
          window.removeEventListener('mousemove', handleWindowMouseMove);
          window.removeEventListener('mouseup', handleWindowMouseUp);
      };
  }, [onNodesChange, onSelectNode]); 

  // --- Port Mouse Up (Connection Finalize) ---
  const handlePortMouseUp = (e: React.MouseEvent, nodeId: string, handle: string) => {
      e.stopPropagation();
      const { isConnecting, connectionStart: connStart } = dragRef.current;

      if (isConnecting && connStart) {
          if (connStart.nodeId !== nodeId) {
              const exists = edges.some(edge => 
                  edge.source === connStart.nodeId && edge.sourceHandle === connStart.handle &&
                  edge.target === nodeId && edge.targetHandle === handle
              );

              if (!exists) {
                  const newEdge: Edge = {
                      id: `e-${Date.now()}`,
                      source: connStart.nodeId,
                      sourceHandle: connStart.handle,
                      target: nodeId,
                      targetHandle: handle
                  };
                  onEdgesChange([...edges, newEdge]);
              }
          }
      }
      
      setDragEdge(null);
      dragRef.current.isConnecting = false;
      dragRef.current.connectionStart = null;
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/flowgen-node') as NodeType;
      if (type) {
          const pos = screenToWorld(e.clientX, e.clientY);
          addNode(type, { x: pos.x - 70, y: pos.y - 35 });
      }
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      if (dragRef.current.isPanning) return;
      if (e.target === canvasRef.current || (e.target as HTMLElement).tagName === 'svg') {
          setContextMenu({ type: 'picker', x: e.clientX, y: e.clientY });
          setPickerSearch('');
      }
  };

  const handleNodeContextMenu = (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ type: 'node', id, x: e.clientX, y: e.clientY });
  };

  const handleEdgeContextMenu = (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ type: 'edge', id, x: e.clientX, y: e.clientY });
      setSelectedEdgeId(id);
  };

  const handleAddFromPicker = (type: NodeType) => {
      if (!contextMenu || contextMenu.type !== 'picker') return;
      const world = screenToWorld(contextMenu.x, contextMenu.y);
      addNode(type, { x: world.x - 50, y: world.y - 20 });
      setContextMenu(null);
  };

  const filteredNodes = NODE_OPTIONS.filter(opt => 
      opt.label.toLowerCase().includes(pickerSearch.toLowerCase()) || 
      opt.desc.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  return (
    <div 
      ref={canvasRef} 
      className={`relative w-full h-full bg-gray-950 overflow-hidden cursor-crosshair`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onContextMenu={handleCanvasContextMenu}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        backgroundImage: `linear-gradient(to right, #1f2937 1px, transparent 1px), linear-gradient(to bottom, #1f2937 1px, transparent 1px)`,
        backgroundSize: `${24 * view.zoom}px ${24 * view.zoom}px`,
        backgroundPosition: `${view.x}px ${view.y}px`
      }}
    >
      <div 
        className="absolute top-0 left-0 w-full h-full pointer-events-none origin-top-left"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
      >
          {/* Render Wires (Edges) */}
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible">
            {edges.map(edge => {
              const source = nodes.find(n => n.id === edge.source);
              const target = nodes.find(n => n.id === edge.target);
              if (!source || !target) return null;

              // Pass NodeType to allow correct vertical offset calculation
              const start = getPortPosition(source.position.x, source.position.y, source.data.shape, edge.sourceHandle, source.type);
              const end = getPortPosition(target.position.x, target.position.y, target.data.shape, edge.targetHandle, target.type);

              return (
                <Wire 
                    key={edge.id}
                    id={edge.id}
                    start={{ x: start.x, y: start.y, side: start.side as any }}
                    end={{ x: end.x, y: end.y, side: end.side as any }}
                    isSelected={selectedEdgeId === edge.id}
                    onSelect={() => {
                        setSelectedEdgeId(edge.id);
                        onSelectNode([]); 
                    }}
                    onDelete={() => onDeleteEdge(edge.id)}
                    onContextMenu={(e) => handleEdgeContextMenu(e, edge.id)}
                />
              );
            })}

            {/* Render Draft Wire (Dragging) */}
            {dragEdge && (
                <Wire 
                    start={dragEdge.start}
                    end={dragEdge.end}
                    isDraft={true}
                />
            )}
          </svg>

          {/* Render Nodes */}
          <div className="pointer-events-auto">
            {nodes.map(node => (
                <NodeComponent 
                    key={node.id} 
                    node={node} 
                    isSelected={selectedNodeIds.includes(node.id)}
                    onMouseDown={handleNodeMouseDown}
                    onContextMenu={handleNodeContextMenu}
                    onPortMouseDown={handlePortMouseDown}
                    onPortMouseUp={handlePortMouseUp}
                    onRunNode={onRunNode} 
                />
            ))}
          </div>
      </div>
      
      {/* Selection Box */}
      {selectionBox && (
          <div 
            className="absolute border border-blue-400 bg-blue-500/20 z-50 pointer-events-none"
            style={{
                left: Math.min(selectionBox.start.x, selectionBox.end.x),
                top: Math.min(selectionBox.start.y, selectionBox.end.y),
                width: Math.abs(selectionBox.end.x - selectionBox.start.x),
                height: Math.abs(selectionBox.end.y - selectionBox.start.y)
            }}
          />
      )}

      {/* Context Menu */}
      {contextMenu && (
          <div 
            className="fixed z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={{ 
                left: Math.min(contextMenu.x, window.innerWidth - (contextMenu.type === 'picker' ? 270 : 150)), 
                top: Math.min(contextMenu.y, window.innerHeight - (contextMenu.type === 'picker' ? 300 : 100)),
                width: contextMenu.type === 'picker' ? '16rem' : '10rem'
            }}
            onMouseDown={(e) => e.stopPropagation()} 
          >
              {contextMenu.type === 'picker' ? (
                  <>
                    <div className="p-2 border-b border-gray-800 bg-gray-850">
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Search nodes..." 
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg py-1.5 pl-3 pr-3 text-sm text-white focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder-gray-600"
                            value={pickerSearch}
                            onChange={(e) => setPickerSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && filteredNodes.length > 0) handleAddFromPicker(filteredNodes[0].type);
                                if (e.key === 'Escape') setContextMenu(null);
                            }}
                        />
                    </div>
                    <div className="overflow-y-auto max-h-64 p-1">
                        {filteredNodes.length === 0 ? <div className="p-3 text-center text-xs text-gray-500">No nodes found</div> : 
                            filteredNodes.map((opt) => (
                                <button
                                    key={opt.type}
                                    onClick={() => handleAddFromPicker(opt.type)}
                                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors text-left group"
                                >
                                    <div className={`p-2 rounded-md bg-gray-800 group-hover:bg-gray-700 border border-gray-700 ${opt.color}`}>
                                        <opt.icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-200">{opt.label}</div>
                                        <div className="text-[10px] text-gray-500">{opt.desc}</div>
                                    </div>
                                </button>
                            ))
                        }
                    </div>
                  </>
              ) : contextMenu.type === 'node' ? (
                <div className="p-1">
                    <button 
                        onClick={() => { onDeleteNode(contextMenu.id); setContextMenu(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-900/30 rounded-lg text-sm transition-colors"
                    >
                        <Trash2 className="w-4 h-4" /> Delete Node
                    </button>
                </div>
              ) : (
                <div className="p-1">
                     <button 
                        onClick={() => { onDeleteEdge(contextMenu.id); setContextMenu(null); setSelectedEdgeId(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-900/30 rounded-lg text-sm transition-colors"
                    >
                        <X className="w-4 h-4" /> Cut Connection
                    </button>
                </div>
              )}
          </div>
      )}
    </div>
  );
};

export default Canvas;
