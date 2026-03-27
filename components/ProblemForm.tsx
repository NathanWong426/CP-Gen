import React from 'react';
import { ProblemContext } from '../types';
import { Code2, FileText, Play, Settings, Clock, Hash } from 'lucide-react';

interface ProblemFormProps {
  problemContext: ProblemContext;
  setProblemContext: React.Dispatch<React.SetStateAction<ProblemContext>>;
  onStart: () => void;
  isProcessing: boolean;
}

export const ProblemForm: React.FC<ProblemFormProps> = ({
  problemContext,
  setProblemContext,
  onStart,
  isProcessing
}) => {
  
  const handleChange = (field: keyof ProblemContext, value: any) => {
    setProblemContext(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex flex-col flex-1 gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[600px]">
        <div className="flex flex-col gap-2 h-full">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            Problem Statement
          </label>
          <textarea
            className="flex-1 w-full bg-gray-900 border border-gray-700 rounded-lg p-4 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            placeholder="Paste the full problem description here (Input format, constraints, examples)..."
            value={problemContext.statement}
            onChange={(e) => handleChange('statement', e.target.value)}
            disabled={isProcessing}
          />
        </div>

        <div className="flex flex-col gap-2 h-full">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-green-400" />
            Standard Solution (C++/Python/Java)
          </label>
          <textarea
            className="flex-1 w-full bg-gray-900 border border-gray-700 rounded-lg p-4 font-mono text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
            placeholder="Paste the correct solution code here..."
            value={problemContext.solution}
            onChange={(e) => handleChange('solution', e.target.value)}
            disabled={isProcessing}
          />
        </div>
      </div>

      {/* Configuration Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          
          {/* Test Case Count */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Hash className="w-4 h-4" />
              <span>Test Cases:</span>
            </div>
            <input
              type="number"
              min={1}
              max={50}
              value={problemContext.testCaseCount}
              onChange={(e) => handleChange('testCaseCount', parseInt(e.target.value) || 1)}
              disabled={isProcessing}
              className="w-16 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-center font-mono text-sm focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="w-px h-8 bg-gray-800 hidden md:block" />

          {/* Rate Limit Settings */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={problemContext.enableDelay}
                  onChange={(e) => handleChange('enableDelay', e.target.checked)}
                  disabled={isProcessing}
                />
                <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </div>
              <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">API Rate Limit Delay</span>
            </label>

            {problemContext.enableDelay && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4 duration-200">
                <Clock className="w-4 h-4 text-gray-500" />
                <input
                  type="number"
                  min={1}
                  value={problemContext.delaySeconds}
                  onChange={(e) => handleChange('delaySeconds', parseInt(e.target.value) || 0)}
                  disabled={isProcessing}
                  className="w-16 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-center font-mono text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <span className="text-sm text-gray-500">seconds</span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onStart}
          disabled={!problemContext.statement || !problemContext.solution || isProcessing}
          className={`
            flex items-center gap-2 px-8 py-2.5 rounded-lg font-semibold transition-all w-full md:w-auto justify-center
            ${(!problemContext.statement || !problemContext.solution || isProcessing)
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
            }
          `}
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              Generate
            </>
          )}
        </button>
      </div>
    </div>
  );
};