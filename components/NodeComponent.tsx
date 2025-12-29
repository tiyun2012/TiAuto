import React from 'react';
import { Node, NodeType } from '../types';
import { Play, FileCode, ShieldCheck, Terminal, AlertCircle, CheckCircle2, StickyNote, Laptop } from 'lucide-react';
import { NODE_WIDTH, NODE_PORT_OFFSET_Y } from '../constants';

interface NodeComponentProps {
  node: Node;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onPortMouseDown: (e: React.MouseEvent, nodeId: string, type: 'source' | 'target') => void;
}

const NodeComponent: React.FC<NodeComponentProps> = ({ node, isSelected, onMouseDown, onPortMouseDown }) => {
  const { type, data } = node;

  let Icon = FileCode;
  let colorClass = "border-blue-500 bg-gray-800";
  let titleColor = "text-blue-400";

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

  const isNote = type === NodeType.NOTE;
  
  const baseClasses = `absolute rounded-lg shadow-lg border-2 transition-shadow duration-200 cursor-move ${
    isSelected ? 'ring-2 ring-white/50 z-20' : 'z-10'
  } ${isNote ? colorClass : colorClass}`;

  // Status Indicator
  const renderStatus = () => {
    if (data.status === 'running') return <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />;
    if (data.status === 'success') return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (data.status === 'error') return <AlertCircle className="w-5 h-5 text-red-500" />;
    return null;
  };

  return (
    <div
      className={baseClasses}
      style={{ 
        left: node.position.x, 
        top: node.position.y,
        width: NODE_WIDTH, 
        boxSizing: 'border-box' // Critical for correct port positioning relative to borders
      }}
      onMouseDown={(e) => onMouseDown(e, node.id)}
    >
      {/* Input Port */}
      {type !== NodeType.TRIGGER && type !== NodeType.NOTE && (
        <div
          className="absolute left-0 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-gray-400 rounded-full border-2 border-gray-900 hover:bg-white cursor-crosshair z-30 transition-transform hover:scale-125"
          style={{ top: NODE_PORT_OFFSET_Y }}
          onMouseDown={(e) => { e.stopPropagation(); onPortMouseDown(e, node.id, 'target'); }}
          title="Input"
        />
      )}

      {/* Node Body */}
      <div className={`p-3 ${isNote ? '' : 'text-gray-100'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${isNote ? titleColor : titleColor}`} />
            <span className={`font-bold text-sm ${isNote ? 'text-yellow-900' : 'text-gray-100'}`}>{data.label}</span>
          </div>
          <div className="flex items-center">
            {renderStatus()}
          </div>
        </div>
        
        {/* Preview content */}
        {!isNote && (
          <div className="text-xs text-gray-400 line-clamp-3 font-mono bg-black/20 p-2 rounded">
            {type === NodeType.VS_CODE ? (data.prompt ? `Opening: ${data.prompt}` : "No path set") : (data.prompt || "No configuration...")}
          </div>
        )}
        {isNote && (
           <div className="text-xs text-yellow-900 font-sans p-1">
             {data.prompt || "Double click to edit note..."}
           </div>
        )}

        {/* Output Preview (if success) */}
        {data.status === 'success' && !isNote && (
          <div className="mt-2 pt-2 border-t border-gray-700">
             <div className="text-[10px] uppercase text-gray-500 mb-1">Output</div>
             <div className="text-xs text-green-300 font-mono line-clamp-2">
                {data.output?.slice(0, 100)}...
             </div>
          </div>
        )}
      </div>

      {/* Output Port */}
      {type !== NodeType.NOTE && (
        <div
          className="absolute right-0 translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-gray-900 hover:bg-white cursor-crosshair z-30 transition-transform hover:scale-125"
          style={{ top: NODE_PORT_OFFSET_Y }}
          onMouseDown={(e) => { e.stopPropagation(); onPortMouseDown(e, node.id, 'source'); }}
          title="Output"
        />
      )}
    </div>
  );
};

export default NodeComponent;