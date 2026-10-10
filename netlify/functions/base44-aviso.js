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
 *   { origen: "web", evento, cambios: [...], enviado_en, lote, lotes,
 *     productos: [{ slug, source_id, name, price, category, description,
 *                   image_urls, tags, featured, order, label, in_stock,
 *                   visible, pending_review, updated_at, synced_at,
 *                   last_change_origin }] }
 *   evento: creado | modificado | publicado | oculto | stock | eliminado
 *   En "eliminado" cada producto trae sólo { slug, source_id, eliminado: true }.
 *
 * Conflictos (09/10): `updated_at` es la marca que Gestión devuelve en
 * `if_updated_at` cuando edita contenido por /api/productos ("vi esta
 * versión"). `last_change_origin: "panel"` con `updated_at` posterior a
 * `synced_at` = el panel cambió algo que Gestión todavía no tomó.
 *
 * Lotes (09/10): de a 100 productos por envío. Un lote que falla se guarda
 * en `sync_pendientes` (sólo los slugs: al reintentar se manda el estado
 * de ese momento, no uno viejo) y se reintenta en los próximos avisos, o
 * con `{ reintentar: true }`. Después de 10 intentos queda "abandonado".
 */
import { getDb } from '../../src/firebase-admin.js';
import { cloudinaryUrl } from '../../src/cloudinary-config.js';
import { json as jsonBase, hasAdminSession } from './_helpers.js';

/** Mismo formato que /api/productos: success/ok, error, message/mensaje. */
const json = (status, body) =>
  jsonBase(status, { success: body.ok, ...body, ...(body.mensaje ? { message: body.mensaje } : {}) });

export const EVENTOS = ['creado', 'modificado', 'publicado', 'oculto', 'stock', 'eliminado'];
const MAX_PRODUCTOS = 2000;
export const LOTE = 100;
const MAX_INTENTOS = 10;
const PENDIENTES_POR_AVISO = 3;

/** [a,b,c,d,e] de a 2 -> [[a,b],[c,d],[e]] */
export const enLotes = (lista, n = LOTE) => {
  const out = [];
  for (let i = 0; i < lista.length; i += n) out.push(lista.slice(i, i + n));
  return out;
};

/** Valida lo que manda el panel. Devuelve { datos } o { error }. */
export function validarAviso(body) {
  if (!body || typeof body !== 'object') return { error: 'El cuerpo tiene que ser JSON.' };
  if (body.reintentar === true) return { datos: { reintentar: true } };
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
    tags: p.tags || '',
    featured: Boolean(p.featured),
    order: Number.isFinite(p.order) ? p.order : null,
    label: p.etiqueta || '',
    in_stock: p.inStock !== false,
    visible: p.visible !== false,
    pending_review: Boolean(p.pendingReview),
    updated_at: p.updatedAt || null,
    synced_at: p.syncedAt || null,
    last_change_origin: p.lastChangeOrigin || 'panel',
  };
}

/** Lee el estado actual de esos slugs (getAll: una lectura por producto,
    nunca el catálogo entero) y lo pasa al formato del aviso. */
async function estadoDe(db, pedidos) {
  const docs = await db.getAll(...pedidos.map((p) => db.collection('products').doc(p.slug)));
  return docs.map((d, i) => (d.exists ? aProducto(d.data(), pedidos[i]) : null)).filter(Boolean);
}

/** Un envío a Base44. true si lo aceptó. */
async function enviar(url, cuerpo, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        ...(process.env.BASE44_PRODUCT_SYNC_TOKEN ? { 'x-sync-token': process.env.BASE44_PRODUCT_SYNC_TOKEN } : {}),
      },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) console.error('aviso a Base44: respondió', res.status);
    return res.ok ? { ok: true } : { ok: false, error: `Base44 respondió ${res.status}` };
  } catch (err) {
    console.error('aviso a Base44:', err);
    return { ok: false, error: 'Base44 no respondió' };
  }
}

/**
 * Manda un aviso partido en lotes de 100. Los lotes que fallan quedan en
 * sync_pendientes. Devuelve el resumen para la respuesta.
 */
export async function avisarEnLotes(db, url, { evento, cambios, pedidos }, { fetchImpl = fetch, ahora = new Date() } = {}) {
  const lotes = enLotes(pedidos);
  let enviados = 0;
  let productos = 0;
  const fallidos = [];
  for (const [i, lote] of lotes.entries()) {
    const lista = evento === 'eliminado' ? lote.map((p) => ({ ...p, eliminado: true })) : await estadoDe(db, lote);
    if (!lista.length) continue;
    const r = await enviar(url, {
      origen: 'web', evento, cambios, enviado_en: ahora.toISOString(), lote: i + 1, lotes: lotes.length, productos: lista,
    }, fetchImpl);
    if (r.ok) {
      enviados++;
      productos += lista.length;
    } else {
      fallidos.push(i + 1);
      await db.collection('sync_pendientes').add({
        evento, cambios, productos: lote, error: r.error, intentos: 1,
        estado: 'pendiente', creado: ahora.toISOString(), ultimo_intento: ahora.toISOString(),
      });
    }
  }
  return { lotes: lotes.length, enviados, productos, fallidos };
}

/** Reintenta los pendientes más viejos (pocos por vez, para no demorar al panel). */
export async function reintentarPendientes(db, url, { limite = PENDIENTES_POR_AVISO, fetchImpl = fetch, ahora = new Date() } = {}) {
  // Sin orderBy: where + orderBy en campos distintos pide un índice compuesto.
  const snap = await db.collection('sync_pendientes').where('estado', '==', 'pendiente').limit(limite).get();
  let ok = 0;
  let siguen = 0;
  for (const doc of snap.docs) {
    const p = doc.data();
    const lista = p.evento === 'eliminado' ? p.productos.map((x) => ({ ...x, eliminado: true })) : await estadoDe(db, p.productos);
    const r = lista.length
      ? await enviar(url, { origen: 'web', evento: p.evento, cambios: p.cambios || [], enviado_en: ahora.toISOString(), reintento: p.intentos, productos: lista }, fetchImpl)
      : { ok: true };
    if (r.ok) {
      await doc.ref.delete();
      ok++;
    } else {
      const intentos = (p.intentos || 1) + 1;
      await doc.ref.update({ intentos, error: r.error, ultimo_intento: ahora.toISOString(), estado: intentos >= MAX_INTENTOS ? 'abandonado' : 'pendiente' });
      siguen++;
    }
  }
  return { reintentados: snap.docs.length, ok, siguen };
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
    const db = await getDb(process.cwd());
    // Primero lo que quedó pendiente de avisos anteriores (pocos por vez).
    const pendientes = await reintentarPendientes(db, url).catch((err) => {
      console.error('reintento de avisos:', err);
      return null;
    });
    if (v.datos.reintentar) return json(200, { ok: true, pendientes });

    const r = await avisarEnLotes(db, url, {
      evento: v.datos.evento,
      cambios: v.datos.cambios,
      pedidos: v.datos.productos,
    });
    if (!r.enviados && !r.fallidos.length) return json(200, { ok: true, enviado: false, motivo: 'SIN_PRODUCTOS', pendientes });
    if (r.fallidos.length) {
      return json(502, {
        ok: false,
        enviado: r.enviados > 0,
        error: 'BASE44_SIN_RESPUESTA',
        mensaje: `No se pudieron avisar ${r.fallidos.length} de ${r.lotes} lotes. Quedaron guardados para reintentar.`,
        ...r,
        pendientes,
      });
    }
    return json(200, { ok: true, enviado: true, ...r, pendientes });
  } catch (err) {
    console.error('aviso a Base44:', err);
    return json(502, { ok: false, enviado: false, error: 'BASE44_SIN_RESPUESTA', mensaje: 'No se pudo avisar a Base44.' });
  }
};
