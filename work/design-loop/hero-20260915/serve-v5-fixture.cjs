const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..', '..', 'dist');
const fixture = `<script>
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('[data-arias-announcement]')) return;
  const bar = document.createElement('div');
  bar.dataset.ariasAnnouncement = 'true';
  bar.dataset.visible = 'true';
  bar.className = 'arias-pc-bar';
  bar.setAttribute('role', 'complementary');
  bar.setAttribute('aria-label', 'Aviso de la tienda');
  const link = document.createElement('a');
  link.href = 'https://wa.me/5493804505150';
  link.textContent = 'Novedades y ofertas por WhatsApp';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'arias-pc-bar__close';
  close.setAttribute('aria-label', 'Cerrar aviso');
  close.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"></path></svg>';
  close.addEventListener('click', () => bar.remove());
  bar.append(link, close);
  const hero = document.querySelector('[data-arias-section="hero"]');
  if (hero) hero.after(bar); else document.body.append(bar);
});
</script>`;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

http.createServer((request, response) => {
  const pathname = decodeURIComponent(request.url.split('?')[0]);
  let filename = path.join(root, pathname === '/' ? 'index.html' : pathname);
  if (!filename.startsWith(root)) {
    response.writeHead(403);
    response.end('403');
    return;
  }
  if (fs.existsSync(filename) && fs.statSync(filename).isDirectory()) filename = path.join(filename, 'index.html');
  fs.readFile(filename, (error, bytes) => {
    if (error) {
      response.writeHead(404);
      response.end('404');
      return;
    }
    const ext = path.extname(filename);
    let body = bytes;
    if (ext === '.html') body = bytes.toString('utf8').replace('</body>', `${fixture}</body>`);
    response.writeHead(200, {
      'Content-Type': mime[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(body);
  });
}).listen(4330, '127.0.0.1', () => {
  console.log('V5_FIXTURE http://127.0.0.1:4330');
});
