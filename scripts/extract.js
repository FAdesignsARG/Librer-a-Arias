/**
 * extract.js — migración one-shot del catálogo monolítico.
 *
 * Lee el HTML original de 12 MB y lo desarma en:
 *   data/products.json      productos con precio numérico, slug y stock
 *   assets/products/*.webp  las fotos que estaban en base64 dentro del <script>
 *   assets/brand/*          logo, hero, favicon y los dos SVG grandes
 *
 * Se corre una sola vez. A partir de acá la fuente de verdad es products.json.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, '_original-backup.html');

const PRODUCTS_DIR = path.join(ROOT, 'assets', 'products');
const BRAND_DIR = path.join(ROOT, 'assets', 'brand');
const DATA_DIR = path.join(ROOT, 'data');

/* ---------- utilidades ---------- */

const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

/** "$56.000" -> 56000. El punto es separador de miles, no decimal. */
const parsePrice = (s) => parseInt(String(s).replace(/[^\d]/g, ''), 10) || 0;

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

const decode = (dataUri) => {
  const m = /^data:image\/([a-zA-Z+]+);base64,(.+)$/s.exec(dataUri);
  return m ? Buffer.from(m[2], 'base64') : null;
};

/** Guarda un data-URI como webp optimizado. Devuelve {file, bytes, w, h}. */
async function saveImage(dataUri, destDir, basename, { maxWidth = 1200, quality = 80 } = {}) {
  const buf = decode(dataUri);
  if (!buf) return null;

  const img = sharp(buf);
  const meta = await img.metadata();
  const out = await img
    .resize({ width: Math.min(maxWidth, meta.width || maxWidth), withoutEnlargement: true })
    .webp({ quality, effort: 6 })
    .toBuffer();

  const file = `${basename}.webp`;
  await fs.writeFile(path.join(destDir, file), out);
  return { file, bytes: out.length, originalBytes: buf.length, w: meta.width, h: meta.height };
}

/**
 * Foto de producto en dos tamaños: la grilla baja la miniatura y sólo la
 * ficha pide la grande. Con lazy-load, la portada termina descargando
 * ~200 KB en vez de los 12 MB que pesaba el HTML monolítico.
 */
const VARIANTS = [
  { suffix: '-thumb', width: 400, quality: 68 },
  { suffix: '', width: 500, quality: 80 },
];

async function saveProductImage(dataUri, basename) {
  const buf = decode(dataUri);
  if (!buf) return null;

  const written = [];
  let bytes = 0;
  let thumbBytes = 0;
  for (const v of VARIANTS) {
    const out = await sharp(buf)
      .resize({ width: v.width, withoutEnlargement: true })
      .webp({ quality: v.quality, effort: 6, smartSubsample: true })
      .toBuffer();
    const file = `${basename}${v.suffix}.webp`;
    await fs.writeFile(path.join(PRODUCTS_DIR, file), out);
    written.push(file);
    bytes += out.length;
    if (v.suffix === '-thumb') thumbBytes = out.length;
  }
  const meta = await sharp(buf).metadata();
  return {
    file: `${basename}.webp`,
    written,
    bytes,
    thumbBytes,
    originalBytes: buf.length,
    w: meta.width,
    h: meta.height,
  };
}

/* ---------- 1. leer el HTML ---------- */

const html = await fs.readFile(SOURCE, 'utf8');
console.log(`Origen: ${kb(Buffer.byteLength(html))}\n`);

/* ---------- 2. productos ---------- */

const start = html.indexOf('const products = [');
const end = html.indexOf('\n  ];', start);
if (start === -1 || end === -1) throw new Error('No se encontró el array `products` en el HTML.');

const arrayLiteral = html.slice(start + 'const products = '.length, end + '\n  ]'.length);
// Los objetos son literales JS válidos (claves sin comillas), no JSON: se evalúan.
const raw = new Function(`return ${arrayLiteral}`)();
console.log(`Productos encontrados: ${raw.length}\n`);

const usedSlugs = new Set();
const products = [];
let totalBefore = 0;
let totalAfter = 0;
let totalThumb = 0;

for (const [i, p] of raw.entries()) {
  let slug = slugify(p.name);
  let n = 2;
  while (usedSlugs.has(slug)) slug = `${slugify(p.name)}-${n++}`;
  usedSlugs.add(slug);

  const images = [];
  if (p.img) {
    const saved = await saveProductImage(p.img, slug);
    if (saved) {
      images.push(saved.file);
      totalBefore += saved.originalBytes;
      totalAfter += saved.bytes;
      totalThumb += saved.thumbBytes;
      console.log(
        `[${String(i + 1).padStart(3)}/${raw.length}] ${slug.padEnd(46)} ` +
          `base64 ${kb(saved.originalBytes).padStart(7)} -> thumb ${kb(saved.thumbBytes).padStart(6)}`
      );
    }
  }

  products.push({
    id: slug,
    slug,
    name: p.name,
    category: p.cat,
    description: p.desc,
    price: parsePrice(p.price),
    images,
    // El badge original era "Nuevo" en los 125 productos, así que no aportaba
    // nada: se descarta y se reemplaza por flags reales que el admin controla.
    inStock: true,
    featured: false,
    tags: p.tags || '',
    sub: p.sub || null,
    order: i,
    createdAt: new Date().toISOString(),
  });
}

// totalAfter suma las dos variantes, así que como "peso en disco" es mayor
// que el original — pero el navegador nunca baja las dos. Lo que importa es
// cuánto pesa la primera pantalla, y eso son sólo miniaturas.
console.log(
  `\nFotos: ${raw.length} productos x ${VARIANTS.length} tamaños = ${kb(totalAfter)} en disco.`
);
console.log(`  (antes: ${kb(totalBefore)} de base64, TODO descargado de una en cada visita)`);
console.log(`  ahora la portada baja ~12 miniaturas de ${kb(totalThumb / raw.length)} = ~${kb(totalThumb / raw.length * 12)}\n`);

/* ---------- 3. assets de marca ---------- */

// Cada uno se identifica por el atributo/prefijo con el que aparece en el HTML.
const brandTargets = [
  { name: 'favicon', re: /<link rel="icon"[^>]*href="(data:image\/[^"]+)"/, maxWidth: 180 },
  // Ojo: en el original el src va ANTES del class, con un alt en el medio.
  { name: 'logo', re: /<img src="(data:image\/[^"]+)"[^>]*class="brand-logo"/, maxWidth: 200 },
  { name: 'hero-crane', re: /class="hero-crane" src="(data:image\/[^"]+)"/, maxWidth: 400 },
  { name: 'hero-title', re: /class="hero-title-img" src="(data:image\/[^"]+)"/, maxWidth: 1000 },
  { name: 'hero-bg', re: /background-image:url\('(data:image\/[^']+)'\)/, maxWidth: 1600 },
];

for (const t of brandTargets) {
  const m = t.re.exec(html);
  if (!m) {
    console.log(`  ! no encontrado: ${t.name}`);
    continue;
  }
  const saved = await saveImage(m[1], BRAND_DIR, t.name, { maxWidth: t.maxWidth, quality: 85 });
  if (saved) console.log(`  brand/${saved.file.padEnd(20)} ${kb(saved.originalBytes)} -> ${kb(saved.bytes)}`);
}

// El banner del canal y el cartel de horarios son SVG de ~1,3 MB cada uno,
// armados como pilas de 4-6 PNG superpuestos (exportados de un editor).
// Sacar un PNG suelto daría una imagen incompleta, así que se rasteriza el
// SVG entero y se guarda el resultado aplanado: 1,3 MB -> ~70 KB.
// El ancla tiene que ser el markup del body — el nombre de clase aparece
// primero en el CSS y ahí no hay ningún <svg> que sirva.
const svgTargets = [
  { name: 'banner-canal', anchor: '<a class="channel-banner-img-link"' },
  { name: 'cartel-horarios', anchor: '<div class="hours-inner">' },
];
for (const t of svgTargets) {
  const at = html.indexOf(t.anchor);
  if (at === -1) {
    console.log(`  ! no encontrado: ${t.name}`);
    continue;
  }
  const s = html.indexOf('<svg', at);
  const e = html.indexOf('</svg>', s);
  if (s === -1 || e === -1) continue;
  const svg = Buffer.from(html.slice(s, e + 6));

  const out = await sharp(svg, { density: 150 })
    .resize({ width: 1400, withoutEnlargement: true })
    .webp({ quality: 84, effort: 6 })
    .toBuffer();
  await fs.writeFile(path.join(BRAND_DIR, `${t.name}.webp`), out);
  console.log(`  brand/${(t.name + '.webp').padEnd(22)} ${kb(svg.length).padStart(8)} (svg) -> ${kb(out.length)}`);
}

/* ---------- 4. escribir data ---------- */

const categories = [...new Set(products.map((p) => p.category))];

await fs.writeFile(path.join(DATA_DIR, 'products.json'), JSON.stringify(products, null, 2), 'utf8');

const settings = {
  storeName: 'Librería Arias',
  tagline: 'Librería · Bazar · Juguetería · Regalería · Electrónica · Tecnología',
  whatsapp: '5493804505150',
  phoneDisplay: '3804 505150',
  address: 'Esquina España y Bulnes, La Rioja',
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=Libreria+Arias%2C+La+Rioja&query_place_id=ChIJYa8YyDLaJ5QRypXtUmCt3PA',
  social: {
    instagram: 'https://www.instagram.com/libreriaarias?igsh=NXZrcXd5OHR3bjkz&utm_source=qr',
    facebook: 'https://www.facebook.com/ariaslibreria/',
    tiktok: 'https://www.tiktok.com/@libreriaarias',
    whatsappChannel: 'https://whatsapp.com/channel/0029VbDBqiGLY6cxTVJTw01j',
    maps: 'https://maps.app.goo.gl/GGndi3x2nVu6X5nZ8',
  },
  categories,
  currency: 'ARS',
  siteUrl: 'https://libreriaarias.com.ar',
  // Leídos del cartel de horarios del catálogo original.
  // Formato schema.org para poder emitir el LocalBusiness sin traducir nada.
  hours: [
    { days: ['Mo', 'Tu', 'We', 'Th', 'Fr'], opens: '09:00', closes: '13:00' },
    { days: ['Mo', 'Tu', 'We', 'Th', 'Fr'], opens: '18:00', closes: '21:00' },
    { days: ['Sa'], opens: '09:30', closes: '13:30' },
    { days: ['Sa'], opens: '18:30', closes: '21:30' },
  ],
  hoursDisplay: [
    { label: 'Lunes a Viernes', value: '09:00 a 13:00 · 18:00 a 21:00' },
    { label: 'Sábados', value: '09:30 a 13:30 · 18:30 a 21:30' },
  ],
};
await fs.writeFile(path.join(DATA_DIR, 'settings.json'), JSON.stringify(settings, null, 2), 'utf8');

console.log(`\nOK — ${products.length} productos en data/products.json`);
console.log(`Categorías: ${categories.join(', ')}`);
