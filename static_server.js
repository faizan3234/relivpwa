const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;

http.createServer((req, res) => {
  // Proxy /oracle-api to Oracle Cloud server (matches Netlify redirect)
  if (req.url.startsWith('/oracle-api/')) {
    const targetPath = req.url.replace(/^\/oracle-api/, '');
    const proxyReq = http.request(`http://161.118.169.29:4000${targetPath}`, {
      method: req.method,
      headers: { ...req.headers, host: '161.118.169.29:4000' }
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });
    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Proxy error: ' + err.message);
    });
    req.pipe(proxyReq, { end: true });
    return;
  }

  // Parse URL to prevent directory traversal
  let safeUrl = req.url.split('?')[0];
  let filePath = path.join(__dirname, safeUrl);
  
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 File Not Found', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code + '\n');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
}).listen(PORT);

console.log(`\n======================================================`);
console.log(`🚀 Relix local server started successfully!`);
console.log(`👉 Open http://localhost:${PORT}/ in your browser.`);
console.log(`======================================================\n`);
