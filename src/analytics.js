/**
 * Analítica anónima del catálogo → app de gestión en Base44 ("Librería
 * Arias Gestión"), a pedido de Rodri para su propio panel. Portado del
 * script embebido en el HTML que compartió (libreria-arias-netlify-v26),
 * adaptado a que este sitio es multi-página (portada + ficha por producto,
 * no todo en un solo HTML) y a los nombres reales de clases del proyecto
 * (.card__name/.card__cat/.card__price, no .card-name con guión).
 *
 * Nunca debe romper ni frenar la navegación: cualquier falla (SDK que no
 * carga, red caída, entidad rechazada) queda silenciada.
 */

const ARIAS_APP_ID = '6a7e432be6e59ad993e40158';
const MAX_EVENTS_PER_SESSION = 120;
let eventCount = 0;
let analyticsEntity = null;

function sessionId() {
  const key = 'arias_catalog_session_v1';
  let value = sessionStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID?.() || `arias-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(key, value);
  }
  return value;
}

/** Saca emails y números largos (teléfonos) de cualquier texto antes de mandarlo. */
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
    /* document.referrer con formato raro — se ignora */
  }
  return {
    referrer: safeText(referrer, 100),
    utm_source: safeText(params.get('utm_source'), 80),
    utm_medium: safeText(params.get('utm_medium'), 80),
    utm_campaign: safeText(params.get('utm_campaign'), 100),
    language: safeText(navigator.language, 20),
  };
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
    origen: 'Catálogo web',
    pagina: safeText(location.pathname || '/', 120),
    dispositivo: deviceType(),
    valor_conversion: 0,
    datos: JSON.stringify({
      resultados: Number(details.resultados || 0),
      precio: safeText(details.precio, 40),
      ...campaignData(),
    }).slice(0, 1000),
    procesado: false,
  };

  analyticsEntity.create(row).catch(() => {
    /* La medición nunca debe interrumpir la navegación del catálogo. */
  });
}

function cardInfo(card) {
  return {
    product_name: card?.querySelector('.card__name')?.textContent,
    categoria: card?.querySelector('.card__cat')?.textContent,
    precio: card?.querySelector('.card__price')?.textContent,
  };
}

/** Buscador y chips de categoría — sólo existen en la portada. */
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

  chipsEl?.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
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

/** Cualquier link a WhatsApp en cualquier página: carrito, dock flotante,
    ficha de producto, banner del canal. */
function wireWhatsAppClicks() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href*="wa.me"], a[href*="whatsapp.com"]');
    if (!link) return;
    const card = link.closest('.card');
    trackCatalogEvent('Click en WhatsApp', card ? cardInfo(card) : {});
  });
}

/** Tarjetas que quedan ≥70% visibles en pantalla — grilla de la portada y
    la de "también te puede interesar" en la ficha de producto. */
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
    product_name: name,
    categoria: document.querySelector('.product__cat')?.textContent,
    precio: document.querySelector('.product__price')?.textContent,
  });
}

async function init() {
  try {
    const { createClient } = await import('https://esm.sh/@base44/sdk@0.8.41?bundle');
    analyticsEntity = createClient({ appId: ARIAS_APP_ID }).entities.EventoCatalogo;
  } catch {
    return; // sin SDK no se manda nada — nunca rompe la navegación del catálogo
  }

  trackCatalogEvent('Visita');
  trackProductPageView();
  wireHomeEvents();
  wireWhatsAppClicks();
  wireCardViews();
}

init();
