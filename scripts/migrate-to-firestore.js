/**
 * Migración de una sola vez: sube data/products.json y data/settings.json
 * a Firestore. Se corre una vez para arrancar; de ahí en más el panel
 * escribe directo en Firestore y estos archivos locales quedan de respaldo.
 *
 * Las fechas (createdAt/updatedAt) se guardan como el mismo string ISO que
 * ya usan — todo el código que las lee (isNew, offerActive, dateFmt) hace
 * `new Date(iso)`, así que cambiarlas a Timestamp de Firestore hubiera
 * obligado a tocar esa lógica en todos lados sin necesidad.
 *
 * Las fotos NO se tocan acá: siguen siendo los nombres de archivo locales
 * hasta correr scripts/migrate-images-to-cloudinary.js por separado.
 *
 *   node scripts/migrate-to-firestore.js
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { getDb } from '../src/firebase-admin.js';
import { loadEnv } from '../src/ai.js';

const ROOT = path.resolve(import.meta.dirname, '..');
await loadEnv(ROOT);

const products = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'products.json'), 'utf8'));
const settings = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'settings.json'), 'utf8'));

const db = await getDb(ROOT);

console.log(`Subiendo ${products.length} productos...`);
// 125 entra cómodo en un solo batch (el límite de Firestore es 500 escrituras)
const batch = db.batch();
for (const p of products) {
  batch.set(db.collection('products').doc(p.slug), p);
}
await batch.commit();
console.log('  productos: listo');

await db.collection('settings').doc('main').set(settings);
console.log('  settings: listo');

console.log(`\nMigrados ${products.length} productos y la configuración a Firestore.`);
console.log('Los archivos locales data/products.json y data/settings.json quedan de respaldo.');
