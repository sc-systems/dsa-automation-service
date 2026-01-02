const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 4000;
const PYTHON_SERVICE = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';

// GitHub config (NO TOKEN - Python handles auth)
const GITHUB_USER = process.env.GITHUB_USER || 'sc-systems'; // Update this
const GITHUB_REPO = process.env.GITHUB_REPO || 'dsa-journey';       // Update this
const GITHUB_API = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}`;

// Cache
let folderCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Middleware: logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Fetch folder tree from GitHub API
async function fetchFoldersFromGitHub() {
  try {
    console.log('Fetching folder tree from GitHub...');
    const response = await axios.get(`${GITHUB_API}/contents`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'DSA-Automation-App'
      }
    });

    const rootItems = response.data.filter(item => item.type === 'dir');
    const folderTree = {};

    // Fetch subfolders for each top-level folder
    for (const folder of rootItems) {
      try {
        const subResponse = await axios.get(`${GITHUB_API}/contents/${folder.name}`, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'DSA-Automation-App'
          }
        });
        
        const subFolders = subResponse.data
          .filter(item => item.type === 'dir')
          .map(item => item.name);
        
        folderTree[folder.name] = subFolders;
      } catch (err) {
        console.error(`Error fetching subfolders for ${folder.name}:`, err.message);
        folderTree[folder.name] = [];
      }
    }

    console.log('Folder tree fetched successfully:', folderTree);
    return folderTree;
  } catch (error) {
    console.error('GitHub API fetch failed:', error.message);
    throw error;
  }
}

// Fallback: static folder structure
function getFallbackFolders() {
  console.log('Using fallback folder structure');
  return {
    "DS": ["Arrays", "LinkedList", "Stack", "Queue", "Tree", "Graph"],
    "Patterns": ["TwoPointers", "SlidingWindow", "BinarySearch", "DFS", "BFS"],
    "Algorithms": ["Sorting", "Searching", "DynamicProgramming"],
    "Practice": ["Easy", "Medium", "Hard"]
  };
}

// GET /api/folders - Fetch folder tree
app.get('/api/folders', async (req, res) => {
  try {
    // Check cache
    const now = Date.now();
    if (folderCache && cacheTimestamp && (now - cacheTimestamp < CACHE_TTL)) {
      console.log('Returning cached folders');
      return res.json(folderCache);
    }

    // Try GitHub API
    try {
      const folders = await fetchFoldersFromGitHub();
      folderCache = folders;
      cacheTimestamp = Date.now();
      return res.json(folders);
    } catch (githubError) {
      // Fallback to static
      console.warn('GitHub fetch failed, using fallback');
      const fallback = getFallbackFolders();
      return res.json(fallback);
    }
  } catch (error) {
    console.error('Error in /api/folders:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// POST /api/create-file - Forward to Python service
app.post('/api/create-file', async (req, res) => {
  try {
    const { topFolder, subFolder, filename, content, action } = req.body;

    // Validate payload
    if (!topFolder || !subFolder || !filename || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['check', 'overwrite', 'version', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    console.log(`Forwarding to Python: ${topFolder}/${subFolder}/${filename} [${action}]`);

    // Forward to Python service
    const pythonResponse = await axios.post(`${PYTHON_SERVICE}/create-file`, {
      topFolder,
      subFolder,
      filename,
      content,
      action
    }, {
      timeout: 30000 // 30 second timeout
    });

    res.json(pythonResponse.data);
  } catch (error) {
    console.error('Error forwarding to Python:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Python service not available. Is it running on port 5000?' 
      });
    }

    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'node-gateway',
    cacheStatus: folderCache ? 'loaded' : 'empty'
  });
});

app.listen(PORT, () => {
  console.log(`🟢 Node.js API Gateway running on http://localhost:${PORT}`);
  console.log(`📡 Forwarding requests to Python service at ${PYTHON_SERVICE}`);
  console.log(`🔄 Folder cache TTL: ${CACHE_TTL / 1000}s`);
});