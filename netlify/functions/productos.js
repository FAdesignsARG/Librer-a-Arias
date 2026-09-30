/**
 * Productos desde Base44 — `POST /api/productos`.
 *
 * `action: "crear"`: alta en la misma colección y con la misma forma que la
 * carga del panel. `actualizar` / `ocultar` / `habilitar` (30/09): por
 * `source_id`, sólo precio, stock y visibilidad — lo operativo lo manda el
 * POS; nombre, descripción, rubro y foto siguen siendo del panel (decisión
 * de Fran). Nunca borra: dar de baja es ocultar.
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
export const ACCIONES = ['crear', 'actualizar', 'ocultar', 'habilitar'];

/**
 * Qué manda cada lado en un producto vinculado (decisión de Fran, 30/09):
 * Base44/POS manda precio, stock y visibilidad; nombre, descripción, rubro
 * y foto se editan en el panel. Si Base44 los manda en `actualizar`, se
 * ignoran y se avisa en `ignorados` (no es error, para no trabar su envío).
 */
const CAMPOS_DEL_PANEL = ['name', 'description', 'category', 'image_url'];

export function validar(body) {
  const mal = (error, mensaje) => ({ error, mensaje });
  if (!body || typeof body !== 'object') return mal('CUERPO_INVALIDO', 'El cuerpo tiene que ser JSON.');
  if (!ACCIONES.includes(body.action))
    return mal('ACCION_INVALIDA', `action tiene que ser uno de: ${ACCIONES.join(', ')}.`);
  if (body.source !== 'base44') return mal('ORIGEN_INVALIDO', 'source tiene que ser "base44".');

  const sourceId = String(body.source_id ?? '').trim();
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(sourceId))
    return mal('SOURCE_ID_INVALIDO', 'source_id es obligatorio (letras, números, - o _).');

  if (body.action !== 'crear') return validarCambio(body, sourceId, mal);

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
    datos: {
      accion: 'crear',
      sourceId,
      name,
      price,
      category: body.category,
      description,
      imagen,
      imagenExterna,
      publish: body.publish === true,
    },
  };
}

/** actualizar / ocultar / habilitar. */
function validarCambio(body, sourceId, mal) {
  // slug = el catalog_slug de Base44. Sólo hace falta la primera vez, para
  // vincular un producto que se cargó en el panel (no nació por `crear`).
  const slug = String(body.slug ?? body.catalog_slug ?? '').trim();
  if (slug && !/^[a-z0-9-]{1,80}$/.test(slug)) return mal('SLUG_INVALIDO', 'slug no tiene el formato de la web.');

  const cambios = {};
  if (body.action === 'ocultar') cambios.visible = false;
  else if (body.action === 'habilitar') cambios.visible = true;
  else {
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price <= 0) return mal('PRECIO_INVALIDO', 'price tiene que ser un número mayor a 0.');
      cambios.price = price;
    }
    if (body.in_stock !== undefined) {
      if (typeof body.in_stock !== 'boolean') return mal('STOCK_INVALIDO', 'in_stock tiene que ser true o false.');
      cambios.inStock = body.in_stock;
    }
    const vis = body.visible ?? body.active;
    if (vis !== undefined) {
      if (typeof vis !== 'boolean') return mal('VISIBLE_INVALIDO', 'visible tiene que ser true o false.');
      cambios.visible = vis;
    }
  }
  const ignorados = body.action === 'actualizar' ? CAMPOS_DEL_PANEL.filter((k) => body[k] !== undefined) : [];
  return { datos: { accion: body.action, sourceId, slug: slug || null, cambios, ignorados } };
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
      syncedAt: iso,
      lastChangeOrigin: 'base44',
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

/**
 * actualizar / ocultar / habilitar por `source_id`. Nunca borra: ocultar es
 * `visible: false` y el vínculo queda, así una sincronización posterior no
 * resucita ni duplica nada. El slug no cambia jamás. Mandar el mismo estado
 * otra vez responde 200 con `actualizado: false` y no escribe nada.
 *
 * Primer contacto de un producto que se cargó en el panel: no hay vínculo,
 * así que Base44 manda también `slug` (su catalog_slug) y se ata acá. Si ese
 * producto ya está atado a OTRO source_id, 409: es justo el caso de los
 * registros duplicados de Base44, y no se decide solo cuál gana.
 */
export async function actualizarProducto(db, datos, { ahora = new Date(), publicarDirecto = false } = {}) {
  const productos = db.collection('products');
  const fuenteRef = db.collection('fuentes_externas').doc(`base44_${datos.sourceId}`);
  const error = (status, codigo, mensaje, extra = {}) => ({ status, body: { ok: false, error: codigo, mensaje, ...extra } });

  return db.runTransaction(async (tx) => {
    const fuente = await tx.get(fuenteRef);
    let slug;
    let vincular = false;
    if (fuente.exists) {
      slug = fuente.data().slug;
      if (datos.slug && datos.slug !== slug) {
        return error(409, 'VINCULO_DISTINTO', `Este source_id ya está atado a "${slug}", no a "${datos.slug}". El slug no cambia.`, { slug });
      }
    } else {
      if (!datos.slug) {
        return error(404, 'NO_VINCULADO', 'Este source_id no está vinculado. Mandá también slug (catalog_slug) o usá action "crear".');
      }
      slug = datos.slug;
      vincular = true;
    }

    const doc = await tx.get(productos.doc(slug));
    if (!doc.exists) {
      return vincular
        ? error(404, 'SLUG_INEXISTENTE', `No hay ningún producto con slug "${slug}" en la web.`)
        : error(409, 'ELIMINADO_EN_PANEL', 'Este producto se borró desde el panel. No se vuelve a crear solo.', { slug });
    }
    const p = doc.data();
    if (vincular && p.sourceId && p.sourceId !== datos.sourceId) {
      return error(409, 'VINCULO_DISTINTO', `"${slug}" ya está atado a otro registro de Base44 (${p.sourceId}).`, {
        slug,
        source_id_vinculado: p.sourceId,
      });
    }

    const avisos = [];
    const pedido = { ...datos.cambios };
    // Lo que entró "para revisar" se publica desde el panel (o con
    // publicación directa habilitada). `habilitar` explícito es error; un
    // `visible: true` dentro de una actualización completa se ignora y se
    // aplica el resto, para no trabar precio y stock.
    if (pedido.visible === true && p.pendingReview && !publicarDirecto) {
      if (datos.accion === 'habilitar') {
        return error(409, 'PENDIENTE_REVISION', 'Este producto está para revisar: se publica desde el panel.', { slug });
      }
      delete pedido.visible;
      avisos.push('visible_ignorado_pendiente_revision');
    }

    const patch = {};
    if (pedido.price !== undefined && pedido.price !== p.price) patch.price = pedido.price;
    if (pedido.inStock !== undefined && pedido.inStock !== (p.inStock !== false)) patch.inStock = pedido.inStock;
    if (pedido.visible !== undefined && pedido.visible !== (p.visible !== false)) patch.visible = pedido.visible;
    if (patch.visible && p.pendingReview) patch.pendingReview = false;

    const iso = ahora.toISOString();
    const hayCambios = Object.keys(patch).length > 0;
    if (vincular) {
      tx.set(fuenteRef, { source: 'base44', sourceId: datos.sourceId, slug, createdAt: iso, vinculadoPor: 'actualizar' });
      Object.assign(patch, { source: 'base44', sourceId: datos.sourceId });
    }
    if (hayCambios || vincular) {
      tx.update(productos.doc(slug), { ...patch, ...(hayCambios ? { updatedAt: iso } : {}), syncedAt: iso, lastChangeOrigin: 'base44' });
    }

    const final = { ...p, ...patch };
    const publico = final.visible !== false;
    // Sólo hace falta rebuild si cambia algo que se ve en la web.
    const requiereRebuild = 'visible' in patch || (publico && ('price' in patch || 'inStock' in patch));
    const cambios = Object.keys(patch).filter((k) => !['source', 'sourceId', 'pendingReview'].includes(k));
    const body = {
      ok: true,
      id: p.id || slug,
      slug,
      estado: estadoDe(final),
      actualizado: hayCambios,
      requiere_rebuild: requiereRebuild,
      cambios,
    };
    if (vincular) body.vinculado = true;
    if (datos.ignorados.length) body.ignorados = datos.ignorados;
    if (avisos.length) body.avisos = avisos;
    return { status: 200, body, antes: p, patch: hayCambios ? patch : null };
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

    if (datos.accion !== 'crear') {
      const r = await actualizarProducto(db, datos, { publicarDirecto: process.env.CATALOGO_PUBLICAR_DIRECTO === '1' });
      if (r.patch) {
        const que = [
          'price' in r.patch && `precio ${r.antes.price} → ${r.patch.price}`,
          'inStock' in r.patch && (r.patch.inStock ? 'con stock' : 'sin stock'),
          'visible' in r.patch && (r.patch.visible ? 'visible' : 'oculto'),
        ].filter(Boolean);
        await registrarActividad(db, 'product_synced', r.body.slug, `Base44 actualizó "${r.antes.name}": ${que.join(', ')}`);
      }
      return json(r.status, r.body);
    }

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
      await registrarActividad(
        db,
        'product_created',
        r.product.slug,
        `Base44 agregó "${r.product.name}"${r.product.pendingReview ? ' (para revisar)' : ''}`
      );
    }
    return json(r.status, r.body);
  } catch (err) {
    console.error('productos:', err);
    return json(500, { ok: false, error: 'FALLO', mensaje: 'No se pudo guardar el producto. Probá de nuevo.' });
  }
};

/**
 * Queda en el historial del panel, como cualquier cambio. Los reportes
 * filtran por año/mes/día en hora de Argentina (el panel usa la del
 * navegador; acá el servidor está en UTC). Si falla, no corta la respuesta.
 */
function registrarActividad(db, action, target, summary) {
  const ahora = new Date();
  const ar = new Date(ahora.getTime() - 3 * 60 * 60 * 1000);
  return db
    .collection('activity')
    .add({
      uid: 'base44',
      email: 'Base44',
      action,
      target,
      summary,
      year: ar.getUTCFullYear(),
      month: ar.getUTCMonth() + 1,
      quarter: Math.floor(ar.getUTCMonth() / 3) + 1,
      day: ar.getUTCDate(),
      createdAt: FieldValue.serverTimestamp(),
      clientTime: ahora.toISOString(),
    })
    .catch((err) => console.error('No se pudo registrar la actividad:', err));
}
