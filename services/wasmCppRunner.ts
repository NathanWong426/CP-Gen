import { compile } from "browsercc";
import { WASI, File, OpenFile, ConsoleStdout } from "@bjorn3/browser_wasi_shim";

/**
 * Compiles and runs C++ code in the browser using WebAssembly.
 * 
 * @param sourceCode The C++ source code to compile.
 * @param inputData The standard input (stdin) string of the algorithm.
 * @returns A promise that resolves to the standard output (stdout) and compilation logs if it failed.
 */
export const executeCppWasm = async (
  sourceCode: string,
  inputData: string
): Promise<{ success: boolean; output: string; compileLogs: string; }> => {
  try {
    // 1. Compile C++ to WASM
    const { module, compileOutput } = await compile({
      source: sourceCode,
      fileName: "main.cpp",
      flags: ["-std=c++20", "-O2", "-fno-exceptions"], // Fast execution flags
    });

    if (!module) {
      return {
        success: false,
        output: "",
        compileLogs: compileOutput || "Compilation failed with unknown error.",
      };
    }

    // 2. Setup WASI Execution Environment
    const stdinBytes = new TextEncoder().encode(inputData);
    let stdoutString = "";

    const fds = [
      new OpenFile(new File(stdinBytes)), // fd 0: stdin
      new ConsoleStdout((data: Uint8Array) => {
        stdoutString += new TextDecoder().decode(data); // fd 1: stdout
      }),
      new ConsoleStdout((data: Uint8Array) => {
        // fd 2: stderr (we merge stderr to stdout or log it)
        console.warn("C++ STDERR:", new TextDecoder().decode(data));
      }),
    ];

    const args = ["main.wasm"]; // Program name
    const env: string[] = []; // Empty environment

    const wasi = new WASI(args, env, fds);
    const instance = await WebAssembly.instantiate(module, {
      wasi_snapshot_preview1: wasi.wasiImport,
    });

    // 3. Execute
    wasi.start(instance as any);

    return {
      success: true,
      output: stdoutString,
      compileLogs: compileOutput,
    };
  } catch (error: any) {
    console.error("WASM Execution Error:", error);
    return {
      success: false,
      output: "",
      compileLogs: `Runtime Error: ${error.message || String(error)}`,
    };
  }
};
