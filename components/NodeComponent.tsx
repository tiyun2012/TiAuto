import React from 'react';
import { Node, NodeType, NodeShape } from '../types';
import { Play, FileCode, ShieldCheck, Terminal, AlertCircle, CheckCircle2, StickyNote, Laptop, ListTodo, Binary, Sparkles, Cpu } from 'lucide-react';
import { NODE_DIMENSIONS } from '../constants';

interface NodeComponentProps {
  node: Node;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onPortMouseDown: (e: React.MouseEvent, nodeId: string, handle: string) => void;
  onPortMouseUp: (e: React.MouseEvent, nodeId: string, handle: string) => void;
}

const PORTS = [
    { id: 'top', className: '-top-1.5 left-1/2 -translate-x-1/2' },
    { id: 'right', className: 'top-1/2 -right-1.5 -translate-y-1/2' },
    { id: 'bottom', className: '-bottom-1.5 left-1/2 -translate-x-1/2' },
    { id: 'left', className: 'top-1/2 -left-1.5 -translate-y-1/2' }
];

const NodeComponent: React.FC<NodeComponentProps> = ({ 
    node, isSelected, onMouseDown, onContextMenu, onPortMouseDown, onPortMouseUp 
}) => {
  const { type, data } = node;
  const shape: NodeShape = data.shape || 'square';
  const width = NODE_DIMENSIONS[shape].width;
  const height = NODE_DIMENSIONS[shape].height;

  let Icon = FileCode;
  let colorClass = "border-blue-500 bg-gray-800";
  let titleColor = "text-blue-400";

  // Categorize
  const isAI = [NodeType.GEMINI_GENERATE, NodeType.GEMINI_CHECK, NodeType.SIMULATE_RUN].includes(type);
  const isLogic = [NodeType.TRIGGER, NodeType.PYTHON_EXEC, NodeType.VS_CODE, NodeType.TODO_LIST].includes(type);
  const isNote = type === NodeType.NOTE;

  switch (type) {
    case NodeType.TRIGGER:
      Icon = Play;
      colorClass = "border-green-500 bg-gray-800";
      titleColor = "text-green-400";
      break;
    case NodeType.GEMINI_GENERATE:
      Icon = FileCode;
      colorClass = "border-purple-500 bg-gray-800";
      titleColor = "text-purple-400";
      break;
    case NodeType.GEMINI_CHECK:
      Icon = ShieldCheck;
      colorClass = "border-orange-500 bg-gray-800";
      titleColor = "text-orange-400";
      break;
    case NodeType.SIMULATE_RUN:
      Icon = Terminal;
      colorClass = "border-pink-500 bg-gray-800";
      titleColor = "text-pink-400";
      break;
    case NodeType.PYTHON_EXEC:
      Icon = Binary;
      colorClass = "border-yellow-600 bg-gray-800";
      titleColor = "text-yellow-500";
      break;
    case NodeType.TODO_LIST:
      Icon = ListTodo;
      colorClass = "border-teal-500 bg-gray-800";
      titleColor = "text-teal-400";
      break;
    case NodeType.VS_CODE:
      Icon = Laptop;
      colorClass = "border-blue-400 bg-gray-800";
      titleColor = "text-blue-300";
      break;
    case NodeType.NOTE:
      Icon = StickyNote;
      colorClass = "border-yellow-200 bg-yellow-100 text-yellow-900";
      titleColor = "text-yellow-800";
      break;
  }
  
  const shapeClasses = shape === 'circle' ? 'rounded-full flex flex-col items-center justify-center text-center' : 'rounded-lg';
  const baseClasses = `absolute shadow-lg border-2 transition-shadow duration-200 cursor-move group select-none ${
    isSelected ? 'ring-2 ring-white/50 z-20' : 'z-10'
  } ${isNote ? colorClass : colorClass} ${shapeClasses}`;

  // Status Indicator
  const renderStatus = () => {
    if (data.status === 'running') return <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />;
    if (data.status === 'success') return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (data.status === 'error') return <AlertCircle className="w-5 h-5 text-red-500" />;
    return null;
  };

  const renderContent = () => {
      if (shape === 'circle') {
          return (
              <div className="p-4 flex flex-col items-center gap-2 overflow-hidden">
                 <Icon className={`w-8 h-8 ${titleColor}`} />
                 <span className="font-bold text-xs truncate w-full px-2">{data.label}</span>
                 {renderStatus()}
                 {/* Circle nodes hide detailed preview to fit */}
              </div>
          );
      }
      
      // Square Content
      return (
        <div className={`p-3 h-full flex flex-col ${isNote ? '' : 'text-gray-100'}`}>
            <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 overflow-hidden">
                <Icon className={`w-5 h-5 flex-shrink-0 ${isNote ? titleColor : titleColor}`} />
                <span className={`font-bold text-sm truncate ${isNote ? 'text-yellow-900' : 'text-gray-100'}`}>{data.label}</span>
            </div>
            
            <div className="flex items-center gap-2 pl-2 flex-shrink-0">
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
            </div>
            </div>
            
            {!isNote && (
            <div className="text-xs text-gray-400 line-clamp-3 font-mono bg-black/20 p-2 rounded flex-1">
                {type === NodeType.VS_CODE ? (
                    <>
                    <div className="mb-1">{data.prompt ? `Path: ...${data.prompt.slice(-20)}` : "No path"}</div>
                    </>
                ) : (
                    data.prompt || data.todo || "Double click to configure..."
                )}
            </div>
            )}
             {isNote && (
                <div className="text-xs text-yellow-900 font-sans p-1">
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
        height: height,
        boxSizing: 'border-box'
      }}
      onMouseDown={(e) => onMouseDown(e, node.id)}
      onContextMenu={(e) => onContextMenu(e, node.id)}
    >
      {/* 4 Ports */}
      {type !== NodeType.NOTE && PORTS.map(port => (
          <div
            key={port.id}
            className={`absolute w-3 h-3 bg-gray-400 rounded-full border border-gray-900 hover:bg-white hover:scale-150 cursor-crosshair z-30 transition-transform ${port.className}`}
            onMouseDown={(e) => { e.stopPropagation(); onPortMouseDown(e, node.id, port.id); }}
            onMouseUp={(e) => { e.stopPropagation(); onPortMouseUp(e, node.id, port.id); }}
            title={`${port.id} Port`}
          />
      ))}

      {renderContent()}
    </div>
  );
};

export default NodeComponent;