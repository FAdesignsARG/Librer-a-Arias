/**
 * Capa auxiliar del catálogo, servida por Base44 (`action: catalogo_auxiliar`).
 *
 * QUÉ ES Y QUÉ NO ES
 * El catálogo público sigue siendo estático: Firestore -> scripts/build.js ->
 * data/products.json + /p/<slug>/. Base44 NO es la fuente del catálogo y no
 * puede serlo: si lo fuera, Google, las vistas previas de WhatsApp y los datos
 * estructurados dependerían de que un servicio externo conteste. Esto es una
 * capa de ENRIQUECIMIENTO que se aplica encima, por `slug`:
 *
 *   - search_aliases  -> más formas de encontrar un producto que ya existe
 *   - etiqueta        -> etiqueta comercial ("Nuevo", "Oferta", "Más consultado")
 *   - destacado       -> destacados elegidos desde Base44
 *   - aliases_globales-> sinónimos del buscador ("air fryer" -> freidora de aire)
 *   - relacionados    -> "También te puede interesar" curado, con prioridad
 *
 * REGLA DE ORO: si Base44 no contesta, tarda o devuelve cualquier cosa, el
 * build TIENE que salir igual. Todo lo de acá es opcional por diseño; ante la
 * duda se devuelve la capa vacía y el sitio queda exactamente como antes.
 *
 * Se llama por HTTP directo (no por el SDK del navegador) porque esto corre en
 * Node durante el build. La acción es pública y de sólo lectura: no hay tokens.
 */

const BRIDGE_URL =
  'https://base44.app/api/apps/6a7e432be6e59ad993e40158/functions/catalogo-metricas';

const TIMEOUT_MS = 15000;

/** Capa vacía: lo que se usa cuando Base44 no está disponible. */
export const EMPTY_AUX = {
  ok: false,
  bridgeVersion: null,
  generatedAt: null,
  aliases: [],
  bySlug: new Map(),
  relatedBySlug: new Map(),
};

const txt = (v) => (typeof v === 'string' ? v.trim() : '');

/** Listas de texto tolerantes: acepta array, o un string con comas. */
const strList = (v) => {
  const raw = Array.isArray(v) ? v : txt(v) ? txt(v).split(',') : [];
  return [...new Set(raw.map(txt).filter(Boolean))];
};

/**
 * Estado de publicación / visibilidad que manda Base44, si lo manda.
 * Devuelve `true` (publicar), `false` (ocultar) o `null` (Base44 no opina:
 * manda lo que diga Firestore). El `null` es importante: hoy el bridge NO
 * envía estos campos, y ausencia NO puede significar "ocultalo" — vaciaría
 * el catálogo entero de un rebuild.
 */
function webVisibility(row) {
  for (const k of ['visible', 'visible_web', 'habilitado_web', 'publicado']) {
    if (typeof row?.[k] === 'boolean') return row[k];
  }
  const estado = txt(row?.estado || row?.estado_publicacion).toLowerCase();
  if (!estado) return null;
  if (estado === 'oculto') return false;
  // "Publicado", "Pendiente", "Publicando" y "Error" son estados del circuito
  // de publicación de Base44, no una orden de despublicar: sólo "Oculto" saca
  // el producto de la web.
  return true;
}

/**
 * Pide la capa auxiliar. Nunca lanza: ante cualquier problema devuelve
 * EMPTY_AUX con `ok:false` y el motivo en `error`.
 */
export async function fetchAuxiliar({ url, timeout = TIMEOUT_MS } = {}) {
  // BASE44_AUX_URL permite apuntar a un bridge de prueba sin tocar el código
  // (se usa para probar alias, etiquetas, relacionados y ocultos con datos
  // simulados, porque el bridge real todavía viene vacío). En Netlify no está
  // definida, así que producción siempre habla con Base44.
  url = url || process.env.BASE44_AUX_URL || BRIDGE_URL;
  let payload;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'catalogo_auxiliar' }),
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) return { ...EMPTY_AUX, error: `HTTP ${res.status}` };
    payload = await res.json();
  } catch (err) {
    return { ...EMPTY_AUX, error: err?.message || 'sin respuesta' };
  }

  if (!payload?.success) {
    return { ...EMPTY_AUX, error: txt(payload?.error) || 'success:false' };
  }

  /* ---------- sinónimos globales del buscador ---------- */
  const aliases = [];
  for (const row of Array.isArray(payload.aliases_globales) ? payload.aliases_globales : []) {
    const termino = txt(row?.termino);
    const sinonimos = strList(row?.sinonimos);
    if (termino && sinonimos.length) aliases.push({ termino, sinonimos });
  }

  /* ---------- enriquecimiento por producto ---------- */
  const bySlug = new Map();
  for (const row of Array.isArray(payload.productos) ? payload.productos : []) {
    const slug = txt(row?.slug);
    if (!slug) continue;
    bySlug.set(slug, {
      searchAliases: strList(row?.search_aliases),
      etiqueta: txt(row?.etiqueta),
      destacado: row?.destacado === true,
      visibleWeb: webVisibility(row),
    });
  }

  /* ---------- relaciones curadas ---------- */
  // prioridad: número más bajo = más arriba. Si no viene, va al fondo pero
  // antes que los relacionados automáticos.
  const relatedBySlug = new Map();
  for (const row of Array.isArray(payload.relacionados) ? payload.relacionados : []) {
    const slug = txt(row?.slug);
    const relatedSlug = txt(row?.related_slug);
    if (!slug || !relatedSlug || slug === relatedSlug) continue;
    const prioridad = Number.isFinite(Number(row?.prioridad)) ? Number(row.prioridad) : 999;
    if (!relatedBySlug.has(slug)) relatedBySlug.set(slug, []);
    relatedBySlug.get(slug).push({
      slug: relatedSlug,
      relacion: txt(row?.relacion) || 'Similar',
      prioridad,
    });
  }
  for (const list of relatedBySlug.values()) {
    list.sort((a, b) => a.prioridad - b.prioridad || a.slug.localeCompare(b.slug));
  }

  return {
    ok: true,
    bridgeVersion: txt(payload.bridge_version) || null,
    generatedAt: txt(payload.generated_at) || null,
    aliases,
    bySlug,
    relatedBySlug,
  };
}
