/**
 * Dispara una reconstrucción del sitio publicado.
 *
 * El catálogo público es estático: se genera una vez por build a partir de
 * Firestore (scripts/build.js escribe data/products.json en ese momento).
 * El panel admin escribe directo a Firestore en tiempo real, pero nada
 * avisaba a Netlify que había que reconstruir — así que un producto
 * cargado en admin quedaba invisible en la página pública hasta el
 * próximo build por otra razón (un push de código). admin.js llama a este
 * endpoint (con demora, para no disparar un build por cada producto de una
 * carga masiva) después de cualquier escritura, y también hay un botón
 * para forzarlo ya.
 *
 * BUILD_HOOK_URL es la URL secreta que da Netlify (Site settings > Build
 * hooks) — vive sólo acá, nunca en el navegador, para que nadie pueda
 * gastar los minutos de build del sitio con sólo mirar el código fuente
 * del panel.
 */
import crypto from 'node:crypto';
import { getDb } from '../../src/firebase-admin.js';
import { json, hasAdminSession } from './_helpers.js';

/**
 * Quién puede pedir un rebuild.
 *
 * Acá NO alcanza con exigir sesión del panel: Base44 también llama a este
 * endpoint (es su botón de publicación, y su centro de salud lo usa cuando
 * detecta una diferencia). Si se pidiera sesión a secas, se rompería la
 * integración con Rodri.
 *
 * Entonces vale cualquiera de las dos:
 *   - sesión del panel (Firebase Auth), o
 *   - el secreto compartido `REBUILD_TOKEN`, que va en el header
 *     `x-rebuild-token` — es el que le pasamos a Base44.
 *
 * Desde el 30/09 (pedido de Rodri, OK de Fran) está CERRADO para el resto:
 * sin `REBUILD_TOKEN` cargada, sólo el panel puede pedir una publicación.
 * Antes quedaba abierto mientras faltara la variable, para no cortarle la
 * publicación a Base44 antes de que tuviera el token.
 */
async function puedePedirRebuild(event) {
  const esperado = process.env.REBUILD_TOKEN || '';
  const enviado = event.headers?.['x-rebuild-token'] || event.headers?.['X-Rebuild-Token'] || '';
  if (esperado && enviado) {
    const x = Buffer.from(enviado);
    const y = Buffer.from(esperado);
    if (x.length === y.length && crypto.timingSafeEqual(x, y)) return true;
  }
  return hasAdminSession(event);
}

/** Mismo formato que /api/productos: success/ok, error, message/mensaje. */
const responder = (status, body) =>
  json(status, { success: body.ok, ...body, ...(body.mensaje ? { message: body.mensaje } : {}) });

/**
 * Pedidos casi simultáneos (Base44 y el panel a la vez, o reintentos) no
 * disparan builds en paralelo: si hubo un pedido en los últimos
 * VENTANA_MS, no se vuelve a llamar al hook. El build que ya está en camino
 * todavía no leyó Firestore (antes instala dependencias), así que incluye
 * este cambio. Igual se devuelve `accepted_at` = ahora, para que la
 * verificación con data/publicacion.json siga siendo honesta: si ese build
 * hubiera leído antes, `datos_leidos_en` queda atrás y Base44 lo ve.
 */
export const VENTANA_MS = 20000;

export async function yaPedidoHaceInstantes(db, ahora = new Date()) {
  const ref = db.collection('sistema').doc('rebuild');
  return db.runTransaction(async (tx) => {
    const d = await tx.get(ref);
    const ultimo = d.exists ? Date.parse(d.data().ultimoPedido) : 0;
    if (ahora - ultimo < VENTANA_MS) return true;
    tx.set(ref, { ultimoPedido: ahora.toISOString() });
    return false;
  });
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return responder(405, { ok: false, error: 'METODO', mensaje: 'Usá POST.' });
  }

  if (!(await puedePedirRebuild(event))) {
    return responder(401, {
      ok: false,
      error: 'SIN_SESION',
      mensaje: 'Para pedir una publicación hay que entrar al panel o mandar el token acordado.',
    });
  }

  const hookUrl = process.env.BUILD_HOOK_URL;
  if (!hookUrl) {
    return responder(503, { ok: false, error: 'SIN_HOOK', mensaje: 'Falta configurar BUILD_HOOK_URL en Netlify.' });
  }

  // La hora se toma antes de llamar al hook: cualquier build que publique
  // data/publicacion.json con `datos_leidos_en` posterior incluye este pedido.
  const accepted_at = new Date().toISOString();

  try {
    const db = await getDb(process.cwd());
    if (await yaPedidoHaceInstantes(db, new Date(accepted_at))) {
      return responder(200, { ok: true, accepted_at, deduplicado: true });
    }
  } catch (err) {
    // Si Firestore no responde, se publica igual: mejor un build de más
    // que un cambio sin publicar.
    console.error('rebuild: no se pudo deduplicar:', err?.message);
  }

  try {
    const res = await fetch(hookUrl, { method: 'POST' });
    if (!res.ok) return responder(502, { ok: false, error: 'FALLO', mensaje: `Netlify respondió ${res.status}` });
    return responder(200, { ok: true, accepted_at, deduplicado: false });
  } catch (err) {
    return responder(502, { ok: false, error: 'FALLO', mensaje: err?.message || 'No se pudo contactar a Netlify' });
  }
};
