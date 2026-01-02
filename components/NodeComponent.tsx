

import React, { useState } from 'react';
import { Node, NodeType, NodeShape } from '../types';
import { Play, FileCode, ShieldCheck, Terminal, AlertCircle, CheckCircle2, StickyNote, Laptop, ListTodo, Binary, Brain, Cpu, Eye, EyeOff, SquareTerminal, FlaskConical, X, FileDiff, Sparkles, Bot, Zap, Cloud, Server, ThumbsUp, ThumbsDown, CircleDashed, Files, Repeat, FolderOpen, Users, Layers, GitFork, Save, GitBranch, Briefcase } from 'lucide-react';
import { NODE_DIMENSIONS } from '../constants';

interface NodeComponentProps {
  node: Node;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onPortMouseDown: (e: React.MouseEvent, nodeId: string, handle: string) => void;
  onPortMouseUp: (e: React.MouseEvent, nodeId: string, handle: string) => void;
  onRunNode: (id: string, action?: string) => void;
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
    node, isSelected, onMouseDown, onContextMenu, onPortMouseDown, onPortMouseUp, onRunNode 
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
  const isAI = [NodeType.GEMINI_GENERATE, NodeType.GEMINI_CHECK, NodeType.SIMULATE_RUN, NodeType.AI_UNIT_TEST, NodeType.AI_DEBATE, NodeType.MULTI_CHECK, NodeType.ARCHITECT].includes(type);
  const isLogic = [NodeType.TRIGGER, NodeType.PYTHON_EXEC, NodeType.VS_CODE, NodeType.TODO_LIST, NodeType.SHELL_EXEC, NodeType.DIFF, NodeType.APPROVAL, NodeType.LOOP, NodeType.READ_FILE, NodeType.ROUTER, NodeType.WRITE_FILE, NodeType.GIT_CONTROL].includes(type);
  const isNote = type === NodeType.NOTE;
  const hasFiles = data.files && Object.keys(data.files).length > 0;

  switch (type) {
    case NodeType.TRIGGER:
      Icon = Play;
      bgClass = "bg-gray-800";
      borderClass = "border-green-500";
      titleColor = "text-green-400";
      portColor = "bg-green-500";
      break;
    case NodeType.ARCHITECT:
      Icon = Briefcase;
      bgClass = "bg-gray-800";
      borderClass = "border-emerald-300";
      titleColor = "text-emerald-300";
      portColor = "bg-emerald-300";
      break;
    case NodeType.READ_FILE:
      Icon = FolderOpen;
      bgClass = "bg-gray-800";
      borderClass = "border-blue-300";
      titleColor = "text-blue-300";
      portColor = "bg-blue-300";
      break;
    case NodeType.WRITE_FILE:
      Icon = Save;
      bgClass = "bg-gray-800";
      borderClass = "border-red-300";
      titleColor = "text-red-300";
      portColor = "bg-red-300";
      break;
    case NodeType.GIT_CONTROL:
      Icon = GitBranch;
      bgClass = "bg-gray-800";
      borderClass = "border-orange-300";
      titleColor = "text-orange-300";
      portColor = "bg-orange-300";
      break;
    case NodeType.GEMINI_GENERATE:
      Icon = Sparkles; 
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
    case NodeType.AI_DEBATE:
      Icon = Users;
      bgClass = "bg-gray-800";
      borderClass = "border-pink-400";
      titleColor = "text-pink-400";
      portColor = "bg-pink-400";
      break;
    case NodeType.MULTI_CHECK:
      Icon = Layers;
      bgClass = "bg-gray-800";
      borderClass = "border-indigo-300";
      titleColor = "text-indigo-300";
      portColor = "bg-indigo-300";
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
    case NodeType.APPROVAL:
      Icon = ThumbsUp;
      bgClass = "bg-gray-900";
      borderClass = "border-rose-500";
      titleColor = "text-rose-400";
      portColor = "bg-rose-500";
      break;
    case NodeType.LOOP:
      Icon = Repeat;
      bgClass = "bg-gray-900";
      borderClass = "border-violet-500";
      titleColor = "text-violet-400";
      portColor = "bg-violet-500";
      break;
    case NodeType.ROUTER:
      Icon = GitFork;
      bgClass = "bg-gray-900";
      borderClass = "border-yellow-200";
      titleColor = "text-yellow-200";
      portColor = "bg-yellow-200";
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
    if (data.status === 'waiting') return <CircleDashed className="w-4 h-4 text-yellow-400 animate-pulse bg-gray-900 rounded-full" />;
    if (data.status === 'success') return <CheckCircle2 className="w-4 h-4 text-green-500 bg-gray-900 rounded-full" />;
    if (data.status === 'error') return <AlertCircle className="w-4 h-4 text-red-500 bg-gray-900 rounded-full" />;
    return null;
  };

  // Run Button overlay
  const renderRunButton = () => {
      if (isNote || data.status === 'running') return null;
      let btnClass = "absolute -top-3 -right-3"; 
      if (shape === 'circle') btnClass = "absolute -top-1 -right-1";
      
      return (
        <button
            onClick={(e) => { e.stopPropagation(); onRunNode(id); }}
            className={`${btnClass} z-50 p-1.5 rounded-full text-white shadow-lg transition-transform hover:scale-110 ${portColor} border-2 border-gray-900`}
            title="Execute Node"
        >
            <Play className="w-2.5 h-2.5 fill-current" />
        </button>
      );
  };

  // Approval Buttons Overlay (If waiting)
  const renderApprovalButtons = () => {
      if (type !== NodeType.APPROVAL || data.status !== 'waiting') return null;
      
      return (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 flex gap-2 z-50">
              <button 
                onClick={(e) => { e.stopPropagation(); onRunNode(id, 'approve'); }}
                className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-md shadow-lg text-xs font-bold flex items-center gap-1 animate-bounce"
              >
                  <ThumbsUp className="w-3 h-3" /> Approve
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onRunNode(id, 'reject'); }}
                className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-md shadow-lg text-xs font-bold flex items-center gap-1"
              >
                  <ThumbsDown className="w-3 h-3" /> Stop
              </button>
          </div>
      );
  };
  
  // Corner Badge
  const renderCornerBadge = () => {
    if (isNote) return null;
    let posClass = "-top-3 -left-3"; 
    if (shape === 'circle') posClass = "top-1 left-1"; 

    // Dynamic coloring based on node theme
    const badgeCommon = `absolute ${posClass} p-1.5 rounded-full bg-gray-900 border-2 shadow-lg z-40 flex items-center justify-center transition-transform hover:scale-110 ${borderClass} ${titleColor}`;

    if (isAI) {
        const provider = data.provider;
        const model = data.model || '';
        let AiIcon = Bot;
        let tooltip = "Default AI";
        
        if (type === NodeType.MULTI_CHECK) {
            return (
                <div className={badgeCommon} title="Multi-Provider Check">
                    <Layers className="w-3.5 h-3.5" />
                </div>
            );
        }

        if (provider === 'gemini' || (!provider && model.includes('gemini'))) { AiIcon = Sparkles; tooltip = "Gemini"; } 
        else if (provider === 'deepseek' || (!provider && model.includes('deepseek'))) { AiIcon = Brain; tooltip = "DeepSeek"; } 
        else if (provider === 'qwen' || (!provider && model.includes('qwen'))) { AiIcon = Cloud; tooltip = "Qwen"; } 
        else if (provider === 'openai' || (!provider && model.includes('gpt'))) { AiIcon = Zap; tooltip = "OpenAI"; }

        return (
            <div className={badgeCommon} title={`${tooltip} ${model ? `(${model})` : ''}`}>
                <AiIcon className="w-3.5 h-3.5" />
            </div>
        );
    }
    if (isLogic) {
        return (
            <div className={badgeCommon} title="Logic / Utility">
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
      if (type === NodeType.APPROVAL) return "Waiting for human confirmation...";
      if (type === NodeType.LOOP) return `Max Retries: ${data.maxIterations || 3}`;
      if (type === NodeType.READ_FILE) return data.localPath ? `Reading: ${data.localPath}` : "No file loaded.";
      if (type === NodeType.WRITE_FILE) return data.localPath ? `Writing to: ${data.localPath}` : "No path set.";
      if (type === NodeType.ROUTER) return `Logic Result: ${data.output || 'Pending'}`;
      if (type === NodeType.ARCHITECT) return data.output ? "Plan generated." : "Planning...";
      if (type === NodeType.GIT_CONTROL) return `Git ${data.gitCommand || 'status'}`;
      if (data.output) return data.output;
      return data.prompt || "No details.";
  };

  const renderEyeButton = () => {
     if (isNote) return null;
     return (
        <button 
           onClick={(e) => { e.stopPropagation(); setShowPopup(!showPopup); }}
           className={`absolute top-5 left-1/2 -translate-x-1/2 z-40 p-1 rounded-full bg-gray-900/90 border transition-all shadow-sm backdrop-blur-sm hover:scale-110 ${
               showPopup 
               ? `${titleColor} ${borderClass}` 
               : `text-gray-400 border-transparent hover:text-white hover:bg-gray-800`
           }`}
        >
            {showPopup ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>
     );
  };

  const renderContent = () => {
      // --- CIRCLE SHAPE ---
      if (shape === 'circle') {
          const r = width / 2;
          const textRadius = r - 14; 
          const pathId = `curve-${id}`;
          
          return (
              <div className="relative w-full h-full">
                 {renderCornerBadge()}
                 <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10">
                     <path 
                        id={pathId} 
                        d={`M 10,${height/2} A ${textRadius},${textRadius} 0 1,1 ${width-10},${height/2}`} 
                        fill="transparent" 
                     />
                     <text className={`text-[10px] font-bold uppercase tracking-widest ${isNote ? 'fill-yellow-900' : 'fill-gray-300'}`}>
                        <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
                            {data.label}
                        </textPath>
                     </text>
                 </svg>
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none mb-1">
                    <Icon className={`w-12 h-12 ${titleColor} opacity-90 drop-shadow-lg`} />
                 </div>
                 <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20">
                     {renderStatus()}
                 </div>
                 {renderEyeButton()}
              </div>
          );
      }

      // --- SQUARE SHAPE ---
      if (shape === 'square') {
          return (
              <div className="relative w-full h-full">
                  {renderCornerBadge()}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-4">
                      <Icon className={`w-14 h-14 ${titleColor} opacity-90 transition-transform group-hover:scale-110 duration-300`} />
                  </div>
                  <div className="absolute bottom-0 w-full p-2 flex justify-center pointer-events-none">
                    <span className={`font-bold text-[10px] uppercase tracking-wide leading-tight text-center line-clamp-2 px-2 py-0.5 rounded-full ${isNote ? 'text-yellow-900' : 'text-gray-300 bg-gray-900/60 backdrop-blur-sm'}`}>
                        {data.label}
                    </span>
                  </div>
                  <div className="absolute top-2 left-2 z-20">
                    {renderStatus()}
                  </div>
                  {renderEyeButton()}
              </div>
          );
      }
      
      // --- RECTANGLE SHAPE ---
      return (
        <div className={`p-3 h-full flex flex-col justify-center ${isNote ? '' : 'text-gray-100'}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isNote ? titleColor : titleColor}`} />
                    <span className={`font-bold text-sm truncate ${isNote ? 'text-yellow-900' : 'text-gray-100'}`}>{data.label}</span>
                </div>
                
                <div className="flex items-center gap-2 pl-2 flex-shrink-0">
                    {!isNote && isAI && (
                        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gray-900/50 border border-gray-600/50 text-[9px] font-medium uppercase tracking-wider ${titleColor}`}>
                             {/* Specific Icon for Rectangle Header */}
                             {data.provider === 'deepseek' ? <Brain className="w-2.5 h-2.5" /> : 
                              data.provider === 'gemini' ? <Sparkles className="w-2.5 h-2.5" /> : 
                              data.provider === 'qwen' ? <Cloud className="w-2.5 h-2.5" /> :
                              data.provider === 'openai' ? <Zap className="w-2.5 h-2.5" /> :
                              <Bot className="w-2.5 h-2.5" />}
                            <span>AI</span>
                        </div>
                    )}
                    {!isNote && isLogic && (
                        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gray-900/50 border border-gray-600/50 text-[9px] font-medium uppercase tracking-wider ${titleColor}`}>
                            <Cpu className="w-2.5 h-2.5" />
                            <span>Logic</span>
                        </div>
                    )}
                    
                    {/* Loop Iteration Badge */}
                    {type === NodeType.LOOP && (
                        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-900/50 border border-violet-600/50 text-[9px] font-medium uppercase tracking-wider text-violet-300`}>
                            <Repeat className="w-2.5 h-2.5" />
                            <span>{data.currentIteration || 0}/{data.maxIterations || 3}</span>
                        </div>
                    )}

                    {/* Multi-file indicator Badge */}
                    {!isNote && hasFiles && (
                         <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-900/50 border border-blue-600/50 text-[9px] font-medium uppercase tracking-wider text-blue-300`}>
                            <Files className="w-2.5 h-2.5" />
                            <span>{Object.keys(data.files!).length}</span>
                        </div>
                    )}

                    {renderStatus()}
                    {!isNote && (
                         <button 
                            onClick={(e) => { e.stopPropagation(); setShowPopup(!showPopup); }}
                            className={`p-1 rounded transition-colors ${
                                showPopup 
                                ? `${titleColor} bg-gray-800` 
                                : `text-gray-500 hover:${titleColor} hover:bg-gray-800`
                            }`}
                         >
                            {showPopup ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                         </button>
                    )}
                </div>
            </div>

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
      {renderRunButton()}
      {renderApprovalButtons()}
      
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
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-800 border-l border-t border-gray-600 rotate-45"></div>
          </div>
      )}
    </div>
  );
};

export default NodeComponent;