import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { ProblemForm } from './components/ProblemForm';
import { PlanReview } from './components/PlanReview';
import { ResultsView } from './components/ResultsView';
import { ProblemContext, TestCase, GeneratorState, GenerationLog } from './types';
import { analyzeProblemAndPlan, generateInputData, generateExpectedOutput } from './services/aiGenerator';
import { runPythonScript } from './services/pyodide';
import { executeCppWasm } from './services/wasmCppRunner';
import { generateAndDownloadZip } from './utils/zipGenerator';
import { HistoryView } from './components/HistoryView';
import { saveGeneration } from './utils/db';
import { GenerationRecord } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'generator' | 'history'>('generator');
  const [problemContext, setProblemContext] = useState<ProblemContext>({ 
    statement: '', 
    solution: '',
    testCaseCount: 5,
    enableDelay: true,
    delaySeconds: 5,
    selectedModel: 'gemini-3.1-pro',
    provider: 'google',
    apiKeys: {
      google: '',
      laozhang: ''
    }
  });
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [state, setState] = useState<GeneratorState>(GeneratorState.IDLE);

  const addLog = (message: string, type: GenerationLog['type'] = 'info') => {
    setLogs(prev => [...prev, { timestamp: Date.now(), message, type }]);
    setTimeout(() => {
        const el = document.getElementById('log-end');
        el?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // Step 1: Analyze
  const handleAnalyze = async () => {
    setState(GeneratorState.ANALYZING);
    setTestCases([]);
    setLogs([]); 
    addLog(`Starting analysis for ${problemContext.testCaseCount} test cases...`, 'info');

    try {
      addLog("Sending problem to Gemini 3 Pro for strategic analysis...", 'thinking');
      const analysis = await analyzeProblemAndPlan(
        problemContext.statement, 
        problemContext.solution,
        problemContext.testCaseCount,
        problemContext.selectedModel,
        problemContext.apiKeys[problemContext.provider],
        problemContext.provider
      );
      
      const plannedCases: TestCase[] = analysis.testPlan.map(p => ({
        ...p,
        input: '',
        expectedOutput: '',
        status: 'pending'
      }));
      
      setTestCases(plannedCases);
      addLog(`Analysis complete. Planned ${plannedCases.length} test cases.`, 'success');
      
      // Move to Plan Review
      setState(GeneratorState.PLAN_REVIEW);

    } catch (error: any) {
      addLog(`Critical Error during Analysis: ${error.message}`, 'error');
      setState(GeneratorState.ERROR);
    }
  };

  // Step 2: Generate based on confirmed plan
  const handleGenerate = async () => {
    setState(GeneratorState.GENERATING_CASES);
    addLog("Starting generation process...", 'info');

    const casesToProcess = [...testCases]; // copy

    for (let i = 0; i < casesToProcess.length; i++) {
      const currentCase = casesToProcess[i];
      
      // Rate Limit Delay
      if (i > 0 && problemContext.enableDelay) {
        const waitTime = problemContext.delaySeconds * 1000;
        addLog(`Waiting ${problemContext.delaySeconds}s to respect rate limits...`, 'info');
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      setTestCases(prev => prev.map(tc => tc.id === currentCase.id ? { ...tc, status: 'generating' } : tc));
      
      const methodLabel = currentCase.generationMethod === 'script' ? 'Python Script' : 'Raw Data';
      addLog(`Generating ${methodLabel} for Case ${i+1}/${casesToProcess.length}: ${currentCase.name}...`, 'info');

      try {
        // Generate Input (or Script)
        const generatedContent = await generateInputData(
            problemContext.statement, 
            currentCase.description,
            currentCase.type,
            currentCase.generationMethod,
            problemContext.selectedModel,
            problemContext.apiKeys[problemContext.provider],
            problemContext.provider
        );
        
        if (!generatedContent) throw new Error("Empty content generated");

        if (currentCase.generationMethod === 'script') {
            // 1. Store the script code
            // 2. Run the script via Pyodide to get actual input data
            addLog(`Executing Python script in browser (Pyodide)...`, 'thinking');
            
            // Temporary update to show we have script, but waiting for execution
            setTestCases(prev => prev.map(tc => tc.id === currentCase.id ? { 
                ...tc, 
                scriptContent: generatedContent 
            } : tc));

            try {
                const executionResult = await runPythonScript(generatedContent);
                // Update with both script AND the result of execution (the .in data)
                setTestCases(prev => prev.map(tc => tc.id === currentCase.id ? { 
                    ...tc, 
                    input: executionResult,
                    scriptContent: generatedContent
                } : tc));
                addLog(`Script execution successful. Generated ${executionResult.length} chars of data.`, 'success');
            } catch (pyErr: any) {
                addLog(`Pyodide Execution Failed: ${pyErr.message}`, 'error');
                throw pyErr;
            }

        } else {
            // Direct text generation
            setTestCases(prev => prev.map(tc => tc.id === currentCase.id ? { ...tc, input: generatedContent } : tc));
        }

        addLog(`${methodLabel} generated for ${currentCase.name}.`, 'success');
        
        // Generate Output
        if (currentCase.generationMethod === 'script') {
           addLog(`Skipping AI output simulation for large script-generated data.`, 'info');
            setTestCases(prev => prev.map(tc => tc.id === currentCase.id ? { 
                ...tc, 
                expectedOutput: "Output generation skipped for Script mode (Data too large/dynamic). Please generate .out locally.", 
                status: 'completed' 
            } : tc));
        } else {
           addLog(`Compiling and executing C++ via WebAssembly locally...`, 'thinking');
           const result = await executeCppWasm(problemContext.solution, generatedContent);
   
           if (!result.success) {
              setTestCases(prev => prev.map(tc => tc.id === currentCase.id ? { 
                ...tc, 
                expectedOutput: `COMPILATION OR RUNTIME ERROR:\n${result.compileLogs}`, 
                status: 'failed' 
              } : tc));
              addLog(`Case ${currentCase.name} C++ Execution Failed!`, 'error');
           } else {
              setTestCases(prev => prev.map(tc => tc.id === currentCase.id ? { 
                ...tc, 
                expectedOutput: result.output || '(No output returned)', 
                status: 'completed' 
              } : tc));
              addLog(`Case ${currentCase.name} completed successfully. Local Output generated.`, 'success');
           }
        }
        
      } catch (err) {
        console.error(err);
        setTestCases(prev => prev.map(tc => tc.id === currentCase.id ? { ...tc, status: 'failed' } : tc));
        addLog(`Failed to generate case ${currentCase.name}.`, 'error');
      }
    }

    setState(GeneratorState.COMPLETED);
    addLog("All operations finished.", 'success');

    // Save strictly to IndexedDB history
    setTestCases(finalTestCases => {
      saveGeneration({
        id: Date.now(),
        date: Date.now(),
        problemStatement: problemContext.statement,
        solution: problemContext.solution,
        testCases: finalTestCases,
        modelName: problemContext.selectedModel,
        provider: problemContext.provider
      }).catch(err => console.error("Could not save history:", err));
      return finalTestCases;
    });
  };

  const handleDownload = () => {
    generateAndDownloadZip(testCases, "problem_data");
    addLog("ZIP file downloaded.", 'info');
  };

  const handleCancelPlan = () => {
      setState(GeneratorState.IDLE);
      setTestCases([]);
      setLogs([]);
  };

  const handleLoadHistoryRecord = (record: GenerationRecord) => {
      setProblemContext(prev => ({
        ...prev,
        statement: record.problemStatement,
        solution: record.solution,
        selectedModel: record.modelName,
        provider: record.provider as any
      }));
      setTestCases(record.testCases);
      setLogs([{ timestamp: Date.now(), message: "Loaded from history.", type: 'info' }]);
      setState(GeneratorState.COMPLETED);
      setCurrentView('generator');
  };

  return (
    <Layout currentView={currentView} onViewChange={setCurrentView}>
      {currentView === 'history' ? (
        <HistoryView onLoadGeneration={handleLoadHistoryRecord} />
      ) : state === GeneratorState.IDLE ? (
        <ProblemForm 
          problemContext={problemContext}
          setProblemContext={setProblemContext}
          onStart={handleAnalyze}
          isProcessing={false}
        />
      ) : state === GeneratorState.ANALYZING ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 font-mono animate-pulse">Analyzing Problem & Planning Cases...</p>
            {/* Show logs during analysis too */}
            <div className="w-full max-w-2xl bg-gray-900 rounded p-4 h-32 overflow-y-auto font-mono text-xs border border-gray-800">
                {logs.map((l, i) => <div key={i} className="text-gray-400">{l.message}</div>)}
            </div>
        </div>
      ) : state === GeneratorState.PLAN_REVIEW ? (
        <PlanReview 
            testCases={testCases}
            setTestCases={setTestCases}
            onConfirm={handleGenerate}
            onBack={handleCancelPlan}
        />
      ) : (
        <ResultsView 
          testCases={testCases}
          logs={logs}
          onDownload={handleDownload}
          isFinished={state === GeneratorState.COMPLETED || state === GeneratorState.ERROR}
        />
      )}
    </Layout>
  );
};

export default App;