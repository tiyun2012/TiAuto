import React, { useRef, useState, useEffect } from 'react';
import { Node, Edge, NodeType } from '../types';
import NodeComponent from './NodeComponent';
import { getPortPosition } from '../constants';
import { Search, Play, FileCode, ShieldCheck, Terminal, Laptop, StickyNote } from 'lucide-react';

interface CanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: React.Dispatch<React.SetStateAction<Node[]>>;
  onEdgesChange: (edges: Edge[]) => void;
  onSelectNode: (nodeId: string | null) => void;
  selectedNodeId: string | null;
  addNode: (type: NodeType, position: { x: number; y: number }) => void;
}

// Node definitions for the picker
const NODE_OPTIONS = [
  { type: NodeType.TRIGGER, label: 'Trigger', icon: Play, desc: 'Start workflow', color: 'text-green-400' },
  { type: NodeType.GEMINI_GENERATE, label: 'AI Generator', icon: FileCode, desc: 'Write code', color: 'text-purple-400' },
  { type: NodeType.GEMINI_CHECK, label: 'AI Security', icon: ShieldCheck, desc: 'Audit code', color: 'text-orange-400' },
  { type: NodeType.SIMULATE_RUN, label: 'Simulator', icon: Terminal, desc: 'Run code', color: 'text-pink-400' },
  { type: NodeType.VS_CODE, label: 'VS Code', icon: Laptop, desc: 'Open local editor', color: 'text-blue-400' },
  { type: NodeType.NOTE, label: 'Note', icon: StickyNote, desc: 'Add comments', color: 'text-yellow-400' },
];

const Canvas: React.FC<CanvasProps> = ({ 
  nodes, edges, onNodesChange, onEdgesChange, onSelectNode, selectedNodeId, addNode 
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Viewport State
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  // Node Dragging State
  const [isDraggingNode, setIsDraggingNode] = useState<string | null>(null);
  const [nodeDragOffset, setNodeDragOffset] = useState({ x: 0, y: 0 });

  // Connection Dragging State
  const [connectionStart, setConnectionStart] = useState<{ nodeId: string, type: 'source' | 'target' } | null>(null);
  const [dragEdgeEnd, setDragEdgeEnd] = useState({ x: 0, y: 0 }); // World coordinates for edge tip

  // --- Helper: Screen (Client) to World Coordinates ---
  const screenToWorld = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.x) / view.zoom,
      y: (clientY - rect.top - view.y) / view.zoom
    };
  };

  // --- Zoom Handling ---
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (isDraggingNode || connectionStart || contextMenu) return;

    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    const newZoom = Math.max(0.1, Math.min(3, view.zoom + delta));

    // Zoom towards mouse pointer
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

  // --- Pan Handling ---
  const handleMouseDown = (e: React.MouseEvent) => {
    // Close context menu on click
    if (contextMenu) {
        setContextMenu(null);
        setPickerSearch('');
    }

    // Middle Mouse (button 1) or Space + Left Click (button 0)
    if (e.button === 1 || (e.button === 0 && e.shiftKey) || (e.button === 0 && e.altKey)) { 
        e.preventDefault();
        setIsPanning(true);
        setLastMousePos({ x: e.clientX, y: e.clientY });
    } else {
        // Deselect if clicking on empty canvas
        if(e.target === canvasRef.current || (e.target as HTMLElement).tagName === 'svg') {
             onSelectNode(null);
        }
    }
  };

  // --- Context Menu Handling ---
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isPanning || isDraggingNode) return;
    
    // Only open on empty space
    if (e.target === canvasRef.current || (e.target as HTMLElement).tagName === 'svg') {
         setContextMenu({ x: e.clientX, y: e.clientY });
         setPickerSearch('');
    }
  };

  const handleAddFromPicker = (type: NodeType) => {
      if (!contextMenu) return;
      const worldPos = screenToWorld(contextMenu.x, contextMenu.y);
      // Center the node visually around the click
      addNode(type, { x: worldPos.x - 100, y: worldPos.y - 20 });
      setContextMenu(null);
      setPickerSearch('');
  };

  // --- Node Drag Start ---
  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    if (e.shiftKey || e.altKey || e.button === 1) return;
    if (contextMenu) setContextMenu(null);

    e.stopPropagation();
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    
    const worldPos = screenToWorld(e.clientX, e.clientY);
    
    setNodeDragOffset({
      x: worldPos.x - node.position.x,
      y: worldPos.y - node.position.y
    });
    
    setIsDraggingNode(id);
    onSelectNode(id);
  };

  // --- Port Drag Start ---
  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, type: 'source' | 'target') => {
    e.stopPropagation();
    if (type === 'source') {
        const worldPos = screenToWorld(e.clientX, e.clientY);
        setDragEdgeEnd(worldPos);
        setConnectionStart({ nodeId, type });
    }
  };

  // --- Global Move & Up Listeners ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (isPanning) {
            const dx = e.clientX - lastMousePos.x;
            const dy = e.clientY - lastMousePos.y;
            setView(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            setLastMousePos({ x: e.clientX, y: e.clientY });
            return;
        }

        if (isDraggingNode && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const worldMouseX = (e.clientX - rect.left - view.x) / view.zoom;
            const worldMouseY = (e.clientY - rect.top - view.y) / view.zoom;

            const newX = worldMouseX - nodeDragOffset.x;
            const newY = worldMouseY - nodeDragOffset.y;

            onNodesChange(prev => prev.map(n => 
                n.id === isDraggingNode 
                ? { ...n, position: { x: newX, y: newY } } 
                : n
            ));
            return;
        }

        if (connectionStart && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const worldMouseX = (e.clientX - rect.left - view.x) / view.zoom;
            const worldMouseY = (e.clientY - rect.top - view.y) / view.zoom;
            setDragEdgeEnd({ x: worldMouseX, y: worldMouseY });
        }
    };

    const handleMouseUp = (e: MouseEvent) => {
        if (isPanning) setIsPanning(false);
        if (isDraggingNode) setIsDraggingNode(null);

        if (connectionStart && canvasRef.current) {
             const rect = canvasRef.current.getBoundingClientRect();
             const worldMouseX = (e.clientX - rect.left - view.x) / view.zoom;
             const worldMouseY = (e.clientY - rect.top - view.y) / view.zoom;

             const targetNode = nodes.find(n => {
                if (n.id === connectionStart.nodeId) return false;
                const portPos = getPortPosition(n.position.x, n.position.y, 'target');
                const dist = Math.sqrt(Math.pow(worldMouseX - portPos.x, 2) + Math.pow(worldMouseY - portPos.y, 2));
                return dist < 40; 
             });

             if (targetNode) {
                const newEdge: Edge = {
                    id: `e-${Date.now()}`,
                    source: connectionStart.nodeId,
                    target: targetNode.id
                };
                onEdgesChange([...edges, newEdge]);
             }
             setConnectionStart(null);
        }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, isDraggingNode, connectionStart, lastMousePos, view, nodeDragOffset, nodes, edges, onNodesChange, onEdgesChange]);


  const renderConnections = () => {
    return (
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible">
        {edges.map(edge => {
          const source = nodes.find(n => n.id === edge.source);
          const target = nodes.find(n => n.id === edge.target);
          if (!source || !target) return null;

          const start = getPortPosition(source.position.x, source.position.y, 'source');
          const end = getPortPosition(target.position.x, target.position.y, 'target');

          const distX = Math.abs(end.x - start.x);
          const controlOffset = Math.max(distX * 0.5, 60);
          const path = `M ${start.x} ${start.y} C ${start.x + controlOffset} ${start.y}, ${end.x - controlOffset} ${end.y}, ${end.x} ${end.y}`;

          return (
            <g key={edge.id}>
                 <path d={path} stroke="#4B5563" strokeWidth="4" fill="none" strokeLinecap="round" />
                 <path d={path} stroke="#60A5FA" strokeWidth="2" fill="none" strokeLinecap="round" className="opacity-80" />
            </g>
          );
        })}

        {connectionStart && (() => {
            const source = nodes.find(n => n.id === connectionStart.nodeId);
            if (!source) return null;
            
            const start = getPortPosition(source.position.x, source.position.y, connectionStart.type);
            const endX = dragEdgeEnd.x;
            const endY = dragEdgeEnd.y;
            
            const distX = Math.abs(endX - start.x);
            const controlOffset = Math.max(distX * 0.5, 60);
            
            const path = `M ${start.x} ${start.y} C ${start.x + controlOffset} ${start.y}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`;
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
      className="relative w-full h-full bg-gray-950 overflow-hidden cursor-crosshair active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
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
                    isSelected={selectedNodeId === node.id}
                    onMouseDown={handleNodeMouseDown}
                    onPortMouseDown={handlePortMouseDown}
                />
            ))}
          </div>
      </div>

      {/* Context Menu / Node Picker */}
      {contextMenu && (
          <div 
            className="fixed z-50 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
            style={{ 
                left: Math.min(contextMenu.x, window.innerWidth - 270), 
                top: Math.min(contextMenu.y, window.innerHeight - 300) 
            }}
          >
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
          </div>
      )}
    </div>
  );
};

export default Canvas;
