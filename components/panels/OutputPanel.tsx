import React, { useState, useEffect } from 'react';
import { Node, NodeType, ShellType } from '../../types';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { Download, Copy, Wand2, CheckCircle2, AlertCircle, AlertTriangle, Info, FileCode, Code2, FileJson, Globe, FileText, ArrowRightLeft, Wrench } from 'lucide-react';

interface OutputPanelProps {
    node: Node;
    onUpdateNode: (id: string, data: any) => void;
    onRefineNode?: (id: string, instructions: string) => void;
    onAutoFix?: (nodeId: string) => void;
}

const OutputPanel: React.FC<OutputPanelProps> = ({ node, onUpdateNode, onRefineNode, onAutoFix }) => {
    const [activeFile, setActiveFile] = useState<string | null>(null);
    const [refinementInput, setRefinementInput] = useState("");
    const [isRefining, setIsRefining] = useState(false);
    const [targetDiffPath, setTargetDiffPath] = useState("");

    // Initialize active file
    useEffect(() => {
        if (node?.data.files && Object.keys(node.data.files).length > 0) {
            if (!activeFile || !node.data.files[activeFile]) {
                setActiveFile(Object.keys(node.data.files)[0]);
            }
        } else {
            setActiveFile(null);
        }
    }, [node?.id, node?.data.files]);

    const handleRefine = () => {
        if (!onRefineNode || !refinementInput.trim()) return;
        setIsRefining(true);
        onRefineNode(node.id, refinementInput);
        setRefinementInput("");
        setTimeout(() => setIsRefining(false), 2000);
    };

    const hasMultipleFiles = node.data.files && Object.keys(node.data.files).length > 0;
    const isGenerative = [NodeType.GEMINI_GENERATE, NodeType.GEMINI_CHECK, NodeType.AI_UNIT_TEST, NodeType.SIMULATE_RUN, NodeType.LOOP, NodeType.AI_DEBATE, NodeType.MULTI_CHECK, NodeType.ARCHITECT].includes(node.type);

    const getLanguage = (fileName?: string) => {
        if (fileName) {
            if (fileName.endsWith('.py')) return 'python';
            if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return 'javascript';
            if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return 'typescript';
            if (fileName.endsWith('.json')) return 'json';
            if (fileName.endsWith('.html')) return 'html';
            if (fileName.endsWith('.css')) return 'css';
            if (fileName.endsWith('.sh')) return 'shell';
            if (fileName.endsWith('.ps1')) return 'powershell';
            if (fileName.endsWith('.md')) return 'markdown';
        }
        if (node.type === NodeType.GEMINI_GENERATE) return 'python';
        if (node.type === NodeType.SIMULATE_RUN) return 'python';
        if (node.type === NodeType.SHELL_EXEC) {
             const type = node.data.shellType;
             if (type === ShellType.POWERSHELL) return 'powershell';
             if (type === ShellType.CMD) return 'bat';
             return 'shell'; // Fallback for bash, zsh, etc.
        }
        return 'markdown';
    };

    const getFileIcon = (fileName: string) => {
        if (fileName.endsWith('.py')) return <FileCode className="w-3.5 h-3.5 text-yellow-400" />;
        if (fileName.endsWith('.js') || fileName.endsWith('.ts')) return <Code2 className="w-3.5 h-3.5 text-blue-400" />;
        if (fileName.endsWith('.json')) return <FileJson className="w-3.5 h-3.5 text-green-400" />;
        if (fileName.endsWith('.html')) return <Globe className="w-3.5 h-3.5 text-orange-400" />;
        return <FileText className="w-3.5 h-3.5 text-gray-400" />;
    };

    const renderCheckResults = (output: string) => {
        try {
            const issues = JSON.parse(output);
            if (!Array.isArray(issues)) throw new Error("Not an array");
            if (issues.length === 0) {
                return (
                    <div className="flex flex-col items-center justify-center h-full text-green-400">
                        <CheckCircle2 className="w-12 h-12 mb-2" />
                        <p>No issues found!</p>
                    </div>
                )
            }
            const highCount = issues.filter((i: any) => i.severity === 'High').length;
            return (
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
                       <span className="text-xs text-gray-400 font-medium">{issues.length} Issues Found ({highCount} High)</span>
                       {onAutoFix && issues.length > 0 && (
                          <button 
                              onClick={() => onAutoFix(node.id)}
                              className="flex items-center gap-1.5 px-2 py-1 bg-green-700 hover:bg-green-600 text-white rounded text-xs font-bold transition-colors"
                          >
                              <Wrench className="w-3 h-3" />
                              Auto-Fix
                          </button>
                       )}
                    </div>
                    <div className="flex flex-col gap-2 p-2 bg-gray-950 overflow-y-auto flex-1">
                      {issues.map((issue: any, idx: number) => (
                          <div key={idx} className="p-3 bg-gray-800 rounded border border-gray-700 flex gap-3">
                              <div className="shrink-0 pt-0.5">
                                  {issue.severity === 'High' ? <AlertCircle className="w-5 h-5 text-red-500" /> :
                                  issue.severity === 'Medium' ? <AlertTriangle className="w-5 h-5 text-yellow-500" /> :
                                  <Info className="w-5 h-5 text-blue-500" />}
                              </div>
                              <div>
                                  <div className="flex items-center gap-2 mb-1">
                                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                          issue.severity === 'High' ? 'bg-red-900/50 text-red-400' :
                                          issue.severity === 'Medium' ? 'bg-yellow-900/50 text-yellow-400' :
                                          'bg-blue-900/50 text-blue-400'
                                      }`}>{issue.severity}</span>
                                      {issue.line && <span className="text-xs text-gray-500">Line {issue.line}</span>}
                                  </div>
                                  <p className="text-sm text-gray-200 font-medium mb-1">{issue.issue}</p>
                                  <p className="text-xs text-gray-400">{issue.suggestion}</p>
                              </div>
                          </div>
                      ))}
                    </div>
                </div>
            );
        } catch (e) {
            return (
              <Editor
                  height="100%"
                  defaultLanguage="markdown"
                  value={output}
                  theme="vs-dark"
                  options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, wordWrap: 'on' }}
              />
            );
        }
    };

    return (
        <div className="space-y-2 flex flex-col h-80 border-t border-gray-800 pt-4 animate-in fade-in">
            <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-green-500 uppercase tracking-wider flex items-center gap-2">
                    Result
                    {isRefining && <span className="text-gray-400 font-normal normal-case animate-pulse">Refining...</span>}
                </label>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => {
                            const content = hasMultipleFiles && activeFile ? node.data.files?.[activeFile] : node.data.output;
                            navigator.clipboard.writeText(content || '');
                        }}
                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1 bg-gray-800 px-2 py-1 rounded border border-gray-700 hover:border-gray-500 transition-colors"
                        title="Copy to Clipboard"
                    >
                        <Copy className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Refinement Input */}
            {isGenerative && onRefineNode && node.type !== NodeType.ROUTER && (
                <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700 flex gap-2">
                     <input 
                        type="text" 
                        className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none"
                        placeholder="Refine instruction..."
                        value={refinementInput}
                        onChange={(e) => setRefinementInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                     />
                     <button 
                        onClick={handleRefine}
                        disabled={isRefining || !refinementInput.trim()}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs"
                     >
                        <Wand2 className="w-3 h-3" />
                     </button>
                </div>
            )}

            {/* File Tabs - IDE Style */}
            {hasMultipleFiles && (
                <div className="flex overflow-x-auto gap-0.5 border-b border-gray-700 bg-gray-950">
                    {Object.keys(node.data.files!).map(fname => (
                        <button
                            key={fname}
                            onClick={() => setActiveFile(fname)}
                            className={`px-3 py-2 text-xs font-mono flex items-center gap-2 transition-colors border-r border-gray-800 min-w-[100px] max-w-[180px] ${
                                activeFile === fname 
                                ? 'bg-gray-800 text-white border-t-2 border-t-blue-500' 
                                : 'bg-gray-900 text-gray-500 hover:bg-gray-850 hover:text-gray-300'
                            }`}
                            title={fname}
                        >
                            {getFileIcon(fname)}
                            <span className="truncate">{fname}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Editor Output */}
            <div className={`flex-1 border-x border-b border-gray-700 rounded-b overflow-hidden relative group ${!hasMultipleFiles ? 'border-t rounded-t' : ''}`}>
                 {node.type === NodeType.DIFF ? (
                     <DiffEditor 
                        height="100%"
                        original={node.data.diffOriginal || ""}
                        modified={node.data.diffModified || ""}
                        language="python"
                        theme="vs-dark"
                        options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12 }}
                     />
                 ) : node.type === NodeType.GEMINI_CHECK ? (
                    renderCheckResults(node.data.output || "")
                 ) : (
                    <Editor
                        height="100%"
                        defaultLanguage={getLanguage(activeFile || undefined)}
                        value={hasMultipleFiles && activeFile ? node.data.files?.[activeFile] : node.data.output}
                        theme="vs-dark"
                        options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, wordWrap: 'on' }}
                    />
                 )}
            </div>
            
            {/* Grounding Sources */}
            {node.data.groundingSources && (
                <div className="bg-gray-800 border border-gray-700 rounded p-2">
                    <div className="text-[10px] font-bold text-blue-400 mb-1">Sources</div>
                    {node.data.groundingSources.map((s, i) => (
                        <a key={i} href={s.uri} target="_blank" className="block text-[10px] text-gray-400 hover:text-blue-300 truncate">{s.title}</a>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OutputPanel;