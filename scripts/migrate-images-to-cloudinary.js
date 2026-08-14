/**
 * Migración de una sola vez: sube las fotos que hoy viven en
 * assets/products/*.webp a Cloudinary, y actualiza el campo `images` de
 * cada producto en Firestore para que apunte al public_id de Cloudinary en
 * vez del nombre de archivo local.
 *
 * Sólo se sube el tamaño completo (nombre.webp, no el -thumb): Cloudinary
 * genera la miniatura al vuelo por URL, no hace falta guardar dos veces
 * la misma foto.
 *
 *   node scripts/migrate-images-to-cloudinary.js
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { getDb } from '../src/firebase-admin.js';
import { loadEnv } from '../src/ai.js';
import { cloudinaryConfig } from '../src/cloudinary-config.js';

const ROOT = path.resolve(import.meta.dirname, '..');
await loadEnv(ROOT);
const db = await getDb(ROOT);

const IMG_DIR = path.join(ROOT, 'assets', 'products');
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`;

async function uploadOne(localFilename) {
  const buf = await fs.readFile(path.join(IMG_DIR, localFilename));
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'image/webp' }), localFilename);
  form.append('upload_preset', cloudinaryConfig.uploadPreset);
  // El nombre local (sin extensión) queda como contexto legible en el
  // dashboard de Cloudinary, aunque el id real que use la app sea el que
  // Cloudinary asigna solo.
  form.append('context', `local=${localFilename.replace(/\.webp$/, '')}`);

  const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data.public_id;
}

/** Sube de a N en paralelo — 125 de una sería innecesariamente agresivo. */
async function withConcurrency(items, limit, worker) {
  const results = [];
  let i = 0;
  async function next() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: limit }, next));
  return results;
}

const snap = await db.collection('products').get();
const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

console.log(`Migrando fotos de ${products.length} productos a Cloudinary...\n`);

let ok = 0;
let fail = 0;

await withConcurrency(products, 5, async (p) => {
  // Ya migrado (se puede volver a correr el script sin re-subir todo):
  // un nombre local siempre termina en .webp, un public_id de Cloudinary no.
  const already = p.images?.[0] && !p.images[0].endsWith('.webp');
  if (already) {
    ok++;
    return;
  }
  if (!p.images?.length) return;

  try {
    const publicIds = [];
    for (const localFile of p.images) {
      publicIds.push(await uploadOne(localFile));
    }
    await db.collection('products').doc(p.id).update({ images: publicIds });
    ok++;
    console.log(`  ok   ${p.slug}`);
  } catch (err) {
    fail++;
    console.log(`  FALLÓ ${p.slug}: ${err.message}`);
  }
});

console.log(`\nListo — ${ok} migrados, ${fail} con error.`);
if (fail) console.log('Corré el script de nuevo: los que ya migraron se saltan solos.');
