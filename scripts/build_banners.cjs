/**
 * Banners de la home a partir de los PNG originales de Fran.
 *
 *   node scripts/build_banners.cjs
 *
 * Los PNG pesan 3-4 MB y traen mucho margen transparente. Acá se recorta ese
 * margen (el mismo recorte para los dos banners de cada par, así tienen
 * exactamente la misma proporción y pueden fundirse uno en otro sin que la
 * página salte) y se exportan a WebP con transparencia en dos anchos.
 * Desktop: horizontales. Celular: los verticales.
 */
const sharp = require('sharp');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets', 'promos');
const PAIRS = [
  {
    name: 'desktop',
    widths: [1600, 1000],
    files: {
      promos: 'Banners de Adolfito/Banner adolfito promos 1.png',
      canal: 'Banners de Adolfito/Banner adolfito promos 2.png',
    },
  },
  {
    name: 'mobile',
    widths: [1000, 640],
    files: {
      promos: 'Banners Mobile/banner adolfito promos - VERTICAL MOBILE.png',
      canal: 'Banners Mobile/banner-canal 2 - VERTICAL MOBILE.png',
    },
  },
];

(async () => {
  for (const pair of PAIRS) {
    const entries = Object.entries(pair.files).map(([key, rel]) => [key, path.join(__dirname, '..', rel)]);
    // Caja de recorte común: la unión de lo que ocupa cada dibujo.
    let box = null;
    for (const [, file] of entries) {
      const { info } = await sharp(file).trim({ threshold: 8 }).toBuffer({ resolveWithObject: true });
      const left = -info.trimOffsetLeft;
      const top = -info.trimOffsetTop;
      const b = { left, top, right: left + info.width, bottom: top + info.height };
      box = box
        ? { left: Math.min(box.left, b.left), top: Math.min(box.top, b.top), right: Math.max(box.right, b.right), bottom: Math.max(box.bottom, b.bottom) }
        : b;
    }
    const pad = 12; // aire mínimo para que la sombra del dibujo no quede al ras
    const meta = await sharp(entries[0][1]).metadata();
    const crop = {
      left: Math.max(0, box.left - pad),
      top: Math.max(0, box.top - pad),
    };
    crop.width = Math.min(meta.width, box.right + pad) - crop.left;
    crop.height = Math.min(meta.height, box.bottom + pad) - crop.top;

    for (const [key, file] of entries) {
      for (const w of pair.widths) {
        const out = path.join(OUT, `banner-${key}-${pair.name}-${w}.webp`);
        const info = await sharp(file).extract(crop).resize({ width: w }).webp({ quality: 84, alphaQuality: 90, effort: 6 }).toFile(out);
        console.log(path.basename(out), `${info.width}x${info.height}`, `${Math.round(info.size / 1024)} KB`);
      }
    }
  }
})();
