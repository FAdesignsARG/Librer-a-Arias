/**
 * Procesa los originales de marca que dejó Fran en la raíz del proyecto y
 * los deja en assets/brand/ con nombres estables y en varios tamaños.
 *
 * Criterio de cuál va dónde:
 *   crane        grulla amarilla sin círculo  -> modo oscuro
 *   crane-light  grulla negra cromática       -> modo claro (el amarillo
 *                                                sobre blanco pierde contraste)
 *   mark         círculo negro con la grulla  -> favicon y avatar de la barra
 *   wordmark     "LIBRERÍA ARIAS"             -> título del hero
 *
 * Correr con:  node scripts/brand.js
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'assets', 'brand');

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

const SOURCES = [
  {
    src: 'LOGO-LIBRERIA-PNG.png',
    name: 'crane',
    sizes: [128, 256, 512],
    trim: true,
  },
  {
    // Círculo cromático blanco/plateado: va sobre fondo NEGRO y es el favicon
    src: 'Logo Circulo Cromatico en Blanco.png',
    name: 'mark-dark',
    sizes: [64, 128, 256],
    trim: true,
  },
  {
    src: 'libreria-arias-negro.png',
    name: 'wordmark',
    sizes: [780],
    trim: false,
  },
];

for (const s of SOURCES) {
  const file = path.join(ROOT, s.src);
  try {
    await fs.access(file);
  } catch {
    console.log(`  ! falta el original: ${s.src}`);
    continue;
  }

  const original = await fs.readFile(file);

  // Recorta el margen transparente sobrante. Sin esto cada logo trae un
  // aire distinto y al ponerlos en un contenedor cuadrado se ven de
  // tamaños diferentes aunque tengan los mismos píxeles.
  let base = sharp(original);
  if (s.trim) base = base.trim({ threshold: 10 });

  const buf = await base.png().toBuffer();
  const meta = await sharp(buf).metadata();

  for (const w of s.sizes) {
    const out = await sharp(buf)
      .resize({ width: w, height: w, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 92, effort: 6, alphaQuality: 100 })
      .toBuffer();

    // El tamaño más chico se queda con el nombre base, los otros llevan @<ancho>
    const suffix = w === s.sizes[0] ? '' : `@${w}`;
    await fs.writeFile(path.join(OUT, `${s.name}${suffix}.webp`), out);
    console.log(`  brand/${(s.name + suffix + '.webp').padEnd(22)} ${String(w).padStart(4)}px  ${kb(out.length)}`);
  }
  console.log(`     (origen ${s.src} — ${meta.width}x${meta.height} tras recortar)\n`);
}

// El wordmark no es cuadrado: se rehace respetando su proporción
const wm = path.join(ROOT, 'libreria-arias-negro.png');
try {
  const buf = await fs.readFile(wm);
  const out = await sharp(buf).resize({ width: 780 }).webp({ quality: 92, effort: 6, alphaQuality: 100 }).toBuffer();
  await fs.writeFile(path.join(OUT, 'wordmark.webp'), out);
  const m = await sharp(out).metadata();
  console.log(`  brand/wordmark.webp        ${m.width}x${m.height}  ${kb(out.length)}`);
} catch {
  console.log('  ! no se pudo rehacer el wordmark');
}

/* Favicon: el círculo cromático blanco. A 32px una silueta con puntas se
   convierte en ruido, y el círculo blanco se recorta bien tanto en una
   pestaña clara como oscura. */
try {
  const buf = await fs.readFile(path.join(ROOT, 'Logo Circulo Cromatico en Blanco.png'));
  const out = await sharp(buf).resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90, alphaQuality: 100 })
    .toBuffer();
  await fs.writeFile(path.join(OUT, 'favicon.webp'), out);
  console.log(`  brand/favicon.webp         180x180  ${kb(out.length)}`);
} catch {
  console.log('  ! no se pudo rehacer el favicon');
}

console.log('\nListo.');
