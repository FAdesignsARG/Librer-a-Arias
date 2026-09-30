/**
 * Aviso web → Base44 — `POST /api/base44/aviso`.
 *
 * El panel escribe directo en Firestore desde el navegador, sin servidor de
 * por medio. Después de guardar, llama acá (con su sesión) y esta función
 * le reenvía a Base44 el estado real del producto, leído de Firestore. El
 * token de Base44 vive sólo acá, nunca en el navegador.
 *
 * Variables (Netlify): `BASE44_PRODUCT_SYNC_URL` y `BASE44_PRODUCT_SYNC_TOKEN`
 * (va en el header `x-sync-token`). Sin la URL no se manda nada y se
 * responde 200 con `enviado: false`: el panel nunca se traba por esto.
 *
 * Sin loops: sólo el panel llama a este endpoint. Lo que llega de Base44
 * por /api/productos se escribe en el servidor y no dispara avisos. Igual,
 * cada aviso lleva `origen: "web"` para que Base44 no lo rebote.
 *
 * Contrato del aviso (JSON):
 *   { origen: "web", evento, cambios: [...], enviado_en,
 *     productos: [{ slug, source_id, name, price, category, description,
 *                   image_urls, in_stock, visible, pending_review,
 *                   updated_at, last_change_origin }] }
 *   evento: creado | modificado | publicado | oculto | stock | eliminado
 *   En "eliminado" cada producto trae sólo { slug, source_id, eliminado: true }.
 */
import { getDb } from '../../src/firebase-admin.js';
import { cloudinaryUrl } from '../../src/cloudinary-config.js';
import { json, hasAdminSession } from './_helpers.js';

export const EVENTOS = ['creado', 'modificado', 'publicado', 'oculto', 'stock', 'eliminado'];
const MAX_PRODUCTOS = 500;

/** Valida lo que manda el panel. Devuelve { datos } o { error }. */
export function validarAviso(body) {
  if (!body || typeof body !== 'object') return { error: 'El cuerpo tiene que ser JSON.' };
  if (!EVENTOS.includes(body.evento)) return { error: `evento tiene que ser uno de: ${EVENTOS.join(', ')}.` };
  const lista = Array.isArray(body.productos) ? body.productos : [];
  const productos = lista
    .map((p) => ({ slug: String(p?.slug || ''), source_id: p?.source_id ? String(p.source_id) : null }))
    .filter((p) => /^[a-z0-9-]{1,80}$/.test(p.slug));
  if (!productos.length || productos.length > MAX_PRODUCTOS)
    return { error: `productos tiene que traer entre 1 y ${MAX_PRODUCTOS} slugs válidos.` };
  const cambios = Array.isArray(body.cambios) ? body.cambios.map(String).slice(0, 20) : [];
  return { datos: { evento: body.evento, cambios, productos } };
}

/** Lo que ve Base44 de un producto: el estado que quedó en Firestore. */
export function aProducto(p, pedido) {
  return {
    slug: p.slug,
    source_id: p.sourceId || pedido.source_id || null,
    name: p.name,
    price: p.price,
    category: p.category,
    description: p.description || '',
    image_urls: (p.images || []).map((id) => cloudinaryUrl(id)),
    in_stock: p.inStock !== false,
    visible: p.visible !== false,
    pending_review: Boolean(p.pendingReview),
    updated_at: p.updatedAt || null,
    last_change_origin: p.lastChangeOrigin || 'panel',
  };
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'METODO', mensaje: 'Usá POST.' });
  if (!(await hasAdminSession(event))) {
    return json(401, { ok: false, error: 'SIN_SESION', mensaje: 'Sólo el panel puede avisar cambios.' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '');
  } catch {
    return json(400, { ok: false, error: 'CUERPO_INVALIDO', mensaje: 'El cuerpo tiene que ser JSON.' });
  }
  const v = validarAviso(body);
  if (v.error) return json(422, { ok: false, error: 'AVISO_INVALIDO', mensaje: v.error });

  const url = process.env.BASE44_PRODUCT_SYNC_URL;
  if (!url) return json(200, { ok: true, enviado: false, motivo: 'SIN_CONFIGURAR' });

  try {
    let productos;
    if (v.datos.evento === 'eliminado') {
      productos = v.datos.productos.map((p) => ({ ...p, eliminado: true }));
    } else {
      // Una lectura por producto (getAll), nunca el catálogo entero: la
      // cuota de Firestore ya se agotó una vez.
      const db = await getDb(process.cwd());
      const refs = v.datos.productos.map((p) => db.collection('products').doc(p.slug));
      const docs = await db.getAll(...refs);
      productos = docs
        .map((d, i) => (d.exists ? aProducto(d.data(), v.datos.productos[i]) : null))
        .filter(Boolean);
      if (!productos.length) return json(200, { ok: true, enviado: false, motivo: 'SIN_PRODUCTOS' });
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        ...(process.env.BASE44_PRODUCT_SYNC_TOKEN ? { 'x-sync-token': process.env.BASE44_PRODUCT_SYNC_TOKEN } : {}),
      },
      body: JSON.stringify({
        origen: 'web',
        evento: v.datos.evento,
        cambios: v.datos.cambios,
        enviado_en: new Date().toISOString(),
        productos,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error('aviso a Base44: respondió', res.status);
      return json(502, { ok: false, enviado: false, error: 'BASE44_RECHAZO', mensaje: `Base44 respondió ${res.status}.` });
    }
    return json(200, { ok: true, enviado: true, productos: productos.length });
  } catch (err) {
    console.error('aviso a Base44:', err);
    return json(502, { ok: false, enviado: false, error: 'BASE44_SIN_RESPUESTA', mensaje: 'No se pudo avisar a Base44.' });
  }
};
