const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const app = express();
const PORT = 3001;

// --- CONFIGURATION ---
// We set your Engine Path here.
// You can change this string via POST /api/config or by editing this file.
let PROJECT_ROOT = process.env.PROJECT_ROOT || "D:\\Dev\\ti3D_main\\ti3D_new-main";

// Middleware
app.use(cors()); // Allow frontend (localhost:3002) to call this
app.use(bodyParser.json({ limit: '50mb' }));

// Helper to resolve paths relative to PROJECT_ROOT
const resolvePath = (userPath) => {
    // If user provides absolute path, use it. Otherwise join with ROOT.
    if (path.isAbsolute(userPath)) return path.normalize(userPath);
    return path.resolve(PROJECT_ROOT, userPath);
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
    const { command, cwd } = req.body;
    
    if (!command) {
        return res.status(400).json({ error: 'Command is required' });
    }

    // Default to PROJECT_ROOT if no specific folder is requested
    const targetCwd = cwd ? resolvePath(cwd) : PROJECT_ROOT;

    console.log(`[EXEC] "${command}" in ${targetCwd}`);

    const options = {
        cwd: targetCwd, 
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    };

    exec(command, options, (error, stdout, stderr) => {
        res.json({
            stdout: stdout || '',
            stderr: stderr || '',
            error: error ? error.message : null
        });
    });
});

// 4. Read File
app.post('/api/read', async (req, res) => {
    const { path: filePath } = req.body;
    
    if (!filePath) return res.status(400).json({ error: 'Path is required' });

    try {
        const absolutePath = resolvePath(filePath);
        console.log(`[READ] ${absolutePath}`);
        const content = await fs.readFile(absolutePath, 'utf-8');
        res.json({ content });
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
            
        // Get parent directory
        const parent = path.dirname(browsePath);

        res.json({
            current: browsePath,
            parent: parent === browsePath ? null : parent, // If root, parent is null-ish
            folders: folders,
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
            if (['node_modules', '.git', 'dist', 'build', '.vs', 'bin', 'obj'].includes(dirent.name)) {
                return [];
            }
            return getFiles(res);
        } else {
            return res;
        }
    }));
    return Array.prototype.concat(...files);
}

app.listen(PORT, () => {
    console.log(`-----------------------------------------------------`);
    console.log(`🔌 Local Bridge Server running on http://localhost:${PORT}`);
    console.log(`📂 Linked Project Root: ${PROJECT_ROOT}`);
    console.log(`   - Frontend Access: Allowed (CORS enabled)`);
    console.log(`-----------------------------------------------------`);
});