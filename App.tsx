import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { ProblemForm } from './components/ProblemForm';
import { PlanReview } from './components/PlanReview';
import { ResultsView } from './components/ResultsView';
import { ProblemContext, TestCase, GeneratorState, GenerationLog } from './types';
import { analyzeProblemAndPlan, generateInputData, generateExpectedOutput } from './services/gemini';
import { runPythonScript } from './services/pyodide';
import { generateAndDownloadZip } from './utils/zipGenerator';

const App: React.FC = () => {
  const [problemContext, setProblemContext] = useState<ProblemContext>({ 
    statement: '', 
    solution: '',
    testCaseCount: 5,
    enableDelay: true,
    delaySeconds: 5
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
        problemContext.testCaseCount
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
            currentCase.generationMethod
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
           // We mark it as completed, but with empty output or a placeholder
            setTestCases(prev => prev.map(tc => tc.id === currentCase.id ? { 
                ...tc, 
                expectedOutput: "Output generation skipped for Script mode (Data too large/dynamic). Please generate .out locally.", 
                status: 'completed' 
            } : tc));
        } else {
           addLog(`Simulating output for ${currentCase.name}...`, 'thinking');
           const outputData = await generateExpectedOutput(
             problemContext.statement,
             problemContext.solution,
             generatedContent, // Use the content we just got
             currentCase.generationMethod
           );
   
           setTestCases(prev => prev.map(tc => tc.id === currentCase.id ? { 
             ...tc, 
             expectedOutput: outputData, 
             status: 'completed' 
           } : tc));
        }
        
        addLog(`Case ${currentCase.name} completed successfully.`, 'success');

      } catch (err) {
        console.error(err);
        setTestCases(prev => prev.map(tc => tc.id === currentCase.id ? { ...tc, status: 'failed' } : tc));
        addLog(`Failed to generate case ${currentCase.name}.`, 'error');
      }
    }

    setState(GeneratorState.COMPLETED);
    addLog("All operations finished.", 'success');
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

  return (
    <Layout>
      {state === GeneratorState.IDLE ? (
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