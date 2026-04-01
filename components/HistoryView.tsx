import React, { useEffect, useState } from 'react';
import { GenerationRecord } from '../types';
import { getGenerations, deleteGeneration } from '../utils/db';
import { Clock, Trash2, ArrowRight } from 'lucide-react';

interface HistoryViewProps {
  onLoadGeneration: (record: GenerationRecord) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onLoadGeneration }) => {
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getGenerations();
      setHistory(data);
    } catch (e) {
      console.error('Failed to load history', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this record?')) {
      await deleteGeneration(id);
      loadData();
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 h-[60vh]">
        <Clock className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg">No history records found.</p>
        <p className="text-sm">Generations will automatically save here.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Generation History</h2>
          <p className="text-gray-400">View and download your past AI-generated test cases.</p>
        </div>
        <div className="text-sm font-medium text-gray-500 bg-gray-900 px-3 py-1 rounded border border-gray-800">
          Total: {history.length}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {history.map((record) => (
          <div 
            key={record.id} 
            className="group bg-gray-900 border border-gray-800 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-900/20 transition-all rounded-xl p-5 flex flex-col cursor-pointer"
            onClick={() => onLoadGeneration(record)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-400 font-medium">
                  {new Date(record.date).toLocaleString()}
                </span>
              </div>
              <button
                onClick={(e) => handleDelete(record.id, e)}
                className="text-gray-600 hover:text-red-400 transition-colors p-1"
                title="Delete Record"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 mb-4">
              <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed">
                {record.problemStatement || "(No statement provided)"}
              </p>
            </div>

            <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 font-mono w-fit">
                   {record.modelName}
                </div>
                <div className="text-xs text-gray-500">
                   {record.testCases?.length || 0} Test Cases
                </div>
              </div>
              
              <div className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
