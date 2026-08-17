/**
 * Compartido entre las funciones de /api/ai/*.
 *
 * Cada endpoint es su propia Netlify Function (así Netlify las bundlea y
 * arranca por separado, sin un router propio que mantener). Lo único que
 * repetirían es esto: la respuesta JSON, leer el catálogo de Firestore con
 * el mismo mecanismo que ya usa scripts/build.js, y traducir los errores
 * de src/ai.js a un código HTTP con mensaje en criollo.
 */
import { getDb } from '../../src/firebase-admin.js';

export const json = (statusCode, obj) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  body: JSON.stringify(obj),
});

/**
 * Mismo mecanismo que scripts/build.js (getDb + FIREBASE_SERVICE_ACCOUNT_JSON,
 * ya configurada en Netlify para el build). No hay archivo de clave acá —
 * el `root` sólo importaría para el fallback local, que en Netlify nunca
 * se toca porque la variable de entorno gana primero.
 */
export async function loadCatalog() {
  const db = await getDb(process.cwd());
  const [productsSnap, settingsDoc] = await Promise.all([
    db.collection('products').get(),
    db.collection('settings').doc('main').get(),
  ]);
  return {
    products: productsSnap.docs.map((d) => d.data()),
    settings: settingsDoc.data(),
  };
}

/** Mismo criterio de errores que tenía server.js/ai-api.js en local. */
export function aiErrorResponse(err) {
  const msg = err?.message || 'Error inesperado';
  if (msg.startsWith('LIMITE')) return json(429, { error: 'LIMITE', mensaje: msg.slice(8) });
  if (msg.startsWith('CLAVE_INVALIDA')) return json(401, { error: 'CLAVE_INVALIDA', mensaje: msg.slice(15) });
  console.error('error de IA:', err);
  return json(500, { error: 'FALLO', mensaje: msg });
}

export const noKeyResponse = () =>
  json(503, {
    error: 'SIN_CLAVE',
    mensaje: 'Falta configurar GROQ_API_KEY en las variables de entorno de Netlify.',
  });
