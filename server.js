/**
 * Servidor de desarrollo.
 *
 * Sirve el catálogo renderizando con los mismos templates que usa el build,
 * así que lo que se ve en local es igual a lo que se publica. Además expone
 * la API que consume el panel de administración.
 *
 *   npm run dev   ->  http://localhost:4321
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readFirestoreData } from './src/firestore-rest.js';


const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4321;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

/* ---------- módulos en caliente ----------
   Node cachea los módulos al importarlos, así que sin esto habría que
   reiniciar el server cada vez que se toca una plantilla o la API. Se
   reimporta con la fecha de modificación en la query: mismo archivo,
   otra URL, módulo nuevo. Sólo para desarrollo; el build importa normal.

   Ojo con esto: reimportar el ENTRY con otra query sólo revienta la caché
   de ese archivo puntual. Si ese archivo a su vez hace un `import './x.js'`
   estático, esa importación interna sigue apuntando a la copia de x.js que
   Node cacheó la primera vez — el query string nuevo nunca la toca, porque
   Node cachea por URL resuelta y `./x.js` sin query siempre resuelve a la
   misma URL. Pasó de verdad: ai-api.js importaba `./ai.js` así, y agregar
   una función nueva a ai.js no aparecía hasta reiniciar el servidor a mano.
   La regla: cualquier módulo del que dependa un endpoint tiene que tener
   su propia entrada acá y pedirse con `hot()`, nunca con un `import`
   estático — si no, esa dependencia queda pegada a como estaba al arrancar
   el proceso. */
const HOT = {
  templates: { entry: './src/templates.js', deps: ['src/templates.js'] },
  sitemap: { entry: './src/sitemap.js', deps: ['src/sitemap.js', 'src/templates.js'] },
  ai: { entry: './src/ai.js', deps: ['src/ai.js'] },
  aiApi: { entry: './src/ai-api.js', deps: ['src/ai-api.js'] },
};
const hotCache = {};

async function hot(name) {
  const { entry, deps } = HOT[name];
  const stamps = await Promise.all(
    deps.map((f) => fs.stat(path.join(ROOT, f)).then((s) => s.mtimeMs).catch(() => 0))
  );
  const key = stamps.join('-');

  if (hotCache[name]?.key !== key) {
    hotCache[name] = { key, mod: await import(`${entry}?v=${key}`) };
  }
  return hotCache[name].mod;
}

const templates = () => hot('templates');

/* ---------- datos ----------
   Firestore es la fuente de verdad — el panel escribe ahí directo desde el
   navegador. Se cachea unos segundos en memoria: una sola carga de página
   dispara varios pedidos (el HTML, /data/products.json, /data/settings.json)
   y sin esto cada uno pegaría a Firestore por separado. Sólo importa para
   el servidor de desarrollo local — el sitio publicado es HTML estático
   generado por scripts/build.js, no pasa por acá. */
const CACHE_MS = 4000;
let cache = { at: 0, data: null };

export async function readData() {
  if (Date.now() - cache.at < CACHE_MS) return cache.data;

  const data = await readFirestoreData(ROOT);
  cache = { at: Date.now(), data };
  return cache.data;
}

/** Los que se muestran al público, en el orden configurado. */
export const publicProducts = (products) =>
  products.filter((p) => p.visible !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

/** Relacionados: mismo rubro, precio parecido. */
export function relatedTo(product, products, limit = 4) {
  return products
    .filter((p) => p.slug !== product.slug && p.category === product.category)
    .sort((a, b) => Math.abs(a.price - product.price) - Math.abs(b.price - product.price))
    .slice(0, limit);
}

/* ---------- helpers de respuesta ---------- */

const send = (res, status, body, type = 'text/html; charset=utf-8', extra = {}) => {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', ...extra });
  res.end(body);
};

export const sendJson = (res, status, obj) =>
  send(res, status, JSON.stringify(obj), 'application/json; charset=utf-8');

async function sendFile(res, filePath) {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return false;
  } catch {
    return false;
  }
  const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
  fsSync.createReadStream(filePath).pipe(res);
  return true;
}

/* ---------- servidor ---------- */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);

  try {
    // 1. API del panel de administración
    if (pathname.startsWith('/api/ai/')) {
      const { registerAiApi } = await hot('aiApi');
      const handled = await registerAiApi(req, res, { ROOT, pathname, url, ai: await hot('ai') });
      if (handled) return;
      return sendJson(res, 404, { error: 'Endpoint de IA desconocido' });
    }

    // Mismo endpoint que /.netlify/functions/rebuild.js en producción —
    // ver ese archivo para el porqué (el sitio es estático, admin.js le
    // avisa a Netlify que reconstruya después de escribir en Firestore).
    if (pathname === '/api/rebuild' && req.method === 'POST') {
      const hookUrl = process.env.BUILD_HOOK_URL;
      if (!hookUrl) {
        return sendJson(res, 503, {
          error: 'SIN_HOOK',
          mensaje: 'Falta BUILD_HOOK_URL en .env (no hace falta para desarrollar local).',
        });
      }
      try {
        const r = await fetch(hookUrl, { method: 'POST' });
        if (!r.ok) return sendJson(res, 502, { error: 'FALLO', mensaje: `Netlify respondió ${r.status}` });
        return sendJson(res, 200, { ok: true });
      } catch (err) {
        return sendJson(res, 502, { error: 'FALLO', mensaje: err?.message || 'No se pudo contactar a Netlify' });
      }
    }

    if (pathname.startsWith('/api/')) {
      return sendJson(res, 404, { error: 'Endpoint desconocido' });
    }

    // 2. Panel de administración
    if (pathname === '/admin' || pathname === '/admin/') {
      const ok = await sendFile(res, path.join(ROOT, 'src', 'admin', 'admin.html'));
      if (ok) return;
      return send(res, 404, 'Panel no encontrado');
    }

    // 3. products.json / settings.json — ya no son archivos locales, se
    // arman al vuelo desde Firestore. Mismas URLs de siempre, así que
    // app.js/assistant.js (que hacen fetch('/data/products.json')) no
    // necesitan enterarse de que cambió la fuente de los datos.
    if (pathname === '/data/products.json' || pathname === '/data/settings.json') {
      const { products, settings } = await readData();
      return send(
        res,
        200,
        JSON.stringify(pathname.endsWith('products.json') ? products : settings),
        MIME['.json']
      );
    }

    // 4. Archivos estáticos (assets, src)
    if (/^\/(assets|src)\//.test(pathname)) {
      // Nada de subir por el árbol con ../
      const target = path.join(ROOT, pathname);
      if (!target.startsWith(ROOT)) return send(res, 403, 'Prohibido');
      if (await sendFile(res, target)) return;
      return send(res, 404, 'No encontrado');
    }

    const { products, settings } = await readData();
    const visible = publicProducts(products);
    const { renderHome, renderProduct } = await templates();

    // 5. Landing de producto
    const m = /^\/p\/([^/]+)\/?$/.exec(pathname);
    if (m) {
      const product = visible.find((p) => p.slug === m[1]);
      if (!product) return send(res, 404, notFoundPage(settings));
      return send(
        res,
        200,
        renderProduct({ product, related: relatedTo(product, visible), settings })
      );
    }

    // 6. Portada
    if (pathname === '/' || pathname === '/index.html') {
      return send(res, 200, renderHome({ products: visible, settings }));
    }

    // 6. robots y sitemap, para que en local se vean igual que publicados
    if (pathname === '/robots.txt') {
      return send(res, 200, `User-agent: *\nAllow: /\n\nSitemap: ${settings.siteUrl}/sitemap.xml\n`, MIME['.txt']);
    }
    if (pathname === '/sitemap.xml') {
      const { buildSitemap } = await hot('sitemap');
      return send(res, 200, buildSitemap(visible, settings), MIME['.xml']);
    }

    send(res, 404, notFoundPage(settings));
  } catch (err) {
    console.error(`  error en ${pathname}:`, err);
    send(res, 500, `<pre style="color:#f66;padding:24px;font:14px ui-monospace">${err.stack}</pre>`);
  }
});

const notFoundPage = (s) => `<!doctype html><html lang="es-AR"><head><meta charset="utf-8">
<title>Página no encontrada — ${s.storeName}</title>
<link rel="stylesheet" href="/src/styles.css"></head>
<body><div class="empty" style="padding-top:22vh">
<h3 class="t-h1">No encontramos esta página</h3>
<p class="t-body" style="margin-top:10px">Puede que el producto ya no esté en el catálogo.</p>
<p style="margin-top:20px"><a class="btn btn--gold" href="/">Volver al catálogo</a></p>
</div></body></html>`;

const { loadEnv, aiEnabled } = await import('./src/ai.js');
await loadEnv(ROOT);

server.listen(PORT, () => {
  console.log(`\n  Catálogo   http://localhost:${PORT}`);
  console.log(`  Panel      http://localhost:${PORT}/admin`);
  console.log(
    `  IA         ${aiEnabled() ? 'activada (Groq)' : 'apagada — copiá .env.example a .env y poné tu GROQ_API_KEY'}\n`
  );
});
