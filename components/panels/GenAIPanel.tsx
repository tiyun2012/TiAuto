import React from 'react';
import { Node, NodeType, AISettings, AIProvider } from '../../types';
import { GEMINI_MODELS, DEEPSEEK_MODELS, QWEN_MODELS, OPENAI_MODELS } from '../../constants';
import Editor from '@monaco-editor/react';
import { Server, Zap, Globe, Users, Layers, Repeat } from 'lucide-react';

interface GenAIPanelProps {
    node: Node;
    aiSettings: AISettings;
    onUpdateNode: (id: string, data: any) => void;
}

const GenAIPanel: React.FC<GenAIPanelProps> = ({ node, aiSettings, onUpdateNode }) => {
    
    const activeProvider = node.data.provider || aiSettings.provider;
    
    // Get available models based on active provider
    let availableModels: { value: string, label: string }[] = [];
    if (activeProvider === 'gemini') availableModels = GEMINI_MODELS;
    else if (activeProvider === 'deepseek') availableModels = DEEPSEEK_MODELS;
    else if (activeProvider === 'qwen') availableModels = QWEN_MODELS;
    else if (activeProvider === 'openai') availableModels = OPENAI_MODELS;

    const getPromptLabel = () => {
        switch(node.type) {
            case NodeType.GEMINI_CHECK: return 'Check Criteria';
            case NodeType.LOOP: return 'Fix Instructions (Optional)';
            case NodeType.AI_DEBATE: return 'Debate Topic';
            case NodeType.MULTI_CHECK: return 'Instruction for All Providers';
            case NodeType.ROUTER: return 'Condition (e.g. Is code correct?)';
            case NodeType.ARCHITECT: return 'Project Requirements';
            default: return 'Prompt / Instructions';
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
                 {/* Provider Select - Hidden for Multi-Check as it selects many */}
                 {node.type !== NodeType.MULTI_CHECK && (
                     <div className="space-y-2">
                         <label className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                            <Server className="w-3.5 h-3.5" />
                            AI Provider
                         </label>
                         <select 
                            value={node.data.provider || ''}
                            onChange={(e) => {
                                const val = e.target.value as AIProvider | '';
                                onUpdateNode(node.id, { provider: val || undefined, model: undefined });
                            }}
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                         >
                             <option value="">Use Global Default ({aiSettings.provider})</option>
                             <option value="gemini">Google Gemini</option>
                             <option value="deepseek">DeepSeek</option>
                             <option value="qwen">Qwen (Alibaba)</option>
                             <option value="openai">OpenAI / Compatible</option>
                         </select>
                     </div>
                 )}

                 {/* Model Select */}
                 {node.type !== NodeType.MULTI_CHECK && (
                     <div className="space-y-2">
                         <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5" />
                            Model
                         </label>
                         <select 
                            value={node.data.model || ''}
                            onChange={(e) => onUpdateNode(node.id, { model: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                         >
                             <option value="">Default Provider Model</option>
                             {availableModels.map(m => (
                                 <option key={m.value} value={m.value}>{m.label}</option>
                             ))}
                         </select>
                     </div>
                 )}

                 {/* Gemini Grounding */}
                 {node.type === NodeType.GEMINI_GENERATE && activeProvider === 'gemini' && (
                     <div className="flex items-center justify-between pt-2">
                         <div className="flex items-center gap-2">
                             <Globe className="w-4 h-4 text-blue-400" />
                             <span className="text-xs text-gray-300">Google Search Grounding</span>
                         </div>
                         <input 
                            type="checkbox" 
                            checked={node.data.useSearch || false}
                            onChange={(e) => onUpdateNode(node.id, { useSearch: e.target.checked })}
                            className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500/20" 
                        />
                     </div>
                 )}
            </div>

            {/* AI DEBATE CONFIG */}
            {node.type === NodeType.AI_DEBATE && (
                <div className="space-y-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-pink-400 uppercase tracking-wider flex items-center gap-2">
                            <Users className="w-3.5 h-3.5" />
                            Personas
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <input 
                            type="text" 
                            placeholder="Persona A (e.g. Architect)"
                            value={node.data.personaA || ''}
                            onChange={(e) => onUpdateNode(node.id, { personaA: e.target.value })}
                            className="bg-gray-800 border border-gray-700 rounded p-2 text-xs"
                            />
                            <input 
                            type="text" 
                            placeholder="Persona B (e.g. Security)"
                            value={node.data.personaB || ''}
                            onChange={(e) => onUpdateNode(node.id, { personaB: e.target.value })}
                            className="bg-gray-800 border border-gray-700 rounded p-2 text-xs"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-pink-400 uppercase tracking-wider">Rounds</label>
                        <input 
                            type="number" 
                            min="1" 
                            max="5"
                            value={node.data.debateRounds || 2}
                            onChange={(e) => onUpdateNode(node.id, { debateRounds: parseInt(e.target.value) })}
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                        />
                    </div>
                </div>
            )}

            {/* MULTI CHECK CONFIG */}
            {node.type === NodeType.MULTI_CHECK && (
                <div className="space-y-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
                    <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5" />
                        Active Providers
                    </label>
                    <div className="space-y-2">
                        {['gemini', 'deepseek', 'qwen', 'openai'].map((p) => (
                            <label key={p} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                                <input 
                                    type="checkbox"
                                    checked={node.data.enabledProviders?.includes(p as AIProvider) || false}
                                    onChange={(e) => {
                                        const current = node.data.enabledProviders || [];
                                        const next = e.target.checked 
                                            ? [...current, p as AIProvider]
                                            : current.filter(cp => cp !== p);
                                        onUpdateNode(node.id, { enabledProviders: next });
                                    }}
                                    className="rounded bg-gray-700 border-gray-600 text-indigo-500 focus:ring-indigo-500/20"
                                />
                                <span className="capitalize">{p}</span>
                            </label>
                        ))}
                    </div>
                    <p className="text-[10px] text-gray-500">Selected providers will run in parallel.</p>
                </div>
            )}

            {/* LOOP NODE CONFIG */}
            {node.type === NodeType.LOOP && (
                <div className="space-y-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
                            <Repeat className="w-3.5 h-3.5" />
                            Max Retries
                        </label>
                        <div className="flex items-center gap-3">
                            <input 
                                type="range" 
                                min="1" 
                                max="10" 
                                value={node.data.maxIterations || 3}
                                onChange={(e) => onUpdateNode(node.id, { maxIterations: parseInt(e.target.value) })}
                                className="flex-1 accent-violet-500 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                            <span className="text-sm font-mono w-6 text-center">{node.data.maxIterations || 3}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Standard Prompt Editor */}
            <div className="space-y-2 flex flex-col h-64">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                   {getPromptLabel()}
                </label>
                <div className="flex-1 border border-gray-700 rounded overflow-hidden">
                    <Editor
                        height="100%"
                        defaultLanguage="markdown"
                        value={node.data.prompt || ''}
                        onChange={(value) => onUpdateNode(node.id, { prompt: value })}
                        theme="vs-dark"
                        options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on' }}
                    />
                </div>
             </div>
        </div>
    );
};

export default GenAIPanel;