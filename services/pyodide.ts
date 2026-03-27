declare global {
  interface Window {
    loadPyodide: (config: any) => Promise<any>;
  }
}

let pyodideInstance: any = null;
let isLoading = false;

export const initPyodide = async () => {
  if (pyodideInstance) return pyodideInstance;
  if (isLoading) {
    // Wait for existing initialization
    while (isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return pyodideInstance;
  }

  isLoading = true;
  try {
    if (!window.loadPyodide) {
      throw new Error("Pyodide script not loaded in index.html");
    }
    
    console.log("Initializing Pyodide...");
    pyodideInstance = await window.loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
    });
    console.log("Pyodide initialized");
    return pyodideInstance;
  } catch (err) {
    console.error("Failed to load Pyodide:", err);
    throw err;
  } finally {
    isLoading = false;
  }
};

export const runPythonScript = async (scriptCode: string): Promise<string> => {
  const pyodide = await initPyodide();

  // Create a wrapper to capture stdout
  // We use io.StringIO to capture the output of print statements
  const wrappedCode = `
import sys
import io

# Capture stdout
sys.stdout = io.StringIO()

try:
${scriptCode.split('\n').map(line => '    ' + line).join('\n')}
except Exception as e:
    print(f"Error executing script: {e}")

# Return output
sys.stdout.getvalue()
`;

  try {
    const output = await pyodide.runPythonAsync(wrappedCode);
    return output;
  } catch (err: any) {
    throw new Error(`Python execution error: ${err.message}`);
  }
};