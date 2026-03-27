import React from 'react';
import { TestCase } from '../types';
import { CheckCircle2, Play, FileText, FileCode } from 'lucide-react';

interface PlanReviewProps {
  testCases: TestCase[];
  setTestCases: React.Dispatch<React.SetStateAction<TestCase[]>>;
  onConfirm: () => void;
  onBack: () => void;
}

export const PlanReview: React.FC<PlanReviewProps> = ({ testCases, setTestCases, onConfirm, onBack }) => {

  const toggleMethod = (id: string) => {
    setTestCases(prev => prev.map(tc => {
      if (tc.id !== id) return tc;
      return {
        ...tc,
        generationMethod: tc.generationMethod === 'direct' ? 'script' : 'direct'
      };
    }));
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-blue-400" />
          Test Plan Review
        </h2>
        <p className="text-gray-400">
          Review the proposed test cases. For large datasets (N &gt; 50), we recommend using a 
          <span className="text-yellow-400 font-mono mx-1">Python Script</span> 
          generator. For smaller cases, we can <span className="text-blue-400 font-mono mx-1">Directly</span> generate the data.
        </p>
      </div>

      <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden flex flex-col">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-800 bg-gray-850 text-sm font-medium text-gray-400">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-3">Name</div>
          <div className="col-span-5">Description</div>
          <div className="col-span-3 text-center">Generation Method</div>
        </div>
        
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
          {testCases.map((tc, idx) => (
            <div key={tc.id} className="grid grid-cols-12 gap-4 items-center p-3 rounded-lg bg-gray-800/30 border border-gray-800 hover:border-gray-700 transition-colors">
              <div className="col-span-1 text-center font-mono text-gray-500">{(idx + 1).toString().padStart(2, '0')}</div>
              
              <div className="col-span-3">
                <div className="font-medium text-gray-200">{tc.name}</div>
                <div className="text-xs text-gray-500 uppercase mt-0.5">{tc.type}</div>
              </div>
              
              <div className="col-span-5 text-sm text-gray-400">
                {tc.description}
              </div>
              
              <div className="col-span-3 flex justify-center">
                <button
                  onClick={() => toggleMethod(tc.id)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-all w-32 justify-center
                    ${tc.generationMethod === 'direct' 
                      ? 'bg-blue-900/30 text-blue-400 border-blue-800 hover:bg-blue-900/50' 
                      : 'bg-yellow-900/30 text-yellow-400 border-yellow-800 hover:bg-yellow-900/50'
                    }
                  `}
                >
                  {tc.generationMethod === 'direct' ? (
                    <>
                      <FileText className="w-3 h-3" />
                      Direct Text
                    </>
                  ) : (
                    <>
                      <FileCode className="w-3 h-3" />
                      Python Script
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center pt-2">
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-lg font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
        >
          Cancel
        </button>
        
        <button
          onClick={onConfirm}
          className="flex items-center gap-2 px-8 py-2.5 rounded-lg font-semibold bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 transition-all"
        >
          <Play className="w-5 h-5 fill-current" />
          Start Generation
        </button>
      </div>
    </div>
  );
};