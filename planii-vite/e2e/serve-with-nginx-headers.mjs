// Serves dist/ with exactly the `add_header` values of nginx.conf, so browser tests run under the
// production CSP / Permissions-Policy. It does NOT replace a real Nginx image build (see docs/jitsi-meetings.md).
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const dist = join(root, 'dist')
const conf = readFileSync(join(root, 'nginx.conf'), 'utf8')
const serverLevel = conf.slice(0, conf.indexOf('location /'))
const headers = {}
for (const m of serverLevel.matchAll(/^\s*add_header\s+([\w-]+)\s+"((?:[^"\\]|\\.)*)"\s+always;/gm)) headers[m[1]] = m[2].replace(/\\"/g, '"')

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' }
const port = Number(process.env.PORT || 4174)

createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')
  let file = join(dist, path)
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html') // try_files … /index.html
  res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', ...headers })
  res.end(readFileSync(file))
}).listen(port, () => console.log(`nginx-headers static server on :${port}`, Object.keys(headers)))
