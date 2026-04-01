import React, { useState, useEffect } from 'react';
import { ProblemContext } from '../types';
import { Code2, FileText, Play, Settings, Clock, Hash, KeyRound, ChevronDown, Check } from 'lucide-react';

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

  const [availableModels, setAvailableModels] = useState<{ id: string, name: string }[]>([
    { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview' },
    { id: 'gemini-3.0-flash', name: 'Gemini 3 Flash' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }
  ]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchModels = async () => {
      const currentKey = problemContext.apiKeys[problemContext.provider];
      if (!currentKey || currentKey.length < 5) return;
      setIsLoadingModels(true);
      try {
        let models: any[] = [];
        if (problemContext.provider === 'google') {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${currentKey}`);
          if (!response.ok) throw new Error('Failed to fetch Gemini');
          const data = await response.json();
          models = data.models
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent') && m.name.includes('gemini'))
            .map((m: any) => ({
              id: m.name.replace('models/', ''),
              name: m.displayName || m.name.replace('models/', '')
            }));
        } else if (problemContext.provider === 'laozhang') {
          const response = await fetch(`https://api.laozhang.ai/v1/models`, {
            headers: { 'Authorization': `Bearer ${currentKey}` }
          });
          if (!response.ok) throw new Error('Failed to fetch LaoZhang models');
          const data = await response.json();
          if (data.data) {
            const modernKeywords = ['o3', 'o4', 'gpt-4.1', 'gpt-4o', 'claude-3.5', 'claude-sonnet-4', 'claude-opus-4', 'deepseek-v3', 'deepseek-r1', 'qwen-max', 'qwen-plus', 'gemini-3', 'gemini-2.5'];
            const excludeDatesAndVariants = /\d{8}|\d{4}-\d{2}-\d{2}|vision|0125|2.5|1106|0613|0806|0314|0409/i;

            models = data.data
              .filter((m: any) => {
                const id = m.id.toLowerCase();
                return modernKeywords.some(kw => id.includes(kw)) && !excludeDatesAndVariants.test(id);
              })
              .map((m: any) => ({ id: m.id, name: m.id }));
          }
        }

        if (models.length > 0) {
          setAvailableModels(models);
          // if current selected model is not in the fetched valid models list, auto-select the first valid one
          if (!models.find((m: any) => m.id === problemContext.selectedModel)) {
            setProblemContext(prev => ({ ...prev, selectedModel: models[0].id }));
          }
        }
      } catch (e) {
        console.error("Fetch models error:", e);
      } finally {
        setIsLoadingModels(false);
      }
    };

    const timeoutId = setTimeout(fetchModels, 800); // 800ms debounce
    return () => clearTimeout(timeoutId);
  }, [problemContext.apiKeys, problemContext.provider, problemContext.selectedModel, setProblemContext]);

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
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-4">

        {/* Top bar for Provider and API Key */}
        <div className="flex flex-col md:flex-row items-center gap-6 border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="text-gray-400 text-sm font-medium">Provider:</div>
            <div className="flex bg-gray-950 border border-gray-800 rounded-lg p-1">
              <button
                type="button"
                onClick={() => handleChange('provider', 'google')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${problemContext.provider === 'google' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
              >
                Google Native
              </button>
              <button
                type="button"
                onClick={() => handleChange('provider', 'laozhang')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${problemContext.provider === 'laozhang' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
              >
                LaoZhang API
              </button>
            </div>
          </div>

          <div className="w-px h-8 bg-gray-800 hidden md:block" />

          {/* API Key Input */}
          <div className="flex items-center gap-3 flex-1 min-w-[200px] max-w-lg">
            <div className="flex items-center gap-2 text-gray-400 text-sm whitespace-nowrap">
              <KeyRound className="w-4 h-4" />
              <span>{problemContext.provider === 'google' ? 'Gemini Key:' : 'LaoZhang Key:'}</span>
            </div>
            <input
              type="password"
              placeholder={`Enter ${problemContext.provider === 'google' ? 'Google Gemini' : 'LaoZhang / OpenAI'} API Key...`}
              value={problemContext.apiKeys[problemContext.provider] || ''}
              onChange={(e) => {
                setProblemContext(prev => ({
                  ...prev,
                  apiKeys: { ...prev.apiKeys, [prev.provider]: e.target.value }
                }));
              }}
              disabled={isProcessing}
              className="flex-1 bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-300 focus:ring-1 focus:ring-blue-500 outline-none w-full"
            />
          </div>
        </div>

        {/* Bottom bar for generation settings */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6 w-full md:w-auto flex-1">

            {/* Model Selection */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Settings className="w-4 h-4" />
                <span>Model:</span>
              </div>
              <div className="relative w-56">
                <button
                  type="button"
                  onClick={() => !isProcessing && !isLoadingModels && setIsModelDropdownOpen(!isModelDropdownOpen)}
                  className={`w-full flex items-center justify-between bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-300 focus:ring-1 focus:ring-blue-500 outline-none transition-colors ${isProcessing || isLoadingModels ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-500'}`}
                >
                  <span className="truncate pr-2 font-medium">
                    {isLoadingModels ? 'Loading...' : availableModels.find(m => m.id === problemContext.selectedModel)?.name || 'Select Model'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isModelDropdownOpen && !isProcessing && !isLoadingModels && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsModelDropdownOpen(false)} />
                    <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="max-h-60 overflow-y-auto">
                        {availableModels.map(model => (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => {
                              handleChange('selectedModel', model.id);
                              setIsModelDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between group transition-colors ${problemContext.selectedModel === model.id ? 'bg-blue-900/30 text-blue-400' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                          >
                            <span className="truncate pr-2">{model.name}</span>
                            {problemContext.selectedModel === model.id && (
                              <Check className="w-4 h-4 flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="w-px h-8 bg-gray-800 hidden md:block" />

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
        </div>

        <button
          onClick={onStart}
          disabled={!problemContext.statement || !problemContext.solution || !problemContext.apiKeys[problemContext.provider] || isProcessing}
          className={`
            flex items-center gap-2 px-8 py-2.5 rounded-lg font-semibold transition-all w-full md:w-auto justify-center
            ${(!problemContext.statement || !problemContext.solution || !problemContext.apiKeys[problemContext.provider] || isProcessing)
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