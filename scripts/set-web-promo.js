/**
 * Reemplaza settings/main.promos en Firestore por la promo única de la web
 * — corrida única, 17/9/2026.
 *
 * Decisión de Fran: los descuentos por tramo de monto ("Llevá más, pagá
 * menos", hasta 20%) y por medio de pago no existen. La única promoción es
 * un porcentaje sobre el total del pedido por comprar desde la web, no
 * acumulable. Este script deja el campo con esa forma nueva; la página, el
 * asistente y el admin ya la leen (webPromo en src/templates.js).
 *
 * Usa `.update()`, no `.set()`: sólo pisa el campo promos, no toca el resto
 * de settings/main. Imprime el valor anterior por si hay que volver atrás.
 *
 *   node --use-system-ca scripts/set-web-promo.js
 */
import path from 'node:path';
import { getDb } from '../src/firebase-admin.js';
import { loadEnv } from '../src/ai.js';

const ROOT = path.resolve(import.meta.dirname, '..');
await loadEnv(ROOT);
const db = await getDb(ROOT);

const ref = db.collection('settings').doc('main');
const antes = (await ref.get()).get('promos');
console.log('settings/main.promos ANTES (guardar por si hay que volver):');
console.log(JSON.stringify(antes, null, 2));

const promos = {
  webPercent: 10,
  disclaimer: 'No acumulable con otras promociones',
};

await ref.update({ promos });
console.log('\nsettings/main.promos AHORA:');
console.log(JSON.stringify(promos, null, 2));
