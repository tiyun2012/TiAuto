import React, { useRef, useState, useEffect } from 'react';
import { Node, Edge, NodeType, NodeShape } from '../types';
import NodeComponent from './NodeComponent';
import { getPortPosition, NODE_DIMENSIONS } from '../constants';
import { Search, Play, FileCode, ShieldCheck, Terminal, Laptop, StickyNote, Trash2, X, ListTodo, Binary, SquareTerminal, FlaskConical, FileDiff, ThumbsUp, Repeat, FolderOpen, Users, Layers, GitFork, Save, GitBranch, Briefcase, FileSearch, ListRestart } from 'lucide-react';

interface CanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: React.Dispatch<React.SetStateAction<Node[]>>;
  onEdgesChange: (edges: Edge[]) => void;
  // Refactored props
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
  const [isPanning, setIsPanning] = useState(false);
  const [isAltZooming, setIsAltZooming] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Marquee Selection State
  const [selectionBox, setSelectionBox] = useState<{start: {x:number, y:number}, end: {x:number, y:number}} | null>(null);

  // Selection
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuType | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  // Node Dragging State
  // We just track IF we are dragging nodes, not which specific one, 
  // because we always drag the entire selected set.
  const [isDraggingNodes, setIsDraggingNodes] = useState(false);

  // Connection Dragging State
  const [connectionStart, setConnectionStart] = useState<{ nodeId: string, handle: string } | null>(null);
  const [dragEdgeEnd, setDragEdgeEnd] = useState({ x: 0, y: 0 });

  // --- Keyboard Shortcuts (Delete) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') return;

        if (selectedNodeIds.length > 0) {
            // App handles bulk delete if we pass one, or we can iterate.
            // But deleting via prop only takes 1 ID. 
            // Better to let App handle it, but here we just call onDeleteNode for the first one 
            // which triggers the bulk logic in App (refactored).
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

  // --- Helper: Screen (Client) to World Coordinates ---
  const screenToWorld = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.x) / view.zoom,
      y: (clientY - rect.top - view.y) / view.zoom
    };
  };

  // --- Zoom Handling (Wheel) ---
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (isDraggingNodes || connectionStart || contextMenu || isAltZooming) return;

    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    const newZoom = Math.max(0.1, Math.min(3, view.zoom + delta));

    if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldX = (mouseX - view.x) / view.zoom;
        const worldY = (mouseY - view.y) / view.zoom;

        const newX = mouseX - worldX * newZoom;
        const newY = mouseY - worldY * newZoom;

        setView({ x: newX, y: newY, zoom: newZoom });
    }
  };

  // --- Mouse Down (Pan, Zoom, Select) ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (contextMenu) {
        setContextMenu(null);
        setPickerSearch('');
    }

    // Right Click
    if (e.button === 2) return; // Handled by Context Menu event

    // Middle Click or Shift/Alt Left Click -> Pan/Zoom
    if (e.button === 1 || (e.button === 0 && e.shiftKey) || (e.button === 0 && e.altKey)) { 
        if (e.altKey && e.button === 2) { // Special Alt+RMB
             e.preventDefault();
             setIsAltZooming(true);
        } else {
             e.preventDefault();
             setIsPanning(true);
        }
        setLastMousePos({ x: e.clientX, y: e.clientY });
        return;
    }

    // Standard Left Click on Canvas -> Start Marquee Selection
    if (e.button === 0 && (e.target === canvasRef.current || (e.target as HTMLElement).tagName === 'svg')) {
         // Clear previous selection unless Ctrl is held (uncommon for marquee start, usually clears)
         if (!e.ctrlKey && !e.metaKey) {
             onSelectNode([]);
             setSelectedEdgeId(null);
         }
         
         // Start Selection Box (Store client coords for drawing)
         const rect = canvasRef.current?.getBoundingClientRect();
         if(rect) {
             const startX = e.clientX - rect.left;
             const startY = e.clientY - rect.top;
             setSelectionBox({ start: {x: startX, y: startY}, end: {x: startX, y: startY} });
         }
    }
  };

  // --- Context Menus ---
  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isPanning || isDraggingNodes || isAltZooming || e.altKey) return;

    if (e.target === canvasRef.current || (e.target as HTMLElement).tagName === 'svg') {
         setContextMenu({ type: 'picker', x: e.clientX, y: e.clientY });
         setPickerSearch('');
    }
  };

  const handleNodeContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAltZooming || e.altKey) return;
    setContextMenu({ type: 'node', id, x: e.clientX, y: e.clientY });
  };

  const handleEdgeContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAltZooming || e.altKey) return;
    setContextMenu({ type: 'edge', id, x: e.clientX, y: e.clientY });
    setSelectedEdgeId(id);
  };

  const handleAddFromPicker = (type: NodeType) => {
      if (!contextMenu || contextMenu.type !== 'picker') return;
      const worldPos = screenToWorld(contextMenu.x, contextMenu.y);
      addNode(type, { x: worldPos.x - 100, y: worldPos.y - 20 });
      setContextMenu(null);
      setPickerSearch('');
  };

  // --- Interactions (Node Click / Drag Start) ---
  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    if (e.shiftKey || e.altKey || e.button === 1 || e.button === 2) return;
    if (contextMenu) setContextMenu(null);

    e.stopPropagation();
    e.preventDefault(); // Stop text selection
    
    // Selection Logic
    let newSelection = [...selectedNodeIds];
    
    if (e.ctrlKey || e.metaKey) {
        // Toggle
        if (newSelection.includes(id)) {
            newSelection = newSelection.filter(nid => nid !== id);
        } else {
            newSelection.push(id);
        }
    } else {
        // If clicking an already selected node, keep selection (might be starting a drag of the group)
        // If clicking an unselected node, clear others and select this one
        if (!newSelection.includes(id)) {
            newSelection = [id];
        }
    }
    
    onSelectNode(newSelection);
    setSelectedEdgeId(null);
    setIsDraggingNodes(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  // --- Port Drag Start ---
  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, handle: string) => {
    e.stopPropagation();
    e.preventDefault(); 
    const worldPos = screenToWorld(e.clientX, e.clientY);

    setDragEdgeEnd(worldPos);
    setConnectionStart({ nodeId, handle });
    setSelectedEdgeId(null);
  };

  const handlePortMouseUp = (e: React.MouseEvent, nodeId: string, handle: string) => {
    e.stopPropagation();
    
    if (connectionStart) {
        if (connectionStart.nodeId === nodeId) {
            setConnectionStart(null);
            return;
        }

        const exists = edges.some(
            edge => edge.source === connectionStart.nodeId && 
                    edge.sourceHandle === connectionStart.handle &&
                    edge.target === nodeId && 
                    edge.targetHandle === handle
        );

        if (!exists) {
            const newEdge: Edge = {
                id: `e-${Date.now()}`,
                source: connectionStart.nodeId,
                sourceHandle: connectionStart.handle,
                target: nodeId,
                targetHandle: handle
            };
            onEdgesChange([...edges, newEdge]);
        }
        
        setConnectionStart(null);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        // 1. Panning
        if (isPanning) {
            const dx = e.clientX - lastMousePos.x;
            const dy = e.clientY - lastMousePos.y;
            setView(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            setLastMousePos({ x: e.clientX, y: e.clientY });
            return;
        }

        // 2. Marquee Selection
        if (selectionBox && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const currX = e.clientX - rect.left;
            const currY = e.clientY - rect.top;
            setSelectionBox(prev => prev ? ({ ...prev, end: {x: currX, y: currY} }) : null);
            return;
        }

        // 3. Node Dragging (Multi)
        if (isDraggingNodes && canvasRef.current) {
             const dx = (e.clientX - lastMousePos.x) / view.zoom;
             const dy = (e.clientY - lastMousePos.y) / view.zoom;
             
             onNodesChange(prev => prev.map(n => 
                selectedNodeIds.includes(n.id) 
                ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } 
                : n
             ));
             setLastMousePos({ x: e.clientX, y: e.clientY });
             return;
        }

        // 4. Wire Dragging
        if (connectionStart && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const worldMouseX = (e.clientX - rect.left - view.x) / view.zoom;
            const worldMouseY = (e.clientY - rect.top - view.y) / view.zoom;
            setDragEdgeEnd({ x: worldMouseX, y: worldMouseY });
        }
    };

    const handleMouseUp = (e: MouseEvent) => {
        if (isPanning) setIsPanning(false);
        if (isAltZooming) setIsAltZooming(false);
        if (isDraggingNodes) setIsDraggingNodes(false);

        // Finalize Marquee Selection
        if (selectionBox) {
            // Calculate selection bounds in World Space
            // Convert start/end from screen offset to World
            const left = Math.min(selectionBox.start.x, selectionBox.end.x);
            const top = Math.min(selectionBox.start.y, selectionBox.start.y, selectionBox.end.y);
            const right = Math.max(selectionBox.start.x, selectionBox.end.x);
            const bottom = Math.max(selectionBox.start.y, selectionBox.end.y);

            const worldLeft = (left - view.x) / view.zoom;
            const worldTop = (top - view.y) / view.zoom;
            const worldRight = (right - view.x) / view.zoom;
            const worldBottom = (bottom - view.y) / view.zoom;

            // Find intersecting nodes
            const newSelection: string[] = [];
            nodes.forEach(node => {
                const dims = NODE_DIMENSIONS[node.data.shape || 'square'];
                const nodeL = node.position.x;
                const nodeT = node.position.y;
                const nodeR = node.position.x + dims.width;
                const nodeB = node.position.y + dims.height;

                // Simple AABB intersection
                if (nodeL < worldRight && nodeR > worldLeft && nodeT < worldBottom && nodeB > worldTop) {
                    newSelection.push(node.id);
                }
            });

            // If Ctrl held, merge. Else replace.
            if (e.ctrlKey || e.metaKey) {
                // Merge logic (toggle or add? typically add in marquee)
                // Let's just add uniques
                const combined = Array.from(new Set([...selectedNodeIds, ...newSelection]));
                onSelectNode(combined);
            } else {
                onSelectNode(newSelection);
            }

            setSelectionBox(null);
        }

        if (connectionStart) setConnectionStart(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, isDraggingNodes, connectionStart, lastMousePos, view, selectionBox, nodes, selectedNodeIds, onNodesChange, onSelectNode]);


  const renderConnections = () => {
    return (
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible">
        {edges.map(edge => {
          const source = nodes.find(n => n.id === edge.source);
          const target = nodes.find(n => n.id === edge.target);
          if (!source || !target) return null;

          const sHandle = edge.sourceHandle || 'right';
          const tHandle = edge.targetHandle || 'left';

          const start = getPortPosition(source.position.x, source.position.y, source.data.shape, sHandle);
          const end = getPortPosition(target.position.x, target.position.y, target.data.shape, tHandle);

          let c1x = start.x, c1y = start.y, c2x = end.x, c2y = end.y;
          const dist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
          const offset = Math.min(dist * 0.5, 100);

          if (sHandle === 'left') c1x -= offset;
          else if (sHandle === 'right') c1x += offset;
          else if (sHandle === 'top') c1y -= offset;
          else if (sHandle === 'bottom') c1y += offset;

          if (tHandle === 'left') c2x -= offset;
          else if (tHandle === 'right') c2x += offset;
          else if (tHandle === 'top') c2y -= offset;
          else if (tHandle === 'bottom') c2y += offset;

          const path = `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;
          const isSelected = selectedEdgeId === edge.id;

          return (
            <g key={edge.id} className="pointer-events-auto group">
                 <path 
                    d={path} 
                    stroke="transparent" 
                    strokeWidth="15" 
                    fill="none" 
                    className="cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (e.ctrlKey || e.metaKey) {
                            onDeleteEdge(edge.id);
                            setSelectedEdgeId(null);
                            return;
                        }
                        setSelectedEdgeId(edge.id);
                        onSelectNode([]); 
                    }}
                    onContextMenu={(e) => handleEdgeContextMenu(e, edge.id)}
                 />
                 <path 
                    d={path} 
                    stroke={isSelected ? "#FBBF24" : "#4B5563"} 
                    strokeWidth={isSelected ? "3" : "4"} 
                    fill="none" 
                    strokeLinecap="round" 
                    className="transition-colors duration-200"
                 />
                 <path 
                    d={path} 
                    stroke={isSelected ? "#FBBF24" : "#60A5FA"} 
                    strokeWidth="2" 
                    fill="none" 
                    strokeLinecap="round" 
                    className={isSelected ? "opacity-100" : "opacity-80"} 
                 />
            </g>
          );
        })}

        {connectionStart && (() => {
            const source = nodes.find(n => n.id === connectionStart.nodeId);
            if (!source) return null;
            
            const start = getPortPosition(source.position.x, source.position.y, source.data.shape, connectionStart.handle);
            const endX = dragEdgeEnd.x;
            const endY = dragEdgeEnd.y;
            
            let c1x = start.x, c1y = start.y;
            const offset = 50;
             if (connectionStart.handle === 'left') c1x -= offset;
             else if (connectionStart.handle === 'right') c1x += offset;
             else if (connectionStart.handle === 'top') c1y -= offset;
             else if (connectionStart.handle === 'bottom') c1y += offset;

            const path = `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${endX} ${endY}, ${endX} ${endY}`;
            return <path d={path} stroke="#FBBF24" strokeWidth="3" strokeDasharray="6,4" fill="none" strokeLinecap="round" />;
        })()}
      </svg>
    );
  };

  // Filter nodes for picker
  const filteredNodes = NODE_OPTIONS.filter(opt => 
      opt.label.toLowerCase().includes(pickerSearch.toLowerCase()) || 
      opt.desc.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  return (
    <div 
      ref={canvasRef} 
      className={`relative w-full h-full bg-gray-950 overflow-hidden cursor-crosshair ${isPanning || isAltZooming ? 'cursor-move' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onContextMenu={handleCanvasContextMenu}
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
          {renderConnections()}
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
      
      {/* Marquee Selection Box */}
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

      {/* Context Menu Renderer */}
      {contextMenu && (
          <div 
            className="fixed z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={{ 
                left: Math.min(contextMenu.x, window.innerWidth - (contextMenu.type === 'picker' ? 270 : 150)), 
                top: Math.min(contextMenu.y, window.innerHeight - (contextMenu.type === 'picker' ? 300 : 100)),
                width: contextMenu.type === 'picker' ? '16rem' : '10rem'
            }}
            onMouseDown={(e) => e.stopPropagation()} 
            onWheel={(e) => e.stopPropagation()} 
          >
              {contextMenu.type === 'picker' ? (
                  <>
                    <div className="p-2 border-b border-gray-800 bg-gray-850">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="Search nodes..." 
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg py-1.5 pl-8 pr-3 text-sm text-white focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder-gray-600"
                                value={pickerSearch}
                                onChange={(e) => setPickerSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && filteredNodes.length > 0) {
                                        handleAddFromPicker(filteredNodes[0].type);
                                    }
                                    if (e.key === 'Escape') setContextMenu(null);
                                }}
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto max-h-64 p-1">
                        {filteredNodes.length === 0 ? (
                            <div className="p-3 text-center text-xs text-gray-500">No nodes found</div>
                        ) : (
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
                        )}
                    </div>
                  </>
              ) : contextMenu.type === 'node' ? (
                <div className="p-1">
                    <button 
                        onClick={() => { onDeleteNode(contextMenu.id); setContextMenu(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-900/30 rounded-lg text-sm transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Node
                    </button>
                </div>
              ) : (
                <div className="p-1">
                     <button 
                        onClick={() => { onDeleteEdge(contextMenu.id); setContextMenu(null); setSelectedEdgeId(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-900/30 rounded-lg text-sm transition-colors"
                    >
                        <X className="w-4 h-4" />
                        Cut Connection
                    </button>
                </div>
              )}
          </div>
      )}
    </div>
  );
};

export default Canvas;