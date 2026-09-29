/**
 * Alta controlada de productos desde Base44 — `POST /api/productos`.
 *
 * El panel (Firestore) sigue siendo el dueño del catálogo: este endpoint
 * crea el producto en la misma colección y con la misma forma que la carga
 * del panel, y a partir de ahí se edita, publica o borra desde el panel.
 * Sólo CREA. No modifica precios, fotos ni borra nada existente.
 *
 * Decisión del 27/09/2026 (Rodri, con el OK de Fran): lo que llega de
 * Base44 entra OCULTO y marcado "para revisar" (`pendingReview`). Alguien
 * lo mira en el panel y lo publica. `publish: true` ya es parte del
 * contrato, pero está apagado hasta que se cargue
 * `CATALOGO_PUBLICAR_DIRECTO=1` en Netlify.
 *
 * Seguridad: token propio `CATALOGO_WRITE_TOKEN` (NO es el de /api/rebuild),
 * en `x-catalogo-token` o `Authorization: Bearer`. A diferencia de
 * /api/rebuild, sin la variable el endpoint está CERRADO: escribir en el
 * catálogo nunca queda abierto por defecto.
 *
 * Idempotente: `fuentes_externas/base44_<source_id>` guarda qué slug le tocó
 * a cada producto de Base44. Si vuelve a llegar el mismo `source_id`, se
 * devuelve ese slug y no se crea nada — aunque el producto se haya borrado
 * en el panel (no se resucita lo que alguien sacó a propósito).
 *
 * Fotos: si `image_url` no es de nuestro Cloudinary (las del canal de
 * WhatsApp quedan en Base44), se descarga y se sube a Cloudinary antes de
 * crear; si eso falla, responde error y no crea nada (29/09, pedido de Rodri).
 *
 * Colisiones (409, no crea nada): misma foto de Cloudinary que un producto
 * existente, o mismo nombre normalizado. Se busca con consultas puntuales y
 * no leyendo el catálogo entero: la cuota de Firestore ya se agotó una vez.
 */
import crypto from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '../../src/firebase-admin.js';
import { cloudinaryConfig } from '../../src/cloudinary-config.js';
import { json as jsonBase } from './_helpers.js';

/** Base44 lee `success`; el resto del contrato usa `ok`. Van los dos. */
const json = (status, body) => jsonBase(status, { success: body.ok, ...body });

export const RUBROS = ['Juguetería', 'Tecnología', 'Regalería', 'Bazar', 'Librería'];
const CLOUD = 'nzyq1xgf';

/** Mismo slug que arma el panel (src/admin/admin.js). */
export const slugify = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const normName = (s) => slugify(String(s || '')).replace(/-/g, ' ');

/**
 * `https://res.cloudinary.com/nzyq1xgf/image/upload/f_auto,q_auto,w_400/v123/abc.jpg`
 * → `abc`. El panel guarda sólo el public id. Devuelve null si la URL no es
 * de nuestra cuenta.
 */
export function cloudinaryPublicId(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.hostname !== 'res.cloudinary.com') return null;
  const parts = u.pathname.split('/').filter(Boolean);
  if (parts[0] !== CLOUD || parts[1] !== 'image' || parts[2] !== 'upload') return null;
  const rest = parts.slice(3);
  const esTransformacion = (seg) => seg.split(',').every((t) => /^[a-z]{1,3}_[^,]+$/.test(t));
  while (rest.length > 1 && (esTransformacion(rest[0]) || /^v\d+$/.test(rest[0]))) rest.shift();
  if (!rest.length) return null;
  const id = rest.join('/').replace(/\.[a-z0-9]+$/i, '');
  return id || null;
}

function tokenValido(event) {
  const esperado = process.env.CATALOGO_WRITE_TOKEN || '';
  const h = event.headers || {};
  const raw = h['x-catalogo-token'] || h['X-Catalogo-Token'] || '';
  const auth = h.authorization || h.Authorization || '';
  const enviado = raw || (auth.startsWith('Bearer ') ? auth.slice(7).trim() : '');
  const a = Buffer.from(enviado);
  const b = Buffer.from(esperado);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Valida y normaliza el cuerpo. Devuelve { datos } o { error, mensaje }. */
export function validar(body) {
  const mal = (error, mensaje) => ({ error, mensaje });
  if (!body || typeof body !== 'object') return mal('CUERPO_INVALIDO', 'El cuerpo tiene que ser JSON.');
  if (body.action !== 'crear') return mal('ACCION_INVALIDA', 'Este endpoint sólo acepta action: "crear".');
  if (body.source !== 'base44') return mal('ORIGEN_INVALIDO', 'source tiene que ser "base44".');

  const sourceId = String(body.source_id ?? '').trim();
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(sourceId))
    return mal('SOURCE_ID_INVALIDO', 'source_id es obligatorio (letras, números, - o _).');

  const name = String(body.name ?? '').trim().replace(/\s+/g, ' ');
  if (!name || name.length > 200 || !slugify(name))
    return mal('NOMBRE_INVALIDO', 'name es obligatorio (hasta 200 caracteres).');

  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) return mal('PRECIO_INVALIDO', 'price tiene que ser un número mayor a 0.');

  if (!RUBROS.includes(body.category))
    return mal('RUBRO_INVALIDO', `category tiene que ser uno de: ${RUBROS.join(', ')}.`);

  const description = String(body.description ?? '').trim();
  if (description.length > 3000) return mal('DESCRIPCION_LARGA', 'description admite hasta 3000 caracteres.');

  // Foto de nuestro Cloudinary: se usa tal cual. Cualquier otra URL https
  // (p. ej. las del canal de WhatsApp, guardadas en Base44) se importa a
  // Cloudinary en el handler antes de crear nada.
  const imageUrl = String(body.image_url ?? '').trim();
  let imagen = null;
  let imagenExterna = null;
  if (imageUrl) {
    imagen = cloudinaryPublicId(imageUrl);
    if (!imagen) {
      if (!urlExternaValida(imageUrl))
        return mal('IMAGEN_INVALIDA', 'image_url tiene que ser una URL https pública o venir vacía.');
      imagenExterna = imageUrl;
    }
  }

  if (body.publish !== undefined && typeof body.publish !== 'boolean')
    return mal('PUBLISH_INVALIDO', 'publish tiene que ser true o false.');

  return {
    datos: { sourceId, name, price, category: body.category, description, imagen, imagenExterna, publish: body.publish === true },
  };
}

/** https y no apuntando a la máquina ni a redes internas. */
function urlExternaValida(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:' || u.username || u.password) return false;
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return false;
  // IPs literales: sólo se aceptan nombres de dominio.
  if (/^[\d.]+$/.test(h) || h.includes(':') || h.startsWith('[')) return false;
  return true;
}

const MAX_FOTO = 10 * 1024 * 1024;

/**
 * Baja la foto de `url` y la sube a nuestro Cloudinary con el mismo preset
 * "unsigned" que usa el panel (no hay credenciales que guardar). Devuelve
 * el public_id o tira un Error con `codigo` para la respuesta.
 */
export async function importarImagen(url, fetchImpl = fetch) {
  const falla = (codigo, mensaje) => Object.assign(new Error(mensaje), { codigo });

  let res;
  try {
    res = await fetchImpl(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
  } catch {
    throw falla('IMAGEN_NO_DESCARGADA', 'No se pudo descargar image_url (no respondió a tiempo o no existe).');
  }
  if (!res.ok) throw falla('IMAGEN_NO_DESCARGADA', `No se pudo descargar image_url (respondió ${res.status}).`);
  const tipo = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!tipo.startsWith('image/')) throw falla('IMAGEN_NO_ES_FOTO', `image_url no es una imagen (llegó ${tipo || 'sin tipo'}).`);
  if (Number(res.headers.get('content-length')) > MAX_FOTO) throw falla('IMAGEN_PESADA', 'La foto pesa más de 10 MB.');
  const bytes = await res.arrayBuffer();
  if (!bytes.byteLength) throw falla('IMAGEN_NO_DESCARGADA', 'image_url llegó vacía.');
  if (bytes.byteLength > MAX_FOTO) throw falla('IMAGEN_PESADA', 'La foto pesa más de 10 MB.');

  const form = new FormData();
  form.append('file', new Blob([bytes], { type: tipo }), 'foto');
  form.append('upload_preset', cloudinaryConfig.uploadPreset);
  let up;
  try {
    up = await fetchImpl(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw falla('IMAGEN_NO_SUBIDA', 'No se pudo subir la foto a Cloudinary. Probá de nuevo.');
  }
  const data = await up.json().catch(() => ({}));
  if (!up.ok || !data.public_id) {
    throw falla('IMAGEN_NO_SUBIDA', `Cloudinary rechazó la foto: ${data?.error?.message || up.status}.`);
  }
  return data.public_id;
}

/**
 * La lógica, separada del handler para poder probarla sin Firestore real.
 * Todo corre en una transacción: dos pedidos iguales al mismo tiempo no
 * pueden crear dos productos.
 */
export async function crearProducto(db, datos, ahora = new Date()) {
  const productos = db.collection('products');
  const fuenteRef = db.collection('fuentes_externas').doc(`base44_${datos.sourceId}`);

  return db.runTransaction(async (tx) => {
    const fuente = await tx.get(fuenteRef);
    if (fuente.exists) {
      const { slug } = fuente.data();
      const prod = await tx.get(productos.doc(slug));
      if (!prod.exists) {
        return {
          status: 409,
          body: {
            ok: false,
            error: 'ELIMINADO_EN_PANEL',
            mensaje: 'Este source_id ya se creó y después se borró desde el panel. No se vuelve a crear solo.',
            slug,
          },
        };
      }
      const p = prod.data();
      return { status: 200, body: { ok: true, id: p.id || slug, slug, creado: false, estado: estadoDe(p), requiere_rebuild: false } };
    }

    // Colisión por foto: la misma imagen ya está en otro producto.
    const candidatos = [];
    if (datos.imagen) {
      const porFoto = await tx.get(productos.where('images', 'array-contains', datos.imagen).limit(5));
      porFoto.forEach((d) => candidatos.push({ ...resumen(d.data()), motivo: 'misma_foto' }));
    }

    // Colisión por nombre y slug libre, en una sola pasada por la cadena
    // slug, slug-2, slug-3… (misma regla que el panel).
    const base = slugify(datos.name);
    let slug = base;
    for (let n = 2; ; n++) {
      const doc = await tx.get(productos.doc(slug));
      if (!doc.exists) break;
      const p = doc.data();
      if (normName(p.name) === normName(datos.name) && !candidatos.some((c) => c.slug === p.slug)) {
        candidatos.push({ ...resumen(p), motivo: p.price === datos.price ? 'mismo_nombre_y_precio' : 'mismo_nombre' });
      }
      slug = `${base}-${n}`;
    }

    if (candidatos.length) {
      return {
        status: 409,
        body: {
          ok: false,
          error: 'POSIBLE_DUPLICADO',
          mensaje: 'Ya hay un producto parecido en la web. No se creó nada: revisalo a mano.',
          candidatos,
        },
      };
    }

    const primero = await tx.get(productos.orderBy('order', 'asc').limit(1));
    const minOrder = primero.empty ? 0 : Math.min(0, primero.docs[0].data().order ?? 0);
    const iso = ahora.toISOString();
    const product = {
      id: slug,
      slug,
      name: datos.name,
      category: datos.category,
      description: datos.description,
      price: datos.price,
      images: datos.imagen ? [datos.imagen] : [],
      inStock: true,
      featured: false,
      visible: datos.publish,
      pendingReview: !datos.publish,
      source: 'base44',
      sourceId: datos.sourceId,
      tags: '',
      sub: null,
      offer: null,
      order: minOrder - 1,
      createdAt: iso,
      updatedAt: iso,
    };
    tx.set(productos.doc(slug), product);
    tx.set(fuenteRef, { source: 'base44', sourceId: datos.sourceId, slug, createdAt: iso });

    // Oculto no cambia nada público: no hace falta rebuild (al publicarlo, el
    // panel republica solo). Publicado directo: Base44 llama a /api/rebuild.
    return {
      status: 201,
      body: { ok: true, id: slug, slug, creado: true, estado: estadoDe(product), requiere_rebuild: product.visible },
      product,
    };
  });
}

const estadoDe = (p) => (p.visible === false ? (p.pendingReview ? 'pendiente_revision' : 'oculto') : 'publicado');
const resumen = (p) => ({ slug: p.slug, name: p.name, price: p.price, source_id: p.sourceId || null });

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'METODO', mensaje: 'Usá POST.' });

  if (!process.env.CATALOGO_WRITE_TOKEN) {
    return json(503, { ok: false, error: 'CERRADO', mensaje: 'Falta configurar CATALOGO_WRITE_TOKEN en Netlify.' });
  }
  if (!tokenValido(event)) {
    return json(401, { ok: false, error: 'TOKEN_INVALIDO', mensaje: 'Falta el token o no es el acordado.' });
  }

  let body;
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : event.body;
    body = JSON.parse(raw || '');
  } catch {
    return json(400, { ok: false, error: 'CUERPO_INVALIDO', mensaje: 'El cuerpo tiene que ser JSON.' });
  }

  const v = validar(body);
  if (v.error) return json(422, { ok: false, error: v.error, mensaje: v.mensaje });

  if (v.datos.publish && process.env.CATALOGO_PUBLICAR_DIRECTO !== '1') {
    return json(403, {
      ok: false,
      error: 'PUBLICAR_DESHABILITADO',
      mensaje: 'Por ahora los productos de Base44 entran ocultos para revisar. Mandá publish: false.',
    });
  }

  try {
    const db = await getDb(process.cwd());
    const datos = v.datos;
    if (datos.imagenExterna) {
      // Si el source_id ya existe, no se sube nada: crearProducto responde
      // igual (200 o 409) y no queda una foto huérfana por cada reintento.
      const ya = await db.collection('fuentes_externas').doc(`base44_${datos.sourceId}`).get();
      if (!ya.exists) {
        try {
          datos.imagen = await importarImagen(datos.imagenExterna);
        } catch (err) {
          if (!err.codigo) throw err;
          // 422 si el problema es la foto; 502 si falló la descarga o Cloudinary.
          const status = err.codigo === 'IMAGEN_NO_ES_FOTO' || err.codigo === 'IMAGEN_PESADA' ? 422 : 502;
          return json(status, { ok: false, error: err.codigo, mensaje: `${err.message} No se creó el producto.` });
        }
      }
    }
    const r = await crearProducto(db, datos);
    if (r.product) {
      // Queda en el historial del panel, como cualquier alta. Los reportes
      // filtran por año/mes/día en hora de Argentina (el panel usa la del
      // navegador; acá el servidor está en UTC).
      const ar = new Date(Date.now() - 3 * 60 * 60 * 1000);
      await db
        .collection('activity')
        .add({
          uid: 'base44',
          email: 'Base44',
          action: 'product_created',
          target: r.product.slug,
          summary: `Base44 agregó "${r.product.name}"${r.product.pendingReview ? ' (para revisar)' : ''}`,
          year: ar.getUTCFullYear(),
          month: ar.getUTCMonth() + 1,
          quarter: Math.floor(ar.getUTCMonth() / 3) + 1,
          day: ar.getUTCDate(),
          createdAt: FieldValue.serverTimestamp(),
          clientTime: r.product.createdAt,
        })
        .catch((err) => console.error('No se pudo registrar la actividad:', err));
    }
    return json(r.status, r.body);
  } catch (err) {
    console.error('alta de producto:', err);
    return json(500, { ok: false, error: 'FALLO', mensaje: 'No se pudo crear el producto. Probá de nuevo.' });
  }
};
