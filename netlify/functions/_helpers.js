/**
 * Compartido entre las funciones de /api/ai/*.
 *
 * Cada endpoint es su propia Netlify Function (así Netlify las bundlea y
 * arranca por separado, sin un router propio que mantener). Lo único que
 * repetirían es esto: la respuesta JSON, leer el catálogo de Firestore con
 * el mismo mecanismo que ya usa scripts/build.js, y traducir los errores
 * de src/ai.js a un código HTTP con mensaje en criollo.
 */
import { getDb, verifyIdToken } from '../../src/firebase-admin.js';

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

/**
 * Exige sesión del panel.
 *
 * Hasta el 22/09/2026 las funciones de IA del panel no pedían nada: medido
 * desde afuera, cualquiera podía llamarlas. Ninguna escribe (el asistente
 * propone y una persona confirma), pero gastaban la cuota de Groq de quien
 * quisiera y una pregunta como "¿qué está oculto?" devolvía los nombres de
 * los productos que el local decidió NO publicar.
 *
 * El panel ya usa Firebase Auth para entrar: el navegador manda su ID token
 * en `Authorization: Bearer …` y acá se valida contra el mismo proyecto. No
 * hay nada nuevo que configurar ni una clave más que cuidar.
 *
 * Devuelve `null` si está todo bien, o la respuesta 401 lista para devolver.
 */
export async function requireAdmin(event) {
  const raw = event.headers?.authorization || event.headers?.Authorization || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
  const user = await verifyIdToken(process.cwd(), token);
  if (user) return null;
  return json(401, {
    error: 'SIN_SESION',
    mensaje: 'Esto es sólo para el panel. Iniciá sesión y volvé a intentar.',
  });
}

/** Igual que requireAdmin pero sin cortar: sólo dice si hay sesión válida. */
export async function hasAdminSession(event) {
  const raw = event.headers?.authorization || event.headers?.Authorization || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
  return Boolean(await verifyIdToken(process.cwd(), token));
}
