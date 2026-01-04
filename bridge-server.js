const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const app = express();
const PORT = 3001;
const HOST = '0.0.0.0'; // BIND TO ALL INTERFACES (Fixes Cloud IDE Port Detection)

// --- CONFIGURATION ---
// We set your Engine Path here.
// You can change this string via POST /api/config or by editing this file.
let PROJECT_ROOT = process.env.PROJECT_ROOT || "D:\\Dev\\ti3D_main\\ti3D_new-main";

// Middleware

// 0. Request Logger (Debug)
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

// 1. Add Private Network Access Headers BEFORE CORS
// This ensures they are present even if the CORS middleware terminates the request (e.g. OPTIONS)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Private-Network", "true");
    next();
});

// 2. Enable CORS for all origins
app.use(cors({
    origin: true, // Reflect request origin
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Private-Network']
}));

app.use(bodyParser.json({ limit: '50mb' }));

// Helper to resolve paths relative to PROJECT_ROOT
const resolvePath = (userPath) => {
    // If user provides absolute path, use it. Otherwise join with ROOT.
    if (path.isAbsolute(userPath)) return path.normalize(userPath);
    return path.resolve(PROJECT_ROOT, userPath);
};

// Helper for binary detection
const isBinary = (buffer) => {
    // Check start of buffer for null bytes or control characters common in binaries
    const checkLen = Math.min(buffer.length, 512);
    for (let i = 0; i < checkLen; i++) {
        if (buffer[i] === 0) return true;
    }
    return false;
};

// 1. Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', mode: 'local-bridge', root: PROJECT_ROOT });
});

// 2. Configure Root Path (New)
app.post('/api/config', async (req, res) => {
    const { projectRoot } = req.body;
    if (projectRoot) {
        // Verify path exists
        try {
            await fs.access(projectRoot);
            PROJECT_ROOT = path.normalize(projectRoot); // Update global
            console.log(`[CONFIG] Project Root changed to: ${PROJECT_ROOT}`);
            res.json({ success: true, root: PROJECT_ROOT });
        } catch(e) {
            console.error(`[CONFIG ERROR] Path invalid: ${projectRoot}`);
            res.status(400).json({ error: "Path does not exist or is not accessible." });
        }
    } else {
        res.status(400).json({ error: "Missing 'projectRoot' parameter" });
    }
});

// 3. Execute Shell Commands
app.post('/api/execute', async (req, res) => {
    const { command, cwd, shell } = req.body;
    
    if (!command) {
        return res.status(400).json({ error: 'Command is required' });
    }

    // Default to PROJECT_ROOT if no specific folder is requested
    const targetCwd = cwd ? resolvePath(cwd) : PROJECT_ROOT;

    console.log(`[EXEC] "${command}" in ${targetCwd} (Shell: ${shell || 'default'})`);

    const options = {
        cwd: targetCwd, 
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        shell: shell || undefined // Allow overriding shell (e.g., 'powershell.exe')
    };

    exec(command, options, (error, stdout, stderr) => {
        res.json({
            stdout: stdout || '',
            stderr: stderr || '',
            error: error ? error.message : null
        });
    });
});

// 4. Read File (Enhanced for Directories)
app.post('/api/read', async (req, res) => {
    const { path: filePath } = req.body;
    
    if (!filePath) return res.status(400).json({ error: 'Path is required' });

    try {
        const absolutePath = resolvePath(filePath);
        console.log(`[READ] ${absolutePath}`);
        
        const stat = await fs.stat(absolutePath);

        if (stat.isDirectory()) {
            // RECURSIVE READ MODE
            console.log(`[READ] Detected Directory. Merging contents...`);
            const files = await getFiles(absolutePath);
            let mergedContent = "";
            let fileCount = 0;

            for (const file of files) {
                // Filter out likely binary extensions just by name to save IO
                if (/\.(png|jpg|jpeg|gif|ico|pdf|zip|tar|gz|7z|exe|dll|bin|obj|o|a|lib|iso)$/i.test(file)) continue;
                if (file.includes('.git') || file.includes('node_modules')) continue;

                try {
                    const buffer = await fs.readFile(file);
                    if (isBinary(buffer)) continue;

                    const relPath = path.relative(PROJECT_ROOT, file);
                    mergedContent += `// --- FILE: ${relPath} ---\n${buffer.toString('utf-8')}\n\n`;
                    fileCount++;
                } catch(e) {
                    console.warn(`Skipped ${file}: ${e.message}`);
                }
            }
            
            if (fileCount === 0) mergedContent = "// (Directory was empty or contained only binary/ignored files)";
            res.json({ content: mergedContent });

        } else {
            // SINGLE FILE MODE
            const content = await fs.readFile(absolutePath, 'utf-8');
            res.json({ content });
        }

    } catch (error) {
        console.error(`[READ ERROR] ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// 5. Write File
app.post('/api/write', async (req, res) => {
    const { path: filePath, content } = req.body;

    if (!filePath || content === undefined) {
        return res.status(400).json({ error: 'Path and content are required' });
    }

    try {
        const absolutePath = resolvePath(filePath);
        console.log(`[WRITE] ${absolutePath}`);
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        
        await fs.writeFile(absolutePath, content, 'utf-8');
        res.json({ success: true, path: absolutePath });
    } catch (error) {
        console.error(`[WRITE ERROR] ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// 6. List Files (Project Indexing - Recursive)
app.post('/api/list', async (req, res) => {
    const { path: dirPath } = req.body;
    // Default to PROJECT_ROOT if '.' or empty string is passed
    const targetDir = resolvePath(dirPath || '.');

    console.log(`[LIST] ${targetDir}`);

    try {
        const files = await getFiles(targetDir);
        // Return relative paths so the AI context isn't flooded with "D:\Dev\..."
        const relativeFiles = files.map(f => path.relative(PROJECT_ROOT, f));
        res.json({ files: relativeFiles });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 7. Browse Directory (Navigation - Non-Recursive)
app.post('/api/browse', async (req, res) => {
    let { targetPath } = req.body;
    
    // If no path provided, try to guess home or root
    if (!targetPath || targetPath === '.') targetPath = PROJECT_ROOT;
    
    // Normalize
    const browsePath = path.normalize(targetPath);

    console.log(`[BROWSE] ${browsePath}`);

    try {
        const dirents = await fs.readdir(browsePath, { withFileTypes: true });
        
        const folders = dirents
            .filter(d => d.isDirectory())
            .map(d => d.name);
            
        const files = dirents
            .filter(d => d.isFile())
            .map(d => d.name);
            
        // Get parent directory
        const parent = path.dirname(browsePath);

        res.json({
            current: browsePath,
            parent: parent === browsePath ? null : parent, // If root, parent is null-ish
            folders: folders,
            files: files,
            separator: path.sep
        });
    } catch (error) {
        console.error(`[BROWSE ERROR] ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});


// Helper for recursive file listing
async function getFiles(dir) {
    let dirents;
    try {
        dirents = await fs.readdir(dir, { withFileTypes: true });
    } catch (e) {
        console.error(`Error reading dir ${dir}: ${e.message}`);
        return [];
    }

    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        // Ignore heavy folders
        if (dirent.isDirectory()) {
            if (['node_modules', '.git', 'dist', 'build', '.vs', 'bin', 'obj', '__pycache__', '.idea', '.vscode'].includes(dirent.name)) {
                return [];
            }
            return getFiles(res);
        } else {
            return res;
        }
    }));
    return Array.prototype.concat(...files);
}

app.listen(PORT, HOST, () => {
    console.log(`-----------------------------------------------------`);
    console.log(`🔌 Local Bridge Server running on http://${HOST}:${PORT}`);
    console.log(`📂 Linked Project Root: ${PROJECT_ROOT}`);
    console.log(`-----------------------------------------------------`);
    console.log(`⚠️  CLOUD IDE USERS (IDX, Replit, VS Code Web) ⚠️`);
    console.log(`1. Open your 'PORTS' or 'Networking' tab.`);
    console.log(`2. If Port 3001 is missing, manually add it.`);
    console.log(`3. Copy the Public HTTPS URL for Port 3001.`);
    console.log(`4. Paste it into FlowGen Settings -> Local Bridge URL.`);
    console.log(`-----------------------------------------------------`);
});