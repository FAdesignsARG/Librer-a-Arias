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
          ...campaign,
        }),
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

/** El código vive mientras dura EL PEDIDO (desde "Iniciado" hasta que se
    vacía o se envía), no atado a qué productos/cantidades tiene en un
    momento dado — así agregar un segundo producto después de arrancar
    el pedido no genera un código distinto al que ya se mandó como
    "Iniciado". Se limpia junto con CART_STARTED_KEY cuando el carrito
    queda vacío (ver wireCartEvents). */
function currentOrderCode() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(ORDER_KEY) || '{}');
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
  try {
    sessionStorage.setItem(ORDER_KEY, JSON.stringify({ code }));
  } catch {
    /* el código sigue funcionando sin storage */
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

  // 1.2s de espera desde la última tecla — mide la búsqueda, no cada letra.
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
    // Sincroniza "carrito iniciado"/código de pedido con el estado real
    // en cualquier click — así se limpian solos cuando el pedido se
    // vacía, sin tener que engancharse a cada botón de quitar/vaciar.
    if (readCart().length === 0) {
      sessionStorage.removeItem(CART_STARTED_KEY);
      sessionStorage.removeItem(ORDER_KEY);
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

        // Primer producto desde carrito vacío: arranca el pedido.
        if (!sessionStorage.getItem(CART_STARTED_KEY)) {
          sessionStorage.setItem(CART_STARTED_KEY, '1');
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
      if (!sessionStorage.getItem(sentKey)) {
        sessionStorage.setItem(sentKey, '1');
        sendPedidoState('Enviado a WhatsApp', code, snapshot);
      }
      return;
    }

    // Cualquier otro link a WhatsApp (el botón general "Consultar por
    // WhatsApp", el dock flotante, etc.) — no depende de tener carrito.
    const link = event.target.closest('a[href*="wa.me"], a[href*="whatsapp.com"]');
    if (!link) return;
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
