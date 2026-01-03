import React, { useState, useEffect } from 'react';
import { AISettings } from '../types';
import { bridgeBrowse, BrowserData } from '../services/localBridgeService';
import { Folder, FolderOpen, ArrowUp, Check, X, Loader2, HardDrive } from 'lucide-react';

interface FileBrowserModalProps {
  initialPath: string;
  settings: AISettings;
  onSelect: (path: string) => void;
  onClose: () => void;
}

const FileBrowserModal: React.FC<FileBrowserModalProps> = ({ initialPath, settings, onSelect, onClose }) => {
  const [currentPath, setCurrentPath] = useState(initialPath || '.');
  const [data, setData] = useState<BrowserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDir = async (path: string) => {
      setLoading(true);
      setError(null);
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
      if (data) {
          onSelect(data.current);
          onClose();
      }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-100">
        <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg flex flex-col h-[60vh]">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 bg-gray-850 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-blue-400" />
                    Browse Folder
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
                        {data.folders.length === 0 ? (
                            <div className="text-center py-10 text-gray-600 text-sm italic">Empty Folder</div>
                        ) : (
                            data.folders.map(folder => (
                                <button
                                    key={folder}
                                    onClick={() => fetchDir(currentPath + data.separator + folder)}
                                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-800 flex items-center gap-3 group transition-colors"
                                >
                                    <Folder className="w-4 h-4 text-yellow-500 group-hover:text-yellow-400" />
                                    <span className="text-sm text-gray-300 group-hover:text-white truncate">{folder}</span>
                                </button>
                            ))
                        )}
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-800 bg-gray-900 flex justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
                <button 
                    onClick={handleSelect}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg flex items-center gap-2"
                >
                    <Check className="w-4 h-4" />
                    Select This Folder
                </button>
            </div>
        </div>
    </div>
  );
};

export default FileBrowserModal;