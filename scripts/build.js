/**
 * Genera el sitio estático en dist/.
 *
 * Sale una carpeta que se sube tal cual a cualquier hosting (Netlify,
 * Vercel, Hostinger, un VPS con nginx). No necesita Node en el servidor.
 *
 * El panel de administración SÍ se publica (admin/index.html) — ya tiene
 * login con Firebase Auth y las reglas de Firestore exigen sesión válida,
 * así que exponer la pantalla de login no da acceso a nada por sí solo.
 * Se deja fuera de sitemap.xml y con noindex/robots.txt para que no lo
 * indexe un buscador, pero es alcanzable a propósito para poder cargar
 * productos desde cualquier PC sin tener el server local corriendo.
 *
 *   npm run build
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { renderHome, renderProduct } from '../src/templates.js';
import { buildSitemap } from '../src/sitemap.js';
import { getDb } from '../src/firebase-admin.js';
import { loadEnv } from '../src/ai.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

/* ---------- datos ----------
   Firestore es la fuente de verdad — el panel escribe ahí directo desde
   cualquier PC, así que el build siempre tiene que leer de ahí y no de
   data/products.json (que quedó de la versión anterior, sin sincronizar). */

await loadEnv(ROOT);
const db = await getDb(ROOT);
const [productsSnap, settingsDoc] = await Promise.all([
  db.collection('products').get(),
  db.collection('settings').doc('main').get(),
]);
const products = productsSnap.docs.map((d) => d.data());
const settings = settingsDoc.data();

const visible = products
  .filter((p) => p.visible !== false)
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

const hidden = products.length - visible.length;

const relatedTo = (product) =>
  visible
    .filter((p) => p.slug !== product.slug && p.category === product.category)
    .sort((a, b) => Math.abs(a.price - product.price) - Math.abs(b.price - product.price))
    .slice(0, 4);

/* ---------- limpiar dist ---------- */

await fs.rm(DIST, { recursive: true, force: true });
await fs.mkdir(DIST, { recursive: true });

const write = async (rel, content) => {
  const file = path.join(DIST, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content, 'utf8');
  return Buffer.byteLength(content);
};

/* ---------- páginas ---------- */

const homeBytes = await write('index.html', renderHome({ products: visible, settings }));
console.log(`index.html                    ${kb(homeBytes)}`);

let productBytes = 0;
for (const product of visible) {
  productBytes += await write(
    path.join('p', product.slug, 'index.html'),
    renderProduct({ product, related: relatedTo(product), settings })
  );
}
console.log(`${String(visible.length).padStart(3)} landings de producto      ${kb(productBytes)}`);

/* ---------- estáticos ----------
   Sólo lo que el sitio público necesita. Nada de src/admin ni scripts. */

await write('data/products.json', JSON.stringify(products));
await write('data/settings.json', JSON.stringify(settings));

const copies = [
  ['assets', 'assets'],
  ['src/styles.css', 'src/styles.css'],
  ['src/styles-parts.css', 'src/styles-parts.css'],
  ['src/theme.css', 'src/theme.css'],
  ['src/assistant.css', 'src/assistant.css'],
  ['src/notify.css', 'src/notify.css'],
  ['src/app.js', 'src/app.js'],
  ['src/ui.js', 'src/ui.js'],
  ['src/theme.js', 'src/theme.js'],
  // El asistente se publica: sin servidor detrás cae solo al buscador local.
  ['src/assistant.js', 'src/assistant.js'],
  ['src/search-engine.js', 'src/search-engine.js'],
  ['src/analytics.js', 'src/analytics.js'],
  // templates.js importa dailyPicks de acá (Ronda 1) — mismo problema que ya
  // pasó antes con cloudinary-config.js: sin esto, templates.js falla al
  // resolver su propio import en el navegador (404) y como app.js importa
  // de templates.js, TODO app.js queda sin cargar — nada de JS corre en el
  // sitio publicado (grilla trabada en skeleton, animaciones sin disparar,
  // botones sin wiring) aunque en local nunca se note, porque server.js
  // sirve /src/* directo del disco.
  ['src/recommend.js', 'src/recommend.js'],
  // app.js importa cardHtml/money/offerActive de acá — sin esto la portada
  // publicada quedaría con un import roto en el navegador.
  ['src/templates.js', 'src/templates.js'],
  // templates.js/app.js/assistant.js importan cloudinaryUrl de acá — sin
  // esto las fotos de producto rompen en el sitio publicado (404 del import,
  // no se nota en local porque el dev server sirve /src/* directo del disco).
  ['src/cloudinary-config.js', 'src/cloudinary-config.js'],
  // Panel de administración: admin.js habla directo con Firestore/Cloudinary
  // desde el navegador, necesita firebase-client.js (que a su vez importa
  // firebase-config.js) además de sus propios admin.js/admin.css.
  ['src/firebase-client.js', 'src/firebase-client.js'],
  ['src/firebase-config.js', 'src/firebase-config.js'],
  ['src/admin/admin.js', 'src/admin/admin.js'],
  ['src/admin/admin.css', 'src/admin/admin.css'],
  // admin.html va a admin/index.html para que /admin resuelva como URL
  // limpia, igual que /p/slug/ con las landings de producto.
  ['src/admin/admin.html', 'admin/index.html'],
];

for (const [from, to] of copies) {
  const src = path.join(ROOT, from);
  const dest = path.join(DIST, to);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.cp(src, dest, { recursive: true });
}
console.log(`assets + css + js             copiados`);

/* ---------- SEO ---------- */

await write('sitemap.xml', buildSitemap(visible, settings));
await write(
  'robots.txt',
  `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${settings.siteUrl}/sitemap.xml\n`
);

// Netlify: sin esto, /p/algo-que-no-existe/ devuelve el index en vez de un 404.
// Las reglas de /api/ai/* van PRIMERO: en este archivo gana la primera que
// matchea, y netlify.toml solo (sin esto acá) no alcanzó — /api/ai/status
// seguía cayendo en el catch-all de abajo en vez de llegar a la función.
await write(
  '_redirects',
  `# IA: las mismas URLs de siempre (server.js en local, funciones acá)
/api/ai/status              /.netlify/functions/ai-status              200
/api/ai/ask                 /.netlify/functions/ai-ask                 200
/api/ai/stock-actions       /.netlify/functions/ai-stock-actions       200
/api/ai/draft-text          /.netlify/functions/ai-draft-text          200
/api/ai/draft-image         /.netlify/functions/ai-draft-image         200
/api/ai/summarize-activity  /.netlify/functions/ai-summarize-activity  200
/api/rebuild                /.netlify/functions/rebuild                200

# Cualquier otra ruta desconocida cae en la portada con código 404 real
/*  /index.html  404
`
);

console.log('sitemap.xml, robots.txt       ok');

/* ---------- resumen ---------- */

async function dirSize(dir) {
  let total = 0;
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    total += e.isDirectory() ? await dirSize(f) : (await fs.stat(f)).size;
  }
  return total;
}

const total = await dirSize(DIST);
console.log(`\nListo — dist/ ${(total / 1024 / 1024).toFixed(1)} MB`);
console.log(`  ${visible.length} productos publicados${hidden ? `, ${hidden} ocultos sin publicar` : ''}`);
console.log(`  URL configurada: ${settings.siteUrl}`);
console.log(`\n  Subí el contenido de dist/ al servidor.`);
