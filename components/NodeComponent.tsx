import React from 'react';
import { Node, NodeType } from '../types';
import { Play, FileCode, ShieldCheck, Terminal, AlertCircle, CheckCircle2, StickyNote, Laptop, ListTodo, Binary, Sparkles, Cpu } from 'lucide-react';
import { NODE_WIDTH, NODE_PORT_OFFSET_Y } from '../constants';

interface NodeComponentProps {
  node: Node;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onPortMouseDown: (e: React.MouseEvent, nodeId: string, type: 'source' | 'target') => void;
}

const NodeComponent: React.FC<NodeComponentProps> = ({ node, isSelected, onMouseDown, onContextMenu, onPortMouseDown }) => {
  const { type, data } = node;

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
      onContextMenu={(e) => onContextMenu(e, node.id)}
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
          <div className="flex items-center gap-2 overflow-hidden">
            <Icon className={`w-5 h-5 flex-shrink-0 ${isNote ? titleColor : titleColor}`} />
            <span className={`font-bold text-sm truncate ${isNote ? 'text-yellow-900' : 'text-gray-100'}`}>{data.label}</span>
          </div>
          
          <div className="flex items-center gap-2 pl-2 flex-shrink-0">
             {/* Category Badges */}
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
        
        {/* Preview content */}
        {!isNote && (
          <div className="text-xs text-gray-400 line-clamp-3 font-mono bg-black/20 p-2 rounded">
            {type === NodeType.VS_CODE ? (
                <>
                  <div className="mb-1">{data.prompt ? `Opening: ${data.prompt}` : "No path set"}</div>
                  {data.todo && <div className="text-blue-300 opacity-70 border-t border-gray-700 mt-1 pt-1 italic">{data.todo.slice(0, 50)}...</div>}
                </>
            ) : type === NodeType.PYTHON_EXEC ? (
                <div className="text-yellow-300/80">
                    <div>Executes incoming code.</div>
                    {data.dependencies && <div className="text-[10px] opacity-70 mt-1">Deps: {data.dependencies}</div>}
                </div>
            ) : type === NodeType.TODO_LIST ? (
                <div className="text-teal-300/80 whitespace-pre-wrap">{data.todo || "Add tasks..."}</div>
            ) : (
                data.prompt || "No configuration..."
            )}
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