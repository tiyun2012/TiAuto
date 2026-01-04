
import React from 'react';
import { Node, NodeType, NodeShape } from '../types';
import { Port } from './Port';
import { NODE_DIMENSIONS, NODE_PORTS, PortDefinition } from '../constants';
import { Play, FileCode, ShieldCheck, Terminal, AlertCircle, CheckCircle2, StickyNote, Laptop, ListTodo, Binary, SquareTerminal, FlaskConical, FileDiff, Sparkles, ThumbsUp, ThumbsDown, CircleDashed, Repeat, FolderOpen, Users, Layers, GitFork, Save, GitBranch, Briefcase, FileSearch, ListRestart } from 'lucide-react';

interface NodeComponentProps {
  node: Node;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onPortMouseDown: (e: React.MouseEvent, nodeId: string, portId: string) => void;
  onPortMouseUp: (e: React.MouseEvent, nodeId: string, portId: string) => void;
  onRunNode: (id: string, action?: string) => void;
}

const NodeComponent: React.FC<NodeComponentProps> = ({ 
    node, isSelected, onMouseDown, onContextMenu, onPortMouseDown, onPortMouseUp, onRunNode 
}) => {
  const { type, data, id } = node;
  const shape: NodeShape = data.shape || 'square';
  const width = NODE_DIMENSIONS[shape].width;
  const baseHeight = NODE_DIMENSIONS[shape].height;
  const height = type === NodeType.NOTE && shape === 'rectangle' ? 140 : baseHeight;

  // Get Ports Config
  const portsConfig = NODE_PORTS[type] || { inputs: [{id:'left'}], outputs: [{id:'right'}] };

  // --- Icon & Color Logic ---
  let Icon = FileCode;
  let bgClass = "bg-gray-800";
  let borderClass = "border-blue-500";
  let titleColor = "text-blue-400";
  const isAI = [NodeType.GEMINI_GENERATE, NodeType.GEMINI_CHECK, NodeType.SIMULATE_RUN, NodeType.AI_UNIT_TEST, NodeType.AI_DEBATE, NodeType.MULTI_CHECK, NodeType.ARCHITECT].includes(type);
  const isNote = type === NodeType.NOTE;

  // Simple visual mapper
  switch (type) {
    case NodeType.TRIGGER: Icon = Play; bgClass = "bg-gray-800"; borderClass = "border-green-500"; titleColor = "text-green-400"; break;
    case NodeType.ARCHITECT: Icon = Briefcase; bgClass = "bg-gray-900"; borderClass = "border-emerald-300"; titleColor = "text-emerald-300"; break;
    case NodeType.PROJECT_INDEX: Icon = FileSearch; borderClass = "border-cyan-300"; titleColor = "text-cyan-300"; break;
    case NodeType.TASK_ITERATOR: Icon = ListRestart; borderClass = "border-violet-300"; titleColor = "text-violet-300"; break;
    case NodeType.READ_FILE: Icon = FolderOpen; borderClass = "border-blue-300"; titleColor = "text-blue-300"; break;
    case NodeType.WRITE_FILE: Icon = Save; borderClass = "border-red-300"; titleColor = "text-red-300"; break;
    case NodeType.GIT_CONTROL: Icon = GitBranch; borderClass = "border-orange-300"; titleColor = "text-orange-300"; break;
    case NodeType.GEMINI_GENERATE: Icon = Sparkles; borderClass = "border-purple-500"; titleColor = "text-purple-400"; break;
    case NodeType.GEMINI_CHECK: Icon = ShieldCheck; borderClass = "border-orange-500"; titleColor = "text-orange-400"; break;
    case NodeType.AI_DEBATE: Icon = Users; borderClass = "border-pink-400"; titleColor = "text-pink-400"; break;
    case NodeType.MULTI_CHECK: Icon = Layers; borderClass = "border-indigo-300"; titleColor = "text-indigo-300"; break;
    case NodeType.AI_UNIT_TEST: Icon = FlaskConical; borderClass = "border-cyan-500"; titleColor = "text-cyan-400"; break;
    case NodeType.SIMULATE_RUN: Icon = Terminal; borderClass = "border-pink-500"; titleColor = "text-pink-400"; break;
    case NodeType.SHELL_EXEC: Icon = SquareTerminal; bgClass = "bg-gray-900"; borderClass = "border-gray-500"; titleColor = "text-gray-300"; break;
    case NodeType.PYTHON_EXEC: Icon = Binary; borderClass = "border-yellow-600"; titleColor = "text-yellow-500"; break;
    case NodeType.TODO_LIST: Icon = ListTodo; borderClass = "border-teal-500"; titleColor = "text-teal-400"; break;
    case NodeType.VS_CODE: Icon = Laptop; borderClass = "border-blue-400"; titleColor = "text-blue-300"; break;
    case NodeType.DIFF: Icon = FileDiff; borderClass = "border-indigo-500"; titleColor = "text-indigo-400"; break;
    case NodeType.APPROVAL: Icon = ThumbsUp; bgClass = "bg-gray-900"; borderClass = "border-rose-500"; titleColor = "text-rose-400"; break;
    case NodeType.LOOP: Icon = Repeat; bgClass = "bg-gray-900"; borderClass = "border-violet-500"; titleColor = "text-violet-400"; break;
    case NodeType.ROUTER: Icon = GitFork; bgClass = "bg-gray-900"; borderClass = "border-yellow-200"; titleColor = "text-yellow-200"; break;
    case NodeType.NOTE: Icon = StickyNote; bgClass = "bg-yellow-100 text-yellow-900"; borderClass = "border-yellow-200"; titleColor = "text-yellow-800"; break;
  }

  let shapeClasses = 'rounded-md'; 
  if (shape === 'circle') shapeClasses = 'rounded-full';
  if (shape === 'square') shapeClasses = 'rounded-2xl'; 

  const baseClasses = `absolute shadow-lg border-2 transition-shadow duration-200 cursor-move group select-none ${
    isSelected ? 'ring-2 ring-white/50 z-20' : 'z-10'
  } ${bgClass} ${borderClass} ${shapeClasses}`;

  // Helper to render a list of ports (Inputs or Outputs)
  const renderPortGroup = (definitions: PortDefinition[], type: 'input' | 'output') => {
    // Add metadata for positioning
    const metaPorts = definitions.map(p => ({
        ...p,
        side: p.side || (type === 'input' ? 'left' : 'right')
    }));

    return metaPorts.map(p => {
        // Find siblings on the same side to calculate index/total
        const siblings = metaPorts.filter(m => m.side === p.side);
        // Also need to account for BOTH inputs and outputs if they share a side (rare but possible)
        // For simplicity in this implementation, we assume inputs are mostly left, outputs right/top/bottom.
        // If mixed, we might need a more complex global index, but per-group indexing works for 99% of cases.
        
        return (
            <Port 
                key={p.id}
                id={p.id}
                nodeId={id}
                type={type}
                side={p.side as any}
                index={siblings.indexOf(p)}
                total={siblings.length}
                label={p.label}
                styleOverride={p.style}
                onMouseDown={onPortMouseDown}
                onMouseUp={onPortMouseUp}
            />
        );
    });
  };

  const renderContent = () => {
      if (isNote) {
          return (
            <div className="p-3 h-full flex flex-col items-center justify-center text-center">
                <Icon className={`w-8 h-8 ${titleColor} mb-1`} />
                <div className="font-bold text-sm text-yellow-900 line-clamp-3">{data.label}</div>
            </div>
          );
      }

      return (
        <div className="h-full flex flex-col">
            <div className={`flex items-center justify-between px-3 py-2 border-b border-white/5 bg-black/10`}>
                <div className="flex items-center gap-2 overflow-hidden">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${titleColor}`} />
                    <span className={`font-bold text-xs truncate ${titleColor}`}>{data.label}</span>
                </div>
                <div className="flex items-center gap-2">
                    {isAI && <span className="text-[9px] font-mono text-gray-500 uppercase">{data.provider?.slice(0,3) || 'AI'}</span>}
                    {data.status === 'running' && <div className="animate-spin h-3 w-3 border-[1.5px] border-white border-t-transparent rounded-full" />}
                    {data.status === 'waiting' && <CircleDashed className="w-4 h-4 text-yellow-400 animate-pulse" />}
                    {data.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {data.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                </div>
            </div>
            
            <div className="flex-1 p-3 flex flex-col justify-center text-gray-300 relative">
               <div className="line-clamp-2 text-[10px] opacity-60 leading-tight">
                   {type === NodeType.SHELL_EXEC ? `$ ${data.prompt?.slice(0,25)}...` : 
                    type === NodeType.TASK_ITERATOR ? `Task ${data.iteratorIndex} / ${data.iteratorTotal||'?'}` :
                    (data.prompt || data.label)}
               </div>
               {data.status !== 'running' && (
                   <button
                        onClick={(e) => { e.stopPropagation(); onRunNode(id); }}
                        className="absolute bottom-2 right-2 p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-white transition-colors"
                        title="Run"
                    >
                        <Play className="w-3 h-3" />
                    </button>
               )}
            </div>
        </div>
      );
  };

  return (
    <div 
        className={baseClasses}
        style={{ width, height, left: node.position.x, top: node.position.y }}
        onMouseDown={(e) => onMouseDown(e, id)}
        onContextMenu={(e) => onContextMenu(e, id)}
    >
        {renderContent()}
        
        {/* Render Child Ports */}
        {!isNote && (
            <>
                {renderPortGroup(portsConfig.inputs, 'input')}
                {renderPortGroup(portsConfig.outputs, 'output')}
            </>
        )}

        {/* Action Overlay (Approval) */}
        {type === NodeType.APPROVAL && data.status === 'waiting' && (
             <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 flex gap-2 z-50 animate-in zoom-in-95">
                <button onClick={(e) => { e.stopPropagation(); onRunNode(id, 'approve'); }} className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-[10px] font-bold shadow flex items-center gap-1 animate-bounce">
                    <ThumbsUp className="w-3 h-3" /> YES
                </button>
                <button onClick={(e) => { e.stopPropagation(); onRunNode(id, 'reject'); }} className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-[10px] font-bold shadow flex items-center gap-1">
                    <ThumbsDown className="w-3 h-3" /> NO
                </button>
            </div>
        )}
    </div>
  );
};

export default NodeComponent;
