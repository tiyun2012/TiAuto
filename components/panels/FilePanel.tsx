import React, { useState } from 'react';
import { Node, NodeType, AISettings } from '../../types';
import Editor from '@monaco-editor/react';
import { Network, FolderOpen, Save } from 'lucide-react';
import FileBrowserModal from '../FileBrowserModal';

interface FilePanelProps {
    node: Node;
    aiSettings: AISettings;
    onUpdateNode: (id: string, data: any) => void;
}

const FilePanel: React.FC<FilePanelProps> = ({ node, aiSettings, onUpdateNode }) => {
    const [showFilePicker, setShowFilePicker] = useState(false);

    // Handle local file selection (Browser Upload)
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const content = ev.target?.result as string;
            onUpdateNode(node.id, { 
                code: content, 
                label: file.name,
                output: content 
            });
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-4">
            {/* READ FILE CONFIG */}
            {node.type === NodeType.READ_FILE && (
                <>
                    {aiSettings.localBridgeEnabled && (
                        <div className="space-y-2 pb-2 border-b border-gray-700">
                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="localRead"
                                    checked={node.data.useLocalBridge || false}
                                    onChange={(e) => onUpdateNode(node.id, { useLocalBridge: e.target.checked })}
                                />
                                <label htmlFor="localRead" className="text-xs text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer">
                                    <Network className="w-3 h-3" /> Read from Local Path
                                </label>
                            </div>
                            {node.data.useLocalBridge && (
                                <div className="space-y-1">
                                    <div className="flex gap-2">
                                        <input 
                                            type="text"
                                            placeholder="/path/to/file.txt, src/other.ts"
                                            value={node.data.localPath || ''}
                                            onChange={(e) => onUpdateNode(node.id, { localPath: e.target.value })}
                                            className="flex-1 bg-gray-800 border border-indigo-900/50 rounded p-2 text-sm font-mono focus:ring-1 focus:ring-indigo-500"
                                        />
                                        <button 
                                            onClick={() => setShowFilePicker(true)}
                                            className="bg-indigo-700 hover:bg-indigo-600 text-white p-2 rounded"
                                            title="Browse Files"
                                        >
                                            <FolderOpen className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-500">Supports multiple comma-separated paths.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {!node.data.useLocalBridge && (
                        <div className="p-4 bg-gray-800 border-2 border-dashed border-gray-700 rounded-lg text-center hover:border-blue-500 transition-colors">
                            <label className="cursor-pointer block">
                                <FolderOpen className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                                <span className="text-sm font-medium text-gray-300">
                                    {node.data.label !== 'Read File' ? node.data.label : 'Select Local File (Browser Upload)'}
                                </span>
                                <input type="file" className="hidden" onChange={handleFileUpload} />
                            </label>
                        </div>
                    )}
                </>
            )}

            {/* WRITE FILE CONFIG */}
            {node.type === NodeType.WRITE_FILE && (
                <>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-red-300 uppercase tracking-wider flex items-center gap-2">
                            <Save className="w-3.5 h-3.5" /> Output Path
                        </label>
                        <input 
                            type="text"
                            placeholder="/path/to/output_file.ext"
                            value={node.data.localPath || ''}
                            onChange={(e) => onUpdateNode(node.id, { localPath: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm font-mono"
                        />
                    </div>
                    
                    {aiSettings.localBridgeEnabled ? (
                        <div className="flex items-center gap-2 p-2 bg-indigo-900/20 rounded border border-indigo-900/50">
                            <input 
                                type="checkbox" 
                                id="localWrite"
                                checked={node.data.useLocalBridge || true} 
                                onChange={(e) => onUpdateNode(node.id, { useLocalBridge: e.target.checked })}
                            />
                            <label htmlFor="localWrite" className="text-xs text-indigo-300 cursor-pointer">Write to real disk via Bridge</label>
                        </div>
                    ) : (
                        <div className="p-2 bg-yellow-900/20 text-yellow-500 text-xs rounded border border-yellow-900/50">
                            Local Bridge disabled. File write will be simulated.
                        </div>
                    )}

                    <div className="mt-4 space-y-2 flex flex-col h-40">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Content Override (Optional)</label>
                        <div className="flex-1 border border-gray-700 rounded overflow-hidden">
                            <Editor
                                height="100%"
                                defaultLanguage="text"
                                value={node.data.code || ''}
                                onChange={(value) => onUpdateNode(node.id, { code: value })}
                                theme="vs-dark"
                                options={{ minimap: { enabled: false }, fontSize: 13 }}
                            />
                        </div>
                    </div>
                </>
            )}

            {/* Modal */}
            {showFilePicker && (
                <FileBrowserModal 
                    initialPath={aiSettings.localProjectPath || "."}
                    settings={aiSettings}
                    mode="files"
                    onSelect={(path) => onUpdateNode(node.id, { localPath: path })}
                    onClose={() => setShowFilePicker(false)}
                />
            )}
        </div>
    );
};

export default FilePanel;