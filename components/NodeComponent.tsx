
import React, { useState } from 'react';
import { Node, NodeType, NodeShape } from '../types';
import { Play, FileCode, ShieldCheck, Terminal, AlertCircle, CheckCircle2, StickyNote, Laptop, ListTodo, Binary, Sparkles, Cpu, Eye, EyeOff, SquareTerminal, FlaskConical, X, FileDiff } from 'lucide-react';
import { NODE_DIMENSIONS } from '../constants';

interface NodeComponentProps {
  node: Node;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onPortMouseDown: (e: React.MouseEvent, nodeId: string, handle: string) => void;
  onPortMouseUp: (e: React.MouseEvent, nodeId: string, handle: string) => void;
}

// Updated Port Positioning: 
// Use -0.5 (2px) offset to compensate for the parent's border-2 (2px).
// This places the center of the port exactly on the outer edge of the node.
const PORTS = [
    { id: 'top', className: '-top-0.5 left-1/2 -translate-x-1/2 -translate-y-1/2' },
    { id: 'right', className: '-right-0.5 top-1/2 translate-x-1/2 -translate-y-1/2' },
    { id: 'bottom', className: '-bottom-0.5 left-1/2 -translate-x-1/2 translate-y-1/2' },
    { id: 'left', className: '-left-0.5 top-1/2 -translate-x-1/2 -translate-y-1/2' }
];

const NodeComponent: React.FC<NodeComponentProps> = ({ 
    node, isSelected, onMouseDown, onContextMenu, onPortMouseDown, onPortMouseUp 
}) => {
  const { type, data, id } = node;
  const shape: NodeShape = data.shape || 'square';
  const width = NODE_DIMENSIONS[shape].width;
  const height = NODE_DIMENSIONS[shape].height;

  // Widget State
  const [showPopup, setShowPopup] = useState(false);

  let Icon = FileCode;
  // Breakdown colors for granular control (Port border must match Node border)
  let bgClass = "bg-gray-800";
  let borderClass = "border-blue-500";
  let titleColor = "text-blue-400";
  let portColor = "bg-blue-500"; 

  // Categorize
  const isAI = [NodeType.GEMINI_GENERATE, NodeType.GEMINI_CHECK, NodeType.SIMULATE_RUN, NodeType.AI_UNIT_TEST].includes(type);
  const isLogic = [NodeType.TRIGGER, NodeType.PYTHON_EXEC, NodeType.VS_CODE, NodeType.TODO_LIST, NodeType.SHELL_EXEC, NodeType.DIFF].includes(type);
  const isNote = type === NodeType.NOTE;

  switch (type) {
    case NodeType.TRIGGER:
      Icon = Play;
      bgClass = "bg-gray-800";
      borderClass = "border-green-500";
      titleColor = "text-green-400";
      portColor = "bg-green-500";
      break;
    case NodeType.GEMINI_GENERATE:
      Icon = FileCode;
      bgClass = "bg-gray-800";
      borderClass = "border-purple-500";
      titleColor = "text-purple-400";
      portColor = "bg-purple-500";
      break;
    case NodeType.GEMINI_CHECK:
      Icon = ShieldCheck;
      bgClass = "bg-gray-800";
      borderClass = "border-orange-500";
      titleColor = "text-orange-400";
      portColor = "bg-orange-500";
      break;
    case NodeType.AI_UNIT_TEST:
      Icon = FlaskConical;
      bgClass = "bg-gray-800";
      borderClass = "border-cyan-500";
      titleColor = "text-cyan-400";
      portColor = "bg-cyan-500";
      break;
    case NodeType.SIMULATE_RUN:
      Icon = Terminal;
      bgClass = "bg-gray-800";
      borderClass = "border-pink-500";
      titleColor = "text-pink-400";
      portColor = "bg-pink-500";
      break;
    case NodeType.SHELL_EXEC:
      Icon = SquareTerminal;
      bgClass = "bg-gray-900";
      borderClass = "border-gray-500";
      titleColor = "text-gray-300";
      portColor = "bg-gray-400";
      break;
    case NodeType.PYTHON_EXEC:
      Icon = Binary;
      bgClass = "bg-gray-800";
      borderClass = "border-yellow-600";
      titleColor = "text-yellow-500";
      portColor = "bg-yellow-500";
      break;
    case NodeType.TODO_LIST:
      Icon = ListTodo;
      bgClass = "bg-gray-800";
      borderClass = "border-teal-500";
      titleColor = "text-teal-400";
      portColor = "bg-teal-500";
      break;
    case NodeType.VS_CODE:
      Icon = Laptop;
      bgClass = "bg-gray-800";
      borderClass = "border-blue-400";
      titleColor = "text-blue-300";
      portColor = "bg-blue-400";
      break;
    case NodeType.DIFF:
      Icon = FileDiff;
      bgClass = "bg-gray-800";
      borderClass = "border-indigo-500";
      titleColor = "text-indigo-400";
      portColor = "bg-indigo-500";
      break;
    case NodeType.NOTE:
      Icon = StickyNote;
      bgClass = "bg-yellow-100 text-yellow-900";
      borderClass = "border-yellow-200";
      titleColor = "text-yellow-800";
      portColor = "bg-yellow-500";
      break;
  }
  
  // Shape-specific styling
  let shapeClasses = 'rounded-lg'; // Default for rectangle
  if (shape === 'circle') shapeClasses = 'rounded-full';
  if (shape === 'square') shapeClasses = 'rounded-2xl'; // Slightly rounded square

  // Base Node Classes
  const baseClasses = `absolute shadow-lg border-2 transition-shadow duration-200 cursor-move group select-none ${
    isSelected ? 'ring-2 ring-white/50 z-20' : 'z-10'
  } ${bgClass} ${borderClass} ${shapeClasses}`;

  // Status Indicator
  const renderStatus = () => {
    if (data.status === 'running') return <div className="animate-spin h-3 w-3 border-[1.5px] border-white border-t-transparent rounded-full shadow-sm" />;
    if (data.status === 'success') return <CheckCircle2 className="w-4 h-4 text-green-500 bg-gray-900 rounded-full" />;
    if (data.status === 'error') return <AlertCircle className="w-4 h-4 text-red-500 bg-gray-900 rounded-full" />;
    return null;
  };
  
  // Corner Badge for AI/Logic (Square/Circle only)
  const renderCornerBadge = () => {
    if (isNote) return null;
    const badgeCommon = "absolute -top-3 -left-3 p-1.5 rounded-full bg-gray-900 border-2 shadow-lg z-40 flex items-center justify-center";

    if (isAI) {
        return (
            <div className={`${badgeCommon} border-purple-500/80 text-purple-400`} title="AI Powered">
                <Sparkles className="w-3.5 h-3.5" />
            </div>
        );
    }
    if (isLogic) {
        return (
            <div className={`${badgeCommon} border-gray-600 text-gray-400`} title="Logic / Utility">
                <Cpu className="w-3.5 h-3.5" />
            </div>
        );
    }
    return null;
  };

  const getWidgetContent = () => {
      if (type === NodeType.VS_CODE) return data.todo || `Path: ${data.prompt}`;
      if (type === NodeType.PYTHON_EXEC) return data.code || "Executes connected Python code.";
      if (type === NodeType.SHELL_EXEC) return data.prompt || "Execute Shell Command";
      if (type === NodeType.TODO_LIST) return data.todo;
      if (type === NodeType.DIFF) return "Comparing inputs...";
      if (data.output) return data.output;
      return data.prompt || "No details.";
  };

  const renderContent = () => {
      // --- CIRCLE SHAPE ---
      if (shape === 'circle') {
          const r = width / 2;
          const textRadius = r - 12; // Push text closer to edge
          const pathId = `curve-${id}`;
          
          return (
              <div className="relative w-full h-full">
                 {renderCornerBadge()}
                 {/* 1. Curved Text (Label) */}
                 <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10">
                     <path 
                        id={pathId} 
                        d={`M 10,${height/2 + 10} A ${textRadius},${textRadius} 0 1,1 ${width-10},${height/2 + 10}`} 
                        fill="transparent" 
                     />
                     <text className={`text-[9px] font-bold uppercase tracking-widest ${isNote ? 'fill-yellow-900' : 'fill-gray-400'}`}>
                        <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
                            {data.label}
                        </textPath>
                     </text>
                 </svg>

                 {/* 2. Centered Icon */}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Icon className={`w-12 h-12 ${titleColor} opacity-90`} />
                 </div>

                 {/* 3. Status Indicator (Bottom Center) */}
                 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                     {renderStatus()}
                 </div>

                 {/* 4. Popup Toggle (Top Right Offset) */}
                 {!isNote && (
                     <button 
                        onClick={(e) => { e.stopPropagation(); setShowPopup(!showPopup); }}
                        className={`absolute top-2 right-2 z-30 p-1 rounded-full bg-gray-900/80 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors shadow-sm ${showPopup ? 'text-blue-400 border-blue-500/50' : ''}`}
                     >
                         {showPopup ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                     </button>
                 )}
              </div>
          );
      }

      // --- SQUARE SHAPE (True Square) ---
      if (shape === 'square') {
          return (
              <div className="relative w-full h-full">
                  {renderCornerBadge()}
                  {/* 1. Center Icon */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-4">
                      <Icon className={`w-14 h-14 ${titleColor} opacity-90 transition-transform group-hover:scale-110 duration-300`} />
                  </div>
                  
                  {/* 2. Label (Bottom Aligned) */}
                  <div className="absolute bottom-0 w-full p-2 flex justify-center pointer-events-none">
                    <span className={`font-bold text-[10px] uppercase tracking-wide leading-tight text-center line-clamp-2 px-2 py-0.5 rounded-full ${isNote ? 'text-yellow-900' : 'text-gray-300 bg-gray-900/60 backdrop-blur-sm'}`}>
                        {data.label}
                    </span>
                  </div>
                  
                  {/* 3. Status (Top Left) */}
                  <div className="absolute top-2 left-2 z-20">
                    {renderStatus()}
                  </div>

                  {/* 4. Popup Toggle (Top Right) */}
                  {!isNote && (
                     <button 
                        onClick={(e) => { e.stopPropagation(); setShowPopup(!showPopup); }}
                        className={`absolute top-2 right-2 z-30 p-1.5 rounded-md bg-gray-900/40 border border-gray-700/30 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors shadow-sm backdrop-blur-sm ${showPopup ? 'text-blue-400 border-blue-500/50 bg-blue-900/20' : ''}`}
                     >
                         {showPopup ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                     </button>
                 )}
              </div>
          );
      }
      
      // --- RECTANGLE SHAPE (Wide Header) ---
      return (
        <div className={`p-3 h-full flex flex-col justify-center ${isNote ? '' : 'text-gray-100'}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isNote ? titleColor : titleColor}`} />
                    <span className={`font-bold text-sm truncate ${isNote ? 'text-yellow-900' : 'text-gray-100'}`}>{data.label}</span>
                </div>
                
                <div className="flex items-center gap-2 pl-2 flex-shrink-0">
                    {/* Rectangle still uses inline badges for cleaner header layout */}
                    {!isNote && isAI && (
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-[9px] text-purple-300 font-medium uppercase tracking-wider">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>AI</span>
                        </div>
                    )}
                    {!isNote && isLogic && (
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gray-700/50 border border-gray-600/50 text-[9px] text-gray-400 font-medium uppercase tracking-wider">
                            <Cpu className="w-2.5 h-2.5" />
                            <span>Logic</span>
                        </div>
                    )}
                    {renderStatus()}

                    {/* Popup Toggle */}
                    {!isNote && (
                         <button 
                            onClick={(e) => { e.stopPropagation(); setShowPopup(!showPopup); }}
                            className={`p-1 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors ${showPopup ? 'text-blue-400 bg-blue-500/10' : ''}`}
                            title={showPopup ? "Close View" : "Quick View"}
                         >
                            {showPopup ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                         </button>
                    )}
                </div>
            </div>

            {/* Note Body (Preserved) */}
            {isNote && (
                 <div className="text-xs text-yellow-900 font-sans p-1 mt-1 flex-1 overflow-hidden">
                    {data.prompt || "Note..."}
                </div>
            )}
        </div>
      );
  };

  return (
    <div
      className={baseClasses}
      style={{ 
        left: node.position.x, 
        top: node.position.y,
        width: width,
        height: isNote && shape === 'rectangle' ? 140 : height,
        boxSizing: 'border-box'
      }}
      onMouseDown={(e) => onMouseDown(e, node.id)}
      onContextMenu={(e) => onContextMenu(e, node.id)}
    >
      {/* 4 Ports */}
      {/* Socket Style: bg-gray-950 (Canvas color) + Border-2 (Node Color) + Inner Dot */}
      {/* We use explicit flex centering for the inner dot */}
      {type !== NodeType.NOTE && PORTS.map(port => (
          <div
            key={port.id}
            className={`absolute w-4 h-4 rounded-full bg-gray-950 border-2 ${borderClass} hover:scale-125 cursor-crosshair z-30 transition-all duration-200 flex items-center justify-center ${port.className}`}
            onMouseDown={(e) => { e.stopPropagation(); onPortMouseDown(e, node.id, port.id); }}
            onMouseUp={(e) => { e.stopPropagation(); onPortMouseUp(e, node.id, port.id); }}
            title={`${port.id} Port`}
          >
              <div className={`w-2 h-2 rounded-full ${portColor}`}></div>
          </div>
      ))}

      {renderContent()}

      {/* Popup Widget (Detail View) */}
      {!isNote && showPopup && (
          <div 
            className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-80 bg-gray-900 border border-gray-600 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 select-text cursor-default"
            onMouseDown={(e) => e.stopPropagation()} 
          >
              <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      {data.output ? "Output Result" : "Configuration"}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowPopup(false); }}
                    className="p-1 rounded hover:bg-gray-700 transition-colors text-gray-500 hover:text-white"
                  >
                      <X className="w-3.5 h-3.5" />
                  </button>
              </div>
              <div className="p-3 max-h-60 overflow-y-auto font-mono text-xs text-gray-300 scrollbar-thin">
                  {getWidgetContent()}
              </div>
              {/* Arrow */}
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-800 border-l border-t border-gray-600 rotate-45"></div>
          </div>
      )}
    </div>
  );
};

export default NodeComponent;
