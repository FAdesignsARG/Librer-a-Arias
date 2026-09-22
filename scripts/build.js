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

import { renderHome, renderProduct, renderCategory, categorySlug } from '../src/templates.js';
import { buildSitemap } from '../src/sitemap.js';
import { getDb } from '../src/firebase-admin.js';
import { fetchAuxiliar } from '../src/base44-auxiliar.js';
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
const rawProducts = productsSnap.docs.map((d) => d.data());
const settings = settingsDoc.data();

/* ---------- capa auxiliar de Base44 ----------
   Enriquece por `slug` los productos que ya existen en Firestore: alias de
   búsqueda, etiqueta comercial, destacados y visibilidad web. NO agrega ni
   inventa productos — un slug que Base44 mande y acá no exista se ignora.
   Si Base44 no contesta, `aux.ok` es false y el build sigue igual que
   siempre: el catálogo público nunca depende del bridge (eso es lo que
   mantiene el SEO y las vistas previas de WhatsApp a salvo).            */
const aux = await fetchAuxiliar();
console.log(
  aux.ok
    ? `Base44 catalogo_auxiliar      bridge ${aux.bridgeVersion} · ${aux.bySlug.size} productos, ${aux.aliases.length} alias globales, ${aux.relatedBySlug.size} con relacionados`
    : `Base44 catalogo_auxiliar      sin datos (${aux.error}) — se publica sin la capa auxiliar`
);

let auxAplicados = 0;
let auxOcultos = 0;
const products = rawProducts.map((p) => {
  const extra = aux.bySlug.get(p.slug);
  if (!extra) return p;
  auxAplicados++;
  // visibleWeb === null significa que Base44 no opina de este producto:
  // manda Firestore. Sólo un `false` explícito lo saca de la web.
  const oculto = extra.visibleWeb === false;
  if (oculto && p.visible !== false) auxOcultos++;
  return {
    ...p,
    ...(oculto ? { visible: false } : {}),
    ...(extra.searchAliases.length ? { searchAliases: extra.searchAliases } : {}),
    ...(extra.etiqueta ? { etiqueta: extra.etiqueta } : {}),
    // `destacado` de Base44 sólo suma: nunca apaga un destacado de Firestore.
    ...(extra.destacado ? { featured: true } : {}),
  };
});

const visible = products
  .filter((p) => p.visible !== false)
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

const hidden = products.length - visible.length;

const bySlug = new Map(visible.map((p) => [p.slug, p]));

/* Relacionados de la ficha. Primero los que eligió una persona en Base44
   (ordenados por `prioridad`, con su tipo de relación para agruparlos en la
   ficha); después se completa con los automáticos de siempre — mismo rubro y
   precio parecido — sin repetir. Un related_slug que no exista o que esté
   oculto se descarta acá mismo, así la ficha nunca enlaza a un 404.       */
const relatedTo = (product) => {
  const curated = [];
  const vistos = new Set([product.slug]);
  for (const rel of aux.relatedBySlug.get(product.slug) || []) {
    const target = bySlug.get(rel.slug);
    if (!target || vistos.has(rel.slug)) continue;
    vistos.add(rel.slug);
    curated.push({ ...target, relacion: rel.relacion });
  }

  const autos = visible
    .filter((p) => !vistos.has(p.slug) && p.category === product.category)
    .sort((a, b) => Math.abs(a.price - product.price) - Math.abs(b.price - product.price))
    .concat(
      visible
        .filter((p) => !vistos.has(p.slug) && p.category !== product.category && p.inStock)
        .sort((a, b) => Math.abs(a.price - product.price) - Math.abs(b.price - product.price))
    );

  return curated.concat(autos).slice(0, 12);
};

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

// Home v2: el catálogo completo (buscador + filtros + grilla) vive en su página.
const catalogBytes = await write(path.join('catalogo', 'index.html'), renderHome({ products: visible, settings, mode: 'catalog' }));
console.log(`catalogo/index.html           ${kb(catalogBytes)}`);

let productBytes = 0;
for (const product of visible) {
  productBytes += await write(
    path.join('p', product.slug, 'index.html'),
    renderProduct({ product, related: relatedTo(product), settings })
  );
}
console.log(`${String(visible.length).padStart(3)} landings de producto      ${kb(productBytes)}`);

// Ronda 9: una página por rubro. Se recorren los rubros que existen DE
// VERDAD entre los productos visibles (no settings.categories) a
// propósito: settings.categories es la lista curada de chips de la
// portada, y no necesariamente coincide con los rubros reales de los
// productos — se encontró un caso real (6 productos visibles en
// "Electrónica", que ya no está en settings.categories) que con
// settings.categories como fuente se quedaba sin página propia pero
// igual aparecía en el sitemap (armado aparte, de los productos reales),
// dejando un link roto. Derivando los dos del mismo dato no puede pasar.
let categoryBytes = 0;
let categoryCount = 0;
const categoriesInCatalog = [...new Set(visible.map((p) => p.category))];
for (const category of categoriesInCatalog) {
  const inCategory = visible.filter((p) => p.category === category);
  categoryCount++;
  categoryBytes += await write(
    path.join('c', categorySlug(category), 'index.html'),
    renderCategory({ category, products: inCategory, all: visible, settings })
  );
}
console.log(`${String(categoryCount).padStart(3)} páginas de rubro          ${kb(categoryBytes)}`);

/* ---------- estáticos ----------
   Sólo lo que el sitio público necesita. Nada de src/admin ni scripts. */

// products.json = EXACTAMENTE lo que está publicado, ni uno más.
// Antes se escribían todos los productos de Firestore, incluidos los
// ocultos: el buscador y el asistente los filtraban por su cuenta, pero
// el archivo mentía sobre el catálogo público. Ahora el centro de salud de
// Base44 lo compara contra sus productos habilitados, así que tiene que
// coincidir con las páginas, el listado, los rubros y el sitemap.
await write('data/products.json', JSON.stringify(visible));
await write('data/settings.json', JSON.stringify(settings));
// Sinónimos globales del buscador (Base44). Archivo aparte y chiquito: lo
// pide app.js junto con el catálogo y, si no está, el buscador anda igual.
await write('data/search-aliases.json', JSON.stringify(aux.aliases));

const copies = [
  ['assets', 'assets'],
  ['src/styles.css', 'src/styles.css'],
  ['src/styles-parts.css', 'src/styles-parts.css'],
  ['src/theme.css', 'src/theme.css'],
  ['src/assistant.css', 'src/assistant.css'],
  ['src/notify.css', 'src/notify.css'],
  ['src/page-control.css', 'src/page-control.css'],
  ['src/glass.css', 'src/glass.css'],
  ['src/app.js', 'src/app.js'],
  ['src/home.css', 'src/home.css'],
  ['src/home-search-motion.js', 'src/home-search-motion.js'],
  ['src/ui.js', 'src/ui.js'],
  ['src/share.js', 'src/share.js'],
  ['src/theme.js', 'src/theme.js'],
  // El asistente se publica: sin servidor detrás cae solo al buscador local.
  ['src/assistant.js', 'src/assistant.js'],
  ['src/search-engine.js', 'src/search-engine.js'],
  ['src/analytics.js', 'src/analytics.js'],
  // Control remoto de página desde Base44 (marketing) + su cliente compartido.
  ['src/page-control.js', 'src/page-control.js'],
  ['src/base44-client.js', 'src/base44-client.js'],
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
  ['src/admin/select.js', 'src/admin/select.js'],
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
if (aux.ok) {
  console.log(`  capa Base44: ${auxAplicados} productos enriquecidos${auxOcultos ? `, ${auxOcultos} ocultados desde Base44` : ''}`);
}
console.log(`  URL configurada: ${settings.siteUrl}`);
console.log(`\n  Subí el contenido de dist/ al servidor.`);
