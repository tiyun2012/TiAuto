
import { AISettings } from "../types";

/**
 * Local Bridge Service
 * 
 * This service communicates with a lightweight local server (not provided) 
 * that the user would run on their machine to enable file system access and shell execution.
 * 
 * Standard Endpoint Contract:
 * POST /api/execute { command: string, cwd?: string } -> { stdout: string, stderr: string }
 * POST /api/read { path: string } -> { content: string }
 * POST /api/write { path: string, content: string } -> { success: boolean }
 * POST /api/list { path: string } -> { files: string[] }
 */

export const checkBridgeHealth = async (url: string): Promise<boolean> => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        const res = await fetch(`${url}/health`, { signal: controller.signal });
        clearTimeout(timeoutId);
        return res.ok;
    } catch (e) {
        return false;
    }
};

export const bridgeExecute = async (command: string, settings: AISettings): Promise<string> => {
    if (!settings.localBridgeEnabled) throw new Error("Local Bridge is disabled in settings.");
    
    try {
        const res = await fetch(`${settings.localBridgeUrl}/api/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command })
        });
        
        if (!res.ok) throw new Error(`Bridge Error: ${res.statusText}`);
        
        const data = await res.json();
        // Combine stdout and stderr for the logs
        let output = data.stdout || "";
        if (data.stderr) output += `\n[STDERR]\n${data.stderr}`;
        
        if (data.error) throw new Error(data.error);
        
        return output || "(No Output)";
    } catch (e: any) {
        throw new Error(`Local Bridge Connection Failed: ${e.message}. Is your local server running at ${settings.localBridgeUrl}?`);
    }
};

export const bridgeReadFile = async (path: string, settings: AISettings): Promise<string> => {
    if (!settings.localBridgeEnabled) throw new Error("Local Bridge is disabled in settings.");

    try {
        const res = await fetch(`${settings.localBridgeUrl}/api/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });

        if (!res.ok) throw new Error(`Bridge Read Error: ${res.statusText}`);
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);
        return data.content;
    } catch (e: any) {
        throw new Error(`Local Bridge Read Failed: ${e.message}`);
    }
};

export const bridgeWriteFile = async (path: string, content: string, settings: AISettings): Promise<string> => {
    if (!settings.localBridgeEnabled) throw new Error("Local Bridge is disabled in settings.");

    try {
        const res = await fetch(`${settings.localBridgeUrl}/api/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, content })
        });

        if (!res.ok) throw new Error(`Bridge Write Error: ${res.statusText}`);
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);
        return `Successfully wrote to ${path}`;
    } catch (e: any) {
        throw new Error(`Local Bridge Write Failed: ${e.message}`);
    }
};

export const bridgeListFiles = async (path: string, settings: AISettings): Promise<string[]> => {
    if (!settings.localBridgeEnabled) throw new Error("Local Bridge is disabled in settings.");

    try {
        const res = await fetch(`${settings.localBridgeUrl}/api/list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: path || '.' })
        });

        if (!res.ok) throw new Error(`Bridge List Error: ${res.statusText}`);
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);
        return Array.isArray(data.files) ? data.files : [];
    } catch (e: any) {
        throw new Error(`Local Bridge List Failed: ${e.message}`);
    }
};
