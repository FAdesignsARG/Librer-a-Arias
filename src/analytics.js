/**
 * Analítica anónima + embudo de pedidos para Librería Arias.
 *
 * Registra interacción comercial sin nombre, teléfono, email, IP ni
 * ubicación precisa. Los errores se silencian para que el catálogo y
 * WhatsApp nunca dejen de funcionar.
 *
 * v29 (2/9/2026): correcciones que pidió Rodri sobre la v28 ya publicada:
 * - `consulta` va como campo de primer nivel del evento (antes vivía sólo
 *   adentro de `datos` y les llegaba vacío porque leían el nivel de arriba).
 * - La cantidad de resultados de una búsqueda es `datos.results_count`
 *   (antes `datos.resultados`).
 * - "Impresión de tarjeta" (una tarjeta que aparece en pantalla, en la
 *   grilla o en "relacionados") queda separada de "Vista de producto"
 *   (abrir la ficha del producto en sí) — antes ambas mandaban el mismo
 *   tipo y se mezclaban impresiones con vistas reales.
 * - Al agregar un producto, `datos.cart_count`/`datos.cart_total` (antes
 *   `cantidad`/`total`).
 * - "Pedido Iniciado" y "Pedido Enviado a WhatsApp" dejan de ser eventos
 *   sueltos (`action:'evento'`) y pasan a ser el MISMO registro de pedido
 *   (`action:'pedido'`) con `estado` que cambia de 'Iniciado' a 'Enviado a
 *   WhatsApp' — mismo código en los dos, para que se pueda copiar tal
 *   cual a Sale.codigo_catalogo y cruzar la conversión real. El código
 *   ahora vive mientras dura el pedido (no por combinación exacta de
 *   productos/cantidades como antes) — así agregar un segundo producto
 *   después de "Iniciado" no genera un código distinto al de "Enviado".
 * - Se vuelve a registrar el click en el botón general "Consultar por
 *   WhatsApp" (sin carrito de por medio) — la v28 lo había sacado por
 *   completo; ahora se registra todo `wa.me` que NO sea el de enviar el
 *   pedido armado (ese ya se cuenta aparte, como pedido).
 * - `datos.es_prueba` marca tráfico que no es del dominio real de
 *   producción (deploys de preview, localhost) o que llega con `?test=1`
 *   — para que Rodri pueda filtrarlo en vez de mezclarlo con ventas
 *   reales. Filtro básico anti-bot: si `navigator.webdriver` está
 *   prendido o el user-agent es de un crawler conocido, no se manda nada.
 *
 * Lo de CampanaMarketing (campos de UTM acumulados por campaña) es un
 * cambio de esquema del lado de Base44 — no se toca desde acá, ya se le
 * mandan los utm_source/utm_medium/utm_campaign en cada evento y pedido.
 */

import { getBase44 } from './base44-client.js';

const MAX_EVENTS_PER_SESSION = 120;
const CART_KEY = 'arias.pedido.v1';
const SESSION_KEY = 'arias_catalog_session_v1';
const ORDER_KEY = 'arias.catalog.order.v1';
const CART_STARTED_KEY = 'arias.catalog.cart_started.v1';

let eventCount = 0;
let base44 = null;
let productsBySlug = new Map();

/** UUID con fallback para navegadores/contextos sin crypto.randomUUID. */
function uuid() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

/** Visitante anónimo persistente — sobrevive entre visitas, a propósito. */
function sessionId() {
  try {
    let value = localStorage.getItem(SESSION_KEY);
    if (!value) {
      value = uuid();
      localStorage.setItem(SESSION_KEY, value);
    }
    return value;
  } catch {
    // Modo privado / cuota llena: se genera uno nuevo por carga de
    // página en vez de romper el resto de la analítica.
    return uuid();
  }
}

/** Elimina emails y teléfonos antes de enviar texto libre. */
function safeText(value, max = 120) {
  return String(value || '')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/\d{6,}/g, '[numero]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function deviceType() {
  const ua = navigator.userAgent || '';
  if (/tablet|ipad/i.test(ua)) return 'Tablet';
  if (/mobile|android|iphone/i.test(ua)) return 'Móvil';
  return 'Computadora';
}

/* ---------- Atribución de campañas ----------
   ESTO ESTABA ROTO y por eso se hizo. campaignData() leía las UTM de la URL
   de la página actual, nada más: el visitante entraba por un anuncio, la
   "Visita" viajaba con la campaña bien, y desde la SEGUNDA página en adelante
   todos los eventos —incluido el pedido— iban con las UTM vacías y origen
   "Catálogo web". O sea, el pedido que salía de un anuncio figuraba como
   tráfico directo. Medido el 22/09 y confirmado con Rodri.

   Contrato acordado con Base44 (23/09):
   - FIRST TOUCH: manda la campaña con la que entró, y se mantiene toda la
     navegación aunque las páginas siguientes no lleven parámetros.
   - Una entrada nueva CON otra UTM pisa a la anterior: es otra visita.
   - La ventana de sesión son 30 minutos sin actividad, que es el corte
     estándar en analítica. Cada evento la renueva.
   - Cinco campos de punta a punta: source, medium, campaign, content, term.

   Si el navegador no deja guardar (modo privado, cuota llena), se cae al
   comportamiento viejo: se usa lo que haya en la URL y listo. Perder la
   atribución nunca puede romper la medición ni la navegación. */
const CAMPAIGN_KEY = 'arias.catalog.campaign.v1';
const CAMPAIGN_TTL_MS = 30 * 60 * 1000;
const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

function utmFromUrl() {
  const params = new URLSearchParams(location.search);
  const out = {};
  for (const k of UTM_FIELDS) {
    const v = safeText(params.get(k), k === 'utm_campaign' ? 100 : 80);
    if (v) out[k] = v;
  }
  return out;
}

function campaignData() {
  const fromUrl = utmFromUrl();
  const ahora = Date.now();

  try {
    // Entró con campaña: es una visita nueva y pisa lo guardado.
    if (Object.keys(fromUrl).length) {
      localStorage.setItem(CAMPAIGN_KEY, JSON.stringify({ utm: fromUrl, at: ahora }));
      return { ...fromUrl };
    }

    const raw = localStorage.getItem(CAMPAIGN_KEY);
    if (!raw) return {};
    const guardado = JSON.parse(raw);
    if (!guardado?.utm || ahora - Number(guardado.at || 0) > CAMPAIGN_TTL_MS) {
      localStorage.removeItem(CAMPAIGN_KEY);
      return {};
    }
    // Sigue viva: se renueva la ventana y se devuelve la campaña de entrada.
    localStorage.setItem(CAMPAIGN_KEY, JSON.stringify({ utm: guardado.utm, at: ahora }));
    return { ...guardado.utm };
  } catch {
    return { ...fromUrl };
  }
}

function campaignOrigin() {
  const source = (campaignData().utm_source || '').toLowerCase();
  if (source.includes('instagram')) return 'Instagram';
  if (source.includes('facebook') || source.includes('meta')) return 'Facebook';
  if (source.includes('tiktok')) return 'TikTok';
  if (source.includes('whatsapp')) return 'WhatsApp';
  if (source.includes('google')) return 'Google';
  return 'Catálogo web';
}

/** Dominio real de producción: cualquier otro host (deploy de preview,
    localhost) o `?test=1` explícito se marca como tráfico de prueba, para
    que se pueda filtrar en vez de mezclarlo con datos reales. */
function isTestTraffic() {
  try {
    if (new URLSearchParams(location.search).get('test') === '1') return true;
  } catch {
    /* se ignora, sigue con el chequeo de dominio */
  }
  const host = location.hostname || '';
  return !(host === 'libreria-arias.netlify.app' || /(^|\.)libreriaarias\.com\.ar$/i.test(host));
}

/** Filtro básico: navegadores automatizados (Selenium/Puppeteer/Playwright
    prenden navigator.webdriver) y crawlers conocidos no generan tráfico
    real — no vale la pena ni cargar el SDK para ellos. */
function looksLikeBot() {
  if (navigator.webdriver) return true;
  return /bot|crawl|spider|slurp|headless|phantom|selenium|puppeteer|playwright/i.test(navigator.userAgent || '');
}

/** Undefined en vez de valores vacíos: menos ruido en el payload. */
const clean = (obj) => {
  const out = {};
  for (const k in obj) if (obj[k] !== undefined && obj[k] !== '' && obj[k] !== 0) out[k] = obj[k];
  return out;
};

function trackCatalogEvent(tipo, details = {}) {
  if (!base44 || eventCount >= MAX_EVENTS_PER_SESSION) return;
  eventCount += 1;

  const campaign = campaignData();
  base44.functions
    .invoke('catalogo-metricas', {
      action: 'evento',
      tipo,
      sesion: sessionId(),
      clave_evento: uuid(),
      pagina: safeText(location.pathname || '/', 120),
      consulta: safeText(details.consulta, 120) || undefined,
      product_id: details.product_id || undefined,
      product_name: safeText(details.product_name, 160) || undefined,
      categoria: safeText(details.categoria, 80) || undefined,
      dispositivo: deviceType(),
      origen: campaignOrigin(),
      datos: {
        ...clean({
          results_count: Number(details.resultados || 0),
          precio: safeText(details.precio, 40),
          cart_count: Number(details.cantidad || 0),
          cart_total: Number(details.total || 0),
          canal: safeText(details.canal, 20),
          // Buscador predictivo (contrato acordado con Base44 el 23/09).
          posicion: Number(details.posicion || 0),
          match_por: safeText(details.match_por, 20),
          ...campaign,
        }),
        // Estos dos van FUERA de clean() a propósito: clean descarta 0 y '',
        // y acá el cero y el false son justamente los datos que interesan —
        // "se buscó y no apareció ninguna sugerencia" y "se mostraron pero no
        // eligió ninguna" son las dos señales que Base44 quiere para mejorar
        // los alias. Si se colaran dentro de clean se perderían en silencio.
        ...(Number.isFinite(details.sugerencias_mostradas)
          ? { sugerencias_mostradas: Number(details.sugerencias_mostradas) }
          : {}),
        ...(typeof details.hubo_seleccion === 'boolean'
          ? { hubo_seleccion: details.hubo_seleccion }
          : {}),
        tracking_version: '2',
        es_prueba: isTestTraffic(),
      },
    })
    .catch(() => {
      /* La medición nunca debe interrumpir la navegación del catálogo. */
    });
}

function cardInfo(card) {
  return {
    product_id: card?.querySelector('[data-add]')?.dataset.add,
    product_name: card?.querySelector('.card__name')?.textContent,
    categoria: card?.querySelector('.card__cat')?.textContent,
    precio: card?.querySelector('.card__price')?.textContent,
  };
}

function productInfoForButton(button) {
  const slug = button?.dataset.add;
  const product = productsBySlug.get(slug);
  if (product) {
    return {
      product_id: slug,
      product_name: product.name,
      categoria: product.category,
      precio: product.price,
    };
  }
  const card = button?.closest('.card');
  if (card) return cardInfo(card);
  return {
    product_id: slug,
    product_name: document.querySelector('.product__info h1')?.textContent,
    categoria: document.querySelector('.product__cat')?.textContent,
    precio: document.querySelector('.product__price')?.textContent,
  };
}

function readCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(raw)
      ? raw.filter((entry) => Array.isArray(entry) && entry.length === 2 && Number(entry[1]) > 0)
      : [];
  } catch {
    return [];
  }
}

function cartSnapshot() {
  const items = readCart().map(([slug, qty]) => {
    const p = productsBySlug.get(slug);
    const quantity = Number(qty || 0);
    const price = Number(p?.price || 0);
    return {
      slug: safeText(slug, 100),
      name: safeText(p?.name || slug, 160),
      quantity,
      price,
      subtotal: price * quantity,
    };
  });
  return {
    items,
    quantity: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.subtotal, 0),
  };
}

/** LAWEB-XXXXXXXX: se copia a mano en "Código del pedido web" del Punto
    de Venta — el formato tiene que ser exactamente este. */
function createOrderCode() {
  const hex = uuid().replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  return `LAWEB-${hex.slice(0, 8).padEnd(8, '0')}`;
}

/* Estado del pedido (código, "ya se inició", "ya se envió"): vive en
   localStorage, IGUAL que el carrito (CART_KEY). Antes estaba en
   sessionStorage, que es por pestaña: agregar en una pestaña y enviar desde
   otra (una ficha abierta aparte, volver más tarde) encontraba el carrito
   pero no el código, y "Enviado a WhatsApp" salía con un LAWEB-* distinto al
   de "Iniciado" (reportado por Rodri el 21/09). Se lee también
   sessionStorage para no perder el código de un pedido ya en curso. */
const orderStore = {
  get(key) {
    try {
      return localStorage.getItem(key) ?? sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* el pedido sigue funcionando sin storage */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      /* nada que limpiar */
    }
  },
};

/** El código vive mientras dura EL PEDIDO (desde "Iniciado" hasta que se
    vacía o se envía), no atado a qué productos/cantidades tiene en un
    momento dado — así agregar un segundo producto después de arrancar
    el pedido no genera un código distinto al que ya se mandó como
    "Iniciado". Se limpia junto con CART_STARTED_KEY cuando el carrito
    queda vacío (ver wireCartEvents). */
function currentOrderCode() {
  try {
    const saved = JSON.parse(orderStore.get(ORDER_KEY) || '{}');
    if (saved.code) return saved.code;
  } catch {
    /* se genera uno nuevo */
  }
  return null;
}
function ensureOrderCode() {
  const existing = currentOrderCode();
  if (existing) return existing;
  const code = createOrderCode();
  orderStore.set(ORDER_KEY, JSON.stringify({ code }));
  return code;
}

function addCodeToWhatsAppLink(link, code) {
  try {
    const url = new URL(link.href);
    const current = url.searchParams.get('text') || '';
    if (!current.includes(code)) {
      url.searchParams.set('text', `${current}\n\nCódigo de pedido: ${code}`);
      link.href = url.toString();
    }
  } catch {
    /* WhatsApp conserva el enlace original. */
  }
}

/** Registro del pedido en sí — un solo tipo de llamada, action:'pedido',
    que se repite con distinto `estado` a medida que el pedido avanza
    (Iniciado -> Enviado a WhatsApp), siempre con el mismo código. */
function sendPedidoState(estado, code, snapshot) {
  if (!base44) return;
  const campaign = campaignData();
  base44.functions
    .invoke('catalogo-metricas', {
      action: 'pedido',
      codigo: code,
      estado,
      sesion: sessionId(),
      pagina: safeText(location.pathname || '/', 120),
      dispositivo: deviceType(),
      origen: campaignOrigin(),
      items: snapshot.items,
      total_estimado: snapshot.total,
      datos: { ...clean(campaign), tracking_version: '2', es_prueba: isTestTraffic() },
    })
    .catch(() => {
      /* La medición nunca debe interrumpir la navegación del catálogo. */
    });
}

function wireHomeEvents() {
  const searchEl = document.getElementById('search');
  const chipsEl = document.getElementById('chips');
  const gridEl = document.getElementById('grid');
  let searchTimer = null;

  /* ---------- Buscador predictivo ----------
     app.js avisa por un evento de ventana qué sugerencias mostró y cuál se
     eligió; acá se mide. Están separados a propósito: el buscador no sabe de
     analítica y la analítica no sabe de interfaz.

     A propósito NO se manda un evento por tecla. Hay un tope de 120 eventos
     por sesión y gastarlo en el tipeo dejaría afuera lo que de verdad
     importa (el pedido). Acordado con Rodri el 23/09. */
  let sugMostradas = 0;
  let sugElegida = false;

  window.addEventListener('arias:suggest', (e) => {
    // Tanda nueva de sugerencias: se reinicia el "hubo selección".
    sugMostradas = Number(e.detail?.mostradas || 0);
    sugElegida = false;
  });

  window.addEventListener('arias:suggest-pick', (e) => {
    const d = e.detail || {};
    sugElegida = true;
    trackCatalogEvent('Sugerencia elegida', {
      consulta: d.consulta,
      product_name: d.nombre,
      categoria: d.categoria,
      posicion: d.posicion,
      match_por: d.motivo,
      sugerencias_mostradas: d.mostradas,
    });
  });

  // 400ms de espera desde la última tecla — mide la búsqueda, no cada letra
  // (pedido de Rodri 15/9: antes 1.2s, colapsaba tipeos incrementales pero
  // tardaba de más en registrar la búsqueda real).
  searchEl?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const query = safeText(searchEl.value, 120);
      if (query.length < 3) return; // pedido de Rodri: no medir 1-2 letras sueltas
      const results = gridEl?.querySelectorAll('.card').length || 0;
      trackCatalogEvent(results ? 'Búsqueda' : 'Búsqueda sin resultados', {
        consulta: query,
        categoria: chipsEl?.querySelector('.chip[aria-pressed="true"]')?.dataset.cat || '',
        resultados: results,
        sugerencias_mostradas: sugMostradas,
        hubo_seleccion: sugElegida,
      });
    }, 400);
  });

  chipsEl?.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    requestAnimationFrame(() => {
      trackCatalogEvent('Búsqueda', {
        consulta: `Categoría: ${safeText(chip.dataset.cat, 70)}`,
        categoria: chip.dataset.cat,
        resultados: gridEl?.querySelectorAll('.card').length || 0,
      });
    });
  });
}

function wireCartEvents() {
  document.addEventListener('click', (event) => {
    // Sincroniza "carrito iniciado"/código de pedido con el estado real
    // en cualquier click — así se limpian solos cuando el pedido se
    // vacía, sin tener que engancharse a cada botón de quitar/vaciar.
    if (readCart().length === 0) {
      const done = currentOrderCode();
      if (done) orderStore.remove(`arias.catalog.order.sent.${done}`);
      orderStore.remove(CART_STARTED_KEY);
      orderStore.remove(ORDER_KEY);
    }

    const addButton = event.target.closest('[data-add]');
    if (addButton) {
      setTimeout(() => {
        const snapshot = cartSnapshot();
        trackCatalogEvent('Agregado a pedido', {
          ...productInfoForButton(addButton),
          cantidad: snapshot.quantity,
          total: snapshot.total,
        });

        // Sumar algo DESPUÉS de haber enviado (el cliente eligió "seguir
        // comprando" sin vaciar) es un pedido nuevo: código nuevo, para que
        // no pise en Base44 al que ya figura como "Enviado a WhatsApp".
        const sentCode = currentOrderCode();
        if (sentCode && orderStore.get(`arias.catalog.order.sent.${sentCode}`)) {
          orderStore.remove(`arias.catalog.order.sent.${sentCode}`);
          orderStore.remove(ORDER_KEY);
          orderStore.remove(CART_STARTED_KEY);
        }

        // Primer producto desde carrito vacío: arranca el pedido.
        if (!orderStore.get(CART_STARTED_KEY)) {
          orderStore.set(CART_STARTED_KEY, '1');
          sendPedidoState('Iniciado', ensureOrderCode(), snapshot);
        }
      }, 0);
      return;
    }

    const send = event.target.closest('#sheetSend');
    if (send) {
      const snapshot = cartSnapshot();
      if (!snapshot.items.length) return;
      const code = ensureOrderCode();
      addCodeToWhatsAppLink(send, code);
      const sentKey = `arias.catalog.order.sent.${code}`;
      if (!orderStore.get(sentKey)) {
        orderStore.set(sentKey, '1');
        sendPedidoState('Enviado a WhatsApp', code, snapshot);
      }
      return;
    }

    // Cualquier otro link a WhatsApp (el botón general "Consultar por
    // WhatsApp", el dock flotante, etc.) — no depende de tener carrito.
    const link = event.target.closest('a[href*="wa.me"], a[href*="whatsapp.com"]');
    if (!link) return;
    // Compartir un producto por WhatsApp no es una consulta al local: no se cuenta acá.
    if (link.closest('#shareSheet')) return;
    const card = link.closest('.card');
    trackCatalogEvent('Consulta por WhatsApp', card ? cardInfo(card) : {});
  });
}

/** Tarjetas que quedan ≥70% visibles en pantalla — grilla de la portada y
    la de "también te puede interesar" en la ficha de producto. Esto es
    una IMPRESIÓN (la tarjeta apareció), no una vista real del producto
    — ver trackProductPageView() para lo segundo. */
function wireCardViews() {
  const seen = new Set();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.7) return;
        const card = entry.target;
        const info = cardInfo(card);
        if (!info.product_name || seen.has(info.product_name)) return;
        seen.add(info.product_name);
        observer.unobserve(card);
        trackCatalogEvent('Impresión de tarjeta', info);
      });
    },
    { threshold: [0.7] }
  );

  const observeNewCards = (root) => {
    root.querySelectorAll('.card:not([data-analytics-observed])').forEach((card) => {
      card.dataset.analyticsObserved = 'true';
      observer.observe(card);
    });
  };

  [document.getElementById('grid'), document.querySelector('.related .grid')]
    .filter(Boolean)
    .forEach((gridEl) => {
      observeNewCards(gridEl);
      new MutationObserver(() => observeNewCards(gridEl)).observe(gridEl, { childList: true });
    });
}

/** La ficha de producto (/p/slug/) no es una .card de grilla — se registra
    aparte, una sola vez al abrir la página (no por reaparecer en
    pantalla), una vez confirmado que el HTML ya tiene los datos. */
function trackProductPageView() {
  if (!document.body.classList.contains('page-product')) return;
  const name = document.querySelector('.product__info h1')?.textContent;
  if (!name) return;
  trackCatalogEvent('Vista de producto', {
    product_id: document.querySelector('.product__info [data-add]')?.dataset.add,
    product_name: name,
    categoria: document.querySelector('.product__cat')?.textContent,
    precio: document.querySelector('.product__price')?.textContent,
  });
}

/** "Producto compartido" (acordado con Rodri el 19/09/2026). share.js avisa con
    `arias:share` cada vez que se elige un canal de la hoja de compartir; acá se
    traduce al evento de Base44. Canales: whatsapp, sistema, facebook, mail,
    enlace, mail-diseno, imagen (los mismos `data-share-via` de la hoja). */
const SHARE_CHANNELS = new Set(['whatsapp', 'sistema', 'facebook', 'mail', 'enlace', 'mail-diseno', 'imagen']);
function wireShareEvents() {
  window.addEventListener('arias:share', (event) => {
    const { slug, via } = event.detail || {};
    if (!slug || !SHARE_CHANNELS.has(via)) return;
    const product = productsBySlug.get(slug);
    trackCatalogEvent('Producto compartido', {
      product_id: slug,
      product_name: product?.name || document.querySelector('.product__info h1')?.textContent,
      categoria: product?.category,
      precio: product?.price,
      canal: via,
    });
  });
}

async function loadProducts() {
  try {
    const products = await fetch('/data/products.json').then((response) => response.json());
    productsBySlug = new Map(products.map((product) => [product.slug, product]));
  } catch {
    productsBySlug = new Map();
  }
}

async function init() {
  if (looksLikeBot()) return;

  const [client] = await Promise.all([getBase44(), loadProducts()]);
  if (!client) return; // sin SDK no se manda nada — nunca rompe la navegación del catálogo
  base44 = client;

  trackCatalogEvent('Visita');
  trackProductPageView();
  wireShareEvents();
  wireHomeEvents();
  wireCartEvents();
  wireCardViews();
}

init();
