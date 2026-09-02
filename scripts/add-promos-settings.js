/**
 * Agrega el campo `promos` a settings/main en Firestore — corrida única.
 *
 * Ver Ronda 1 de roadmap-mejoras.md para el porqué de estos valores: son
 * los tramos reales de la promo "Llevá más, pagá menos" vigente en el
 * local (fuente: pieza gráfica provista por el negocio). Usa `.update()`,
 * no `.set()` — sólo agrega este campo, no toca el resto de settings/main.
 *
 *   node scripts/add-promos-settings.js
 */
import path from 'node:path';
import { getDb } from '../src/firebase-admin.js';
import { loadEnv } from '../src/ai.js';

const ROOT = path.resolve(import.meta.dirname, '..');
await loadEnv(ROOT);
const db = await getDb(ROOT);

const promos = {
  tiers: [
    { minAmount: 50000, percent: 5 },
    { minAmount: 100000, percent: 10 },
    { minAmount: 150000, percent: 15 },
    { minAmount: 200000, percent: 20 },
  ],
  paymentNote: 'Solo efectivo o transferencia',
  chachosPercent: 10,
  disclaimer: 'Descuentos no acumulables con otras promociones',
};

await db.collection('settings').doc('main').update({ promos });
console.log('settings/main.promos actualizado:');
console.log(JSON.stringify(promos, null, 2));
