

import React from 'react';
import { NodeType } from '../types';
import { Play, Sparkles, ShieldCheck, Terminal, StickyNote, Laptop, ListTodo, Binary, Brain, Cpu, SquareTerminal, FlaskConical, FileDiff, ThumbsUp, Repeat, FolderOpen, Users, Layers, GitFork, Save, GitBranch, Briefcase, FileSearch, ListRestart } from 'lucide-react';

interface SidebarProps {
  onAddNode: (type: NodeType) => void;
  onRunWorkflow: () => void;
  isExecuting: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ onAddNode, onRunWorkflow, isExecuting }) => {
  return (
    <div className="w-16 md:w-20 flex flex-col items-center py-4 bg-gray-900 border-r border-gray-800 z-50 h-full select-none shadow-xl">
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
            tooltip="Starts the flow manually."
            color="text-green-400" 
            onClick={() => onAddNode(NodeType.TRIGGER)}
            type={NodeType.TRIGGER} 
        />
        <ToolButton 
            icon={<FileSearch />} 
            label="Index" 
            tooltip="List Project Files (Bridge)."
            color="text-cyan-300" 
            onClick={() => onAddNode(NodeType.PROJECT_INDEX)}
            type={NodeType.PROJECT_INDEX} 
        />
        <ToolButton 
            icon={<FolderOpen />} 
            label="Read File" 
            tooltip="Load local file content."
            color="text-blue-300" 
            onClick={() => onAddNode(NodeType.READ_FILE)}
            type={NodeType.READ_FILE} 
        />
        <ToolButton 
            icon={<Save />} 
            label="Write File" 
            tooltip="Save content to disk."
            color="text-red-300" 
            onClick={() => onAddNode(NodeType.WRITE_FILE)}
            type={NodeType.WRITE_FILE} 
        />
        <ToolButton 
            icon={<Briefcase />} 
            label="Architect" 
            tooltip="Plan project structure."
            color="text-emerald-300" 
            onClick={() => onAddNode(NodeType.ARCHITECT)}
            type={NodeType.ARCHITECT} 
        />
        <ToolButton 
            icon={<ListRestart />} 
            label="Iterator" 
            tooltip="Execute tasks one by one."
            color="text-violet-300" 
            onClick={() => onAddNode(NodeType.TASK_ITERATOR)}
            type={NodeType.TASK_ITERATOR} 
        />
        <ToolButton 
            icon={<GitBranch />} 
            label="Git" 
            tooltip="Version Control (Commit/Push)."
            color="text-orange-300" 
            onClick={() => onAddNode(NodeType.GIT_CONTROL)}
            type={NodeType.GIT_CONTROL} 
        />
        <ToolButton 
            icon={<Sparkles />} 
            label="Gen" 
            tooltip="Generates Code/Text (Creative)."
            color="text-purple-400" 
            onClick={() => onAddNode(NodeType.GEMINI_GENERATE)}
            type={NodeType.GEMINI_GENERATE} 
        />
        <ToolButton 
            icon={<Users />} 
            label="Debate" 
            tooltip="Multi-Persona Discussion."
            color="text-pink-400" 
            onClick={() => onAddNode(NodeType.AI_DEBATE)}
            type={NodeType.AI_DEBATE} 
        />
        <ToolButton 
            icon={<ShieldCheck />} 
            label="Check" 
            tooltip="Audits Code for Bugs/Security."
            color="text-orange-400" 
            onClick={() => onAddNode(NodeType.GEMINI_CHECK)}
            type={NodeType.GEMINI_CHECK} 
        />
        <ToolButton 
            icon={<Layers />} 
            label="Group" 
            tooltip="Run Check on Multiple AIs."
            color="text-indigo-300" 
            onClick={() => onAddNode(NodeType.MULTI_CHECK)}
            type={NodeType.MULTI_CHECK} 
        />
        <ToolButton 
            icon={<Repeat />} 
            label="Loop" 
            tooltip="Retry logic if checks fail."
            color="text-violet-400" 
            onClick={() => onAddNode(NodeType.LOOP)}
            type={NodeType.LOOP} 
        />
        <ToolButton 
            icon={<GitFork />} 
            label="Router" 
            tooltip="Logic Gate (True/False)."
            color="text-yellow-200" 
            onClick={() => onAddNode(NodeType.ROUTER)}
            type={NodeType.ROUTER} 
        />
        <ToolButton 
            icon={<FlaskConical />} 
            label="Tests" 
            tooltip="Writes Unit Tests (Pytest)."
            color="text-cyan-400" 
            onClick={() => onAddNode(NodeType.AI_UNIT_TEST)}
            type={NodeType.AI_UNIT_TEST} 
        />
         <ToolButton 
            icon={<SquareTerminal />} 
            label="Shell" 
            tooltip="Simulates Command Line."
            color="text-gray-200" 
            onClick={() => onAddNode(NodeType.SHELL_EXEC)}
            type={NodeType.SHELL_EXEC} 
        />
        <ToolButton 
            icon={<Terminal />} 
            label="Sim" 
            tooltip="Predicts execution output (Safe)."
            color="text-pink-400" 
            onClick={() => onAddNode(NodeType.SIMULATE_RUN)}
            type={NodeType.SIMULATE_RUN} 
        />
         <ToolButton 
            icon={<Binary />} 
            label="Py Run" 
            tooltip="Executes Python in Browser."
            color="text-yellow-400" 
            onClick={() => onAddNode(NodeType.PYTHON_EXEC)}
            type={NodeType.PYTHON_EXEC} 
        />
        <ToolButton 
            icon={<FileDiff />} 
            label="Diff" 
            tooltip="Compares two inputs."
            color="text-indigo-400" 
            onClick={() => onAddNode(NodeType.DIFF)}
            type={NodeType.DIFF} 
        />
        <ToolButton 
            icon={<ListTodo />} 
            label="Tasks" 
            tooltip="Manual Checklist."
            color="text-teal-400" 
            onClick={() => onAddNode(NodeType.TODO_LIST)}
            type={NodeType.TODO_LIST} 
        />
        <ToolButton 
            icon={<Laptop />} 
            label="VS Code" 
            tooltip="Opens local VS Code."
            color="text-blue-400" 
            onClick={() => onAddNode(NodeType.VS_CODE)}
            type={NodeType.VS_CODE} 
        />
        <ToolButton 
            icon={<StickyNote />} 
            label="Note" 
            tooltip="Add sticky notes."
            color="text-yellow-400" 
            onClick={() => onAddNode(NodeType.NOTE)}
            type={NodeType.NOTE} 
        />
      </div>
    </div>
  );
};

const ToolButton = ({ icon, label, tooltip, onClick, color, type }: { icon: any, label: string, tooltip: string, onClick: () => void, color: string, type: NodeType }) => {
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('application/flowgen-node', type);
        e.dataTransfer.effectAllowed = 'move';
    };

    const isAI = [NodeType.GEMINI_GENERATE, NodeType.GEMINI_CHECK, NodeType.SIMULATE_RUN, NodeType.AI_UNIT_TEST, NodeType.AI_DEBATE, NodeType.MULTI_CHECK, NodeType.ARCHITECT].includes(type);
    const isLogic = [NodeType.TRIGGER, NodeType.PYTHON_EXEC, NodeType.VS_CODE, NodeType.TODO_LIST, NodeType.SHELL_EXEC, NodeType.DIFF, NodeType.APPROVAL, NodeType.LOOP, NodeType.READ_FILE, NodeType.ROUTER, NodeType.GIT_CONTROL, NodeType.PROJECT_INDEX, NodeType.TASK_ITERATOR].includes(type);

    return (
        <div 
            className="group relative flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing select-none" 
            onClick={onClick}
            draggable
            onDragStart={handleDragStart}
        >
            <div className={`relative p-3 rounded-xl bg-gray-800 border border-gray-700 hover:border-gray-500 hover:bg-gray-750 transition-all group-hover:-translate-y-1`}>
                {React.cloneElement(icon, { className: `w-6 h-6 ${color}` })}
                
                {/* Type Indicator Dot */}
                {isAI && <div className="absolute -top-1 -right-1 bg-gray-900 rounded-full p-0.5 border border-gray-700"><Sparkles className={`w-2.5 h-2.5 ${color}`} /></div>}
                {isLogic && <div className="absolute -top-1 -right-1 bg-gray-900 rounded-full p-0.5 border border-gray-700"><Cpu className={`w-2.5 h-2.5 ${color}`} /></div>}
            </div>
            <span className="text-[10px] font-medium text-gray-500 group-hover:text-gray-300">{label}</span>
            
            {/* Tooltip */}
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-all duration-200">
                <span className="font-bold block mb-0.5 text-gray-300">{label}</span>
                <span className="text-gray-500">{tooltip}</span>
            </div>
        </div>
    );
};

export default Sidebar;