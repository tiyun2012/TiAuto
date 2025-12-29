
declare global {
  interface Window {
    loadPyodide: any;
    pyodide: any;
  }
}

let pyodideInstance: any = null;

export const initializePyodide = async () => {
  if (pyodideInstance) return pyodideInstance;

  if (!window.loadPyodide) {
    throw new Error("Pyodide script not loaded. Check index.html");
  }

  console.log("Initializing Pyodide...");
  pyodideInstance = await window.loadPyodide();
  console.log("Pyodide Ready");
  
  // Load micropip for package management
  await pyodideInstance.loadPackage("micropip");
  return pyodideInstance;
};

export const runPythonCode = async (code: string, dependencies: string = "") => {
  const pyodide = await initializePyodide();
  
  // Reset output buffers
  pyodide.setStdout({ batched: (msg: string) => console.log("[Python stdout]", msg) });
  pyodide.setStderr({ batched: (msg: string) => console.warn("[Python stderr]", msg) });

  let outputLog: string[] = [];

  // Override print to capture output
  pyodide.setStdout({ batched: (msg: string) => outputLog.push(msg) });
  pyodide.setStderr({ batched: (msg: string) => outputLog.push(`[Error] ${msg}`) });

  // 1. Install Dependencies
  if (dependencies.trim()) {
    const packages = dependencies.split(',').map(p => p.trim()).filter(p => p);
    if (packages.length > 0) {
      outputLog.push(`Installing packages: ${packages.join(', ')}...`);
      try {
        const micropip = pyodide.pyimport("micropip");
        await micropip.install(packages);
        outputLog.push("Packages installed.");
      } catch (e: any) {
        outputLog.push(`Failed to install packages: ${e.message}`);
        throw new Error(`Package Installation Error: ${e.message}`);
      }
    }
  }

  // 2. Execute Code
  try {
    // If the code is just an expression, runPython returns the result. 
    // If it's a script, we usually care about stdout.
    await pyodide.runPythonAsync(code);
    return outputLog.join('\n') || "(No output)";
  } catch (error: any) {
    return outputLog.join('\n') + `\n\nRuntime Error: ${error.message}`;
  }
};
