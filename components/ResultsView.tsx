import React, { useState } from 'react';
import { TestCase, GenerationLog } from '../types';
import { CheckCircle2, Circle, AlertCircle, Loader2, Download, Eye, FileCode, FileText, Code2, Database } from 'lucide-react';

interface ResultsViewProps {
  testCases: TestCase[];
  logs: GenerationLog[];
  onDownload: () => void;
  isFinished: boolean;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ testCases, logs, onDownload, isFinished }) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'data' | 'script'>('data');

  const selectedCase = testCases.find(tc => tc.id === selectedCaseId) || testCases[0];

  const getStatusIcon = (status: TestCase['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'generating': return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'failed': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Circle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'edge': return 'bg-yellow-900/30 text-yellow-400 border-yellow-800';
      case 'max': return 'bg-red-900/30 text-red-400 border-red-800';
      case 'trick': return 'bg-purple-900/30 text-purple-400 border-purple-800';
      default: return 'bg-blue-900/30 text-blue-400 border-blue-800';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      {/* Left: List */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-850">
          <h2 className="font-semibold text-gray-200">Generated Cases</h2>
          <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400">
            {testCases.filter(t => t.status === 'completed').length} / {testCases.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {testCases.map((tc) => (
            <button
              key={tc.id}
              onClick={() => { setSelectedCaseId(tc.id); setViewMode('data'); }}
              className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3
                ${selectedCase?.id === tc.id 
                  ? 'bg-blue-900/20 border-blue-700/50' 
                  : 'bg-gray-800/50 border-transparent hover:bg-gray-800'
                }
              `}
            >
              <div className="mt-0.5">{getStatusIcon(tc.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-200 truncate text-sm">{tc.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wide font-bold ${getTypeColor(tc.type)}`}>
                    {tc.type}
                  </span>
                  {tc.generationMethod === 'script' && (
                    <FileCode className="w-3 h-3 text-yellow-500 ml-auto" />
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">{tc.description}</p>
              </div>
            </button>
          ))}
        </div>
        
        <div className="p-4 border-t border-gray-800 bg-gray-850">
           <button
             onClick={onDownload}
             disabled={!isFinished}
             className={`w-full py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-all
               ${isFinished 
                 ? 'bg-green-600 hover:bg-green-500 text-white' 
                 : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
             `}
           >
             <Download className="w-4 h-4" />
             Download ZIP
           </button>
        </div>
      </div>

      {/* Middle: Detail View */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 flex-1 flex flex-col overflow-hidden min-h-[400px]">
           {selectedCase ? (
             <>
               <div className="p-4 border-b border-gray-800 bg-gray-850 flex items-center justify-between">
                 <div>
                   <h3 className="font-semibold text-gray-200 flex items-center gap-2">
                     {selectedCase.name}
                     <span className={`text-xs px-2 py-0.5 rounded-full border ${getTypeColor(selectedCase.type)}`}>
                       {selectedCase.type}
                     </span>
                     {selectedCase.generationMethod === 'script' && (
                       <span className="text-xs px-2 py-0.5 rounded-full border bg-yellow-900/20 text-yellow-400 border-yellow-800 flex items-center gap-1">
                         <FileCode className="w-3 h-3" /> Script + Exec
                       </span>
                     )}
                   </h3>
                   <p className="text-xs text-gray-500 mt-1">{selectedCase.description}</p>
                 </div>
                 
                 {selectedCase.generationMethod === 'script' && (
                   <div className="flex bg-gray-800 rounded-lg p-1">
                     <button 
                        onClick={() => setViewMode('data')}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1
                          ${viewMode === 'data' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'}
                        `}
                     >
                        <Database className="w-3 h-3" /> Generated Data
                     </button>
                     <button 
                        onClick={() => setViewMode('script')}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1
                          ${viewMode === 'script' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'}
                        `}
                     >
                        <Code2 className="w-3 h-3" /> Python Script
                     </button>
                   </div>
                 )}
               </div>
               
               <div className="flex-1 overflow-hidden grid grid-cols-2 divide-x divide-gray-800">
                  <div className="flex flex-col h-full col-span-2 lg:col-span-1 lg:border-r border-gray-800">
                    <div className="px-3 py-2 bg-gray-800/50 text-xs font-mono text-gray-400 border-b border-gray-800 flex justify-between items-center">
                      <span>
                        {viewMode === 'script' && selectedCase.generationMethod === 'script' 
                            ? 'Generator Code (Python)' 
                            : 'Input Data (.in)'}
                      </span>
                    </div>
                    <pre className="flex-1 p-4 overflow-auto font-mono text-sm text-gray-300 whitespace-pre-wrap">
                      {viewMode === 'script' && selectedCase.generationMethod === 'script'
                        ? (selectedCase.scriptContent || <span className="text-gray-600 italic">No script...</span>)
                        : (selectedCase.input || <span className="text-gray-600 italic">Generating...</span>)
                      }
                    </pre>
                  </div>
                  <div className="flex flex-col h-full col-span-2 lg:col-span-1">
                    <div className="px-3 py-2 bg-gray-800/50 text-xs font-mono text-gray-400 border-b border-gray-800 flex justify-between">
                      <span>Expected Output (.out)</span>
                      <span className="text-yellow-600 text-[10px] uppercase">AI Simulated</span>
                    </div>
                    <pre className="flex-1 p-4 overflow-auto font-mono text-sm text-gray-300 whitespace-pre-wrap">
                      {selectedCase.expectedOutput || <span className="text-gray-600 italic">Waiting for input...</span>}
                    </pre>
                  </div>
               </div>
             </>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
               <Eye className="w-12 h-12 mb-4 opacity-50" />
               <p>Select a test case to view details</p>
             </div>
           )}
        </div>

        {/* Logs Console */}
        <div className="bg-gray-950 rounded-xl border border-gray-800 h-48 flex flex-col overflow-hidden font-mono text-xs">
          <div className="px-3 py-1 bg-gray-900 border-b border-gray-800 text-gray-400">System Logs</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {logs.map((log, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-gray-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span className={`
                  ${log.type === 'error' ? 'text-red-400' : ''}
                  ${log.type === 'success' ? 'text-green-400' : ''}
                  ${log.type === 'thinking' ? 'text-purple-400' : ''}
                  ${log.type === 'info' ? 'text-gray-300' : ''}
                `}>
                  {log.message}
                </span>
              </div>
            ))}
            <div id="log-end" />
          </div>
        </div>
      </div>
    </div>
  );
};