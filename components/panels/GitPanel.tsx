import React from 'react';
import { Node } from '../../types';

interface GitPanelProps {
    node: Node;
    onUpdateNode: (id: string, data: any) => void;
}

const GitPanel: React.FC<GitPanelProps> = ({ node, onUpdateNode }) => {
    return (
        <div className="space-y-4 p-4 bg-orange-900/20 border border-orange-800/50 rounded-lg">
            <div className="space-y-2">
                <label className="text-xs font-bold text-orange-400 uppercase tracking-wider">Command</label>
                <select 
                    value={node.data.gitCommand || 'status'}
                    onChange={(e) => onUpdateNode(node.id, { gitCommand: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white"
                >
                    <option value="status">Status</option>
                    <option value="add">Add All (git add .)</option>
                    <option value="commit">Commit</option>
                    <option value="push">Push</option>
                    <option value="log">Log</option>
                </select>
            </div>
            
            {node.data.gitCommand === 'status' && (
                    <div className="flex items-center gap-2 mt-2">
                    <input 
                        type="checkbox" 
                        checked={node.data.gitStopOnDirty || false}
                        onChange={(e) => onUpdateNode(node.id, { gitStopOnDirty: e.target.checked })}
                        className="rounded bg-gray-700 border-gray-600 text-orange-500"
                    />
                    <span className="text-xs text-orange-300">Stop workflow if dirty</span>
                </div>
            )}

            {node.data.gitCommand === 'commit' && (
                <div className="space-y-2">
                    <label className="text-xs font-bold text-orange-400 uppercase tracking-wider">Message</label>
                    <input 
                        type="text"
                        placeholder="Commit message..."
                        value={node.data.gitMessage || ''}
                        onChange={(e) => onUpdateNode(node.id, { gitMessage: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                    />
                </div>
            )}
            <div className="flex items-center gap-2 mt-2">
                <input 
                    type="checkbox" 
                    checked={node.data.useLocalBridge || true}
                    disabled
                    className="rounded bg-gray-700 border-gray-600 text-orange-500"
                />
                <span className="text-xs text-gray-400">Always uses Local Bridge</span>
            </div>
        </div>
    );
};

export default GitPanel;