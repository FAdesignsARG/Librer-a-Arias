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
import { json } from './_helpers.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido' });

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
