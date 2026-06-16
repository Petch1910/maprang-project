import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { extname, join } from 'path';

const ROOT = process.argv[2] || 'D:/missai.me';
const PORT = 8899;
const types = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.json':'application/json', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.txt':'text/plain' };

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/home';
    let fp = join(ROOT, p);
    // try direct file, then .html mapping
    if (!existsSync(fp) || !extname(fp)) {
      if (existsSync(fp + '.html')) fp = fp + '.html';
      else if (existsSync(join(ROOT, p.replace(/^\//,'') + '.html'))) fp = join(ROOT, p.replace(/^\//,'') + '.html');
    }
    if (!existsSync(fp)) { // SPA fallback to the requested page html or home
      const guess = join(ROOT, p.split('/').filter(Boolean).pop() + '.html');
      fp = existsSync(guess) ? guess : join(ROOT, 'home.html');
    }
    const data = await readFile(fp);
    res.setHeader('Content-Type', types[extname(fp)] || 'application/octet-stream');
    res.end(data);
  } catch (e) {
    res.statusCode = 500; res.end(String(e));
  }
}).listen(PORT, () => console.log('serving', ROOT, 'on', PORT));
