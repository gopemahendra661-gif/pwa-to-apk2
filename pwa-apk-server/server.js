// server.js
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch'); // node 18+ में native fetch भी हो सकता है
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

// CORS: आपकी GitHub Pages डोमेन यहाँ allow करें (production में पूरा origin डालें)
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER;    // आपकी username
const REPO_NAME  = process.env.REPO_NAME;     // repo name, जैसे pwa-to-apk
const WORKFLOW_FILE = process.env.WORKFLOW_FILE || 'build-apk.yml';
const REF = process.env.REF || 'main';

if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
  console.error('Error: GITHUB_TOKEN, REPO_OWNER और REPO_NAME environment variables set करें।');
  process.exit(1);
}

app.post('/trigger-workflow', async (req, res) => {
  try {
    const { manifest } = req.body;
    if (!manifest) return res.status(400).json({ success: false, error: 'manifest missing' });

    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_FILE}/dispatches`;
    const body = {
      ref: REF,
      inputs: {
        manifest
      }
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (r.status === 204) {
      // 204 No Content = success (workflow triggered)
      return res.json({ success: true, message: 'Workflow triggered' });
    } else {
      const text = await r.text();
      return res.status(500).json({ success: false, error: `GitHub API error: ${r.status}`, details: text });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
