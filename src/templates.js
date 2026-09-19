/**
 * Generación de HTML. Lo usan tanto el servidor de desarrollo (render al
 * vuelo) como scripts/build.js (escribe el sitio estático), así que lo que
 * se ve en local es exactamente lo que se publica.
 */
import { cloudinaryUrl, shareCardUrl } from './cloudinary-config.js';
import { dailyPicks } from './recommend.js';

/* ---------- helpers ---------- */

/** Escapa para insertar dentro de texto o de un atributo con comillas dobles. */
export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const money = (n) => '$' + Number(n || 0).toLocaleString('es-AR');

/** Slug de un rubro para sus páginas SEO (Ronda 9) — mismo criterio que
    el slugify de productos que ya existe en admin.js/scripts/extract.js
    (sin tildes, minúsculas, guiones), pero vive acá porque
    scripts/build.js y src/sitemap.js ya importan de este archivo y
    admin.js no se puede importar en Node (arrastra el SDK de Firebase
    del navegador). */
export const categorySlug = (cat) =>
  String(cat)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/* ---------- ofertas ----------
   Una oferta vive DENTRO del producto (product.offer), no en una colección
   aparte: cada producto tiene como mucho una oferta activa a la vez, que es
   como Fran las piensa ("este producto está en oferta hasta tal fecha").
   Menos piezas que un sistema de campañas separado, y alcanza para lo que
   se pidió: tarjetas de oferta con vencimiento, manejables desde el panel.
   Vencida sola: si `until` ya pasó, se trata como si no existiera. */
export const offerActive = (p) => !!p.offer?.until && new Date(p.offer.until).getTime() > Date.now();
export const offerHasDiscount = (p) => offerActive(p) && Number(p.offer.price) > 0;

/** La única promoción de la tienda (decisión de Fran, 17/9/2026): un
    porcentaje de descuento sobre el total por comprar desde la web, no
    acumulable con nada. Nada de tramos por monto ni de descuentos por medio
    de pago: eso no existe. Devuelve null sólo si el admin lo puso en 0.
    Si el dato falta (deploy viejo), vale el 10% que definió el negocio. */
export const webPromo = (s) => {
  const percent = Number(s?.promos?.webPercent ?? 10);
  if (!(percent > 0)) return null;
  return { percent, disclaimer: String(s?.promos?.disclaimer || '').trim() };
};

/** Días de calendario que quedan hasta que vence una oferta activa
    (Ronda 5: cuenta regresiva real en la ficha de producto). Por
    CALENDARIO, no por horas exactas: algo que vence a las 23:59 de hoy
    tiene que decir "Termina hoy", no "Termina mañana" sólo porque
    quedan menos de 24hs completas (Math.ceil de milisegundos daba ese
    resultado incorrecto). Sólo tiene sentido llamarla si offerActive(p)
    ya dio true. */
export const offerDaysLeft = (p) => {
  const until = new Date(p.offer.until);
  const now = new Date();
  const untilDay = new Date(until.getFullYear(), until.getMonth(), until.getDate());
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((untilDay - nowDay) / 86400000);
};

export const isNew = (p, days = 14) =>
  !!p.createdAt && Date.now() - new Date(p.createdAt).getTime() < days * 86400000;

export const dateFmt = (iso) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** Corta en el último espacio antes del límite y agrega puntos suspensivos. */
const clamp = (s, max) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return t.slice(0, t.lastIndexOf(' ', max - 1)).trimEnd() + '…';
};

// `images` guarda public_ids de Cloudinary (ver src/cloudinary-config.js),
// no nombres de archivo local — el tamaño se pide por parámetro de URL.
const thumbSrc = (id) => cloudinaryUrl(id, { width: 400 });
const fullSrc = (id) => cloudinaryUrl(id, { width: 1000 });

/* ---------- iconos ---------- */

const ico = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.75"/><path d="M15.4 15.4 20 20"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5.5v13M5.5 12h13"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 12h13"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4.75 12.5 4.5 4.5 10-10"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.4 8.5h13.2l.9 10.15A2 2 0 0 1 17.5 21h-11a2 2 0 0 1-2-2.35L5.4 8.5Z"/><path d="M8.75 8.5V7.25a3.25 3.25 0 0 1 6.5 0V8.5"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.25 5.75 6.25 6.25-6.25 6.25"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>',
  wa: '<svg viewBox="0 0 32 32" fill="currentColor"><path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.408.71 4.65 1.929 6.533L4 29l7.646-1.884A11.94 11.94 0 0 0 16 27c6.627 0 12-5.373 12-12S22.628 3 16.001 3zm0 21.6c-1.79 0-3.46-.52-4.867-1.417l-.349-.22-4.14 1.02 1.04-4.03-.228-.36A9.55 9.55 0 0 1 6.4 15c0-5.294 4.307-9.6 9.601-9.6 5.293 0 9.6 4.306 9.6 9.6 0 5.293-4.307 9.6-9.6 9.6zm5.27-7.18c-.288-.145-1.706-.842-1.97-.938-.264-.096-.457-.144-.65.145-.192.288-.745.937-.913 1.13-.168.192-.336.216-.624.072-.289-.145-1.219-.45-2.322-1.433-.858-.766-1.437-1.712-1.605-2-.168-.289-.018-.445.126-.589.13-.129.289-.336.433-.504.145-.168.193-.289.29-.481.096-.193.048-.361-.024-.505-.073-.145-.65-1.566-.89-2.144-.234-.563-.472-.487-.65-.496l-.553-.01a1.06 1.06 0 0 0-.77.361c-.264.289-1.01.987-1.01 2.408 0 1.42 1.034 2.792 1.178 2.985.145.192 2.036 3.11 4.933 4.36.69.298 1.228.476 1.648.61.692.22 1.322.189 1.82.115.555-.083 1.706-.698 1.947-1.372.24-.673.24-1.25.168-1.37-.072-.121-.264-.193-.553-.337z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21.25S5.25 14.5 5.25 9.75a6.75 6.75 0 0 1 13.5 0c0 4.75-6.75 11.5-6.75 11.5Z"/><circle cx="12" cy="9.75" r="2.5"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.25 2"/></svg>',
  ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none"/></svg>',
  fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.5 8.5h2.6V5.1h-2.6c-2.6 0-4.6 2-4.6 4.6v1.8H7.6v3.4h2.3V21h3.4v-6.1h2.6l.5-3.4h-3.1V9.7c0-.7.5-1.2 1.2-1.2z"/></svg>',
  tk: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 3c.4 2.1 1.9 3.7 4 4v3c-1.4 0-2.7-.4-3.9-1.1v6.1c0 3.3-2.7 6-6 6s-6-2.7-6-6 2.7-6 6-6c.3 0 .6 0 .9.1v3.1c-.3-.1-.6-.1-.9-.1-1.6 0-3 1.3-3 3s1.4 3 3 3 3-1.3 3-3V3h2.9z"/></svg>',
  mapPin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-7.58 7-12a7 7 0 0 0-14 0c0 4.42 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 4.75c0-.7.55-1.25 1.25-1.25h6.6c.5 0 .98.2 1.33.55l7.77 7.77a1.9 1.9 0 0 1 0 2.68l-5.85 5.85a1.9 1.9 0 0 1-2.68 0L4.15 12.6a1.9 1.9 0 0 1-.65-1.33Z"/><circle cx="8.25" cy="8.25" r="1.35"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l1.8 5.7 5.7 1.8-5.7 1.8L12 17.5l-1.8-5.7-5.7-1.8 5.7-1.8L12 2.5z"/></svg>',
  fire: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 2c.3 2.6-.7 3.9-2 5.3C9 8.7 7.5 10.4 7.5 13a4.5 4.5 0 0 0 9 0c0-1.4-.5-2.3-1.1-3.2.9.4 2.1 1.6 2.1 4a5.5 5.5 0 0 1-11 0c0-4.5 3-6.3 4.5-8.3.9-1.2 1.3-2.1 1.5-3.5z"/></svg>',
};

/* ---------- tema ----------
   Corre antes de que el navegador pinte nada. Si esperáramos al módulo,
   se vería un flash del tema equivocado en cada carga. */
const themeBootScript = (home = false) => `<script>(function(){try{
var t=localStorage.getItem('arias.tema');
if(!t)t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
document.documentElement.dataset.theme=t;
if(sessionStorage.getItem('arias.splash.visto')!=='1')document.documentElement.dataset.splash='running';
}catch(e){document.documentElement.dataset.theme='dark';}})();<\/script>`;

const splashHtml = (s, home = false) => `<div class="splash${home ? ' splash--home' : ''}" id="splash" aria-hidden="true">
  <div class="splash__panel splash__panel--top"></div>
  <div class="splash__panel splash__panel--bottom"></div>
  <div class="splash__stack">
    <div class="splash__brand">
      <div class="splash__mark">
        <span class="splash__halo" aria-hidden="true"></span>
        <img class="splash__logo brand-dark" src="/assets/brand/mark-dark@256.webp" width="132" height="132" alt="">
        <img class="splash__logo brand-light" src="/assets/brand/mark-light@256.webp" width="132" height="132" alt="">
      </div>
      <img class="splash__word brand-dark" src="/assets/brand/wordmark-dark.webp" alt="${esc(s.storeName)}">
      <img class="splash__word brand-light" src="/assets/brand/wordmark-light.webp" alt="${esc(s.storeName)}">
    </div>
    <div class="splash__bar"></div>
  </div>
</div>`;

const themeIcons = `<svg class="ico-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>
  <svg class="ico-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6"/></svg>`;

const themeButton = `<button class="themebtn" id="themeBtn" aria-label="Cambiar entre modo claro y oscuro" title="Cambiar tema">
  ${themeIcons}
</button>`;

const welcomeHtml = (s) => `<dialog class="welcome" id="welcome" aria-labelledby="welcomeTitle">
  <div class="welcome__head">
    <img class="brand-dark" src="/assets/brand/mark-dark@128.webp" width="54" height="54" alt="">
    <img class="brand-light" src="/assets/brand/mark-light@128.webp" width="54" height="54" alt="">
    <h2 id="welcomeTitle">¿Cómo querés ver ${esc(s.storeName)}?</h2>
    <p>Elegí el modo que más te guste. Tocá una opción para verla al instante y guardá cuando estés conforme.</p>
  </div>
  <div class="welcome__options">
    <button type="button" class="themecard themecard--light" data-theme="light" aria-pressed="false">
      <div class="themecard__preview">
        <div class="themecard__bar"></div>
        <div class="themecard__grid">
          <div class="themecard__cell"></div><div class="themecard__cell"></div><div class="themecard__cell"></div>
        </div>
      </div>
      <div class="themecard__label">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6"/></svg>
        Modo claro
      </div>
      <p class="themecard__hint">Ideal de día</p>
    </button>
    <button type="button" class="themecard themecard--dark" data-theme="dark" aria-pressed="false">
      <div class="themecard__preview">
        <div class="themecard__bar"></div>
        <div class="themecard__grid">
          <div class="themecard__cell"></div><div class="themecard__cell"></div><div class="themecard__cell"></div>
        </div>
      </div>
      <div class="themecard__label">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>
        Modo oscuro
      </div>
      <p class="themecard__hint">Descansa la vista</p>
    </button>
  </div>
  <div class="welcome__step2" id="welcomeStep2" hidden>
    <p class="welcome__q">¿Con qué arrancamos?</p>
    <div class="quick">
      <button type="button" class="quick__opt" data-ask="Busco un regalo. ¿Qué me recomendás?">
        <span class="quick__ico">🎁</span>
        <span class="quick__txt"><strong>Busco un regalo</strong><span>Te ayudo a elegir según para quién es</span></span>
      </button>
      <button type="button" class="quick__opt" data-ask="¿Qué tenés por menos de 10 mil pesos?">
        <span class="quick__ico">💸</span>
        <span class="quick__txt"><strong>Menos de $10.000</strong><span>Lo más accesible del catálogo</span></span>
      </button>
      <button type="button" class="quick__opt" data-ask="¿Cuáles son los productos más virales o más buscados?">
        <span class="quick__ico">🔥</span>
        <span class="quick__txt"><strong>Lo más viral</strong><span>Lo que todo el mundo está buscando</span></span>
      </button>
      <button type="button" class="quick__opt" data-go="catalogo">
        <span class="quick__ico">🛍️</span>
        <span class="quick__txt"><strong>Ver todo el catálogo</strong><span>Miro yo mismo, gracias</span></span>
      </button>
    </div>
  </div>

  <div class="welcome__foot">
    <button type="button" class="btn btn--gold" id="welcomeSave">Continuar</button>
    <p class="welcome__note">Podés cambiar el modo cuando quieras con el botón de la barra de arriba.</p>
  </div>
</dialog>`;

/* ==========================================================================
   LAYOUT
   ========================================================================== */

/**
 * Envoltorio común. `head` recibe title/description/canonical/image y el
 * bloque de datos estructurados ya serializado.
 */
function layout({ head, body, settings, bodyClass = '' }) {
  const isHome = bodyClass.split(' ').includes('page-home');
  const s = settings;
  const url = head.canonical;
  // Para compartir conviene el círculo: las tarjetas de WhatsApp y Facebook
  // van sobre fondo blanco, y el wordmark con ARIAS blanco se perdería ahí.
  const img = head.image || `${s.siteUrl}/assets/brand/mark-light@256.webp`;

  return `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(head.title)}</title>
<meta name="description" content="${esc(head.description)}">
<link rel="canonical" href="${esc(url)}">
<meta name="theme-color" content="#08080a">
<meta name="robots" content="index, follow, max-image-preview:large">

<meta property="og:type" content="${head.ogType || 'website'}">
<meta property="og:site_name" content="${esc(s.storeName)}">
<meta property="og:locale" content="es_AR">
<meta property="og:title" content="${esc(head.ogTitle || head.title)}">
<meta property="og:description" content="${esc(head.description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(img)}">
${head.imageWidth ? `<meta property="og:image:secure_url" content="${esc(img)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="${head.imageWidth}">
<meta property="og:image:height" content="${head.imageHeight}">
<meta property="og:image:alt" content="${esc(head.imageAlt || head.title)}">` : ''}
${head.price ? `<meta property="product:price:amount" content="${head.price}">
<meta property="product:price:currency" content="ARS">
<meta property="og:availability" content="${head.inStock ? 'instock' : 'oos'}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(head.ogTitle || head.title)}">
<meta name="twitter:description" content="${esc(head.description)}">
<meta name="twitter:image" content="${esc(img)}">

<link rel="icon" type="image/webp" href="/assets/brand/favicon.webp">
<link rel="apple-touch-icon" href="/assets/brand/mark-dark@256.webp">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400..700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/src/styles.css">
<link rel="stylesheet" href="/src/styles-parts.css">
<link rel="stylesheet" href="/src/theme.css">
${isHome ? '<link rel="stylesheet" href="/src/home.css">' : ''}
<link rel="stylesheet" href="/src/assistant.css">
<link rel="stylesheet" href="/src/notify.css">
<link rel="stylesheet" href="/src/page-control.css">
<link rel="stylesheet" href="/src/glass.css">
${head.preload || ''}
${themeBootScript(isHome)}
<script type="application/ld+json">${head.jsonLd}</script>
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
${splashHtml(s, isHome && !bodyClass.includes('page-catalog'))}
${navbar(s, isHome)}
${railHtml(s)}
${body}
${orderSheet(s)}
${notifyPanel()}
${shareSheetHtml(s)}
${menuSheetHtml(isHome ? s : null)}
${isHome ? '' : welcomeHtml(s)}
<script type="module" src="/src/theme.js"></script>
<script type="module" src="/src/app.js"></script>
<script type="module" src="/src/assistant.js"></script>
<script type="module" src="/src/share.js"></script>
<script type="module" src="/src/analytics.js"></script>
<!-- Control remoto de página desde Base44 (marketing). Para desactivarlo
     por completo: poner enabled:false acá, o borrar estas dos líneas. -->
<script>window.ARIAS_PAGE_CONTROL = { enabled: true, refreshMs: 60000 };</script>
<script type="module" src="/src/page-control.js"></script>
</body>
</html>`;
}

/**
 * La grulla amarilla sobre blanco casi no se lee, así que en modo claro va
 * la versión negra cromática. Se resuelve con dos <img> y CSS en vez de con
 * JS: si dependiera del script, al cargar se vería un instante la incorrecta.
 */
const crane = (cls, size) => {
  // El círculo cromático se usa en los dos temas: trae su propio fondo, así
  // que se lee igual de bien sobre negro que sobre blanco, y su amarillo es
  // el de la marca. La grulla suelta quedaba pálida sobre fondo claro.
  const file = size > 96 ? '@256' : size > 48 ? '@128' : '';
  return `<img class="${cls} brand-dark" src="/assets/brand/mark-dark${file}.webp"
       width="${size}" height="${size}" alt="" loading="eager" decoding="async">
  <img class="${cls} brand-light" src="/assets/brand/mark-light${file}.webp"
       width="${size}" height="${size}" alt="" loading="eager" decoding="async">`;
};

/* Mismo ícono que el botón "Preguntame" del dock — se reusa en el globo
   de invitación (ver orderSheet) para que se lea como la misma función. */
const shareIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3.5m0 0L8 7.5m4-4 4 4"/><path d="M8 10.5H6.5A1.5 1.5 0 0 0 5 12v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7a1.5 1.5 0 0 0-1.5-1.5H16"/></svg>';

/** Precio que realmente paga la persona, ya formateado. */
const paidPrice = (p) => money(offerHasDiscount(p) ? p.offer.price : p.price);

/** Atributos que lee src/share.js: viajan en el botón para no depender de products.json. */
const shareAttrs = (p) =>
  `data-share="${esc(p.slug)}" data-share-name="${esc(p.name)}" data-share-price="${esc(paidPrice(p))}" data-share-img="${esc(p.images[0])}"`;

/** Hoja de compartir: una sola para toda la página. WhatsApp primero y más grande. */
const shareSheetHtml = (s) => {
  const promo = webPromo(s);
  const opt = (id, via, icon, label, extra = '') =>
    `<${extra.includes('href') ? 'a' : 'button type="button"'} class="shareopt" id="${id}" data-share-via="${via}" ${extra}><span class="shareopt__ico">${icon}</span><span class="shareopt__label">${label}</span></${extra.includes('href') ? 'a' : 'button'}>`;
  const fbIco = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.700V21h2.800Z"/></svg>';
  const mailIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m4 8 8 5.5L20 8"/></svg>';
  const linkIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';
  const downIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0 4-4m-4 4-4-4"/><path d="M5 19.5h14"/></svg>';
  return `<dialog class="sortsheet sharesheet" id="shareSheet" aria-labelledby="shareSheetTitle" tabindex="-1" data-promo="${promo ? esc(`${promo.percent}% OFF comprando por la web`) : ''}">
  <div class="sortsheet__head">
    <h2 id="shareSheetTitle">Compartir</h2>
    <button type="button" class="sheet__close" id="shareSheetClose" aria-label="Cerrar">${ico.x}</button>
  </div>
  <div class="sharesheet__body">
    <figure class="sharecard">
      <img id="sharePreviewImg" width="1200" height="630" alt="" decoding="async">
      <figcaption><strong id="shareName"></strong><span id="sharePrice"></span><small id="shareUrl"></small></figcaption>
    </figure>
    <a class="btn btn--gold btn--block sharesheet__wa" id="shareWa" data-share-via="whatsapp" target="_blank" rel="noopener">${ico.wa} Enviar por WhatsApp</a>
    <div class="sharesheet__grid">
      ${opt('shareNative', 'sistema', shareIco, 'Instagram y más')}
      ${opt('shareFb', 'facebook', fbIco, 'Facebook', 'href="#" target="_blank" rel="noopener"')}
      ${opt('shareMail', 'mail', mailIco, 'Mail', 'href="#"')}
      ${opt('shareCopy', 'enlace', linkIco, 'Copiar enlace')}
      ${opt('shareMailCopy', 'mail-diseno', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8"/></svg>', 'Copiar diseño para mail')}
      ${opt('shareDownload', 'imagen', downIco, 'Bajar imagen', 'href="#" target="_blank" rel="noopener"')}
    </div>
    <p class="sharesheet__note">Al enviarlo se ve la foto, el nombre y el precio. La imagen sirve para historias y publicaciones de Instagram.</p>
  </div>
</dialog>`;
};

const askIco =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4.5c-4.7 0-8.5 3.15-8.5 7.05 0 2.05 1.05 3.9 2.75 5.2L5.5 20.5l4.1-1.9c.75.15 1.55.25 2.4.25 4.7 0 8.5-3.15 8.5-7.05S16.7 4.5 12 4.5Z"/><path d="M9.9 9.9a2.2 2.2 0 1 1 3.1 2.05c-.65.3-1 .9-1 1.55"/><path d="M12 16.1h.01"/></svg>';

const menuIco =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7.5h16M4 12h16M4 16.5h16"/></svg>';
const gridIco =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="7.25" height="7.25" rx="2.25"/><rect x="13.25" y="3.5" width="7.25" height="7.25" rx="2.25"/><rect x="3.5" y="13.25" width="7.25" height="7.25" rx="2.25"/><rect x="13.25" y="13.25" width="7.25" height="7.25" rx="2.25"/></svg>';

const navbar = (s, home = false) => `<nav class="nav" id="nav">
  <div class="nav__inner">
    <a class="nav__brand" href="/" aria-label="${esc(s.storeName)} — inicio">
      ${crane('nav__crane', 32)}
      <span>${esc(s.storeName)}</span>
    </a>
    <a class="statusbadge" id="statusBadge" href="/#horarios" hidden></a>
    <div class="nav__links">
      <a class="nav__link" href="/catalogo/">Catálogo</a>
      <a class="nav__link" href="/#visitanos">Visitanos</a>
    </div>
    <button class="bellbtn" id="bellBtn" aria-haspopup="dialog" aria-label="Novedades y ofertas">
      ${ico.bell}<span class="bellbtn__dot" id="bellDot" hidden></span>
    </button>
    ${themeButton}
    <a class="btn btn--gold btn--sm nav__wa" data-arias-whatsapp href="https://wa.me/${s.whatsapp}" target="_blank" rel="noopener">
      ${ico.wa} Escribinos
    </a>
    <button type="button" class="menubtn" id="menuBtn" aria-haspopup="dialog" aria-label="Menú">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>${home ? '<span class="island__dot" id="navMenuDot" hidden></span>' : ''}
    </button>
    ${home ? `<div class="home-tools"><button type="button" id="homeHelp" aria-haspopup="dialog" aria-label="Ayuda">${askIco}<span>Ayuda</span></button><button type="button" id="homeOrder" aria-haspopup="dialog">Mi pedido <span id="homeOrderCount">0</span></button></div>` : ''}
  </div>
</nav>`;

/**
 * Barra lateral de desktop (≥1024px). Reemplaza a la barra de arriba: logo,
 * inicio, catálogo, pedido, ofertas, novedades, tema y, abajo, el menú.
 * No trae lógica propia: cada botón usa un disparador que ya existía
 * (data-open-order, data-open-menu, data-guide). En celular no se muestra:
 * ahí la navegación es la isla flotante.
 */
const railHtml = (s) => {
  const homeIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11.2 12 4.5l8 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-3.7v-5.5H9.2v5.5H5.5A1.5 1.5 0 0 1 4 19v-7.8Z"/></svg>';
  const item = (tag, attrs, icon, label, extra = '', cls = '') =>
    `<${tag} class="rail__item${cls}" ${attrs} aria-label="${label}">${icon}${extra}<span class="rail__tip" aria-hidden="true">${label}</span></${tag}>`;
  return `<aside class="rail" id="rail" aria-label="Navegación principal">
  <a class="rail__brand" href="/" aria-label="${esc(s.storeName)} — inicio">${crane('rail__crane', 44)}<span class="rail__status" id="railStatus" hidden></span></a>
  <nav class="rail__nav" aria-label="Secciones">
    ${item('a', 'href="/" data-rail="home"', homeIco, 'Inicio')}
    ${item('a', 'href="/catalogo/" data-rail="catalog"', gridIco, 'Catálogo')}
    ${item('button', 'type="button" data-open-order aria-haspopup="dialog"', ico.bag, 'Mi pedido', '<span class="rail__count" data-order-count data-empty="true">0</span>')}
    ${item('a', 'href="/catalogo/?cat=Ofertas" data-home-category="Ofertas" data-rail="offers"', ico.tag, 'Ofertas')}
    ${item('button', 'type="button" data-guide="news" aria-haspopup="dialog"', ico.bell, 'Novedades', '<span class="rail__dot" id="railDot" hidden></span>')}
    ${item('button', 'type="button" data-guide="theme"', themeIcons, 'Modo claro u oscuro')}
  </nav>
  ${item('button', 'type="button" data-open-menu aria-haspopup="dialog" aria-controls="menuSheet"', menuIco, 'Menú', '', ' rail__menu')}
</aside>`;
};
const chatIco =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4.5c-4.7 0-8.5 3.15-8.5 7.05 0 2.05 1.05 3.9 2.75 5.2L5.5 20.5l4.1-1.9c.75.15 1.55.25 2.4.25 4.7 0 8.5-3.15 8.5-7.05S16.7 4.5 12 4.5Z"/><path d="M9.9 9.9a2.2 2.2 0 1 1 3.1 2.05c-.65.3-1 .9-1 1.55"/><path d="M12 16.1h.01"/></svg>';

/**
 * Menú de mobile — el único lugar donde se puede llegar a Catálogo /
 * Horarios / Visitanos ahí (nav__links vive oculto debajo de 720px). De
 * paso, una guía rápida de cómo moverse por el sitio — sutil, con un
 * botón que HACE cada cosa en vez de explicarla, nada de plantearlo como
 * un instructivo de compra.
 */
const menuSheetHtml = (home) => home ? islandPanelHtml(home) : `<dialog class="sortsheet menusheet" id="menuSheet" aria-labelledby="menuSheetTitle" tabindex="-1">
  <div class="sortsheet__head">
    <h2 id="menuSheetTitle">Menú</h2>
    <button type="button" class="sheet__close" id="menuSheetClose" aria-label="Cerrar">${ico.x}</button>
  </div>
  <div class="menusheet__body">
    <nav class="menusheet__links" id="menusheetLinks">
      <a href="/catalogo/">Catálogo</a>
      <a href="/#horarios">Horarios</a>
      <a href="/#visitanos">Visitanos</a>
    </nav>
    <div class="menusheet__guide">
      <p class="menusheet__guideTitle">Guía rápida</p>
      <div class="guidestep">
        <span class="guidestep__n">1</span>
        <span class="guidestep__ico">${chatIco}</span>
        <span class="guidestep__info">
          <strong>Preguntale al asistente</strong>
          <span>Te ayuda a encontrar lo que buscás</span>
        </span>
        <button type="button" class="guidestep__btn" data-guide="chat">Preguntar</button>
      </div>
      <div class="guidestep">
        <span class="guidestep__n">2</span>
        <span class="guidestep__ico">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>
        </span>
        <span class="guidestep__info">
          <strong>Mirá el catálogo</strong>
          <span>Filtrá por rubro, precio o stock</span>
        </span>
        <button type="button" class="guidestep__btn" data-guide="catalog">Ver catálogo</button>
      </div>
      <div class="guidestep">
        <span class="guidestep__n">3</span>
        <span class="guidestep__ico">${ico.bag}</span>
        <span class="guidestep__info">
          <strong>Revisá tu selección</strong>
          <span>Cantidades y el total, siempre a mano</span>
        </span>
        <button type="button" class="guidestep__btn" data-guide="cart">Ver selección</button>
      </div>
      <div class="guidestep">
        <span class="guidestep__n">4</span>
        <span class="guidestep__ico">${ico.wa}</span>
        <span class="guidestep__info">
          <strong>Escribinos por WhatsApp</strong>
          <span>Para lo que necesites</span>
        </span>
        <button type="button" class="guidestep__btn" data-guide="cart">Escribir</button>
      </div>
    </div>
  </div>
</dialog>`;

/**
 * Home mobile: el mismo #menuSheet, pero como panel expandido de la isla
 * flotante (buscador + pedido + menú). Absorbe lo que en la home dejaba de
 * verse: rubros, asistente, WhatsApp, novedades, horarios y tema. Conserva
 * los IDs del menú común para que app.js lo maneje con el mismo código.
 */
const islandPanelHtml = (s) => `<dialog class="sortsheet menusheet menusheet--island" id="menuSheet" aria-labelledby="menuSheetTitle" tabindex="-1">
  <div class="sortsheet__head">
    <h2 id="menuSheetTitle">Menú</h2>
    <button type="button" class="sheet__close" id="menuSheetClose" aria-label="Cerrar">${ico.x}</button>
  </div>
  <div class="menusheet__body">
    <p class="island-panel__label" style="--i:0">Rubros</p>
    <nav class="island-panel__cats" id="menusheetLinks" aria-label="Rubros" style="--i:1">
      ${['Todos', 'Ofertas', ...s.categories].map((c) => `<a href="/catalogo/?cat=${encodeURIComponent(c)}" data-home-category="${esc(c)}">${c === 'Todos' ? 'Ver todo' : esc(c)}</a>`).join('')}
    </nav>
    <p class="island-panel__label" style="--i:2">Te ayudamos</p>
    <div class="island-panel__list" style="--i:3">
      <button type="button" data-guide="chat"><span class="island-panel__ico">${askIco}</span><span><strong>Preguntar al asistente</strong><small>Te ayuda a encontrar lo que buscás</small></span></button>
      <a data-arias-whatsapp href="https://wa.me/${s.whatsapp}" target="_blank" rel="noopener"><span class="island-panel__ico">${ico.wa}</span><span><strong>Escribinos por WhatsApp</strong><small>Te respondemos desde el local</small></span></a>
      <button type="button" data-guide="news"><span class="island-panel__ico">${ico.bell}<span class="island__dot" id="islandPanelDot" hidden></span></span><span><strong>Novedades</strong><small>Lo último que llegó</small></span></button>
    </div>
    <p class="island-panel__label" style="--i:4">El local</p>
    <div class="island-panel__list" style="--i:5">
      <a href="/#horarios"><span class="island-panel__ico">${ico.clock}</span><span><strong>Horarios</strong><small>Cuándo abrimos</small></span></a>
      <a href="/#visitanos"><span class="island-panel__ico">${ico.pin}</span><span><strong>Visitanos</strong><small>Dirección y cómo llegar</small></span></a>
      <button type="button" data-guide="theme"><span class="island-panel__ico">${themeIcons}</span><span><strong data-theme-label>Cambiar tema</strong><small>Claro u oscuro, como te guste</small></span></button>
    </div>
  </div>
</dialog>`;

/**
 * Panel de novedades: se abre desde la campanita. El contenido (qué
 * productos son nuevos, cuáles tienen oferta, cuáles son los más pedidos)
 * lo arma app.js a partir de products.json — no hay una colección aparte
 * de "notificaciones" para mantener sincronizada.
 */
const notifyPanel = () => `<dialog class="notify" id="notify" aria-labelledby="notifyTitle" tabindex="-1">
  <div class="notify__head">
    <h2 id="notifyTitle">Novedades</h2>
    <button class="sheet__close" id="notifyClose" aria-label="Cerrar">${ico.x}</button>
  </div>
  <div class="notify__body" id="notifyBody"></div>
</dialog>`;

/** Panel lateral del pedido. El contenido lo llena app.js. */
const orderSheet = (s) => `
<div class="dock">
  <button class="fab" id="fab" hidden aria-haspopup="dialog">
    ${ico.bag}
    <span class="fab__label">Mi pedido</span>
    <span class="fab__total" id="fabTotal">$0</span>
    <span class="fab__count" id="fabCount">0</span>
  </button>
  <div class="dock__row">
    <a class="dockbtn dockbtn--wa" data-arias-whatsapp href="https://wa.me/${s.whatsapp}" target="_blank" rel="noopener"
       aria-label="Escribinos por WhatsApp" title="Escribinos por WhatsApp">
      ${ico.wa}
    </a>
    <button class="dockbtn dockbtn--ai" id="askBtn" aria-haspopup="dialog" aria-label="Preguntarle a Adolfito, el asistente">
      <img class="dockbtn__face" src="/assets/brand/adolfito-chat@128.webp" srcset="/assets/brand/adolfito-chat@128.webp 1x, /assets/brand/adolfito-chat.webp 2x" width="72" height="72" alt="" decoding="async">
      <span>Preguntame</span>
    </button>
  </div>
  <div class="ainudge" id="aiNudge" hidden>
    <button type="button" class="ainudge__close" id="aiNudgeClose" aria-label="Cerrar aviso">${ico.x}</button>
    <button type="button" class="ainudge__body" id="aiNudgeBody">
      <span class="ainudge__ico">${askIco}</span>
      <span class="ainudge__txt">¿Buscás algo puntual? Preguntame, te ayudo a encontrarlo</span>
    </button>
  </div>
</div>

<dialog class="chat" id="chat" aria-labelledby="chatTitle" tabindex="-1">
  <div class="chat__head">
    <img class="chat__avatar" src="/assets/brand/adolfito-chat@128.webp" srcset="/assets/brand/adolfito-chat@128.webp 1x, /assets/brand/adolfito-chat.webp 2x" width="52" height="52" alt="">
    <div class="chat__title">
      <h2 id="chatTitle">Asistente de ${esc(s.storeName)}</h2>
      <p id="chatSub">Te ayudo a encontrar lo que buscás</p>
    </div>
    <button class="sheet__close" id="chatClose" aria-label="Cerrar">${ico.x}</button>
  </div>
  <div class="chat__body" id="chatBody"></div>
  <div class="chat__foot">
    <form class="chat__form" id="chatForm">
      <textarea id="chatInput" rows="1" aria-label="Escribile al asistente" placeholder="¿Qué estás buscando?" enterkeyhint="send" autocomplete="off"></textarea>
      <button class="chat__send" id="chatSend" type="submit" aria-label="Enviar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15m0 0-6-6m6 6-6 6"/></svg>
      </button>
    </form>
    <p class="chat__note">Los precios y el stock salen del catálogo. Para confirmar, escribinos por WhatsApp.</p>
  </div>
</dialog>

<dialog class="sheet" id="sheet" aria-labelledby="sheetTitle" tabindex="-1">
  <div class="sheet__head">
    <h2 id="sheetTitle">Mi pedido</h2>
    <button class="sheet__close" id="sheetClose" aria-label="Cerrar">${ico.x}</button>
  </div>
  <div class="sheet__body" id="sheetBody"></div>
  <div class="sheet__foot" id="sheetFoot" hidden>
    <div class="sheet__total"><span class="t-small">Total estimado</span><strong id="sheetTotal">$0</strong></div>
    <a class="btn btn--gold btn--block" id="sheetSend" href="#" target="_blank" rel="noopener">
      ${ico.wa} Enviar pedido por WhatsApp
    </a>
    <p class="sheet__note">Te abrimos WhatsApp con el pedido escrito. Confirmamos stock y forma de pago por ahí.</p>
    <div class="sheet__fallback">
      <span>¿No se abrió WhatsApp?</span>
      <button type="button" class="sheet__copy" id="sheetCopy">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
        Copiar pedido
      </button>
      <a class="sheet__phone" href="tel:+${esc(s.whatsapp)}">o llamanos al ${esc(s.phoneDisplay)}</a>
    </div>
  </div>
  <div class="sheet__sent" id="sheetSent" hidden>
    ${ico.check}
    <h3>¡Pedido enviado!</h3>
    <p>En breve te responden por WhatsApp para confirmar stock y forma de pago.</p>
    <div class="sheet__sent-actions">
      <button type="button" class="btn btn--ghost" id="sheetSentClear">Vaciar pedido</button>
      <button type="button" class="btn btn--gold" id="sheetSentContinue">Seguir comprando</button>
    </div>
  </div>
</dialog>

<!-- Antes de mandar el pedido, si queda algo en oferta afuera del carrito
     se ofrece sumarlo — una sola vez por sesión (app.js). Las filas de
     .promonudge__picks se arman en JS, acá sólo va el marco. -->
<dialog class="promonudge" id="promoNudge" aria-labelledby="promoNudgeTitle" tabindex="-1">
  <div class="promonudge__head">
    <h2 id="promoNudgeTitle">¿Sumamos algo en oferta?</h2>
    <button type="button" class="sheet__close" id="promoNudgeClose" aria-label="Cerrar">${ico.x}</button>
  </div>
  <div class="promonudge__body">
    <p class="promonudge__sub">Todavía no está en tu pedido — antes de mandarlo, mirá si te sirve:</p>
    <div class="promonudge__picks" id="promoNudgePicks"></div>
  </div>
  <div class="promonudge__foot">
    <button type="button" class="btn btn--ghost" id="promoNudgeSkip">No gracias, continuar</button>
    <button type="button" class="btn btn--gold" id="promoNudgeAdd">Agregar y continuar</button>
  </div>
</dialog>

<div id="toasts" aria-live="polite"></div>`;

const footer = (s) => `<footer class="footer">
  <div class="shell">
    <div class="footer__grid">
      <div>
        <h4>${esc(s.storeName)}</h4>
        <p>${esc(s.tagline)}</p>
      </div>
      <div>
        <h4>Dónde estamos</h4>
        <ul>
          <li><a href="${esc(s.mapsUrl)}" target="_blank" rel="noopener">${esc(s.address)}</a></li>
          <li><a data-arias-whatsapp href="https://wa.me/${s.whatsapp}" target="_blank" rel="noopener">${esc(s.phoneDisplay)}</a></li>
        </ul>
      </div>
      <div>
        <h4>Horarios</h4>
        <ul>
          ${s.hoursDisplay.map((h) => `<li>${esc(h.label)}: ${esc(h.value)}</li>`).join('\n          ')}
        </ul>
      </div>
      <div>
        <h4>Seguinos</h4>
        <ul>
          <li><a href="${esc(s.social.instagram)}" target="_blank" rel="noopener">Instagram</a></li>
          <li><a href="${esc(s.social.facebook)}" target="_blank" rel="noopener">Facebook</a></li>
          <li><a href="${esc(s.social.tiktok)}" target="_blank" rel="noopener">TikTok</a></li>
          <li><a href="${esc(s.social.whatsappChannel)}" target="_blank" rel="noopener">Canal de WhatsApp</a></li>
        </ul>
      </div>
    </div>
    <div class="footer__bottom">© ${new Date().getFullYear()} ${esc(s.storeName)} · La Rioja, Argentina</div>
  </div>
</footer>`;

/* ==========================================================================
   DATOS ESTRUCTURADOS
   ========================================================================== */

const localBusiness = (s) => ({
  '@type': 'Store',
  '@id': `${s.siteUrl}/#store`,
  name: s.storeName,
  description: s.tagline,
  url: s.siteUrl,
  telephone: `+${s.whatsapp}`,
  image: `${s.siteUrl}/assets/brand/mark-light@256.webp`,
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Esquina España y Bulnes',
    addressLocality: 'La Rioja',
    addressRegion: 'La Rioja',
    addressCountry: 'AR',
  },
  hasMap: s.mapsUrl,
  priceRange: '$$',
  currenciesAccepted: s.currency,
  sameAs: [s.social.instagram, s.social.facebook, s.social.tiktok],
  openingHoursSpecification: s.hours.map((h) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: h.days.map(
      (d) =>
        ({ Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday' })[d]
    ),
    opens: h.opens,
    closes: h.closes,
  })),
});

const productLd = (s, p) => ({
  '@type': 'Product',
  '@id': `${s.siteUrl}/p/${p.slug}/#product`,
  name: p.name,
  description: p.description,
  image: p.images.map((id) => fullSrc(id)),
  sku: p.slug,
  category: p.category,
  brand: { '@type': 'Brand', name: s.storeName },
  offers: {
    '@type': 'Offer',
    url: `${s.siteUrl}/p/${p.slug}/`,
    price: offerActive(p) && Number(p.offer.price) > 0 ? p.offer.price : p.price,
    priceCurrency: s.currency,
    availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
    seller: { '@id': `${s.siteUrl}/#store` },
    ...(offerActive(p) ? { priceValidUntil: p.offer.until.slice(0, 10) } : {}),
  },
});

/* ==========================================================================
   PORTADA
   ========================================================================== */

export function renderHome({ products, settings: s, mode = 'home', category = '', inCategory = [], head: headOverride = null }) {
  const isCatalog = mode === 'catalog';
  // Un solo cuerpo para las dos páginas: los bloques marcados se quedan o se van.
  const only = (html) => html
    .replace(isCatalog ? /<!--home-only-->[\s\S]*?<!--\/home-only-->/g : /<!--catalog-only-->[\s\S]*?<!--\/catalog-only-->/g, '')
    .replace(/<!--\/?(?:home|catalog)-only-->/g, '');
  const cats = ['Todos', 'Ofertas', ...s.categories];
  const picks = dailyPicks(products, { count: 5 });
  const favorites = ['pizarra-lcd-de-12-pulgadas', 'auriculares-gamer-g007', 'velador-patito', 'tumbler-vaso-termico-caka-coffee-club-rosa', 'puzzle-capybara'];
  const covers = s.categories.map(category => ({category, product: products.find(p => p.category === category && p.inStock && p.images?.length && favorites.includes(p.slug)) || products.find(p => p.category === category && p.inStock && p.images?.length)})).filter(c => c.product);
  const scene = covers.slice(0,5);
  const discoverySlugs = ['cubo-de-actividades-de-madera', 'camara-digital-para-ninos-rosa', 'robot-proyector-de-galaxia', 'cafetera-moka-gris-premium', 'pizarra-magnetica-de-madera'];
  const discovery = covers.map(({category,product}) => ({category, product: products.find(p => p.category === category && p.inStock && p.images?.length && discoverySlugs.includes(p.slug)) || products.find(p => p.category === category && p.inStock && p.images?.length && p.slug !== product.slug) || product}));
  const promo = webPromo(s);

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      localBusiness(s),
      {
        '@type': 'WebSite',
        '@id': `${s.siteUrl}/#website`,
        url: s.siteUrl,
        name: s.storeName,
        inLanguage: 'es-AR',
        publisher: { '@id': `${s.siteUrl}/#store` },
      },
      {
        '@type': 'ItemList',
        name: 'Catálogo',
        numberOfItems: products.length,
        itemListElement: products.slice(0, 60).map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${s.siteUrl}/p/${p.slug}/`,
          name: p.name,
        })),
      },
    ],
  });

  const body = `
<header class="hero home-hero"${isCatalog ? '' : ' data-arias-section="hero"'}>
  <!--catalog-only--><a class="catalog-brand" href="/" aria-label="Volver al inicio de ${esc(s.storeName)}"><img class="brand-dark" src="/assets/brand/wordmark-dark.webp" width="780" height="211" alt=""><img class="brand-light" src="/assets/brand/wordmark-light.webp" width="780" height="211" alt=""></a><!--/catalog-only-->
  <!--home-only--><div class="home-mark" aria-hidden="true">${crane('home-mark__img', 132)}</div>
  <h1 class="home-wordmark"><img class="brand-dark" src="/assets/brand/wordmark-dark.webp" width="780" height="211" alt="${esc(s.storeName)} — El Temu 2.0 riojano"><img class="brand-light" src="/assets/brand/wordmark-light.webp" width="780" height="211" alt="${esc(s.storeName)} — El Temu 2.0 riojano"></h1><!--/home-only-->
  <div id="homeSearchAnchor" class="home-search-anchor">
    <form class="home-search" id="homeSearch" role="search" action="/" autocomplete="off">
      <div class="search" id="searchWrap">
        <button class="home-search__go" type="submit" aria-label="Buscar">${ico.search}</button><input id="search" name="q" type="search" enterkeyhint="search" placeholder="¿Qué buscás?" aria-label="Buscar productos" aria-controls="grid" autocomplete="off">
        <button type="button" class="search__clear" id="searchClear" aria-label="Borrar búsqueda">${ico.x}</button>
      </div>
      <div class="home-search__suggestions" id="homeSuggestions" hidden><p>Un buen lugar para empezar</p>${['Termos','Relojes','Auriculares'].map(q=>`<button type="button" data-search-idea="${q}">${ico.search}${q}${ico.chevron}</button>`).join('')}<button type="submit" class="home-search__results">Ver resultados ${ico.chevron}</button></div>
      <div class="island__actions">
        <button type="button" class="island__order" data-open-order aria-haspopup="dialog">${ico.bag}<span class="island__orderLabel">Pedido</span><span class="island__count" data-order-count>0</span></button>
        <button type="button" class="island__menu" data-open-menu aria-haspopup="dialog" aria-controls="menuSheet" aria-label="Menú">${menuIco}<span class="island__dot" id="islandDot" hidden></span></button>
      </div>
    </form>
  </div>
  <!--home-only--><nav class="home-quick" aria-label="Accesos rápidos">
    <a href="/catalogo/" data-home-category="Todos" style="--i:0"><span class="home-quick__ico">${gridIco}</span>Catálogo</a>
    <a href="/catalogo/?cat=Ofertas" data-home-category="Ofertas" style="--i:1"><span class="home-quick__ico">${ico.tag}</span>Ofertas</a>
    <button type="button" data-guide="news" style="--i:2"><span class="home-quick__ico">${ico.bell}</span>Novedades</button>
  </nav><!--/home-only-->
  <div class="home-categories" aria-label="Explorar rubros">${cats.map(c=>`<a href="/catalogo/?cat=${encodeURIComponent(c)}" data-home-category="${esc(c)}">${c==='Todos'?'Ver todo':esc(c)}</a>`).join('')}</div>
</header>
<!--home-only--><section class="attention-carousel banners" id="attentionCarousel" data-arias-section="promos" aria-roledescription="carrusel" aria-label="Promos y novedades">
  <div class="banners__stage">
    <button type="button" class="banners__slide is-active" id="promoBanner" data-banner="0" aria-label="${promo ? `Comprando por la web: todo el catálogo con ${promo.percent}% de descuento pidiendo desde acá. Ver cómo funciona` : 'Comprando por la web. Ver cómo funciona'}">
      <picture>
        <source media="(max-width:720px)" srcset="/assets/promos/banner-promos-mobile-640.webp 640w, /assets/promos/banner-promos-mobile-1000.webp 1000w" sizes="min(86vw, 360px)" width="1000" height="1341">
        <img src="/assets/promos/banner-promos-desktop-1000.webp" srcset="/assets/promos/banner-promos-desktop-1000.webp 1000w, /assets/promos/banner-promos-desktop-1600.webp 1600w" sizes="(max-width:1100px) 92vw, 1000px" width="1600" height="597" alt="" decoding="async" fetchpriority="high">
      </picture>
    </button>
    <a class="banners__slide" id="waBanner" data-banner="1" href="${esc(s.social.whatsappChannel)}" target="_blank" rel="noopener" aria-label="Sumate a nuestro canal de WhatsApp: no te pierdas las novedades de todos los días">
      <picture>
        <source media="(max-width:720px)" srcset="/assets/promos/banner-canal-mobile-640.webp 640w, /assets/promos/banner-canal-mobile-1000.webp 1000w" sizes="min(86vw, 360px)" width="1000" height="1341">
        <img src="/assets/promos/banner-canal-desktop-1000.webp" srcset="/assets/promos/banner-canal-desktop-1000.webp 1000w, /assets/promos/banner-canal-desktop-1600.webp 1600w" sizes="(max-width:1100px) 92vw, 1000px" width="1600" height="597" alt="" decoding="async" fetchpriority="low">
      </picture>
    </a>
  </div>
  <div class="attention-carousel__dots">
    <button type="button" class="attention-carousel__dot" aria-current="true" aria-label="Ver la promo de la web"></button>
    <button type="button" class="attention-carousel__dot" aria-current="false" aria-label="Ver el canal de WhatsApp"></button>
    <button type="button" class="banners__pause" id="bannersPause" aria-pressed="false" aria-label="Pausar el cambio automático de banners"><svg class="ico-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="6" width="3.6" height="12" rx="1.2"/><rect x="13.4" y="6" width="3.6" height="12" rx="1.2"/></svg><svg class="ico-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8.5 6.2v11.6a.8.8 0 0 0 1.2.7l9-5.8a.8.8 0 0 0 0-1.4l-9-5.8a.8.8 0 0 0-1.2.7Z"/></svg></button>
  </div>
</section>
<section class="home-discover shell" aria-labelledby="discoverTitle"><div class="home-section-head"><h2 id="discoverTitle">Un mundo para descubrir</h2><a href="/catalogo/">Ver todo ${ico.chevron}</a></div><div class="home-discover__row">${discovery.map(({category,product:p})=>`<a class="home-discover__card" href="/c/${categorySlug(category)}/" data-home-category="${esc(category)}"><span class="home-discover__image"><img src="${esc(thumbSrc(p.images[0]))}" alt="" width="400" height="400" loading="lazy"></span><span>${esc(category)} ${ico.chevron}</span></a>`).join('')}</div></section>

<div data-arias-slot="superior"></div>



${
  picks.length
    ? `<section class="picks" data-arias-section="destacados" data-reveal>
  <div class="shell">
    <p class="t-eyebrow picks__eyebrow">Cambian cada 5 minutos</p>
    <h2 class="t-h2 picks__title">Elegidos para vos</h2>
    <div class="picks__timer" aria-hidden="true"><span id="picksTimer"></span></div>
  </div>
  <div class="picks__row">
    ${picks
      .map((p, i) => `<div class="picks__item" data-reveal style="transition-delay:${i * 70}ms">${cardHtml(p)}</div>`)
      .join('\n    ')}
  </div>
</section>`
    : ''
}
<!--/home-only-->

<!--catalog-only--><div class="controls" id="catalogo"${category ? ` data-initial-cat="${esc(category)}"` : ''}>
  <div class="shell">
    <div class="home-section-head catalog-head"><h1 id="catalogTitle">${category ? esc(category) : 'Catálogo'}</h1></div>
    <div class="filters" id="filters" role="group" aria-label="Filtros del catálogo">
      <button type="button" class="filterpill" id="catBtn" aria-haspopup="dialog" aria-controls="catSheet"><span id="catBtnLabel">Categoría</span><svg class="filterpill__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
      <button type="button" class="filterpill" id="priceBtn" aria-haspopup="dialog" aria-controls="priceSheet"><span id="priceBtnLabel">Precio</span><svg class="filterpill__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
      <button type="button" class="filterpill filterpill--toggle" id="featuredBtn" aria-pressed="false"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 3.6 2.5 5.3 5.8.7-4.3 4 1.1 5.8-5.1-2.9-5.1 2.9 1.1-5.8-4.3-4 5.8-.7L12 3.6Z"/></svg><span>Destacados</span></button>
      <button type="button" class="filterpill" id="sortBtn" aria-haspopup="dialog" aria-controls="sortSheet"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0 3 3m-3-3-3 3"/></svg><span id="sortBtnLabel">Ordenar</span><svg class="filterpill__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
      <button type="button" class="filterpill filterpill--clear" id="filtersClear" hidden>Limpiar filtros</button>
    </div>
    <div class="controls__state" hidden>
      <select class="sort" id="sort" aria-label="Ordenar">
        <option value="relevancia">Recomendados</option>
        <option value="destacados">Destacados primero</option>
        <option value="precio-asc">Menor precio</option>
        <option value="precio-desc">Mayor precio</option>
        <option value="nombre">Nombre A-Z</option>
      </select>
      <select class="sort" id="priceFilter" aria-label="Filtrar por precio">
        <option value="">Cualquier precio</option>
        <option value="0-10000">Hasta $10.000</option>
        <option value="10000-30000">$10.000 a $30.000</option>
        <option value="30000-60000">$30.000 a $60.000</option>
        <option value="60000-">Más de $60.000</option>
      </select>
    </div>
  </div>
</div>

<div class="promoinfo" id="promoInfo" hidden>
  <div class="shell">
    <button type="button" class="promoinfo__trigger" id="promoInfoOpen">
      <span class="promoinfo__trigger-ico">${ico.tag}</span>
      <span class="promoinfo__trigger-text">
        <strong>${promo ? `${promo.percent}% OFF comprando por la web` : 'Comprá por la web'}</strong>
        <span>Sobre el total del pedido, pidiendo desde acá</span>
      </span>
      <span class="promoinfo__trigger-arrow">${ico.chevron}</span>
    </button>
  </div>
</div>

<!--/catalog-only-->
<dialog class="promodlg" id="promoInfoDlg" aria-labelledby="promoInfoTitle" tabindex="-1">
  <div class="promodlg__head">
    <h2 id="promoInfoTitle">Comprando por la web</h2>
    <button type="button" class="sheet__close" id="promoInfoClose" aria-label="Cerrar">${ico.x}</button>
  </div>
  <div class="promodlg__body">
    <p class="promodlg__big">${promo ? `${promo.percent}% OFF` : 'Pedí desde acá'}</p>
    <p class="promodlg__lead">${promo ? `Todo el catálogo tiene ${promo.percent}% de descuento sobre el total del pedido cuando lo armás y lo mandás desde esta página.` : 'Armá tu pedido acá y te lo confirmamos por WhatsApp.'}</p>
    <ul class="promodlg__steps">
      <li><strong>1.</strong> Agregá lo que quieras al pedido.</li>
      <li><strong>2.</strong> Mandalo por WhatsApp desde el botón del pedido.</li>
      <li><strong>3.</strong> El descuento ya va aplicado en el total que te llega.</li>
    </ul>
    ${promo?.disclaimer ? `<p class="promodlg__disclaimer">${esc(promo.disclaimer)}</p>` : ''}
  </div>
</dialog>

<!--catalog-only--><dialog class="sortsheet" id="catSheet" aria-labelledby="catSheetTitle" tabindex="-1">
  <div class="sortsheet__head">
    <h2 id="catSheetTitle">Categoría</h2>
    <button type="button" class="sheet__close" id="catSheetClose" aria-label="Cerrar">${ico.x}</button>
  </div>
  <div class="sortsheet__body">
  <div class="chips" id="chips" role="group" aria-label="Filtrar por rubro">
    ${cats
      .map(
        (c, i) =>
          `<button class="chip${c === 'Ofertas' ? ' chip--ofertas' : ''}" data-cat="${esc(c)}" aria-pressed="${i === 0}">${c === 'Ofertas' ? ico.tag : ''}${esc(c)}</button>`
      )
      .join('\n      ')}
  </div>
  </div>
</dialog><!--/catalog-only-->

<dialog class="sortsheet" id="sortSheet" aria-labelledby="sortSheetTitle" tabindex="-1">
  <div class="sortsheet__head">
    <h2 id="sortSheetTitle">Ordenar por</h2>
    <button type="button" class="sheet__close" id="sortSheetClose" aria-label="Cerrar">${ico.x}</button>
  </div>
  <div class="sortsheet__body" id="sortSheetBody">
    <button type="button" class="sortopt" data-sort="relevancia">Recomendados</button>
    <button type="button" class="sortopt" data-sort="destacados">Destacados primero</button>
    <button type="button" class="sortopt" data-sort="precio-asc">Menor precio</button>
    <button type="button" class="sortopt" data-sort="precio-desc">Mayor precio</button>
    <button type="button" class="sortopt" data-sort="nombre">Nombre A-Z</button>
  </div>
</dialog>

<dialog class="sortsheet" id="priceSheet" aria-labelledby="priceSheetTitle" tabindex="-1">
  <div class="sortsheet__head">
    <h2 id="priceSheetTitle">Filtrar por precio</h2>
    <button type="button" class="sheet__close" id="priceSheetClose" aria-label="Cerrar">${ico.x}</button>
  </div>
  <div class="sortsheet__body" id="priceSheetBody">
    <button type="button" class="sortopt" data-price="">Cualquier precio</button>
    <button type="button" class="sortopt" data-price="0-10000">Hasta $10.000</button>
    <button type="button" class="sortopt" data-price="10000-30000">$10.000 a $30.000</button>
    <button type="button" class="sortopt" data-price="30000-60000">$30.000 a $60.000</button>
    <button type="button" class="sortopt" data-price="60000-">Más de $60.000</button>
  </div>
</dialog>

<!--home-only--><div data-arias-slot="debajo_buscador"></div><!--/home-only-->
<div data-arias-slot="antes_productos"></div>

<main class="shell" id="productos"${isCatalog ? '' : ' data-arias-section="productos"'}>
  <!--home-only--><div class="home-section-head featured-head"><h2 id="featuredTitle">Destacados</h2><a href="/catalogo/">Ver todo ${ico.chevron}</a></div><!--/home-only-->
  <p class="results-line" id="resultsLine"></p>
  <div class="grid" id="grid">${category && inCategory.length ? inCategory.map(cardHtml).join('\n    ') : skeletonCards(10)}</div>
  <div class="empty" id="empty" hidden>
    <h3>No encontramos nada con esa búsqueda</h3>
    <p class="t-body">Probá con otras palabras, o escribinos y lo buscamos por vos.</p>
    <p id="emptyClearWrap" hidden><button type="button" class="btn btn--ghost" id="emptyClear">Limpiar filtros</button></p>
    <p style="margin-top:18px">
      <a class="btn btn--gold" data-arias-whatsapp href="https://wa.me/${s.whatsapp}" target="_blank" rel="noopener">${ico.wa} Consultar por WhatsApp</a>
    </p>
  </div>
  <!--catalog-only--><p class="catalog-more" id="catalogMore" hidden><button type="button" class="btn btn--ghost" id="loadMore">Ver más productos</button></p>
  <div class="catalog-after" data-arias-slot="debajo_buscador"></div><!--/catalog-only-->
  <!--home-only--><p class="featured-more"><a class="btn btn--gold" href="/catalogo/">Ver todo el catálogo ${ico.chevron}</a></p><!--/home-only-->
</main>

<!--home-only--><section class="section" id="visitanos" data-arias-section="visitanos">
  <div class="shell">
    <div class="section__head" data-reveal>
      <h2 class="t-h1">Visitanos</h2>
      <p class="t-body">Estamos en pleno centro de La Rioja. Si buscás algo puntual, escribinos y te decimos si lo tenemos antes de que vengas.</p>
    </div>
    <div class="info-grid">
      <div class="info-card" data-reveal>
        <div class="info-card__icon">${ico.pin}</div>
        <h3>Dirección</h3>
        <p>${esc(s.address)}</p>
        <p style="margin-top:10px"><a class="btn btn--gold btn--sm" href="${esc(s.mapsUrl)}" target="_blank" rel="noopener">${ico.mapPin} Ver en el mapa</a></p>
      </div>
      <div class="info-card info-card--highlight" id="horarios" data-reveal>
        <div class="info-card__top">
          <div class="info-card__icon">${ico.clock}</div>
          <span class="info-card__status" id="hoursCardStatus" hidden></span>
        </div>
        <h3>Horarios</h3>
        <div class="hours-list">
          ${s.hoursDisplay
            .map((h) => `<div><span>${esc(h.label)}</span><span>${esc(h.value)}</span></div>`)
            .join('\n          ')}
        </div>
      </div>
      <div class="info-card" data-reveal>
        <div class="info-card__icon">${ico.wa}</div>
        <h3>Consultas y pedidos</h3>
        <p>Armá tu pedido acá y te lo mandamos escrito por WhatsApp. Te confirmamos stock y forma de pago.</p>
        <p style="margin-top:10px"><a class="btn btn--gold btn--sm" data-arias-whatsapp href="https://wa.me/${s.whatsapp}" target="_blank" rel="noopener">${ico.wa} ${esc(s.phoneDisplay)}</a></p>
      </div>
    </div>
  </div>
</section><!--/home-only-->

<div data-arias-slot="pie"></div>

${footer(s)}`;

  return layout({
    head: {
      title: `${s.storeName} — Juguetería, librería y tecnología en La Rioja`,
      description: clamp(
        `Catálogo online de ${s.storeName}: juguetes, librería, bazar, regalería, electrónica y tecnología en La Rioja. ${products.length} productos con precio. Consultá y pedí por WhatsApp.`,
        158
      ),
      canonical: isCatalog ? `${s.siteUrl}/catalogo/` : `${s.siteUrl}/`,
      jsonLd,
      ...(isCatalog ? { title: `Catálogo — ${s.storeName} | Buscá entre ${products.length} productos` } : {}),
      ...(headOverride || {}),
    },
    body: only(body),
    bodyClass: isCatalog ? 'page-home page-catalog' : 'page-home',
    settings: s,
  });
}

/* ==========================================================================
   PÁGINA DE RUBRO (Ronda 9 — SEO por categoría)
   Generada en scripts/build.js, una por cada rubro con al menos un
   producto visible — no reemplaza el filtro client-side de la portada
   (?cat=, los chips), es una URL indexable aparte.
   ========================================================================== */

export function renderCategory({ category, products, all = [], settings: s }) {
  const url = `${s.siteUrl}/c/${categorySlug(category)}/`;

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      localBusiness(s),
      {
        '@type': 'CollectionPage',
        '@id': `${url}#page`,
        url,
        name: `${category} — ${s.storeName}`,
        isPartOf: { '@id': `${s.siteUrl}/#website` },
        about: { '@id': `${s.siteUrl}/#store` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${s.siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: category, item: url },
        ],
      },
      {
        '@type': 'ItemList',
        name: category,
        numberOfItems: products.length,
        itemListElement: products.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${s.siteUrl}/p/${p.slug}/`,
          name: p.name,
        })),
      },
    ],
  });

  // Misma página que /catalogo/ (buscador, filtros, grilla), abierta en este
  // rubro y con sus productos ya en el HTML: carga más rápido y los buscadores
  // ven los enlaces sin ejecutar JavaScript.
  return renderHome({
    products: all.length ? all : products,
    settings: s,
    mode: 'catalog',
    category,
    inCategory: products,
    head: {
      title: `${category} — ${s.storeName} | Juguetería, librería y bazar en La Rioja`,
      description: clamp(
        `${category} en ${s.storeName}: ${products.length} productos con precio. Consultá y pedí por WhatsApp.`,
        158
      ),
      canonical: url,
      jsonLd,
    },
  });
}
/* ==========================================================================
   LANDING DE PRODUCTO
   ========================================================================== */

export function renderProduct({ product: p, related, settings: s }) {
  const url = `${s.siteUrl}/p/${p.slug}/`;
  const main = p.images[0];

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      productLd(s, p),
      localBusiness(s),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${s.siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: p.category, item: `${s.siteUrl}/#catalogo` },
          { '@type': 'ListItem', position: 3, name: p.name, item: url },
        ],
      },
    ],
  });

  const body = `
<div class="shell">
  <nav class="crumbs" aria-label="Migas de pan">
    <a href="/">Inicio</a>${ico.chevron}
    <a href="/c/${categorySlug(p.category)}/">${esc(p.category)}</a>${ico.chevron}
    <span>${esc(p.name)}</span>
  </nav>

  <article class="product">
    <div class="product__gallery">
      <div class="product__stage">
        <img id="stage" src="${esc(fullSrc(main))}" width="500" height="500"
             alt="${esc(p.name)}" fetchpriority="high">
      </div>
      ${
        p.images.length > 1
          ? `<div class="product__thumbs" id="thumbs">
        ${p.images
          .map(
            (id, i) =>
              `<button type="button" data-src="${esc(fullSrc(id))}" aria-current="${i === 0}" aria-label="Foto ${i + 1}"><img src="${esc(thumbSrc(id))}" width="64" height="64" alt="" loading="lazy"></button>`
          )
          .join('\n        ')}
      </div>`
          : ''
      }
    </div>

    <div class="product__info">
      <div class="product__badges">
        <span class="product__cat">${esc(p.category)}</span>
        ${
          offerActive(p)
            ? offerDaysLeft(p) <= 3
              ? `<span class="flag flag--urgent">${ico.fire}${
                  offerDaysLeft(p) <= 0 ? 'Termina hoy' : offerDaysLeft(p) === 1 ? 'Termina mañana' : `Termina en ${offerDaysLeft(p)} días`
                }</span>`
              : `<span class="flag flag--offer">${ico.tag}Oferta hasta el ${dateFmt(p.offer.until)}</span>`
            : ''
        }
        ${!offerActive(p) && isNew(p) ? `<span class="flag flag--new">Nuevo</span>` : ''}
        ${p.featured ? `<span class="flag flag--featured">${ico.sparkle}Lo más elegido</span>` : ''}
      </div>
      <h1 class="t-h1">${esc(p.name)}</h1>
      <p class="product__price-row">
        ${offerHasDiscount(p) ? `<span class="product__price-old">${money(p.price)}</span>` : ''}
        <span class="product__price">${money(offerHasDiscount(p) ? p.offer.price : p.price)}</span>
      </p>
      ${webPromo(s) ? `<p class="product__webprice">${ico.tag}<span>Comprando por la web: <strong>${money(Math.round((offerHasDiscount(p) ? p.offer.price : p.price) * (1 - webPromo(s).percent / 100)))}</strong> · ${webPromo(s).percent}% OFF sobre el total del pedido</span></p>` : ''}
      ${offerActive(p) && p.offer.note ? `<p class="product__offer-note">${ico.sparkle} ${esc(p.offer.note)}</p>` : ''}
      <p class="product__stock" data-out="${!p.inStock}">${p.inStock ? 'Disponible en el local' : 'Sin stock por ahora'}</p>
      <div class="product__actions">
        <!-- Ronda 8: cantidad antes de agregar. El botón de la barra fija de
             mobile (.stickycta__add, más abajo) lee este mismo valor — no
             tiene su propio stepper, para no tener dos estados separados
             de la misma cosa. -->
        <div class="qtystepper" id="productQty">
          <button type="button" class="qtystepper__btn" data-qty-step="-1" aria-label="Restar uno">${ico.minus}</button>
          <span class="qtystepper__val" id="productQtyVal">1</span>
          <button type="button" class="qtystepper__btn" data-qty-step="1" aria-label="Sumar uno">${ico.plus}</button>
        </div>
        <button class="btn btn--gold product__add" data-add="${esc(p.slug)}">${ico.plus} Agregar al pedido</button>
        <a class="btn product__wa" data-arias-whatsapp data-arias-whatsapp-message="${esc(`Hola! Quiero consultar por: ${p.name} (${paidPrice(p)}) ${url}`)}" href="https://wa.me/${s.whatsapp}?text=${encodeURIComponent(`Hola! Quiero consultar por: ${p.name} (${paidPrice(p)}) ${url}`)}" target="_blank" rel="noopener">${ico.wa} Consultar por WhatsApp</a>
        <button type="button" class="btn btn--ghost product__ask" id="askAboutBtn"
                data-ask="${esc(`Quiero consultar por: ${p.name} (${money(p.price)})`)}">
          ${askIco} Preguntarle a la IA
        </button>
        <button type="button" class="btn btn--ghost product__share" ${shareAttrs(p)}>${shareIco} Compartir</button>
      </div>
      <div class="product__more">
        <details class="pacc" open>
          <summary>Descripción ${ico.chevron}</summary>
          <div class="pacc__body"><p class="product__desc" id="productDesc">${esc(p.description)}</p>${p.description.length > 320 ? `<button type="button" class="pacc__more" id="productDescMore" aria-expanded="false" aria-controls="productDesc">Leer más</button>` : ''}</div>
        </details>
        <details class="pacc">
          <summary>Cómo comprar ${ico.chevron}</summary>
          <div class="pacc__body"><ol class="pacc__steps"><li>Tocá <strong>Agregar al pedido</strong> y sumá todo lo que quieras.</li><li>Abrí <strong>Mi pedido</strong> y mandalo por WhatsApp${webPromo(s) ? `: el ${webPromo(s).percent}% de descuento ya va aplicado en el total` : ''}.</li><li>Te confirmamos stock y forma de pago, y coordinamos la entrega o el retiro.</li></ol></div>
        </details>
        <details class="pacc">
          <summary>Retiro en el local y horarios ${ico.chevron}</summary>
          <div class="pacc__body"><p>${ico.pin} ${esc(s.address)}</p><div class="pacc__hours">${s.hoursDisplay.map((h) => `<div><span>${esc(h.label)}</span><span>${esc(h.value)}</span></div>`).join('')}</div><p><a class="pacc__link" href="${esc(s.mapsUrl)}" target="_blank" rel="noopener">Ver en el mapa ${ico.chevron}</a></p></div>
        </details>
      </div>
    </div>
  </article>
</div>

<!-- Ronda 8: lightbox de la galería, se abre al tocar la foto principal.
     Reusa openDialog/closeDialog/wireDialog/enableDragToClose de ui.js
     igual que el resto de los dialogs del sitio; el pinch-zoom/pan/swipe
     de adentro lo maneja app.js con Pointer Events nativos, sin ninguna
     librería. -->
<dialog class="lightbox" id="galleryLightbox" aria-label="${esc(p.name)}" tabindex="-1">
  <button type="button" class="lightbox__close" id="lightboxClose" aria-label="Cerrar">${ico.x}</button>
  <div class="lightbox__stage" id="lightboxStage">
    <img class="lightbox__img" id="lightboxImg" src="${esc(fullSrc(main))}" alt="${esc(p.name)}">
  </div>
  ${
    p.images.length > 1
      ? `<div class="lightbox__nav">
    <button type="button" class="lightbox__arrow lightbox__arrow--prev" id="lightboxPrev" aria-label="Foto anterior">${ico.chevron}</button>
    <button type="button" class="lightbox__arrow lightbox__arrow--next" id="lightboxNext" aria-label="Foto siguiente">${ico.chevron}</button>
  </div>`
      : ''
  }
</dialog>

<!-- En mobile duplica el CTA de arriba, fijo abajo: el precio y el botón
     de agregar quedan siempre al alcance del pulgar sin importar cuánto
     se scrolleó la descripción. Mismo data-add, participa del mismo
     estado (ícono a check) que el resto de los botones de agregar. -->
<div class="stickycta">
  <div class="stickycta__price">
    ${offerHasDiscount(p) ? `<span class="stickycta__old">${money(p.price)}</span>` : ''}
    <strong>${money(offerHasDiscount(p) ? p.offer.price : p.price)}</strong>
  </div>
  <button class="btn btn--gold stickycta__add" data-add="${esc(p.slug)}">${ico.plus} Agregar</button>
</div>

${
  related.length
    ? `<section class="related">
  <div class="shell">
    <h2 class="t-h2">También te podría gustar</h2>
    <div class="grid">
      ${related.map((r) => cardHtml(r)).join('\n      ')}
    </div>
  </div>
  <form class="psearch" action="/catalogo/" method="get" role="search">
    <input type="search" name="q" placeholder="¿Qué buscás?" aria-label="Buscar en el catálogo" enterkeyhint="search" autocomplete="off">
    <button type="submit" aria-label="Buscar">${ico.search}</button>
  </form>
</section>`
    : ''
}

${footer(s)}`;

  // El precio del título/OG tiene que ser el que realmente paga la persona
  const displayPrice = money(offerHasDiscount(p) ? p.offer.price : p.price);

  return layout({
    head: {
      title: `${p.name} — ${displayPrice}${offerActive(p) ? ' (Oferta)' : ''} | ${s.storeName}`,
      ogTitle: `${p.name} — ${displayPrice}${offerActive(p) ? ' (Oferta)' : ''}`,
      description: clamp(`${p.description} ${p.category} en ${s.storeName}, La Rioja. Consultá por WhatsApp.`, 158),
      canonical: url,
      image: shareCardUrl({ imageId: main, name: p.name, priceText: displayPrice, note: webPromo(s) ? `${webPromo(s).percent}% OFF comprando por la web` : '' }),
      imageWidth: 1200,
      imageHeight: 630,
      imageAlt: `${p.name} — ${displayPrice} en ${s.storeName}`,
      price: offerHasDiscount(p) ? p.offer.price : p.price,
      inStock: p.inStock,
      ogType: 'product',
      jsonLd,
      preload: `<link rel="preload" as="image" href="${esc(fullSrc(main))}" fetchpriority="high">`,
    },
    body,
    settings: s,
    bodyClass: 'page-product',
  });
}

/**
 * Placeholders con brillo mientras carga el JS y llega products.json.
 * Van server-renderizados en el HTML inicial: sin esto la grilla arranca
 * completamente en blanco hasta que corre el fetch, que en un celular con
 * mala señal se nota.
 */
const skeletonCards = (n) =>
  Array.from(
    { length: n },
    () => `<div class="card card--skel" aria-hidden="true">
    <div class="card__media"></div>
    <div class="card__body">
      <span class="skel-line" style="width:40%"></span>
      <span class="skel-line" style="width:85%"></span>
      <span class="skel-line" style="width:30%;margin-top:8px"></span>
    </div>
  </div>`
  ).join('');

/**
 * Tarjeta de producto. app.js importa esta misma función para el render en
 * el navegador — no hay una segunda copia que mantener sincronizada.
 */
export function cardHtml(p) {
  const main = p.images[0];
  const onOffer = offerActive(p);
  // El precio con descuento es opcional: una oferta puede ser sólo un
  // mensaje ("2x1", "traé el cupón") sin cambiar el número.
  const hasDiscount = offerHasDiscount(p);

  // Prioridad de badges cuando hay varios: sin stock tapa todo (no importa
  // si es nuevo o está en oferta si no lo podés comprar); si hay stock,
  // oferta y "nuevo" pueden convivir apiladas.
  const flags = !p.inStock
    ? `<span class="flag flag--out">Sin stock</span>`
    : [
        onOffer ? `<span class="flag flag--offer">${ico.tag}Oferta</span>` : '',
        isNew(p) ? `<span class="flag flag--new">Nuevo</span>` : '',
      ].join('');

  return `<article class="card${p.inStock ? '' : ' card--out'}" data-slug="${esc(p.slug)}">
  <div class="card__media">
    <div class="card__flags">${flags}</div>
    <img src="${esc(thumbSrc(main))}" width="400" height="400" loading="lazy" decoding="async" alt="${esc(p.name)}">
    <button type="button" class="card__share" ${shareAttrs(p)} aria-label="Compartir ${esc(p.name)}">${shareIco}</button>
    <button class="card__add" data-add="${esc(p.slug)}" aria-label="Agregar ${esc(p.name)} al pedido">${ico.plus}</button>
  </div>
  <div class="card__body">
    <span class="card__cat">${esc(p.category)}</span>
    <a class="card__name card__link" href="/p/${esc(p.slug)}/">${esc(p.name)}</a>
    <span class="card__stock">${p.inStock ? 'En stock' : 'Sin stock'}</span>
    <span class="card__price-row">
      ${hasDiscount ? `<span class="card__price-old">${money(p.price)}</span>` : ''}
      <span class="card__price">${money(hasDiscount ? p.offer.price : p.price)}</span>
    </span>
  </div>
</article>`;
}

export { ico };
