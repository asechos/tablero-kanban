const http = require('http');
const fs = require('fs');
const path = require('path');
const fsp = fs.promises;

const PORT = 7000;
const DATA_DIR = path.join(__dirname, 'data');
const BOARD_FILE = path.join(DATA_DIR, 'board.json');
const COMPLETED_FILE = path.join(DATA_DIR, 'completed.json');

let sseClients = [];
let version = 0;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

async function initData() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try { await fsp.access(BOARD_FILE); } catch {
    await fsp.writeFile(BOARD_FILE, JSON.stringify({ pendiente: [], trabajando: [], porconfirmar: [] }));
  }
  try { await fsp.access(COMPLETED_FILE); } catch {
    await fsp.writeFile(COMPLETED_FILE, '[]');
  }
}

function broadcast() {
  version++;
  const msg = `data: ${version}\n\n`;
  sseClients.forEach((res) => {
    try { res.write(msg); } catch { /* ignore */ }
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

async function handleAPI(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }

  if (pathname === '/api/board') {
    if (req.method === 'GET') {
      const data = await fsp.readFile(BOARD_FILE, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
      return true;
    }
    if (req.method === 'POST') {
      const data = await parseBody(req);
      await fsp.writeFile(BOARD_FILE, JSON.stringify(data));
      broadcast();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return true;
    }
  }

  if (pathname === '/api/completed') {
    if (req.method === 'GET') {
      const data = await fsp.readFile(COMPLETED_FILE, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
      return true;
    }
    if (req.method === 'POST') {
      const data = await parseBody(req);
      await fsp.writeFile(COMPLETED_FILE, JSON.stringify(data));
      broadcast();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return true;
    }
  }

  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(`data: ${version}\n\n`);
    sseClients.push(res);
    req.on('close', () => {
      sseClients = sseClients.filter((c) => c !== res);
    });
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  try {
    if (await handleAPI(req, res)) return;

    let url = req.url.split('?')[0];
    if (url === '/') url = '/index.html';

    const filePath = path.join(__dirname, url);
    const ext = path.extname(filePath);

    const data = await fsp.readFile(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 - Archivo no encontrado</h1>');
  }
});

initData().then(() => {
  server.listen(PORT, () => {
    console.log(`\n  Tablero Kanban corriendo en:\n  http://localhost:${PORT}\n`);
  });
});
