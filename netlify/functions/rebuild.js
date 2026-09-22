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
 * Y mientras `REBUILD_TOKEN` NO esté configurada en Netlify, el endpoint
 * sigue abierto como hasta ahora. Es a propósito: si se cerrara de golpe,
 * Base44 dejaría de poder publicar en el momento del deploy, antes de que
 * Rodri tenga el token. Cargar la variable es lo que activa el candado.
 */
async function puedePedirRebuild(event) {
  const esperado = process.env.REBUILD_TOKEN;
  if (!esperado) return true;

  const enviado = event.headers?.['x-rebuild-token'] || event.headers?.['X-Rebuild-Token'] || '';
  if (enviado && enviado === esperado) return true;

  return hasAdminSession(event);
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido' });

  if (!(await puedePedirRebuild(event))) {
    return json(401, {
      error: 'SIN_SESION',
      mensaje: 'Para pedir una publicación hay que entrar al panel o mandar el token acordado.',
    });
  }

  const hookUrl = process.env.BUILD_HOOK_URL;
  if (!hookUrl) {
    return json(503, { error: 'SIN_HOOK', mensaje: 'Falta configurar BUILD_HOOK_URL en Netlify.' });
  }

  try {
    const res = await fetch(hookUrl, { method: 'POST' });
    if (!res.ok) return json(502, { error: 'FALLO', mensaje: `Netlify respondió ${res.status}` });
    return json(200, { ok: true });
  } catch (err) {
    return json(502, { error: 'FALLO', mensaje: err?.message || 'No se pudo contactar a Netlify' });
  }
};
