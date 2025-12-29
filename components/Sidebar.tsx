import React from 'react';
import { NodeType } from '../types';
import { Play, FileCode, ShieldCheck, Terminal, StickyNote, Laptop } from 'lucide-react';

interface SidebarProps {
  onAddNode: (type: NodeType) => void;
  onRunWorkflow: () => void;
  isExecuting: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ onAddNode, onRunWorkflow, isExecuting }) => {
  return (
    <div className="w-16 md:w-20 flex flex-col items-center py-4 bg-gray-900 border-r border-gray-800 z-30 h-full select-none">
      <div className="mb-8 font-bold text-xl tracking-tighter text-blue-500">FG</div>

      {/* Main Run Button */}
      <button 
        onClick={onRunWorkflow}
        disabled={isExecuting}
        className={`mb-8 p-3 rounded-full shadow-lg transition-all ${
            isExecuting 
            ? 'bg-gray-700 cursor-not-allowed opacity-50' 
            : 'bg-gradient-to-br from-green-500 to-green-600 hover:scale-110 hover:shadow-green-500/20'
        }`}
        title="Execute Workflow"
      >
        <Play fill="white" className="w-6 h-6 text-white ml-0.5" />
      </button>

      <div className="w-8 h-px bg-gray-700 mb-6"></div>

      {/* Tools */}
      <div className="flex flex-col gap-4 overflow-y-auto w-full items-center pb-4 scrollbar-hide">
        <ToolButton 
            icon={<Play />} 
            label="Trigger" 
            color="text-green-400" 
            onClick={() => onAddNode(NodeType.TRIGGER)} 
        />
        <ToolButton 
            icon={<FileCode />} 
            label="Gen" 
            color="text-purple-400" 
            onClick={() => onAddNode(NodeType.GEMINI_GENERATE)} 
        />
        <ToolButton 
            icon={<ShieldCheck />} 
            label="Check" 
            color="text-orange-400" 
            onClick={() => onAddNode(NodeType.GEMINI_CHECK)} 
        />
        <ToolButton 
            icon={<Terminal />} 
            label="Sim" 
            color="text-pink-400" 
            onClick={() => onAddNode(NodeType.SIMULATE_RUN)} 
        />
        <ToolButton 
            icon={<Laptop />} 
            label="VS Code" 
            color="text-blue-400" 
            onClick={() => onAddNode(NodeType.VS_CODE)} 
        />
        <ToolButton 
            icon={<StickyNote />} 
            label="Note" 
            color="text-yellow-400" 
            onClick={() => onAddNode(NodeType.NOTE)} 
        />
      </div>
    </div>
  );
};

const ToolButton = ({ icon, label, onClick, color }: any) => (
    <div className="group relative flex flex-col items-center gap-1 cursor-pointer" onClick={onClick}>
        <div className={`p-3 rounded-xl bg-gray-800 border border-gray-700 hover:border-gray-500 hover:bg-gray-750 transition-all group-hover:-translate-y-1`}>
            {React.cloneElement(icon, { className: `w-6 h-6 ${color}` })}
        </div>
        <span className="text-[10px] font-medium text-gray-500 group-hover:text-gray-300">{label}</span>
        
        {/* Tooltip */}
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
            Add {label} Node
        </div>
    </div>
);

export default Sidebar;