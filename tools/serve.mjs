// Local server: `node tools/serve.mjs` → http://localhost:8795. No dependencies.
// Sends no-cache so edits show up on reload; the service worker still runs (localhost counts as secure).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +(process.env.PORT || 8795);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ics': 'text/calendar', '.txt': 'text/plain; charset=utf-8' };

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(ROOT) || /\/(\.git|node_modules)\//.test(file)) { res.writeHead(403).end('Forbidden'); return; }
    const st = await stat(file);
    if (!st.isFile()) throw new Error('not a file');
    let body = await readFile(file);
    // START_URL=./?seed=today makes a Home Screen install on a simulator open with demo data.
    if (process.env.START_URL && file.endsWith('manifest.webmanifest')) {
      body = JSON.stringify({ ...JSON.parse(body), start_url: process.env.START_URL });
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch (e) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}).listen(PORT, () => console.log(`Barracks PT on http://localhost:${PORT}`));
