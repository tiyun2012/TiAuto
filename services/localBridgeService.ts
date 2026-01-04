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
 * POST /api/config { projectRoot: string } -> { success: boolean, root: string }
 * POST /api/browse { targetPath: string } -> { current: string, parent: string, folders: string[], files: string[] }
 */

// Helper to sanitize URL (remove trailing slash)
const cleanUrl = (url: string) => url ? url.replace(/\/+$/, '') : '';

const detectMixedContentError = (url: string) => {
    const isAppSecure = window.location.protocol === 'https:';
    const isTargetLocal = url.includes('localhost') || url.includes('127.0.0.1');
    const isTargetInsecure = url.startsWith('http:');
    
    // Check if we are likely in Project IDX or a Cloud IDE
    const isCloudEnv = window.location.hostname.includes('googleusercontent') || 
                       window.location.hostname.includes('github') || 
                       window.location.hostname.includes('gitpod');

    if (isAppSecure && isTargetLocal && isTargetInsecure) {
        let msg = `\n\n[CONNECTION BLOCKED] Browser Security Rule`;
        msg += `\nYou are viewing this app via HTTPS (${window.location.hostname}), but trying to reach insecure 'localhost'.`;
        
        if (isCloudEnv) {
             msg += `\n\n[VS CODE / PROJECT IDX DETECTED]`;
             msg += `\n1. Open the 'Ports' tab (bottom panel) in your editor.`;
             msg += `\n2. Find Port 3001.`;
             msg += `\n3. Copy the 'Forwarded Address' (it starts with https://).`;
             msg += `\n4. Paste it into Settings -> Local Bridge URL.`;
        } else {
             msg += `\n\nFIX: Please update Settings -> Local Bridge URL to use the secure public URL for your backend, or run the frontend on http://localhost.`;
        }
        return msg;
    }
    return "";
};

// Helper to handle fetch errors consistently
const handleBridgeRequest = async (url: string, body: any, errorMessage: string) => {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || res.statusText);
        return data;
    } catch (e: any) {
        let hint = "";
        
        if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError') || e.message.includes('Connection refused')) {
             hint = detectMixedContentError(url);
             if (!hint) hint = `\nIs 'npm run bridge' running? Checked: ${url}`;
             throw new Error(`Bridge Unreachable.${hint}`);
        }
        throw new Error(`${errorMessage}: ${e.message}`);
    }
};

const checkEnabled = (settings: AISettings) => {
    if (!settings.localBridgeEnabled) {
        throw new Error("Local Bridge is disabled. Please enable it in Settings -> Local Bridge.");
    }
};

export const checkBridgeHealth = async (baseUrl: string): Promise<boolean> => {
    try {
        // Sanitize URL to avoid //health
        const target = `${cleanUrl(baseUrl)}/health`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(target, { signal: controller.signal });
        clearTimeout(timeoutId);
        return res.ok;
    } catch (e: any) {
        console.warn(`Bridge Health Check Failed (${baseUrl}):`, e.message);
        return false;
    }
};

export const bridgeSetRoot = async (path: string, settings: AISettings): Promise<string> => {
    checkEnabled(settings);
    const url = `${cleanUrl(settings.localBridgeUrl)}/api/config`;
    const data = await handleBridgeRequest(url, { projectRoot: path }, "Failed to set Root");
    return data.root;
};

export const bridgeExecute = async (command: string, settings: AISettings, shell?: string): Promise<string> => {
    checkEnabled(settings);
    const url = `${cleanUrl(settings.localBridgeUrl)}/api/execute`;
    const data = await handleBridgeRequest(url, { command, shell }, "Bridge Execution Failed");
    
    // Combine stdout and stderr for the logs
    let output = data.stdout || "";
    if (data.stderr) output += `\n[STDERR]\n${data.stderr}`;
    
    return output || "(No Output)";
};

export const bridgeReadFile = async (path: string, settings: AISettings): Promise<string> => {
    checkEnabled(settings);
    const url = `${cleanUrl(settings.localBridgeUrl)}/api/read`;
    const data = await handleBridgeRequest(url, { path }, "Bridge Read Failed");
    return data.content;
};

export const bridgeWriteFile = async (path: string, content: string, settings: AISettings): Promise<string> => {
    checkEnabled(settings);
    const url = `${cleanUrl(settings.localBridgeUrl)}/api/write`;
    await handleBridgeRequest(url, { path, content }, "Bridge Write Failed");
    return `Successfully wrote to ${path}`;
};

export const bridgeListFiles = async (path: string, settings: AISettings): Promise<string[]> => {
    checkEnabled(settings);
    const url = `${cleanUrl(settings.localBridgeUrl)}/api/list`;
    const data = await handleBridgeRequest(url, { path: path || '.' }, "Bridge List Failed");
    return Array.isArray(data.files) ? data.files : [];
};

export interface BrowserData {
    current: string;
    parent: string | null;
    folders: string[];
    files: string[];
    separator: string;
}

export const bridgeBrowse = async (path: string, settings: AISettings): Promise<BrowserData> => {
    checkEnabled(settings);
    const url = `${cleanUrl(settings.localBridgeUrl)}/api/browse`;
    return await handleBridgeRequest(url, { targetPath: path }, "Browse Failed");
};