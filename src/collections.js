/**
 * Colecciones armadas desde Gestión (Base44) — 08/10/2026.
 *
 * Un `BloquePagina` con productos elegidos funciona como una colección
 * cerrada: `/catalogo/?coleccion=<clave>` muestra sólo esos productos. No
 * hay nada de ninguna campaña acá: la web lee el bloque por su `clave` y
 * lo representa. Cambiar la campaña es cambiar el bloque en Gestión.
 *
 * Qué productos: `product_slugs` (el catalog_slug de cada Product, en el
 * orden elegido) si viene; si no, `product_ids`. Cada valor se busca
 * primero como slug de la web y después como `sourceId` (los productos
 * vinculados con Base44 lo traen en products.json). Lo que no aparece
 * —borrado, oculto o sin vínculo— se omite sin romper nada.
 *
 * Lo usan page-control.js (CTA y vigencia del bloque) y app.js (grilla y
 * fotos del bloque). Sin dependencias: se puede probar en Node.
 */

export const COLLECTION_PARAM = 'coleccion';

export const validKey = (key) => /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(String(key || ''));

export const collectionHref = (key) => `/catalogo/?${COLLECTION_PARAM}=${encodeURIComponent(key)}`;

const lista = (v) => (Array.isArray(v) ? v.map((x) => String(x ?? '').trim()).filter(Boolean) : []);

/** Lo que eligió Gestión, en su orden: slugs si los manda, si no IDs. */
export function collectionIds(block) {
  const slugs = lista(block?.product_slugs);
  return slugs.length ? slugs : lista(block?.product_ids);
}

/** Fechas opcionales del bloque. Base44 ya filtra las vencidas; esto es
    sólo por si una página quedó abierta cuando la campaña terminó. */
export function blockActive(block, now = new Date()) {
  const fecha = (...keys) => {
    for (const k of keys) {
      const raw = block?.[k];
      if (!raw) continue;
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return null;
  };
  const desde = fecha('fecha_inicio', 'inicio', 'fecha_desde');
  const hasta = fecha('fecha_fin', 'fin', 'fecha_hasta');
  if (desde && now < desde) return false;
  // Una fecha sin hora ("2026-10-31") vale hasta el final de ese día.
  if (hasta) {
    const fin = /^\d{4}-\d{2}-\d{2}$/.test(String(block.fecha_fin || block.fin || block.fecha_hasta))
      ? new Date(hasta.getTime() + 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000) // fin del día en Argentina
      : hasta;
    if (now > fin) return false;
  }
  return block?.activo !== false;
}

/** Bloques del payload de `configuracion_pagina` (acepta las dos formas). */
export const payloadBlocks = (payload) =>
  Array.isArray(payload?.bloques) ? payload.bloques : Array.isArray(payload?.blocks) ? payload.blocks : [];

export function findBlock(payload, key, now = new Date()) {
  return payloadBlocks(payload).find((b) => b?.clave === key && blockActive(b, now)) || null;
}

/** IDs/slugs → productos visibles, en el orden de Gestión, sin repetidos. */
export function resolveCollection(block, products) {
  const bySlug = new Map();
  const bySource = new Map();
  for (const p of products || []) {
    bySlug.set(p.slug, p);
    if (p.sourceId) bySource.set(String(p.sourceId), p);
  }
  const out = [];
  const vistos = new Set();
  for (const id of collectionIds(block)) {
    const p = bySlug.get(id) || bySource.get(id);
    if (p && p.visible !== false && !vistos.has(p.slug)) {
      vistos.add(p.slug);
      out.push(p);
    }
  }
  return out;
}
