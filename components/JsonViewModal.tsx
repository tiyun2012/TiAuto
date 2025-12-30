
import React from 'react';
import Editor from '@monaco-editor/react';
import { X, Copy, Download, FileJson } from 'lucide-react';

interface JsonViewModalProps {
  data: any;
  onClose: () => void;
}

const JsonViewModal: React.FC<JsonViewModalProps> = ({ data, onClose }) => {
  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flowgen-workflow-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
        <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-850">
                <div className="flex items-center gap-2">
                    <FileJson className="w-5 h-5 text-blue-500" />
                    <h2 className="text-lg font-semibold text-gray-200">
                        Workflow Source Verification
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition-colors border border-gray-700"
                    >
                        <Copy className="w-4 h-4" /> Copy JSON
                    </button>
                    <button 
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-sm text-white transition-colors"
                    >
                        <Download className="w-4 h-4" /> Download
                    </button>
                    <div className="w-px h-6 bg-gray-700 mx-2"></div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-hidden relative">
                 <div className="absolute top-0 right-0 z-10 bg-gray-800/80 text-[10px] text-gray-400 px-2 py-1 rounded-bl backdrop-blur-sm pointer-events-none">
                    Read-Only View
                 </div>
                <Editor
                    height="100%"
                    defaultLanguage="json"
                    value={jsonString}
                    theme="vs-dark"
                    options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        renderValidationDecorations: 'on'
                    }}
                />
            </div>
             <div className="p-2 border-t border-gray-800 bg-gray-900 text-xs text-gray-500 text-center">
                This JSON representation reflects the current state of all nodes, connections, and output data.
            </div>
        </div>
    </div>
  );
};

export default JsonViewModal;
