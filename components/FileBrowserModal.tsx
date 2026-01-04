import React, { useState, useEffect } from 'react';
import { AISettings } from '../types';
import { bridgeBrowse, BrowserData } from '../services/localBridgeService';
import { Folder, FolderOpen, ArrowUp, Check, X, Loader2, HardDrive, FileText, CheckSquare, Square, PlusSquare } from 'lucide-react';

interface FileBrowserModalProps {
  initialPath: string;
  settings: AISettings;
  onSelect: (path: string) => void;
  onClose: () => void;
  mode?: 'folder' | 'files'; // New prop
}

const FileBrowserModal: React.FC<FileBrowserModalProps> = ({ initialPath, settings, onSelect, onClose, mode = 'folder' }) => {
  const [currentPath, setCurrentPath] = useState(initialPath || '.');
  const [data, setData] = useState<BrowserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Multi-select state
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const fetchDir = async (path: string) => {
      setLoading(true);
      setError(null);
      // Clear selection on dir change
      setSelectedFiles(new Set());
      try {
          const res = await bridgeBrowse(path, settings);
          setData(res);
          setCurrentPath(res.current);
      } catch (e: any) {
          setError(e.message);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchDir(currentPath);
  }, []);

  const handleSelect = () => {
      if (!data) return;

      if (mode === 'folder') {
          onSelect(data.current);
      } else {
          // Join selected files with full paths
          const fullPaths = Array.from(selectedFiles).map(f => {
              // If path already absolute (or weird), use it, otherwise join
              // (Note: simple join here relies on bridge normalization)
              return `${data.current}${data.separator}${f}`;
          });
          onSelect(fullPaths.join(', '));
      }
      onClose();
  };

  const toggleFile = (filename: string) => {
      setSelectedFiles(prev => {
          const next = new Set(prev);
          if (next.has(filename)) next.delete(filename);
          else next.add(filename);
          return next;
      });
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-100">
        <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg flex flex-col h-[70vh]">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 bg-gray-850 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-blue-400" />
                    {mode === 'folder' ? 'Select Folder' : 'Select Files/Folders'}
                </h3>
                <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-white" /></button>
            </div>

            {/* Path Bar */}
            <div className="px-4 py-2 bg-gray-950 border-b border-gray-800 flex items-center gap-2">
                 <button 
                    onClick={() => data?.parent && fetchDir(data.parent)}
                    disabled={!data?.parent || loading}
                    className="p-1.5 hover:bg-gray-800 rounded disabled:opacity-30 text-gray-400 hover:text-white"
                    title="Go Up"
                 >
                     <ArrowUp className="w-4 h-4" />
                 </button>
                 <div className="flex-1 bg-gray-900 border border-gray-800 rounded px-2 py-1 text-xs font-mono text-gray-300 truncate">
                     {currentPath}
                 </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loading && (
                    <div className="flex items-center justify-center h-full text-gray-500 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading...
                    </div>
                )}
                
                {error && (
                    <div className="p-4 text-center text-red-400 text-sm">
                        {error}
                        <div className="mt-2">
                            <button onClick={() => fetchDir('.')} className="text-blue-400 hover:underline">Reset to Root</button>
                        </div>
                    </div>
                )}

                {!loading && !error && data && (
                    <>
                        {data.folders.length === 0 && data.files?.length === 0 ? (
                            <div className="text-center py-10 text-gray-600 text-sm italic">Empty Folder</div>
                        ) : (
                            <>
                                {/* Folders */}
                                {data.folders.map(folder => {
                                    const isSelected = selectedFiles.has(folder);
                                    return (
                                        <div key={folder} className="flex items-center gap-1 group">
                                            {mode === 'files' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleFile(folder); }}
                                                    className={`p-2 rounded hover:bg-gray-800 ${isSelected ? 'text-green-400' : 'text-gray-600 hover:text-gray-300'}`}
                                                    title="Add entire folder"
                                                >
                                                    {isSelected ? <CheckSquare className="w-4 h-4" /> : <PlusSquare className="w-4 h-4" />}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => fetchDir(currentPath + data.separator + folder)}
                                                className="flex-1 text-left px-3 py-2 rounded hover:bg-gray-800 flex items-center gap-3 transition-colors"
                                            >
                                                <Folder className="w-4 h-4 text-yellow-500 group-hover:text-yellow-400" />
                                                <span className="text-sm text-gray-300 group-hover:text-white truncate">{folder}</span>
                                            </button>
                                        </div>
                                    );
                                })}
                                
                                {/* Files */}
                                {data.files?.map(file => {
                                    const isSelected = selectedFiles.has(file);
                                    return (
                                        <button
                                            key={file}
                                            onClick={() => mode === 'files' && toggleFile(file)}
                                            className={`w-full text-left px-3 py-2 rounded flex items-center gap-3 group transition-colors ${isSelected ? 'bg-blue-900/30' : 'hover:bg-gray-800'} ${mode !== 'files' ? 'opacity-50 cursor-default' : ''}`}
                                        >
                                            <div className="shrink-0 text-gray-500">
                                                {mode === 'files' && (isSelected ? <CheckSquare className="w-4 h-4 text-blue-400" /> : <Square className="w-4 h-4" />)}
                                                {mode !== 'files' && <FileText className="w-4 h-4" />}
                                            </div>
                                            {mode === 'files' && <FileText className="w-4 h-4 text-gray-500" />}
                                            <span className={`text-sm truncate ${isSelected ? 'text-blue-300 font-medium' : 'text-gray-400'}`}>{file}</span>
                                        </button>
                                    );
                                })}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-800 bg-gray-900 flex justify-between items-center">
                <div className="text-xs text-gray-500">
                    {mode === 'files' ? `${selectedFiles.size} selected` : 'Select a folder'}
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
                    <button 
                        onClick={handleSelect}
                        disabled={mode === 'files' && selectedFiles.size === 0}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg flex items-center gap-2"
                    >
                        <Check className="w-4 h-4" />
                        {mode === 'folder' ? 'Set as Root' : 'Merge Selected'}
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default FileBrowserModal;