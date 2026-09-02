/**
 * Analítica anónima + embudo de pedidos para Librería Arias.
 *
 * Registra interacción comercial sin nombre, teléfono, email, IP ni
 * ubicación precisa. Los errores se silencian para que el catálogo y
 * WhatsApp nunca dejen de funcionar.
 *
 * v28 (20/8/2026): instrucciones de Rodri — reemplaza la escritura directa
 * a "entidades" de Base44 (client.entities.EventoCatalogo/PedidoCatalogo,
 * como venía desde la v27) por una función propia de su lado
 * (catalogo-metricas) que valida y guarda los eventos. Cambios de fondo:
 *
 * - La sesión ahora es persistente en localStorage (antes sessionStorage):
 *   el mismo ID de visitante sobrevive entre visitas, no sólo dentro de
 *   una pestaña — a propósito, para poder ver visitantes que vuelven.
 * - Cada evento lleva una clave_evento (UUID) nueva para que el backend
 *   pueda deduplicar de verdad, no como antes que dependía de que el
 *   cliente nunca repitiera el envío.
 * - El código de pedido cambia de formato: LAWEB-XXXXXXXX (antes
 *   LA-AAAAMMDD-XXXXX) — es el que se copia a mano en "Código del pedido
 *   web" del Punto de Venta, tiene que ser exactamente ese patrón.
 * - La lista de eventos a mandar es ahora la que dio Rodri tal cual — se
 *   sacó "Click en WhatsApp" (evento genérico que no está en su lista;
 *   el funnel de pedido ya cubre el click real que le importa) y
 *   "Pedido Iniciado" pasó a significar "se armó el primer carrito"
 *   (primer producto agregado desde 0), no "se abrió el carrito".
 *
 * `npm install @base44/sdk` no aplica tal cual: este proyecto no tiene
 * bundler, sirve los .js como módulos ES directo, sin build de por medio.
 * Se mantiene el mismo import dinámico desde CDN que ya usaba este
 * archivo — misma librería, forma de cargarla adaptada al proyecto.
 */

const ARIAS_APP_ID = '6a7e432be6e59ad993e40158';
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

function campaignData() {
  const params = new URLSearchParams(location.search);
  return {
    utm_source: safeText(params.get('utm_source'), 80),
    utm_medium: safeText(params.get('utm_medium'), 80),
    utm_campaign: safeText(params.get('utm_campaign'), 100),
  };
}

function campaignOrigin() {
  const source = campaignData().utm_source.toLowerCase();
  if (source.includes('instagram')) return 'Instagram';
  if (source.includes('facebook') || source.includes('meta')) return 'Facebook';
  if (source.includes('tiktok')) return 'TikTok';
  if (source.includes('whatsapp')) return 'WhatsApp';
  if (source.includes('google')) return 'Google';
  return 'Catálogo web';
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
      product_id: details.product_id || undefined,
      product_name: safeText(details.product_name, 160) || undefined,
      categoria: safeText(details.categoria, 80) || undefined,
      dispositivo: deviceType(),
      origen: campaignOrigin(),
      datos: clean({
        consulta: safeText(details.consulta, 120),
        resultados: Number(details.resultados || 0),
        precio: safeText(details.precio, 40),
        cantidad: Number(details.cantidad || 0),
        total: Number(details.total || 0),
        ...campaign,
        tracking_version: '1',
      }),
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

function cartSignature(snapshot) {
  return snapshot.items
    .map((item) => `${item.slug}:${item.quantity}`)
    .sort()
    .join('|');
}

/** LAWEB-XXXXXXXX: se copia a mano en "Código del pedido web" del Punto
    de Venta — el formato tiene que ser exactamente este. */
function createOrderCode() {
  const hex = uuid().replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  return `LAWEB-${hex.slice(0, 8).padEnd(8, '0')}`;
}

function orderCodeFor(snapshot) {
  const signature = cartSignature(snapshot);
  try {
    const saved = JSON.parse(sessionStorage.getItem(ORDER_KEY) || '{}');
    if (saved.signature === signature && saved.code) return saved.code;
  } catch {
    /* Se genera uno nuevo. */
  }
  const code = createOrderCode();
  try {
    sessionStorage.setItem(ORDER_KEY, JSON.stringify({ signature, code }));
  } catch {
    /* El código sigue funcionando sin storage. */
  }
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

function sendOrder(code, snapshot) {
  if (!base44 || !snapshot.items.length) return;
  const sentKey = `arias.catalog.order.sent.${code}`;
  if (sessionStorage.getItem(sentKey)) return;
  sessionStorage.setItem(sentKey, '1');

  const campaign = campaignData();
  base44.functions
    .invoke('catalogo-metricas', {
      action: 'pedido',
      codigo: code,
      estado: 'Enviado a WhatsApp',
      sesion: sessionId(),
      pagina: safeText(location.pathname || '/', 120),
      dispositivo: deviceType(),
      origen: campaignOrigin(),
      items: snapshot.items,
      total_estimado: snapshot.total,
      datos: clean(campaign),
    })
    .catch(() => {
      sessionStorage.removeItem(sentKey);
    });
}

function wireHomeEvents() {
  const searchEl = document.getElementById('search');
  const chipsEl = document.getElementById('chips');
  const gridEl = document.getElementById('grid');
  let searchTimer = null;

  searchEl?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const query = safeText(searchEl.value, 120);
      if (query.length < 2) return;
      const results = gridEl?.querySelectorAll('.card').length || 0;
      trackCatalogEvent(results ? 'Búsqueda' : 'Búsqueda sin resultados', {
        consulta: query,
        categoria: chipsEl?.querySelector('.chip[aria-pressed="true"]')?.dataset.cat || '',
        resultados: results,
      });
    }, 1200);
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
    // Sincroniza "carrito iniciado" con el estado real en cualquier
    // click — así se limpia solo cuando el pedido se vacía, sin tener
    // que engancharse a cada botón de quitar/vaciar por separado.
    if (readCart().length === 0) sessionStorage.removeItem(CART_STARTED_KEY);

    const addButton = event.target.closest('[data-add]');
    if (addButton) {
      setTimeout(() => {
        const snapshot = cartSnapshot();
        trackCatalogEvent('Agregado a pedido', {
          ...productInfoForButton(addButton),
          cantidad: snapshot.quantity,
          total: snapshot.total,
        });

        // "Pedido Iniciado" = se armó el primer carrito (0 -> 1 producto),
        // no "se abrió el carrito" — una sola vez por cada vez que
        // arranca un pedido nuevo.
        if (!sessionStorage.getItem(CART_STARTED_KEY)) {
          sessionStorage.setItem(CART_STARTED_KEY, '1');
          trackCatalogEvent('Pedido Iniciado', { cantidad: snapshot.quantity, total: snapshot.total });
        }
      }, 0);
      return;
    }

    const send = event.target.closest('#sheetSend');
    if (!send) return;
    const snapshot = cartSnapshot();
    if (!snapshot.items.length) return;
    const code = orderCodeFor(snapshot);
    addCodeToWhatsAppLink(send, code);
    sendOrder(code, snapshot);
    const eventKey = `arias.catalog.order.event.${code}`;
    if (!sessionStorage.getItem(eventKey)) {
      sessionStorage.setItem(eventKey, '1');
      trackCatalogEvent('Pedido Enviado a WhatsApp', { cantidad: snapshot.quantity, total: snapshot.total });
    }
  });
}

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
        trackCatalogEvent('Vista de producto', info);
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
    aparte, una vez confirmado que el HTML ya tiene los datos del producto. */
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

async function loadProducts() {
  try {
    const products = await fetch('/data/products.json').then((response) => response.json());
    productsBySlug = new Map(products.map((product) => [product.slug, product]));
  } catch {
    productsBySlug = new Map();
  }
}

async function init() {
  try {
    const [{ createClient }] = await Promise.all([
      import('https://esm.sh/@base44/sdk@0.8.41?bundle'),
      loadProducts(),
    ]);
    base44 = createClient({ appId: ARIAS_APP_ID });
  } catch {
    return; // sin SDK no se manda nada — nunca rompe la navegación del catálogo
  }

  trackCatalogEvent('Visita');
  trackProductPageView();
  wireHomeEvents();
  wireCartEvents();
  wireCardViews();
}

init();
