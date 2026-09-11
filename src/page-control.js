/**
 * Control remoto de la página pública desde Base44 (integración pedida por
 * el equipo de marketing — ver docs/base44-integracion/).
 *
 * Qué hace: cada tanto le pide a Base44 una "configuración de página"
 * (acción pública de sólo lectura `configuracion_pagina`, sobre la misma
 * función `catalogo-metricas` que ya usa analytics.js) y, si viene algo,
 * lo aplica encima de la página: barra de aviso, bloques/promos en slots,
 * texto del hero, número de WhatsApp, secciones visibles, orden, productos
 * destacados, modo mantenimiento.
 *
 * Reglas que respeta:
 *  - Es una CAPA de control, no un punto único de falla. Si Base44 no
 *    responde, o responde vacío, o el SDK no cargó: la página queda
 *    exactamente como la sirvió Netlify. Cero cambios visuales.
 *  - Nunca ejecuta HTML ni JS que venga de Base44. Los textos entran por
 *    textContent, las URLs se validan (sólo https:// o rutas internas).
 *  - No trae ninguna credencial. Sólo consume la acción pública de lectura.
 *  - Los estilos de lo que inyecta viven en page-control.css con los
 *    tokens de la marca (no colores sueltos), y respetan tema claro/oscuro
 *    y prefers-reduced-motion como el resto del sitio.
 *
 * Kill switch: `window.ARIAS_PAGE_CONTROL = { enabled: false }` en el HTML
 * (o borrar el <script> en templates.js) desactiva todo sin tocar nada más.
 */

import { getBase44 } from './base44-client.js';

const DEFAULT_REFRESH_MS = 60_000;
const MIN_REFRESH_MS = 30_000;
const MAX_BACKOFF_MS = 15 * 60_000;
const GIVE_UP_AFTER = 5; // fallos seguidos -> se corta el polling hasta recargar

let currentConfig = null;
let refreshTimer = null;
let consecutiveFails = 0;

const opts = () => ({
  enabled: window.ARIAS_PAGE_CONTROL?.enabled !== false,
  refreshMs: Math.max(MIN_REFRESH_MS, Number(window.ARIAS_PAGE_CONTROL?.refreshMs) || DEFAULT_REFRESH_MS),
});

/* ---------- helpers ---------- */

/** Sólo deja pasar rutas internas ("/algo") o URLs https absolutas.
    Todo lo demás (javascript:, data:, http sin S, basura) -> "". */
const safeUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('/')) return raw;
  try {
    const url = new URL(raw, location.origin);
    if (url.protocol === 'https:') return url.href;
  } catch {}
  return '';
};

const waDigits = (value) => String(value || '').replace(/\D+/g, '');

const isMobile = () => matchMedia('(max-width: 767px)').matches;

const deviceAllows = (block) => {
  const target = String(block?.dispositivo || 'Todos');
  if (target === 'Móvil') return isMobile();
  if (target === 'Escritorio') return !isMobile();
  return true;
};

/* ---------- pedir la configuración ---------- */

async function requestConfig() {
  const client = await getBase44();
  if (!client) return null;

  const res = await client.functions.invoke('catalogo-metricas', {
    action: 'configuracion_pagina',
  });

  // El SDK puede devolver el cuerpo directo o envuelto en { data }.
  const payload = res?.data ?? res;
  if (!payload?.success || !payload?.config) return null;
  return payload;
}

/* ---------- modo mantenimiento ---------- */

function applySiteState(config) {
  const active = config.sitio_activo !== false;
  let overlay = document.querySelector('[data-arias-maintenance]');

  if (active) {
    overlay?.remove();
    return;
  }
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.dataset.ariasMaintenance = 'true';
    overlay.className = 'arias-pc-maint';
    const box = document.createElement('div');
    box.className = 'arias-pc-maint__box';
    const h = document.createElement('h1');
    h.textContent = 'Librería Arias';
    const p = document.createElement('p');
    p.dataset.ariasMaintenanceText = 'true';
    box.append(h, p);
    overlay.append(box);
    document.body.append(overlay);
  }
  overlay.querySelector('[data-arias-maintenance-text]').textContent =
    String(config.mensaje_mantenimiento || 'Estamos actualizando el catálogo. Volvé en unos minutos.');
}

/* ---------- barra de aviso ---------- */

function applyAnnouncement(bar) {
  let el = document.querySelector('[data-arias-announcement]');

  if (!bar?.activa || !bar?.texto) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('div');
    el.dataset.ariasAnnouncement = 'true';
    el.className = 'arias-pc-bar';
    document.body.insertBefore(el, document.body.firstChild);
  }
  el.replaceChildren();

  const href = safeUrl(bar.link);
  if (href) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = bar.texto;
    el.append(a);
  } else {
    el.textContent = bar.texto;
  }
}

/* ---------- hero ---------- */

function applyHero(hero) {
  const section = document.querySelector('[data-arias-section="hero"]');
  if (!section) return;

  const title = section.querySelector('[data-arias-hero-title]');
  const subtitle = section.querySelector('[data-arias-hero-subtitle]');
  const cta = section.querySelector('[data-arias-hero-cta]');

  if (title) {
    const t = String(hero?.titulo || '').trim();
    title.textContent = t;
    title.hidden = !t || hero?.activo === false;
  }
  if (subtitle) {
    const s = String(hero?.subtitulo || '').trim();
    subtitle.textContent = s;
    subtitle.hidden = !s || hero?.activo === false;
  }
  if (cta) {
    const href = safeUrl(hero?.cta_url);
    const text = String(hero?.cta_texto || '').trim();
    if (href && text && hero?.activo !== false) {
      cta.href = href;
      cta.textContent = text;
      cta.hidden = false;
    } else {
      cta.hidden = true;
    }
  }
}

/* ---------- WhatsApp público ---------- */

function applyWhatsapp(whatsapp) {
  const digits = waDigits(whatsapp);
  if (!digits) return;

  // Para el link del pedido (que arma app.js al vuelo con el texto del
  // carrito) — app.js lo lee de acá si existe.
  window.__ARIAS_WA = digits;

  document.querySelectorAll('[data-arias-whatsapp]').forEach((el) => {
    const msg = String(el.dataset.ariasWhatsappMessage || '').trim();
    const suffix = msg ? `?text=${encodeURIComponent(msg)}` : '';
    el.setAttribute('href', `https://wa.me/${digits}${suffix}`);
  });
}

/* ---------- secciones: visibilidad y orden ---------- */

function applySections(visibleNames, orderNames) {
  const sections = [...document.querySelectorAll('[data-arias-section]')];
  if (!sections.length) return;

  const list = (Array.isArray(visibleNames) ? visibleNames : []).filter(Boolean);
  if (list.length) {
    const visible = new Set(list);
    sections.forEach((s) => {
      s.hidden = !visible.has(s.dataset.ariasSection);
    });
  } else {
    // Lista vacía o ausente = Base44 no está controlando la visibilidad:
    // se revierte cualquier ocultamiento previo (nunca "ocultar todo").
    sections.forEach((s) => {
      s.hidden = false;
    });
  }

  if (!Array.isArray(orderNames) || !orderNames.length) return;

  // Reordenar sólo si todas las secciones controlables cuelgan del mismo
  // contenedor — en esta página no es el caso (el hero es <header>, otras
  // son <section> sueltas), así que en la práctica el orden queda como
  // está y sólo funciona mostrar/ocultar. Se deja el guard por si la
  // estructura cambia en el futuro.
  const parents = new Set(sections.map((s) => s.parentElement));
  if (parents.size !== 1) return;

  const parent = [...parents][0];
  const byName = new Map(sections.map((s) => [s.dataset.ariasSection, s]));
  orderNames.forEach((name) => {
    const s = byName.get(name);
    if (s) parent.append(s);
  });
}

/* ---------- bloques dinámicos en slots ---------- */

function createBlockNode(block) {
  const article = document.createElement('article');
  article.dataset.ariasDynamicBlock = block.clave || block.id || 'bloque';
  article.className = 'arias-pc-block';

  const img = safeUrl(block.imagen_url);
  if (img) {
    const image = document.createElement('img');
    image.src = img;
    image.alt = block.titulo || '';
    image.loading = 'lazy';
    image.className = 'arias-pc-block__img';
    article.append(image);
  }

  if (block.titulo) {
    const h = document.createElement('h3');
    h.className = 'arias-pc-block__title';
    h.textContent = block.titulo;
    article.append(h);
  }
  if (block.texto) {
    const p = document.createElement('p');
    p.className = 'arias-pc-block__text';
    p.textContent = block.texto;
    article.append(p);
  }

  const href = safeUrl(block.cta_url);
  if (block.cta_texto && href) {
    const a = document.createElement('a');
    a.className = 'arias-pc-block__cta btn btn--gold btn--sm';
    a.href = href;
    a.textContent = block.cta_texto;
    article.append(a);
  }
  return article;
}

function applyBlocks(blocks) {
  document.querySelectorAll('[data-arias-dynamic-block]').forEach((n) => n.remove());

  (Array.isArray(blocks) ? blocks : []).filter(deviceAllows).forEach((block) => {
    const slotName = String(block.ubicacion || '');
    if (!slotName) return;
    const slot = document.querySelector(`[data-arias-slot="${CSS.escape(slotName)}"]`);
    if (slot) slot.append(createBlockNode(block));
  });
}

/* ---------- productos destacados ---------- */

function dispatchFeatured(ids) {
  const productIds = Array.isArray(ids) ? ids.filter(Boolean).map(String) : [];
  window.dispatchEvent(new CustomEvent('arias:featured-products', { detail: { productIds } }));
}

/* ---------- decoración de stock (API pública, la llama quien renderiza) ---------- */

function decorateProductCard(cardElement, product) {
  if (!cardElement || !product || !currentConfig?.stock) return;

  cardElement.querySelector('[data-arias-stock-badge]')?.remove();

  const rules = currentConfig.stock;
  const stock = Number(product.stock);
  if (!Number.isFinite(stock)) return;

  if (stock <= 0 && rules.mostrar_sin_stock === false) {
    cardElement.hidden = true;
    return;
  }
  cardElement.hidden = false;

  if (rules.etiqueta_activa === true && stock > 0 && stock <= Number(rules.umbral_bajo || 1)) {
    const badge = document.createElement('span');
    badge.dataset.ariasStockBadge = 'true';
    badge.className = 'arias-pc-stock';
    badge.textContent = String(rules.texto_bajo || 'Última unidad');
    cardElement.append(badge);
  }
}

/* ---------- aplicar todo ---------- */

function apply(payload) {
  currentConfig = payload.config;

  applySiteState(payload.config);
  applyAnnouncement(payload.config.barra_aviso);
  applyHero(payload.config.hero);
  applyWhatsapp(payload.config.whatsapp);
  applySections(payload.config.secciones_visibles, payload.config.orden_secciones);
  applyBlocks(payload.bloques);
  dispatchFeatured(payload.config.productos_destacados);

  window.dispatchEvent(new CustomEvent('arias:page-config-updated', { detail: payload }));
}

async function refresh() {
  try {
    const payload = await requestConfig();
    consecutiveFails = 0;
    if (payload) apply(payload);
    return payload;
  } catch (err) {
    consecutiveFails += 1;
    if (consecutiveFails === 1) {
      // Un solo aviso — no ensuciar la consola cada 60 s. Lo más común
      // en este estado: Base44 todavía no tiene la acción configurada.
      console.warn('[AriasPageControl] no se pudo leer la configuración remota (se sigue con el contenido local):', err);
    }
    return null; // fallo seguro: la página sigue con su contenido local
  }
}

function scheduleNext() {
  clearTimeout(refreshTimer);
  if (consecutiveFails >= GIVE_UP_AFTER) return; // se retoma al recargar la página

  // Backoff ante fallos seguidos: 60s -> 2m -> 4m ... hasta 15m.
  const base = opts().refreshMs;
  const delay = Math.min(MAX_BACKOFF_MS, base * 2 ** consecutiveFails);

  refreshTimer = setTimeout(async () => {
    if (!document.hidden) await refresh();
    scheduleNext();
  }, delay);
}

async function start() {
  if (!opts().enabled) return;
  await refresh();
  scheduleNext();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && consecutiveFails < GIVE_UP_AFTER) refresh();
  });
}

window.AriasPageControl = {
  start,
  refresh,
  decorateProductCard,
  getConfig: () => currentConfig,
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
