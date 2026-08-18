/**
 * Analítica anónima + embudo de pedidos para Librería Arias.
 *
 * Registra interacción comercial sin nombre, teléfono, email, IP ni
 * ubicación precisa. Los errores se silencian para que el catálogo y
 * WhatsApp nunca dejen de funcionar.
 *
 * v27 (18/8/2026): parche de Rodri sobre la versión anterior — agrega el
 * embudo de pedidos (Agregado a pedido / Inicio de pedido / Pedido
 * enviado) con un código LA-AAAAMMDD-XXXXX que se suma al texto del
 * mensaje de WhatsApp, para poder cruzar en su panel una sesión anónima
 * del catálogo con el pedido real que llega por WhatsApp. Sigue sin
 * mandar nombre/teléfono/email — el cruce lo hace Rodri del lado de
 * WhatsApp Business, no este script.
 */

const ARIAS_APP_ID = '6a7e432be6e59ad993e40158';
const MAX_EVENTS_PER_SESSION = 120;
const CART_KEY = 'arias.pedido.v1';
const ORDER_KEY = 'arias.catalog.order.v1';

let eventCount = 0;
let analyticsEntity = null;
let orderEntity = null;
let productsBySlug = new Map();

function sessionId() {
  const key = 'arias_catalog_session_v1';
  let value = sessionStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID?.() || `arias-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(key, value);
  }
  return value;
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
  let referrer = '';
  try {
    referrer = document.referrer ? new URL(document.referrer).hostname : '';
  } catch {
    /* Se ignoran referencias con formato inválido. */
  }
  return {
    referrer: safeText(referrer, 100),
    utm_source: safeText(params.get('utm_source'), 80),
    utm_medium: safeText(params.get('utm_medium'), 80),
    utm_campaign: safeText(params.get('utm_campaign'), 100),
    language: safeText(navigator.language, 20),
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

function trackCatalogEvent(tipo, details = {}) {
  if (!analyticsEntity || eventCount >= MAX_EVENTS_PER_SESSION) return;
  eventCount += 1;

  const row = {
    fecha: new Date().toISOString(),
    tipo,
    sesion: sessionId(),
    product_name: safeText(details.product_name, 160) || undefined,
    consulta: safeText(details.consulta, 120) || undefined,
    categoria: safeText(details.categoria, 80) || undefined,
    origen: campaignOrigin(),
    pagina: safeText(location.pathname || '/', 120),
    dispositivo: deviceType(),
    valor_conversion: Number(details.total || 0),
    datos: JSON.stringify({
      resultados: Number(details.resultados || 0),
      precio: safeText(details.precio, 40),
      cantidad: Number(details.cantidad || 0),
      total: Number(details.total || 0),
      codigo_pedido: details.codigo_pedido || '',
      ...campaignData(),
    }).slice(0, 1000),
    procesado: false,
  };

  analyticsEntity.create(row).catch(() => {});
}

function cardInfo(card) {
  return {
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
      product_name: product.name,
      categoria: product.category,
      precio: product.price,
    };
  }
  const card = button?.closest('.card');
  if (card) return cardInfo(card);
  return {
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

function createOrderCode() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `LA-${date}-${random}`;
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

function saveCatalogOrder(code, snapshot) {
  if (!orderEntity || !snapshot.items.length) return;
  const sentKey = `arias.catalog.order.sent.${code}`;
  if (sessionStorage.getItem(sentKey)) return;
  sessionStorage.setItem(sentKey, '1');

  const campaign = campaignData();
  const now = new Date().toISOString();
  orderEntity
    .create({
      codigo: code,
      fecha: now,
      sesion: sessionId(),
      estado: 'Enviado a WhatsApp',
      items_json: JSON.stringify(snapshot.items).slice(0, 5000),
      cantidad_productos: snapshot.quantity,
      total_estimado: snapshot.total,
      origen: campaignOrigin(),
      utm_source: campaign.utm_source || undefined,
      utm_medium: campaign.utm_medium || undefined,
      utm_campaign: campaign.utm_campaign || undefined,
      pagina: safeText(location.pathname || '/', 120),
      dispositivo: deviceType(),
      fecha_click_whatsapp: now,
      procesado_metricas: false,
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
    const addButton = event.target.closest('[data-add]');
    if (addButton) {
      setTimeout(() => {
        const snapshot = cartSnapshot();
        trackCatalogEvent('Agregado a pedido', {
          ...productInfoForButton(addButton),
          cantidad: snapshot.quantity,
          total: snapshot.total,
        });
      }, 0);
      return;
    }

    if (event.target.closest('#fab')) {
      const snapshot = cartSnapshot();
      trackCatalogEvent('Inicio de pedido', {
        cantidad: snapshot.quantity,
        total: snapshot.total,
      });
      return;
    }

    const send = event.target.closest('#sheetSend');
    if (!send) return;
    const snapshot = cartSnapshot();
    if (!snapshot.items.length) return;
    const code = orderCodeFor(snapshot);
    addCodeToWhatsAppLink(send, code);
    saveCatalogOrder(code, snapshot);
    const eventKey = `arias.catalog.order.event.${code}`;
    if (!sessionStorage.getItem(eventKey)) {
      sessionStorage.setItem(eventKey, '1');
      trackCatalogEvent('Pedido enviado', {
        codigo_pedido: code,
        cantidad: snapshot.quantity,
        total: snapshot.total,
      });
    }
  });
}

function wireWhatsAppClicks() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href*="wa.me"], a[href*="whatsapp.com"]');
    if (!link) return;
    const card = link.closest('.card');
    const snapshot = link.id === 'sheetSend' ? cartSnapshot() : null;
    trackCatalogEvent('Click en WhatsApp', {
      ...(card ? cardInfo(card) : {}),
      cantidad: snapshot?.quantity || 0,
      total: snapshot?.total || 0,
      codigo_pedido: snapshot?.items.length ? orderCodeFor(snapshot) : '',
    });
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

function trackProductPageView() {
  if (!document.body.classList.contains('page-product')) return;
  const name = document.querySelector('.product__info h1')?.textContent;
  if (!name) return;
  trackCatalogEvent('Vista de producto', {
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
    const client = createClient({ appId: ARIAS_APP_ID });
    analyticsEntity = client.entities.EventoCatalogo;
    orderEntity = client.entities.PedidoCatalogo;
  } catch {
    return;
  }

  trackCatalogEvent('Visita');
  trackProductPageView();
  wireHomeEvents();
  wireCartEvents();
  wireWhatsAppClicks();
  wireCardViews();
}

init();
