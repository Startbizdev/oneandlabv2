/** Local preview gateway: browser -> localhost -> Cary API / compiled Nuxt. */
const http = require('node:http');
const https = require('node:https');
const { spawn } = require('node:child_process');
const path = require('node:path');
const frontend = spawn(process.execPath, [path.join(__dirname, '../frontend/.output/server/index.mjs')], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: '3100', NUXT_PUBLIC_API_BASE: '/api', NUXT_API_INTERNAL_BASE: 'https://cary.bio/api' },
  stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true,
});
const allowedHosts = new Set(['localhost:3000', '127.0.0.1:3000']);
const allowedOrigins = new Set(['http://localhost:3000', 'http://127.0.0.1:3000']);
const server = http.createServer((req, res) => {
  if (!allowedHosts.has(req.headers.host) || (req.headers.origin && !allowedOrigins.has(req.headers.origin))) {
    res.writeHead(403); return res.end('Local preview only');
  }
  if (!req.url?.startsWith('/') || req.url.startsWith('//')) { res.writeHead(400); return res.end(); }
  const api = req.url === '/api' || req.url.startsWith('/api/') || req.url.startsWith('/api?');
  const headers = { ...req.headers, host: api ? 'cary.bio' : '127.0.0.1:3100' };
  delete headers.connection;
  const upstream = (api ? https : http).request({
    hostname: api ? 'cary.bio' : '127.0.0.1', port: api ? 443 : 3100,
    path: req.url, method: req.method, headers,
  }, response => {
    const responseHeaders = { ...response.headers };
    if (api && responseHeaders['set-cookie']) {
      responseHeaders['set-cookie'] = responseHeaders['set-cookie'].map(cookie => cookie.replace(/;\s*Domain=[^;]+/ig, ''));
    }
    if (api && responseHeaders.location?.startsWith('https://cary.bio/api/')) {
      responseHeaders.location = responseHeaders.location.replace('https://cary.bio', '');
    }
    res.writeHead(response.statusCode || 502, responseHeaders);
    response.pipe(res);
  });
  upstream.setTimeout(60000, () => upstream.destroy(new Error('Upstream timeout')));
  upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('Service temporairement indisponible'); });
  res.on('close', () => { if (!res.writableFinished) upstream.destroy(); });
  req.pipe(upstream);
});
server.on('error', error => { console.error(error.message); frontend.kill(); process.exitCode = 1; });
server.listen(3000, '127.0.0.1', () => console.log('Preview: http://localhost:3000 — API proxied to Cary production'));
frontend.on('exit', code => { server.close(); if (code) process.exitCode = code; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { frontend.kill(); server.close(); });
process.on('exit', () => frontend.kill());
