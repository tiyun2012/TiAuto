import { Node, Edge, NodeType, AISettings, AIProvider } from '../types';
import { generateCode, checkCodeStructured, simulateExecution, generateUnitTests, refineCode, runDebate, runMultiProviderCheck } from './geminiService';
import { runPythonCode } from './pyodideService';
import { executeShellCommand } from './commandService';
import { bridgeExecute, bridgeReadFile, bridgeWriteFile, bridgeListFiles } from './localBridgeService';
import { parseOutputToFiles, formatFilesForPrompt } from './fileParsingService';

// --- Types for Strategy Context ---
interface StrategyContext {
    node: Node;
    parents: Node[];
    textContext: string;
    fileContext: Record<string, string>;
    aiSettings: AISettings;
    vfsString: string;
    updateNodeData: (id: string, data: Partial<Node['data']>) => void;
}

// --- Helper Functions ---

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
        
        if ((isBalanceError || isQuotaError) && requestedProvider !== 'gemini' && aiSettings.geminiKey) {
            console.warn(`[Engine] Provider ${requestedProvider || aiSettings.provider} failed. Falling back to Gemini.`);
            return await action('gemini');
        }
        throw error;
    }
};

// --- NODE STRATEGIES ---

const strategies: Partial<Record<NodeType, (ctx: StrategyContext) => Promise<string>>> = {
    
    [NodeType.TRIGGER]: async () => {
        await new Promise(r => setTimeout(r, 500));
        return "Workflow started manually.";
    },

    [NodeType.READ_FILE]: async ({ node, parents, aiSettings }) => {
        // 1. DYNAMIC PATH LOGIC
        // If connected to an Iterator or similar, try to extract the filename from the parent's text output
        let path = node.data.localPath;
        
        if (node.data.useLocalBridge && !path) {
             // Look through parents for a dynamic path suggestion
             for (const p of parents) {
                 // Regex matches "File: src/app.ts" or "File: /path/to/file.txt"
                 const dynamicMatch = p.data.output?.match(/File:\s*([^\n]+)/);
                 if (dynamicMatch) {
                     path = dynamicMatch[1].trim();
                     // console.log(`[Dynamic Read] Detected path from parent ${p.data.label}: ${path}`);
                     break; 
                 }
             }
        }

        // 2. EXECUTION
        let content = "";
        if (node.data.useLocalBridge && path) {
            // NEW: Multi-file support via comma separation
            if (path.includes(',')) {
                const paths = path.split(',').map(p => p.trim()).filter(p => p);
                const results = await Promise.all(paths.map(async (p) => {
                    try {
                        const c = await bridgeReadFile(p, aiSettings);
                        return `// --- FILE: ${p} ---\n${c}`;
                    } catch (e: any) {
                         return `// --- FILE: ${p} ---\n(Error reading file: ${e.message})`;
                    }
                }));
                content = results.join('\n\n');
            } else {
                // Existing single file logic
                try {
                    content = await bridgeReadFile(path, aiSettings);
                } catch (e: any) {
                    // IMPORTANT: If reading fails, assume it's a NEW file creation if we are in a generation loop.
                    // We return an empty marker so the Generator knows to create it.
                    if (e.message.includes('ENOENT') || e.message.includes('no such file')) {
                        content = "// [NEW FILE] This file does not exist yet. Create it based on the requirements.";
                    } else {
                        throw e;
                    }
                }
            }
        } else {
            if (!node.data.code) throw new Error("No file uploaded or local path specified.");
            content = node.data.code;
        }

        // 3. AUTO-CONTEXT PASS-THROUGH
        // If a parent was a Task Iterator, prepend the instruction to the file content
        // so downstream Generator nodes know what to do with this file.
        const iteratorParent = parents.find(p => p.type === NodeType.TASK_ITERATOR);
        if (iteratorParent && iteratorParent.data.output) {
            const instructionMatch = iteratorParent.data.output.match(/Instruction:\s*([\s\S]+)/);
            if (instructionMatch) {
                // Return a combined context string
                // We wrap the content in a block so Gemini treats it as file context
                return `TASK CONTEXT (from Iterator):\n${instructionMatch[1].trim()}\n\nTARGET FILE CONTENT (${path}):\n${content}`;
            }
        }

        return content;
    },

    [NodeType.PROJECT_INDEX]: async ({ node, aiSettings }) => {
        const path = node.data.localPath || '.';
        if (node.data.useLocalBridge) {
            const files = await bridgeListFiles(path, aiSettings);
            const limit = 50;
            const displayed = files.slice(0, limit);
            const more = files.length > limit ? `\n...and ${files.length - limit} more` : '';
            return `FILE TREE (${path}):\n${displayed.join('\n')}${more}`;
        }
        return "Simulated File Tree:\n/src\n  app.tsx\n  types.ts\n/components\n  Header.tsx\npackage.json";
    },

    [NodeType.WRITE_FILE]: async ({ node, parents, fileContext, aiSettings }) => {
        if (!node.data.localPath) throw new Error("No output path specified for Write File node.");
        
        let contentToWrite = node.data.code;
        if (!contentToWrite && parents.length > 0) {
            const targetFilename = node.data.localPath.split('/').pop() || "";
            // Priority: File with same name -> First parent text output
            contentToWrite = fileContext[targetFilename] || parents[0].data.output || parents[0].data.code || "";
        }
        
        if (!contentToWrite) throw new Error("No content to write.");

        if (node.data.useLocalBridge) {
            return await bridgeWriteFile(node.data.localPath, contentToWrite, aiSettings);
        } else {
            return `[Simulation] Would write to ${node.data.localPath}:\n${contentToWrite.slice(0, 100)}...`;
        }
    },

    [NodeType.GIT_CONTROL]: async ({ node, parents, aiSettings }) => {
        const cmd = node.data.gitCommand || 'status';
        const msg = node.data.gitMessage || 'Auto-update via FlowGen';
        
        // Safety: If push/commit, require prior Approval node
        if (['push', 'commit'].includes(cmd)) {
            const hasApproval = parents.some(p => p.type === NodeType.APPROVAL && p.data.status === 'success');
            // We can also allow if it's following a successful Unit Test, but Approval is safer for now.
            if (!hasApproval) {
                // Return string but DO NOT execute if bridge enabled, unless user adds a "Force" flag (future)
                return `[Safety Block] Git '${cmd}' requires a successful Approval node as a parent. Operation skipped.`;
            }
        }

        let fullCmd = `git ${cmd}`;
        if (cmd === 'commit') {
            fullCmd = `git commit -m "${msg}"`;
        } else if (cmd === 'push') {
            fullCmd = `git push`;
        } else if (cmd === 'add') {
            fullCmd = `git add .`;
        }

        let output = "";
        if (node.data.useLocalBridge) {
            output = await bridgeExecute(fullCmd, aiSettings);
        } else {
            output = `[Simulation] Git Command: ${fullCmd}`;
        }

        // New Safety Check Logic
        if (cmd === 'status' && node.data.gitStopOnDirty) {
             const lower = output.toLowerCase();
             // Standard git status clean messages
             const isClean = lower.includes("nothing to commit") || lower.includes("working tree clean");
             if (!isClean) {
                 throw new Error("Git Status: Working directory is dirty. Please commit changes or clean working tree.");
             }
        }

        return output;
    },

    [NodeType.ARCHITECT]: async ({ node, textContext, vfsString, aiSettings }) => {
        const prompt = `
            CONTEXT:
            ${vfsString}
            ${textContext}
            
            PROJECT ARCHITECT TASK:
            ${node.data.prompt || "Analyze requirements and output an implementation plan."}
            
            IMPORTANT:
            Output the plan strictly as a JSON object containing a "tasks" array.
            Format:
            \`\`\`json
            {
              "tasks": [
                { "filename": "src/utils.ts", "instruction": "Create helper function..." },
                { "filename": "src/App.tsx", "instruction": "Update component to use utils..." }
              ]
            }
            \`\`\`
        `;
        const res = await runAiWithFallback(async (p) => {
            return await generateCode(prompt, "You are a Senior Software Architect. Output valid JSON.", aiSettings, node.data.model, false, p);
        }, node.data.provider, aiSettings);
        return res.text;
    },

    [NodeType.TASK_ITERATOR]: async ({ node, parents, updateNodeData }) => {
        // 1. Get Plan
        const parentOutput = parents[0]?.data.output;
        if (!parentOutput) throw new Error("No input plan found from Architect.");

        let tasks: any[] = [];
        try {
            // Extract JSON
            const jsonMatch = parentOutput.match(/```json\s*([\s\S]*?)\s*```/);
            const jsonStr = jsonMatch ? jsonMatch[1] : (parentOutput.match(/\{[\s\S]*\}/)?.[0] || "");
            const parsed = JSON.parse(jsonStr);
            tasks = parsed.tasks || [];
        } catch (e) {
            throw new Error("Failed to parse Tasks JSON from parent.");
        }

        if (tasks.length === 0) return "No tasks found in plan.";

        // 2. Determine Iteration
        const currentIndex = node.data.iteratorIndex || 0;
        
        if (currentIndex >= tasks.length) {
            // Reset for future runs
            updateNodeData(node.id, { iteratorIndex: 0, iteratorFinished: true });
            return "All tasks completed.";
        }

        const currentTask = tasks[currentIndex];
        const nextIndex = currentIndex + 1;
        const isFinished = nextIndex >= tasks.length;

        // 3. Update State for this run
        // We set the output to be the instruction for the *Next* node (Generator)
        updateNodeData(node.id, { 
            iteratorIndex: nextIndex,
            iteratorTotal: tasks.length,
            iteratorFinished: isFinished,
        });

        return `TASK (${currentIndex + 1}/${tasks.length}):\nFile: ${currentTask.filename}\nInstruction: ${currentTask.instruction}`;
    },

    [NodeType.GEMINI_GENERATE]: async ({ node, textContext, vfsString, aiSettings }) => {
        const genPrompt = `${vfsString}\n${textContext}\n\nTask: ${node.data.prompt || 'Generate code.'}`;
        
        const fileInstruction = `
IMPORTANT: Return code in this JSON structure for reliability:
{ "files": [ { "filename": "example.py", "content": "print('hello')" } ] }
If you cannot output JSON, use standard markdown code blocks with filenames in headers.
`;
        const genResult = await runAiWithFallback(async (p) => {
            return await generateCode(
                genPrompt, 
                (node.data.systemInstruction || "") + "\n" + fileInstruction, 
                aiSettings, 
                node.data.model,
                node.data.useSearch,
                p 
            );
        }, node.data.provider, aiSettings);
        
        return genResult.text;
    },

    [NodeType.GEMINI_CHECK]: async ({ node, textContext, vfsString, aiSettings }) => {
        if (!vfsString.trim() && !textContext.trim()) throw new Error("No input code to check.");
        const checkCriteria = node.data.prompt || "Check for bugs.";
        const fullContext = `${vfsString}\n\n${textContext}`;
        
        return await runAiWithFallback(async (p) => {
             return await checkCodeStructured(fullContext, checkCriteria, aiSettings, node.data.model, p);
        }, node.data.provider, aiSettings);
    },

    [NodeType.AI_DEBATE]: async ({ node, textContext, vfsString, aiSettings }) => {
        const topic = node.data.prompt || "Refine the provided code/plan.";
        const personaA = node.data.personaA || "Creative Architect";
        const personaB = node.data.personaB || "Senior Security Engineer";
        const rounds = node.data.debateRounds || 2;
        const debateContext = `${vfsString}\n\n${textContext}`;

        return await runAiWithFallback(async (p) => {
             return await runDebate(debateContext, topic, personaA, personaB, rounds, aiSettings, node.data.model, p);
        }, node.data.provider, aiSettings);
    },

    [NodeType.MULTI_CHECK]: async ({ node, textContext, vfsString, aiSettings }) => {
         const providers = node.data.enabledProviders || ['gemini'];
         if (providers.length === 0) throw new Error("No providers selected.");
         const multiCheckContext = `${vfsString}\n\n${textContext}`;
         return await runMultiProviderCheck(node.data.prompt || "Analyze this.", multiCheckContext, providers, aiSettings);
    },

    [NodeType.ROUTER]: async ({ node, textContext, vfsString, aiSettings }) => {
         const condition = node.data.prompt || "Is the code valid?";
         const routerContext = `${vfsString}\n\n${textContext}`;
         const routerPrompt = `CONTEXT:\n${routerContext}\nQUESTION:\n${condition}\nTASK: Answer "TRUE" or "FALSE".`;
         
         const routerRes = await runAiWithFallback(async(p) => {
             return await generateCode(routerPrompt, "Output ONLY 'TRUE' or 'FALSE'.", aiSettings, node.data.model, false, p);
         }, node.data.provider, aiSettings);
         
         const decision = routerRes.text.trim().toUpperCase().includes("TRUE");
         return decision ? "TRUE" : "FALSE";
    },

    [NodeType.AI_UNIT_TEST]: async ({ node, textContext, vfsString, aiSettings }) => {
        if (!vfsString.trim() && !textContext.trim()) throw new Error("No code to test.");
        const testContext = `${vfsString}\n\n${textContext}`;
        
        return await runAiWithFallback(async (p) => {
             return await generateUnitTests(testContext, node.data.prompt || "Write tests.", aiSettings, node.data.model, p);
        }, node.data.provider, aiSettings);
    },

    [NodeType.SIMULATE_RUN]: async ({ node, textContext, vfsString, aiSettings }) => {
         if (!vfsString.trim() && !textContext.trim()) throw new Error("No code to simulate.");
         return await runAiWithFallback(async (p) => {
             return await simulateExecution(`${vfsString}\n\n${textContext}`, aiSettings, "", node.data.model, p);
         }, node.data.provider, aiSettings);
    },

    [NodeType.SHELL_EXEC]: async ({ node, textContext, vfsString, aiSettings }) => {
         const command = node.data.prompt || "echo 'No command'";
         if (node.data.useLocalBridge) {
             return await bridgeExecute(command, aiSettings);
         } else {
             return await executeShellCommand(command, aiSettings, `${vfsString}\n\n${textContext}`, node.data.useAiSimulation ?? true);
         }
    },

    [NodeType.PYTHON_EXEC]: async ({ node, textContext, fileContext }) => {
         const codeParts: string[] = [];
         Object.entries(fileContext).forEach(([fname, content]) => {
             if (fname.endsWith('.py')) codeParts.push(`# File: ${fname}\n${content}`);
         });
         
         if (codeParts.length === 0 && textContext) {
             const match = textContext.match(/```(?:python)?\s*([\s\S]*?)\s*```/);
             if (match) codeParts.push(match[1]);
         }
         
         const manualCode = node.data.code ? `\n# User Code\n${node.data.code}` : "";
         const finalCode = codeParts.join('\n\n') + manualCode;

         if (!finalCode.trim()) return "No executable Python code found.";
         return await runPythonCode(finalCode, node.data.dependencies);
    },

    [NodeType.TODO_LIST]: async ({ node }) => node.data.todo || "No tasks.",
    
    [NodeType.NOTE]: async ({ node }) => node.data.prompt || "Note",
    
    [NodeType.VS_CODE]: async ({ node }) => {
        const path = node.data.prompt?.trim();
        if (!path) throw new Error("No path.");
        const url = `vscode://file/${path}`;
        const link = document.createElement('a');
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return `Signal sent to open VS Code at: ${path}`;
    },

    [NodeType.DIFF]: async ({ node, parents }) => {
        if (parents.length === 0) return "Warning: No input nodes.";
        // Diff logic is mostly visual in properties panel, but we return a summary here
        return "Diff computed. View in Properties Panel.";
    }
};

// --- MAIN EXECUTION FUNCTION ---

export const executeNode = async (
  node: Node, 
  allNodes: Node[], 
  allEdges: Edge[],
  aiSettings: AISettings,
  updateNodeData: (id: string, data: Partial<Node['data']>) => void
): Promise<void> => {
  
  console.log(`[Engine] Executing node: ${node.id} (${node.type})`);
  
  if (node.type === NodeType.APPROVAL) {
      if (node.data.status === 'success') return;
      updateNodeData(node.id, { status: 'waiting' });
      throw new Error("WAIT_FOR_APPROVAL");
  }

  updateNodeData(node.id, { status: 'running', errorMessage: undefined });

  try {
    const parents = getParentNodes(node.id, allNodes, allEdges);
    const { textContext, fileContext } = getContextFromParents(parents);
    const vfsString = Object.keys(fileContext).length > 0 ? `\nCURRENT FILES:\n${formatFilesForPrompt(fileContext)}\n` : "";

    // Special Handling for Loop Node (Control Flow)
    if (node.type === NodeType.LOOP) {
        await executeLoopNode(node, parents, aiSettings, updateNodeData);
        return;
    }

    // Execute Strategy
    const strategy = strategies[node.type];
    if (strategy) {
        const result = await strategy({ node, parents, textContext, fileContext, aiSettings, vfsString, updateNodeData });
        
        // Post-processing
        let extractedFiles = {};
        
        // For nodes that generate file-like content
        if ([NodeType.GEMINI_GENERATE, NodeType.READ_FILE, NodeType.ARCHITECT, NodeType.AI_DEBATE].includes(node.type)) {
             // If local read, we already have it in context, but parseOutputToFiles helps standardizing
             if (node.type === NodeType.READ_FILE && node.data.useLocalBridge) {
                 // The result might now contain metadata headers, but we can treat it as content for now
                 // or re-parse if needed. For simplicity, we just key it to the path.
                 extractedFiles = { [node.data.localPath!]: result };
             } else {
                 extractedFiles = parseOutputToFiles(result);
             }
        }

        // For Diff nodes, calculate specific diff props
        if (node.type === NodeType.DIFF) {
             const original = parents[0]?.data.output || parents[0]?.data.code || node.data.prompt || "";
             const modified = parents[1]?.data.output || parents[1]?.data.code || "";
             updateNodeData(node.id, { diffOriginal: original, diffModified: modified });
        }

        updateNodeData(node.id, { 
            status: 'success', 
            output: result, 
            files: Object.keys(extractedFiles).length > 0 ? extractedFiles : undefined
        });

    } else {
        throw new Error(`No execution strategy for node type: ${node.type}`);
    }

  } catch (error: any) {
      if (error.message === "WAIT_FOR_APPROVAL" || error.message === "LOOP_TRIGGERED") throw error;
      console.error(`Error executing node ${node.id}:`, error);
      updateNodeData(node.id, { status: 'error', errorMessage: error.message });
      throw error;
  }
};

// --- LOOP NODE LOGIC ---
async function executeLoopNode(node: Node, parents: Node[], aiSettings: AISettings, updateNodeData: (id: string, data: Partial<Node['data']>) => void) {
    const maxIter = node.data.maxIterations || 3;
    const currentIter = node.data.currentIteration || 0;

    const codeParent = parents.find(p => [NodeType.GEMINI_GENERATE, NodeType.PYTHON_EXEC, NodeType.VS_CODE, NodeType.TRIGGER, NodeType.READ_FILE, NodeType.AI_DEBATE, NodeType.TASK_ITERATOR].includes(p.type));
    const issueParent = parents.find(p => [NodeType.GEMINI_CHECK, NodeType.AI_UNIT_TEST, NodeType.APPROVAL, NodeType.NOTE, NodeType.MULTI_CHECK, NodeType.SHELL_EXEC].includes(p.type) && p.id !== codeParent?.id);

    if (!codeParent) throw new Error("Loop Node requires a content source.");
    
    // Pass-through if no issues or first run with no issue parent
    if (!issueParent) {
        updateNodeData(node.id, { status: 'success', output: "Passing through.", files: codeParent.data.files });
        return;
    }

    const currentCode = codeParent.data.output || codeParent.data.code || "";
    const checkOutput = issueParent.data.output || "";
    
    let hasError = false;
    if (issueParent.type === NodeType.APPROVAL) {
        if (issueParent.data.status === 'error') hasError = true;
    } else {
        const lower = checkOutput.toLowerCase();
        if (lower.includes("error") || lower.includes("fail") || lower.includes("bug")) hasError = true;
        // JSON check
        if (checkOutput.includes('[') && checkOutput.includes(']')) {
             try {
                 const issues = JSON.parse(checkOutput);
                 if (issues.some((i: any) => i.severity === 'High')) hasError = true;
             } catch(e) {}
        }
    }

    if (hasError && currentIter < maxIter) {
         const fixPrompt = `
            FIX LOOP ITERATION ${currentIter + 1}:
            
            CODE:
            ${currentCode}

            ISSUES:
            ${checkOutput}

            INSTRUCTION:
            ${node.data.prompt || "Fix the code based on the issues."}
         `;

         const fixedResult = await runAiWithFallback(async (p) => {
            return await refineCode(fixPrompt, "Fix the code.", aiSettings, node.data.model, node.data.provider);
         }, node.data.provider, aiSettings);

         const newFiles = parseOutputToFiles(fixedResult);

         // Update Source (Rewind)
         updateNodeData(codeParent.id, { 
             output: fixedResult, 
             code: fixedResult,
             files: Object.keys(newFiles).length > 0 ? newFiles : undefined 
         });

         // Update Self
         updateNodeData(node.id, { 
             currentIteration: currentIter + 1,
             lastFixedCode: fixedResult,
             status: 'idle' 
         });

         // Reset Issue Detector
         updateNodeData(issueParent.id, { status: 'idle', output: undefined });
         
         throw new Error("LOOP_TRIGGERED");
    } else {
         const resultMsg = hasError ? "Max retries reached." : "Checks passed.";
         const finalCode = codeParent.data.output || "";
         const finalFiles = codeParent.data.files || parseOutputToFiles(finalCode);
         
         updateNodeData(node.id, { 
             status: 'success', 
             output: resultMsg,
             currentIteration: 0,
             files: finalFiles
         });
    }
}