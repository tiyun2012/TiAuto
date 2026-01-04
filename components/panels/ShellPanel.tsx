import React from 'react';
import { Node, AISettings, ShellType } from '../../types';
import Editor from '@monaco-editor/react';
import { Network, FileSearch, BookOpen, HardDrive, Terminal } from 'lucide-react';

interface ShellPanelProps {
    node: Node;
    aiSettings: AISettings;
    onUpdateNode: (id: string, data: any) => void;
}

const ShellPanel: React.FC<ShellPanelProps> = ({ node, aiSettings, onUpdateNode }) => {
    
    // Inject Powershell Snippets
    const insertPsSnippet = (type: 'list' | 'read' | 'sys') => {
        let snippet = "";
        if (type === 'list') {
            snippet = `# Smart List (Recursive, Ignored)\nGet-ChildItem -Recurse -File | Where-Object { \n  $_.FullName -notmatch '\\\\node_modules\\\\' -and $_.FullName -notmatch '\\\\.git\\\\'\n} | Select-Object -ExpandProperty FullName`;
        } else if (type === 'read') {
            snippet = `# Read Content with Header\nGet-ChildItem -Recurse -File -Path "src" | Where-Object { $_.Extension -in ".ts", ".js", ".json" } | ForEach-Object {\n  "// --- FILE: $($_.Name) ---"\n  Get-Content $_.FullName -Raw\n}`;
        } else if (type === 'sys') {
            snippet = `Write-Host "Node: $(node -v)";\nWrite-Host "NPM: $(npm -v)";\nGet-PSDrive C | Select-Object Used,Free;`;
        }
        
        onUpdateNode(node.id, { prompt: snippet, shellType: ShellType.POWERSHELL });
    };

    const getEditorLanguage = (type?: ShellType) => {
        if (type === ShellType.POWERSHELL) return 'powershell';
        if (type === ShellType.CMD) return 'bat';
        return 'shell';
    };

    return (
        <div className="space-y-4">
            {aiSettings.localBridgeEnabled && (
                <div className="flex items-center justify-between p-2 bg-indigo-900/20 rounded border border-indigo-900/50 mb-2">
                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            id="localShell" 
                            checked={node.data.useLocalBridge || false}
                            onChange={(e) => onUpdateNode(node.id, { useLocalBridge: e.target.checked })}
                        />
                        <label htmlFor="localShell" className="text-xs text-indigo-300 font-bold uppercase tracking-wider cursor-pointer flex items-center gap-2">
                            <Network className="w-3 h-3" /> Run on Host
                        </label>
                    </div>
                    {node.data.useLocalBridge && (
                        <div className="flex items-center gap-2">
                            <Terminal className="w-3 h-3 text-gray-400" />
                            <select 
                                value={node.data.shellType || ShellType.CMD} 
                                onChange={(e) => onUpdateNode(node.id, { shellType: e.target.value as ShellType })}
                                className="bg-gray-800 text-xs text-white border border-gray-700 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 uppercase font-mono"
                            >
                                {Object.values(ShellType).map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            )}

            {/* PowerShell Power Tools Toolbar */}
            {node.data.shellType === ShellType.POWERSHELL && node.data.useLocalBridge && (
                <div className="flex gap-2 pb-2 overflow-x-auto scrollbar-hide">
                    <button onClick={() => insertPsSnippet('list')} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-[10px] text-blue-300 whitespace-nowrap flex items-center gap-1" title="Recursively list files excluding node_modules/git">
                        <FileSearch className="w-3 h-3" /> Smart List
                    </button>
                    <button onClick={() => insertPsSnippet('read')} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-[10px] text-green-300 whitespace-nowrap flex items-center gap-1" title="Read multiple files with headers">
                        <BookOpen className="w-3 h-3" /> Read Content
                    </button>
                    <button onClick={() => insertPsSnippet('sys')} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-[10px] text-orange-300 whitespace-nowrap flex items-center gap-1" title="Check Node/NPM/Disk">
                        <HardDrive className="w-3 h-3" /> System Info
                    </button>
                </div>
            )}

            <div className="flex items-center gap-2">
                <input 
                    type="checkbox" 
                    id="aiSim" 
                    checked={!node.data.useLocalBridge && (node.data.useAiSimulation ?? true)}
                    disabled={node.data.useLocalBridge}
                    onChange={(e) => onUpdateNode(node.id, { useAiSimulation: e.target.checked })}
                />
                <label htmlFor="aiSim" className={`text-xs ${node.data.useLocalBridge ? 'text-gray-600' : 'text-gray-400'} cursor-pointer`}>Simulate in Browser (AI)</label>
            </div>
            <div className="space-y-2 flex flex-col h-48">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Command</label>
                <div className="flex-1 border border-gray-700 rounded overflow-hidden">
                    <Editor
                        height="100%"
                        defaultLanguage={getEditorLanguage(node.data.shellType)}
                        value={node.data.prompt || ''}
                        onChange={(value) => onUpdateNode(node.id, { prompt: value })}
                        theme="vs-dark"
                        options={{ minimap: { enabled: false }, fontSize: 13 }}
                    />
                </div>
            </div>
        </div>
    );
};

export default ShellPanel;