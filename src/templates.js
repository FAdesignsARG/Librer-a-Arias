/**
 * Generación de HTML. Lo usan tanto el servidor de desarrollo (render al
 * vuelo) como scripts/build.js (escribe el sitio estático), así que lo que
 * se ve en local es exactamente lo que se publica.
 */
import { cloudinaryUrl } from './cloudinary-config.js';
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

/* ---------- ofertas ----------
   Una oferta vive DENTRO del producto (product.offer), no en una colección
   aparte: cada producto tiene como mucho una oferta activa a la vez, que es
   como Fran las piensa ("este producto está en oferta hasta tal fecha").
   Menos piezas que un sistema de campañas separado, y alcanza para lo que
   se pidió: tarjetas de oferta con vencimiento, manejables desde el panel.
   Vencida sola: si `until` ya pasó, se trata como si no existiera. */
export const offerActive = (p) => !!p.offer?.until && new Date(p.offer.until).getTime() > Date.now();
export const offerHasDiscount = (p) => offerActive(p) && Number(p.offer.price) > 0;

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
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12 5.5 5.5L20 7"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l1.2 13H4.8L6 7Z"/><path d="M9 7V5.5a3 3 0 0 1 6 0V7"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
  wa: '<svg viewBox="0 0 32 32" fill="currentColor"><path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.408.71 4.65 1.929 6.533L4 29l7.646-1.884A11.94 11.94 0 0 0 16 27c6.627 0 12-5.373 12-12S22.628 3 16.001 3zm0 21.6c-1.79 0-3.46-.52-4.867-1.417l-.349-.22-4.14 1.02 1.04-4.03-.228-.36A9.55 9.55 0 0 1 6.4 15c0-5.294 4.307-9.6 9.601-9.6 5.293 0 9.6 4.306 9.6 9.6 0 5.293-4.307 9.6-9.6 9.6zm5.27-7.18c-.288-.145-1.706-.842-1.97-.938-.264-.096-.457-.144-.65.145-.192.288-.745.937-.913 1.13-.168.192-.336.216-.624.072-.289-.145-1.219-.45-2.322-1.433-.858-.766-1.437-1.712-1.605-2-.168-.289-.018-.445.126-.589.13-.129.289-.336.433-.504.145-.168.193-.289.29-.481.096-.193.048-.361-.024-.505-.073-.145-.65-1.566-.89-2.144-.234-.563-.472-.487-.65-.496l-.553-.01a1.06 1.06 0 0 0-.77.361c-.264.289-1.01.987-1.01 2.408 0 1.42 1.034 2.792 1.178 2.985.145.192 2.036 3.11 4.933 4.36.69.298 1.228.476 1.648.61.692.22 1.322.189 1.82.115.555-.083 1.706-.698 1.947-1.372.24-.673.24-1.25.168-1.37-.072-.121-.264-.193-.553-.337z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-7.58 7-12a7 7 0 0 0-14 0c0 4.42 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
  ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none"/></svg>',
  fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.5 8.5h2.6V5.1h-2.6c-2.6 0-4.6 2-4.6 4.6v1.8H7.6v3.4h2.3V21h3.4v-6.1h2.6l.5-3.4h-3.1V9.7c0-.7.5-1.2 1.2-1.2z"/></svg>',
  tk: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 3c.4 2.1 1.9 3.7 4 4v3c-1.4 0-2.7-.4-3.9-1.1v6.1c0 3.3-2.7 6-6 6s-6-2.7-6-6 2.7-6 6-6c.3 0 .6 0 .9.1v3.1c-.3-.1-.6-.1-.9-.1-1.6 0-3 1.3-3 3s1.4 3 3 3 3-1.3 3-3V3h2.9z"/></svg>',
  mapPin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-7.58 7-12a7 7 0 0 0-14 0c0 4.42 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.6 3.4 20 10.8a2 2 0 0 1 0 2.8l-6.4 6.4a2 2 0 0 1-2.8 0L3.4 12.6V4a.6.6 0 0 1 .6-.6h8.6z"/><circle cx="8" cy="8" r="1.4"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l1.8 5.7 5.7 1.8-5.7 1.8L12 17.5l-1.8-5.7-5.7-1.8 5.7-1.8L12 2.5z"/></svg>',
  fire: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 2c.3 2.6-.7 3.9-2 5.3C9 8.7 7.5 10.4 7.5 13a4.5 4.5 0 0 0 9 0c0-1.4-.5-2.3-1.1-3.2.9.4 2.1 1.6 2.1 4a5.5 5.5 0 0 1-11 0c0-4.5 3-6.3 4.5-8.3.9-1.2 1.3-2.1 1.5-3.5z"/></svg>',
};

/* ---------- tema ----------
   Corre antes de que el navegador pinte nada. Si esperáramos al módulo,
   se vería un flash del tema equivocado en cada carga. */
const themeBootScript = `<script>(function(){try{
var t=localStorage.getItem('arias.tema');
if(!t)t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
document.documentElement.dataset.theme=t;
if(sessionStorage.getItem('arias.splash.visto')!=='1')document.documentElement.dataset.splash='running';
}catch(e){document.documentElement.dataset.theme='dark';}})();<\/script>`;

const splashHtml = (s) => `<div class="splash" id="splash" aria-hidden="true">
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

const themeButton = `<button class="themebtn" id="themeBtn" aria-label="Cambiar entre modo claro y oscuro" title="Cambiar tema">
  <svg class="ico-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>
  <svg class="ico-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6"/></svg>
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
<link rel="stylesheet" href="/src/assistant.css">
<link rel="stylesheet" href="/src/notify.css">
${head.preload || ''}
${themeBootScript}
<script type="application/ld+json">${head.jsonLd}</script>
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
${splashHtml(s)}
${navbar(s)}
${body}
${orderSheet(s)}
${notifyPanel()}
${menuSheetHtml()}
${welcomeHtml(s)}
<script type="module" src="/src/theme.js"></script>
<script type="module" src="/src/app.js"></script>
<script type="module" src="/src/assistant.js"></script>
<script type="module" src="/src/analytics.js"></script>
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
const askIco =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z"/><path d="M9.2 10.2a2.8 2.8 0 0 1 5.4.9c0 1.9-2.7 2.4-2.7 2.4"/><path d="M12 17.2h.01"/></svg>';

const navbar = (s) => `<nav class="nav" id="nav">
  <div class="nav__inner">
    <a class="nav__brand" href="/" aria-label="${esc(s.storeName)} — inicio">
      ${crane('nav__crane', 32)}
      <span>${esc(s.storeName)}</span>
    </a>
    <a class="statusbadge" id="statusBadge" href="/#horarios" hidden></a>
    <div class="nav__links">
      <a class="nav__link" href="/#catalogo">Catálogo</a>
      <a class="nav__link" href="/#visitanos">Visitanos</a>
    </div>
    <button class="bellbtn" id="bellBtn" aria-haspopup="dialog" aria-label="Novedades y ofertas">
      ${ico.bell}<span class="bellbtn__dot" id="bellDot" hidden></span>
    </button>
    ${themeButton}
    <a class="btn btn--gold btn--sm nav__wa" href="https://wa.me/${s.whatsapp}" target="_blank" rel="noopener">
      ${ico.wa} Escribinos
    </a>
    <button type="button" class="menubtn" id="menuBtn" aria-haspopup="dialog" aria-label="Menú">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>
  </div>
</nav>`;

const chatIco =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z"/><path d="M9.2 10.2a2.8 2.8 0 0 1 5.4.9c0 1.9-2.7 2.4-2.7 2.4"/><path d="M12 17.2h.01"/></svg>';

/**
 * Menú de mobile — el único lugar donde se puede llegar a Catálogo /
 * Horarios / Visitanos ahí (nav__links vive oculto debajo de 720px). De
 * paso, una guía rápida de cómo moverse por el sitio — sutil, con un
 * botón que HACE cada cosa en vez de explicarla, nada de plantearlo como
 * un instructivo de compra.
 */
const menuSheetHtml = () => `<dialog class="sortsheet menusheet" id="menuSheet" aria-labelledby="menuSheetTitle" tabindex="-1">
  <div class="sortsheet__head">
    <h2 id="menuSheetTitle">Menú</h2>
    <button type="button" class="sheet__close" id="menuSheetClose" aria-label="Cerrar">${ico.x}</button>
  </div>
  <div class="menusheet__body">
    <nav class="menusheet__links" id="menusheetLinks">
      <a href="/#catalogo">Catálogo</a>
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
    <a class="dockbtn dockbtn--wa" href="https://wa.me/${s.whatsapp}" target="_blank" rel="noopener"
       aria-label="Escribinos por WhatsApp" title="Escribinos por WhatsApp">
      ${ico.wa}
    </a>
    <button class="dockbtn dockbtn--ai" id="askBtn" aria-haspopup="dialog" aria-label="Preguntarle al asistente">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z"/><path d="M9.2 10.2a2.8 2.8 0 0 1 5.4.9c0 1.9-2.7 2.4-2.7 2.4"/><path d="M12 17.2h.01"/></svg>
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
    <img class="brand-dark" src="/assets/brand/mark-dark.webp" width="34" height="34" alt="">
    <img class="brand-light" src="/assets/brand/mark-light.webp" width="34" height="34" alt="">
    <div class="chat__title">
      <h2 id="chatTitle">Asistente de ${esc(s.storeName)}</h2>
      <p id="chatSub">Te ayudo a encontrar lo que buscás</p>
    </div>
    <button class="sheet__close" id="chatClose" aria-label="Cerrar">${ico.x}</button>
  </div>
  <div class="chat__body" id="chatBody"></div>
  <div class="chat__foot">
    <form class="chat__form" id="chatForm">
      <textarea id="chatInput" rows="1" placeholder="¿Qué estás buscando?" enterkeyhint="send" autocomplete="off"></textarea>
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
          <li><a href="https://wa.me/${s.whatsapp}" target="_blank" rel="noopener">${esc(s.phoneDisplay)}</a></li>
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

export function renderHome({ products, settings: s }) {
  const cats = ['Todos', 'Ofertas', ...s.categories];
  const picks = dailyPicks(products, { count: 5 });
  // Ronda 1.1: badge de urgencia con el tramo más alto real — si cambia en
  // Firestore, el número del carrusel cambia solo, nunca queda hardcodeado.
  const maxPromoPercent = Math.max(...s.promos.tiers.map((t) => t.percent));

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
<header class="hero">
  <div class="hero__bg" style="background-image:url('/assets/brand/hero-bg.webp')"></div>
  <div class="hero__mark">${crane('hero__crane', 132)}</div>
  <img class="hero__title brand-dark" src="/assets/brand/wordmark-dark.webp" width="780" height="211"
       alt="${esc(s.storeName)}" fetchpriority="high">
  <img class="hero__title brand-light" src="/assets/brand/wordmark-light.webp" width="780" height="211"
       alt="${esc(s.storeName)}" fetchpriority="high">
  <div class="hero__actions">
    <a class="btn btn--gold" href="#catalogo">Ver el catálogo</a>
    <a class="btn btn--ghost" href="${esc(s.mapsUrl)}" target="_blank" rel="noopener">${ico.pin} Cómo llegar</a>
  </div>
  <div class="social">
    <a href="${esc(s.social.maps)}" target="_blank" rel="noopener" aria-label="Ubicación">${ico.mapPin}</a>
    <a href="${esc(s.social.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">${ico.ig}</a>
    <a href="${esc(s.social.facebook)}" target="_blank" rel="noopener" aria-label="Facebook">${ico.fb}</a>
    <a href="${esc(s.social.tiktok)}" target="_blank" rel="noopener" aria-label="TikTok">${ico.tk}</a>
  </div>
</header>

<section class="attention-carousel" id="attentionCarousel" data-reveal>
  <div class="attention-carousel__track">
    <a class="attn__slide attn__slide--promos" id="promoBanner" href="?cat=Ofertas#catalogo">
      <div class="attn__media" style="background-image:url('/assets/promos/adolfito-cupon-descuento.webp')"></div>
      <div class="attn__content">
        <span class="attn__badge">${ico.tag}Hasta ${maxPromoPercent}% OFF</span>
        <h2 class="attn__title">Promos activas</h2>
        <p class="attn__desc">Mirá cuánto ahorrás pagando en efectivo o transferencia</p>
        <span class="attn__cta">Ver promociones</span>
      </div>
    </a>
    <a class="attn__slide attn__slide--whatsapp" href="${esc(s.social.whatsappChannel)}" target="_blank" rel="noopener">
      <div class="attn__media" style="background-image:url('/assets/brand/banner-canal.webp')"></div>
      <div class="attn__content">
        <h2 class="attn__title">Sumate a nuestro canal</h2>
        <p class="attn__desc">Enterate primero de las novedades por WhatsApp</p>
        <span class="attn__cta">${ico.wa} Sumarme al canal</span>
      </div>
    </a>
  </div>
  <div class="attention-carousel__dots" role="tablist" aria-label="Elegir promoción">
    <button type="button" class="attention-carousel__dot" aria-label="Ver promociones activas" aria-current="true" data-index="0"></button>
    <button type="button" class="attention-carousel__dot" aria-label="Ver canal de WhatsApp" aria-current="false" data-index="1"></button>
  </div>
</section>

${
  picks.length
    ? `<section class="picks" data-reveal>
  <div class="shell">
    <h2 class="picks__title">Elegidos para vos hoy</h2>
  </div>
  <div class="picks__row">
    ${picks
      .map((p, i) => `<div class="picks__item" data-reveal style="transition-delay:${i * 70}ms">${cardHtml(p)}</div>`)
      .join('\n    ')}
  </div>
</section>`
    : ''
}

<div class="controls" id="catalogo">
  <div class="shell">
    <div class="controls__row">
      <div class="search" id="searchWrap">
        ${ico.search}
        <input id="search" type="text" autocomplete="off" enterkeyhint="search"
               placeholder="Buscá por nombre, o probá &quot;regalo para nena&quot;"
               aria-label="Buscar productos">
        <kbd class="search__kbd" aria-hidden="true">/</kbd>
        <button class="search__clear" id="searchClear" aria-label="Borrar búsqueda">${ico.x}</button>
      </div>
      <select class="sort" id="sort" aria-label="Ordenar">
        <option value="relevancia">Recomendados</option>
        <option value="destacados">Destacados primero</option>
        <option value="precio-asc">Menor precio</option>
        <option value="precio-desc">Mayor precio</option>
        <option value="nombre">Nombre A-Z</option>
      </select>
      <button type="button" class="sortbtn" id="sortBtn" aria-haspopup="dialog" aria-label="Ordenar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0 3 3m-3-3-3 3"/></svg>
      </button>
      <select class="sort" id="priceFilter" aria-label="Filtrar por precio">
        <option value="">Cualquier precio</option>
        <option value="0-10000">Hasta $10.000</option>
        <option value="10000-30000">$10.000 a $30.000</option>
        <option value="30000-60000">$30.000 a $60.000</option>
        <option value="60000-">Más de $60.000</option>
      </select>
      <button type="button" class="sortbtn" id="priceBtn" aria-haspopup="dialog" aria-label="Filtrar por precio">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
      </button>
    </div>
    <div class="chips" id="chips" role="group" aria-label="Filtrar por rubro">
      ${cats
        .map(
          (c, i) =>
            `<button class="chip${c === 'Ofertas' ? ' chip--ofertas' : ''}" data-cat="${esc(c)}" aria-pressed="${i === 0}">${c === 'Ofertas' ? ico.tag : ''}${esc(c)}</button>`
        )
        .join('\n      ')}
    </div>
  </div>
</div>

<div class="promoinfo" id="promoInfo" hidden>
  <div class="shell">
    <div class="promoinfo__card">
      <img class="promoinfo__img" src="/assets/promos/promo-llevamas-pagamenos.webp"
           width="1122" height="1402" loading="lazy"
           alt="Llevá más, pagá menos — descuentos escalonados por monto de compra">
      <div class="promoinfo__body">
        <h3>Llevá más, pagá menos</h3>
        <ul class="promoinfo__tiers">
          ${s.promos.tiers
            .map((t) => `<li><strong>${t.percent}% OFF</strong><span>desde ${money(t.minAmount)}</span></li>`)
            .join('\n          ')}
        </ul>
        <p class="promoinfo__note">${esc(s.promos.paymentNote)}</p>
        <p class="promoinfo__chachos">${ico.tag}Pagando con CHACHOS: <strong>${s.promos.chachosPercent}% adicional</strong></p>
        <p class="promoinfo__disclaimer">${esc(s.promos.disclaimer)}</p>
      </div>
    </div>
  </div>
</div>

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

<main class="shell">
  <p class="results-line" id="resultsLine"></p>
  <div class="grid" id="grid">${skeletonCards(10)}</div>
  <div class="empty" id="empty" hidden>
    <h3>No encontramos nada con esa búsqueda</h3>
    <p class="t-body">Probá con otras palabras, o escribinos y lo buscamos por vos.</p>
    <p style="margin-top:18px">
      <a class="btn btn--gold" href="https://wa.me/${s.whatsapp}" target="_blank" rel="noopener">${ico.wa} Consultar por WhatsApp</a>
    </p>
  </div>
</main>

<section class="section" id="visitanos">
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
        <p style="margin-top:10px"><a class="btn btn--gold btn--sm" href="https://wa.me/${s.whatsapp}" target="_blank" rel="noopener">${ico.wa} ${esc(s.phoneDisplay)}</a></p>
      </div>
    </div>
  </div>
</section>

${footer(s)}`;

  return layout({
    head: {
      title: `${s.storeName} — Juguetería, librería y tecnología en La Rioja`,
      description: clamp(
        `Catálogo online de ${s.storeName}: juguetes, librería, bazar, regalería, electrónica y tecnología en La Rioja. ${products.length} productos con precio. Consultá y pedí por WhatsApp.`,
        158
      ),
      canonical: `${s.siteUrl}/`,
      jsonLd,
      preload: `<link rel="preload" as="image" href="/assets/brand/wordmark-dark.webp">`,
    },
    body,
    settings: s,
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
    <a href="/?cat=${encodeURIComponent(p.category)}#catalogo">${esc(p.category)}</a>${ico.chevron}
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
        ${offerActive(p) ? `<span class="flag flag--offer">${ico.tag}Oferta hasta el ${dateFmt(p.offer.until)}</span>` : ''}
        ${!offerActive(p) && isNew(p) ? `<span class="flag flag--new">Nuevo</span>` : ''}
      </div>
      <h1 class="t-h1">${esc(p.name)}</h1>
      <p class="product__price-row">
        ${offerHasDiscount(p) ? `<span class="product__price-old">${money(p.price)}</span>` : ''}
        <span class="product__price">${money(offerHasDiscount(p) ? p.offer.price : p.price)}</span>
      </p>
      ${offerActive(p) && p.offer.note ? `<p class="product__offer-note">${ico.sparkle} ${esc(p.offer.note)}</p>` : ''}
      <p class="product__stock" data-out="${!p.inStock}">${p.inStock ? 'Disponible en el local' : 'Sin stock por ahora'}</p>
      <p class="product__desc">${esc(p.description)}</p>
      <div class="product__actions">
        <button class="btn btn--gold" data-add="${esc(p.slug)}">${ico.plus} Agregar al pedido</button>
        <button type="button" class="btn btn--ghost" id="askAboutBtn"
                data-ask="${esc(`Quiero consultar por: ${p.name} (${money(p.price)})`)}">
          ${askIco} Preguntarle a la IA
        </button>
      </div>
    </div>
  </article>
</div>

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
    <h2 class="t-h2">También te puede interesar</h2>
    <div class="grid">
      ${related.map((r) => cardHtml(r)).join('\n      ')}
    </div>
  </div>
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
      image: fullSrc(main),
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
