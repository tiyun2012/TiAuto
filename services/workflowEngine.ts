

import { Node, Edge, NodeType, AISettings, AIProvider } from '../types';
import { generateCode, checkCodeStructured, simulateExecution, generateUnitTests, refineCode, runDebate, runMultiProviderCheck } from './geminiService';
import { runPythonCode } from './pyodideService';
import { executeShellCommand } from './commandService';
import { bridgeExecute, bridgeReadFile, bridgeWriteFile } from './localBridgeService';
import { parseOutputToFiles, formatFilesForPrompt } from './fileParsingService';

const getParentNodes = (nodeId: string, nodes: Node[], edges: Edge[]): Node[] => {
  const incomingEdges = edges.filter(e => e.target === nodeId);
  return incomingEdges.map(e => nodes.find(n => n.id === e.source)).filter((n): n is Node => !!n);
};

const getContextFromParents = (parents: Node[]): { textContext: string, fileContext: Record<string, string> } => {
  let textContext = "";
  let fileContext: Record<string, string> = {};

  parents.forEach(p => {
    if (p.data.files && Object.keys(p.data.files).length > 0) {
        Object.assign(fileContext, p.data.files);
    }
    let content = "";
    if (p.data.output) {
        content = `Output from ${p.data.label}:\n${p.data.output}`;
    } else if (p.data.code) {
        content = `Code from ${p.data.label}:\n${p.data.code}`;
    }
    if (content) textContext += content + "\n\n";
  });

  return { textContext, fileContext };
};

// Helper to handle AI calls with automatic fallback
const runAiWithFallback = async (
    action: (provider: AIProvider | undefined) => Promise<any>,
    requestedProvider: AIProvider | undefined,
    aiSettings: AISettings
): Promise<any> => {
    try {
        return await action(requestedProvider);
    } catch (error: any) {
        const errMsg = error.message.toLowerCase();
        const isBalanceError = errMsg.includes('balance') || errMsg.includes('402') || errMsg.includes('insufficient');
        const isQuotaError = errMsg.includes('429') || errMsg.includes('quota');
        
        // If it's a balance/quota issue and we aren't already using Gemini (the safe default), try fallback
        if ((isBalanceError || isQuotaError) && requestedProvider !== 'gemini' && aiSettings.geminiKey) {
            console.warn(`[Engine] Provider ${requestedProvider || aiSettings.provider} failed. Falling back to Gemini.`);
            return await action('gemini');
        }
        throw error;
    }
};

export const executeNode = async (
  node: Node, 
  allNodes: Node[], 
  allEdges: Edge[],
  aiSettings: AISettings,
  updateNodeData: (id: string, data: Partial<Node['data']>) => void
): Promise<void> => {
  
  console.log(`[Engine] Executing node: ${node.id} (${node.type})`);
  
  // APPROVAL NODE LOGIC
  if (node.type === NodeType.APPROVAL) {
      if (node.data.status === 'success') {
          return; // Already approved
      }
      updateNodeData(node.id, { status: 'waiting' });
      throw new Error("WAIT_FOR_APPROVAL");
  }

  updateNodeData(node.id, { status: 'running', errorMessage: undefined, groundingSources: undefined });

  try {
    const parents = getParentNodes(node.id, allNodes, allEdges);
    const { textContext, fileContext } = getContextFromParents(parents);
    
    const vfsString = Object.keys(fileContext).length > 0 
        ? `\nCURRENT PROJECT FILES:\n${formatFilesForPrompt(fileContext)}\n` 
        : "";

    let result = "";
    let extractedFiles: Record<string, string> = {};
    let sources: Array<{ title: string; uri: string }> | undefined = undefined;

    // Extract Overrides
    const modelOverride = node.data.model;
    const providerOverride = node.data.provider;

    switch (node.type) {
      case NodeType.TRIGGER:
        result = "Workflow started manually.";
        await new Promise(r => setTimeout(r, 500));
        break;

      case NodeType.READ_FILE:
        if (node.data.useLocalBridge && node.data.localPath) {
            // Read from Local Bridge
            result = await bridgeReadFile(node.data.localPath, aiSettings);
            extractedFiles = { [node.data.localPath]: result };
        } else {
            // Read from Uploaded Data
            if (!node.data.code) throw new Error("No file uploaded or local path specified.");
            result = node.data.code;
            if (result.includes('###') || result.includes('```')) {
                extractedFiles = parseOutputToFiles(result);
            } else {
                extractedFiles = { [node.data.label || 'uploaded_file']: result };
            }
        }
        break;

      case NodeType.WRITE_FILE:
        if (!node.data.localPath) throw new Error("No output path specified for Write File node.");
        
        let contentToWrite = node.data.code;
        // If no direct code override, use parent output
        if (!contentToWrite && parents.length > 0) {
            // Try to find matching file in context if filename matches
            const targetFilename = node.data.localPath.split('/').pop() || "";
            if (fileContext[targetFilename]) {
                contentToWrite = fileContext[targetFilename];
            } else {
                // Fallback to raw text output
                contentToWrite = parents[0].data.output || parents[0].data.code || "";
            }
        }
        
        if (!contentToWrite) throw new Error("No content to write.");

        if (node.data.useLocalBridge) {
            result = await bridgeWriteFile(node.data.localPath, contentToWrite, aiSettings);
        } else {
            result = `[Simulation] Would write to ${node.data.localPath}:\n${contentToWrite.slice(0, 100)}...`;
        }
        break;

      case NodeType.GEMINI_GENERATE:
        let genPrompt = `${vfsString}\n${textContext}\n\nTask: ${node.data.prompt || 'Generate code based on previous context.'}`;
        
        const fileInstruction = `
IMPORTANT: When generating multiple files, you MUST separate them exactly like this:

### filename.extension
\`\`\`language
code here...
\`\`\`

### another_file.extension
\`\`\`language
code here...
\`\`\`

Do not use any other format for file separation.
`;
        
        const genResult = await runAiWithFallback(async (p) => {
            return await generateCode(
                genPrompt, 
                (node.data.systemInstruction || "") + "\n" + fileInstruction, 
                aiSettings, 
                modelOverride,
                node.data.useSearch,
                p // provider
            );
        }, providerOverride, aiSettings);
        
        result = genResult.text;
        sources = genResult.groundingSources;
        extractedFiles = parseOutputToFiles(result);
        break;

      case NodeType.GEMINI_CHECK:
        if (!vfsString.trim() && !textContext.trim()) {
          throw new Error("No input code found from previous nodes to check.");
        }
        const checkCriteria = node.data.prompt || "Check for bugs and best practices.";
        const fullContext = `${vfsString}\n\n${textContext}`;
        
        result = await runAiWithFallback(async (p) => {
             return await checkCodeStructured(fullContext, checkCriteria, aiSettings, modelOverride, p);
        }, providerOverride, aiSettings);
        break;

      case NodeType.AI_DEBATE:
        const topic = node.data.prompt || "Refine the provided code/plan.";
        const personaA = node.data.personaA || "Creative Architect";
        const personaB = node.data.personaB || "Senior Security Engineer";
        const rounds = node.data.debateRounds || 2;
        
        const debateContext = `${vfsString}\n\n${textContext}`;

        result = await runAiWithFallback(async (p) => {
             return await runDebate(debateContext, topic, personaA, personaB, rounds, aiSettings, modelOverride, p);
        }, providerOverride, aiSettings);
        
        extractedFiles = parseOutputToFiles(result);
        break;

      case NodeType.MULTI_CHECK:
         const providers = node.data.enabledProviders || ['gemini'];
         if (providers.length === 0) throw new Error("No providers selected for Multi-Check.");
         const multiCheckContext = `${vfsString}\n\n${textContext}`;
         const multiCheckPrompt = node.data.prompt || "Analyze this content.";

         result = await runMultiProviderCheck(multiCheckPrompt, multiCheckContext, providers, aiSettings);
         break;

      case NodeType.ROUTER:
         // Logic Gate: Uses AI to decide if condition is true
         const condition = node.data.prompt || "Is the code valid?";
         const routerContext = `${vfsString}\n\n${textContext}`;
         const routerPrompt = `
            CONTEXT:
            ${routerContext}
            
            QUESTION:
            ${condition}
            
            TASK:
            Answer with exactly "TRUE" or "FALSE".
         `;
         const routerRes = await runAiWithFallback(async(p) => {
             return await generateCode(routerPrompt, "Output ONLY 'TRUE' or 'FALSE'.", aiSettings, modelOverride, false, p);
         }, providerOverride, aiSettings);
         
         const decision = routerRes.text.trim().toUpperCase().includes("TRUE");
         result = decision ? "TRUE" : "FALSE";
         break;

      case NodeType.LOOP:
        const maxIter = node.data.maxIterations || 3;
        const currentIter = node.data.currentIteration || 0;

        // A. Identify Inputs via Heuristics
        const codeParent = parents.find(p => [NodeType.GEMINI_GENERATE, NodeType.PYTHON_EXEC, NodeType.VS_CODE, NodeType.TRIGGER, NodeType.READ_FILE, NodeType.AI_DEBATE].includes(p.type));
        const issueParent = parents.find(p => [NodeType.GEMINI_CHECK, NodeType.AI_UNIT_TEST, NodeType.APPROVAL, NodeType.NOTE, NodeType.MULTI_CHECK, NodeType.SHELL_EXEC].includes(p.type) && p.id !== codeParent?.id);

        if (!codeParent) {
            throw new Error("Loop Node requires a content source input (e.g., Generate Node or Read File).");
        }

        const currentCode = codeParent.data.output || codeParent.data.code || "";
        
        if (!issueParent) {
            result = "No issue source connected. Passing through content.";
            extractedFiles = codeParent.data.files || {};
            break;
        }

        const checkOutput = issueParent.data.output || "";
        const issueType = issueParent.type;

        // B. Evaluate Issues
        let hasError = false;
        
        if (issueType === NodeType.APPROVAL) {
            if (issueParent.data.status === 'error') hasError = true;
        } else if (checkOutput.includes('[') && checkOutput.includes(']')) {
             try {
                 const issues = JSON.parse(checkOutput);
                 const seriousIssues = issues.filter((i: any) => i.severity === 'High' || i.severity === 'Medium');
                 if (seriousIssues.length > 0) hasError = true;
             } catch (e) {
                 if (checkOutput.toLowerCase().includes("error") || checkOutput.toLowerCase().includes("fail")) hasError = true;
             }
        } else {
             const lower = checkOutput.toLowerCase();
             if (lower.includes("fail") || lower.includes("error") || lower.includes("bug") || lower.includes("issue")) hasError = true;
        }

        // C. Execute Loop Logic
        if (hasError && currentIter < maxIter) {
             console.log(`[Loop] Issues found from ${issueParent.data.label}. Iteration ${currentIter + 1}/${maxIter}`);
             
             const fixPrompt = `
                You are an automated code fixer in a loop.
                
                1. CURRENT CODE (to be fixed):
                ${currentCode}

                2. REPORTED ISSUES / FEEDBACK:
                ${checkOutput}

                3. USER INSTRUCTIONS:
                ${node.data.prompt || "Fix the code based on the issues found. Return the fully corrected code."}
                
                Task: Return ONLY the fixed code. Maintain file structure.
             `;

             const fixedResult = await runAiWithFallback(async (p) => {
                return await refineCode(
                    fixPrompt, 
                    "You are an automated code fixer. Fix the reported issues.", 
                    aiSettings, 
                    modelOverride, 
                    providerOverride
                );
             }, providerOverride, aiSettings);

             const fixedCode = fixedResult;
             const newFiles = parseOutputToFiles(fixedCode);

             updateNodeData(codeParent.id, { 
                 output: fixedCode,
                 code: fixedCode, 
                 files: Object.keys(newFiles).length > 0 ? newFiles : undefined 
             });

             updateNodeData(node.id, { 
                 currentIteration: currentIter + 1,
                 lastFixedCode: fixedCode,
                 files: Object.keys(newFiles).length > 0 ? newFiles : undefined,
                 status: 'idle' 
             });

             updateNodeData(issueParent.id, { 
                 status: 'idle', 
                 output: undefined 
             });
             
             throw new Error("LOOP_TRIGGERED");

        } else {
             if (hasError) {
                 result = `Max retries (${maxIter}) reached. Proceeding with last available version despite issues.`;
             } else {
                 result = "Check passed (No issues found). Workflow continuing.";
             }
             
             const finalCode = codeParent.data.output || "";
             extractedFiles = codeParent.data.files || parseOutputToFiles(finalCode);
             updateNodeData(node.id, { currentIteration: 0 });
        }
        break;
      
      case NodeType.AI_UNIT_TEST:
        if (!vfsString.trim() && !textContext.trim()) {
            throw new Error("No input code found to generate tests for.");
        }
        const testContext = `${vfsString}\n\n${textContext}`;
        const instructions = node.data.prompt || "Write unit tests for the provided code.";
        
        result = await runAiWithFallback(async (p) => {
             return await generateUnitTests(testContext, instructions, aiSettings, modelOverride, p);
        }, providerOverride, aiSettings);
        
        extractedFiles = parseOutputToFiles(result);
        break;

      case NodeType.SIMULATE_RUN:
         if (!vfsString.trim() && !textContext.trim()) {
            throw new Error("No code found to simulate.");
         }
         const simContext = `${vfsString}\n\n${textContext}`;
         result = await runAiWithFallback(async (p) => {
             return await simulateExecution(simContext, aiSettings, "", modelOverride, p);
         }, providerOverride, aiSettings);
         break;
      
      case NodeType.SHELL_EXEC:
         const command = node.data.prompt || "echo 'No command'";
         const shellContext = `${vfsString}\n\n${textContext}`;
         
         if (node.data.useLocalBridge) {
             result = await bridgeExecute(command, aiSettings);
         } else {
             result = await executeShellCommand(command, aiSettings, shellContext, node.data.useAiSimulation ?? true);
         }
         break;

      case NodeType.PYTHON_EXEC:
         const codeParts: string[] = [];
         Object.entries(fileContext).forEach(([fname, content]) => {
             if (fname.endsWith('.py')) {
                 codeParts.push(`# File: ${fname}\n${content}`);
             }
         });
         if (codeParts.length === 0 && textContext) {
             const match = textContext.match(/```(?:python)?\s*([\s\S]*?)\s*```/);
             if (match) codeParts.push(match[1]);
         }
         const manualCode = node.data.code ? `\n# User Code\n${node.data.code}` : "";
         const finalCode = codeParts.join('\n\n') + manualCode;

         if (!finalCode.trim()) {
            result = "No executable Python code found in project files or properties.";
         } else {
            result = await runPythonCode(finalCode, node.data.dependencies);
         }
         break;
      
      case NodeType.TODO_LIST:
        result = node.data.todo || "No tasks defined.";
        await new Promise(r => setTimeout(r, 300));
        break;

      case NodeType.VS_CODE:
        const path = node.data.prompt?.trim();
        if (!path) throw new Error("No file path specified.");
        let launchMsg = `Attempting to open VS Code at: ${path}`;
        try {
            const url = `vscode://file/${path}`;
            const link = document.createElement('a');
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            launchMsg += "\n\nSuccess: Signal sent to OS.";
        } catch (e: any) {
            throw new Error("Failed to launch URI scheme: " + e.message);
        }
        result = launchMsg;
        await new Promise(r => setTimeout(r, 1000)); 
        break;
      
      case NodeType.DIFF:
        if (parents.length === 0) {
             updateNodeData(node.id, { diffOriginal: node.data.prompt || "", diffModified: "" });
             result = "Warning: No input nodes to compare.";
        } else if (parents.length === 1) {
            const parentOut = parents[0].data.output || parents[0].data.code || "";
            updateNodeData(node.id, { diffOriginal: node.data.prompt || "", diffModified: parentOut });
            result = "Diff computed: Static Text (Original) vs Input Node (Modified).";
        } else {
            const original = parents[0].data.output || parents[0].data.code || "";
            const modified = parents[1].data.output || parents[1].data.code || "";
             updateNodeData(node.id, { diffOriginal: original, diffModified: modified });
             result = `Diff computed between ${parents[0].data.label} and ${parents[1].data.label}.`;
        }
        break;

      case NodeType.NOTE:
        result = node.data.prompt || "Note";
        break;
    }
    
    updateNodeData(node.id, { 
        status: 'success', 
        output: result,
        files: Object.keys(extractedFiles).length > 0 ? extractedFiles : undefined,
        groundingSources: sources
    });

  } catch (error: any) {
      if (error.message === "WAIT_FOR_APPROVAL") {
          console.log("Node paused for approval.");
          return;
      }
      if (error.message === "LOOP_TRIGGERED") {
          console.log("Loop triggered - restarting branch.");
          throw error; // Propagate to App logic to handle queue reset
      }
      console.error(`Error executing node ${node.id}:`, error);
      updateNodeData(node.id, { status: 'error', errorMessage: error.message });
      throw error;
  }
};