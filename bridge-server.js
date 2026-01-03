const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors()); // Allow frontend (localhost:3002) to call this
app.use(bodyParser.json({ limit: '50mb' }));

// 1. Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', mode: 'local-bridge' });
});

// 2. Execute Shell Commands
app.post('/api/execute', async (req, res) => {
    const { command, cwd } = req.body;
    
    if (!command) {
        return res.status(400).json({ error: 'Command is required' });
    }

    console.log(`[EXEC] ${command}`);

    // Execution options
    const options = {
        cwd: cwd || process.cwd(), // Default to project root if no path provided
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer for large outputs
    };

    exec(command, options, (error, stdout, stderr) => {
        // We return everything, even if there was an error code, 
        // because sometimes stderr contains useful info (like git status)
        res.json({
            stdout: stdout || '',
            stderr: stderr || '',
            error: error ? error.message : null
        });
    });
});

// 3. Read File
app.post('/api/read', async (req, res) => {
    const { path: filePath } = req.body;
    
    if (!filePath) return res.status(400).json({ error: 'Path is required' });

    try {
        const absolutePath = path.resolve(filePath);
        console.log(`[READ] ${absolutePath}`);
        const content = await fs.readFile(absolutePath, 'utf-8');
        res.json({ content });
    } catch (error) {
        console.error(`[READ ERROR] ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// 4. Write File
app.post('/api/write', async (req, res) => {
    const { path: filePath, content } = req.body;

    if (!filePath || content === undefined) {
        return res.status(400).json({ error: 'Path and content are required' });
    }

    try {
        const absolutePath = path.resolve(filePath);
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

// 5. List Files (Project Indexing)
app.post('/api/list', async (req, res) => {
    const { path: dirPath } = req.body;
    const targetDir = path.resolve(dirPath || '.');

    console.log(`[LIST] ${targetDir}`);

    try {
        const files = await getFiles(targetDir);
        res.json({ files });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Helper for recursive file listing
async function getFiles(dir) {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        // Ignore node_modules, .git, and build folders to keep context small
        if (dirent.isDirectory()) {
            if (dirent.name === 'node_modules' || dirent.name === '.git' || dirent.name === 'dist' || dirent.name === 'build') {
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
    console.log(`   - Mode: Full System Access (Read/Write/Exec)`);
    console.log(`   - Frontend should run on Port 3002`);
    console.log(`-----------------------------------------------------`);
});