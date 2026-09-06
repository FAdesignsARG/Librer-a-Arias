/**
 * Lógica del catálogo en el navegador.
 *
 * El mismo archivo corre en la portada y en las landings de producto; cada
 * bloque se activa sólo si encuentra los elementos que necesita.
 */
import { buildIndex, getIndex, searchProducts } from './search-engine.js';
import { wireDialog, closeDialog, enableDragToClose } from './ui.js';
// cardHtml es la MISMA función que arma las tarjetas en el servidor: antes
// existían dos copias (una acá, otra en templates.js) que había que
// mantener sincronizadas a mano — ya causó una vez que un ajuste quedara
// aplicado en una sola. templates.js no toca nada de Node, así que se
// puede importar tal cual también en el navegador.
import { cardHtml, money, offerActive, offerHasDiscount, isNew, dateFmt, ico as tIco } from './templates.js';
import { cloudinaryUrl } from './cloudinary-config.js';

// root?. (no sólo el default `= document`): un default de parámetro sólo
// entra en juego con `undefined`, nunca con `null` explícito — y varios
// llamados de más abajo pasan un elemento que puede no existir en esta
// página (ej. $('.sortsheet__head', sortSheet) cuando sortSheet es null
// fuera de la portada). Sin el '?.' eso tira un TypeError no capturado
// que frena TODO el resto del script — incluida loadData() — dejando
// "Agregar al pedido" roto en cualquier página que no sea la portada.
const $ = (sel, root = document) => root?.querySelector(sel) ?? null;
const $$ = (sel, root = document) => (root ? [...root.querySelectorAll(sel)] : []);

const thumbOf = (id) => cloudinaryUrl(id, { width: 400 });

const ico = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12 5.5 5.5L20 7"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l1.2 13H4.8L6 7Z"/><path d="M9 7V5.5a3 3 0 0 1 6 0V7"/></svg>',
};

/* ==========================================================================
   DATOS
   Un único fetch de products.json + settings.json, cacheado en el módulo.
   ========================================================================== */

let PRODUCTS = [];
let SETTINGS = {};
let bySlug = new Map();

async function loadData() {
  const [p, s] = await Promise.all([
    fetch('/data/products.json').then((r) => r.json()),
    fetch('/data/settings.json').then((r) => r.json()),
  ]);
  PRODUCTS = p.filter((x) => x.visible !== false);
  SETTINGS = s;
  bySlug = new Map(PRODUCTS.map((x) => [x.slug, x]));
  buildIndex(PRODUCTS);
}

/* ==========================================================================
   "ABIERTO AHORA" / "CERRADO"
   Se calcula en el navegador de quien mira la página — asume que está en
   el mismo huso horario que el local (Argentina), que es lo esperable
   para una tienda física local, no una tienda de alcance nacional.
   ========================================================================== */
const DAY_CODES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAY_NAMES = {
  Su: 'domingo', Mo: 'lunes', Tu: 'martes', We: 'miércoles',
  Th: 'jueves', Fr: 'viernes', Sa: 'sábado',
};
const minutesOf = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** {open:true, closesAt} o {open:false, next: "hoy a las 18:00"} */
function computeOpenStatus(hours, now = new Date()) {
  if (!hours?.length) return null;
  const todayCode = DAY_CODES[now.getDay()];
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const todaySlots = hours
    .filter((h) => h.days.includes(todayCode))
    .sort((a, b) => minutesOf(a.opens) - minutesOf(b.opens));

  for (const slot of todaySlots) {
    if (nowMin >= minutesOf(slot.opens) && nowMin < minutesOf(slot.closes)) {
      return { open: true, closesAt: slot.closes };
    }
  }
  for (const slot of todaySlots) {
    if (nowMin < minutesOf(slot.opens)) return { open: false, next: `hoy a las ${slot.opens}` };
  }
  for (let add = 1; add <= 7; add++) {
    const code = DAY_CODES[(now.getDay() + add) % 7];
    const slots = hours.filter((h) => h.days.includes(code)).sort((a, b) => minutesOf(a.opens) - minutesOf(b.opens));
    if (slots.length) {
      const label = add === 1 ? 'mañana' : DAY_NAMES[code];
      return { open: false, next: `${label} a las ${slots[0].opens}` };
    }
  }
  return { open: false, next: null };
}

function renderStatusBadge() {
  const status = computeOpenStatus(SETTINGS.hours);
  if (!status) return; // sin horarios cargados: no se muestra nada, no se inventa un estado

  const el = $('#statusBadge');
  if (el) {
    el.hidden = false;
    el.dataset.open = String(status.open);
    // Corto siempre (entra bien en mobile) — el detalle completo va de
    // tooltip, así no se pierde información, sólo se prioriza el espacio.
    el.textContent = status.open ? 'Abierto' : 'Cerrado';
    el.title = status.open ? 'Abierto ahora' : `Cerrado — abre ${status.next ?? 'pronto'}`;
  }

  // Mismo estado, repetido dentro de la tarjeta de horarios — a donde
  // lleva la píldora de arriba, así lo que dice una cosa coincide con
  // lo que confirma la otra apenas se llega.
  const card = $('#hoursCardStatus');
  if (card) {
    card.hidden = false;
    card.dataset.open = String(status.open);
    card.textContent = status.open ? 'Abierto ahora' : `Cerrado — abre ${status.next ?? 'pronto'}`;
  }
}

/* ==========================================================================
   PEDIDO (carrito)
   Se guarda en localStorage para que sobreviva a la navegación entre la
   grilla y las landings, que son páginas separadas.
   ========================================================================== */

const CART_KEY = 'arias.pedido.v1';

/** @type {Map<string, number>} slug -> cantidad */
let cart = new Map();

function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    cart = new Map(raw.filter(([slug]) => bySlug.has(slug)));
  } catch {
    cart = new Map();
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify([...cart]));
  } catch {
    /* modo privado o storage lleno: el pedido igual funciona en memoria */
  }
}

const cartCount = () => [...cart.values()].reduce((a, b) => a + b, 0);
const cartTotal = () =>
  [...cart].reduce((sum, [slug, qty]) => sum + (bySlug.get(slug)?.price || 0) * qty, 0);

/* La primera vez que alguien agrega algo (en cualquier visita, no sólo
   esta sesión) el toast explica el mecanismo — que el pedido se manda
   por WhatsApp — en vez del texto corto de siempre. Una sola vez: después
   de esa, ya lo sabe. Nada de banner permanente ocupando pantalla. */
const CART_HINT_KEY = 'arias.cartHintShown';

function addToCart(slug, { silent = false, qty = 1 } = {}) {
  const p = bySlug.get(slug);
  if (!p) return;
  const firstEver = cart.size === 0 && !localStorage.getItem(CART_HINT_KEY);
  cart.set(slug, (cart.get(slug) || 0) + qty);
  saveCart();
  syncCartUI();
  if (!silent) {
    if (firstEver) {
      toast('¡Va a tu pedido! Armalo y mandalo por WhatsApp cuando quieras', ico.check, 4200);
      localStorage.setItem(CART_HINT_KEY, 'true');
    } else {
      toast(qty > 1 ? `${qty} × ${p.name} agregados` : `${p.name} agregado`, ico.check);
    }
  }
  bumpFab();
}

function setQty(slug, qty) {
  if (qty <= 0) cart.delete(slug);
  else cart.set(slug, qty);
  saveCart();
  syncCartUI();
}

/* ---------- UI del pedido ---------- */

const fab = $('#fab');
const fabCount = $('#fabCount');
const fabTotal = $('#fabTotal');
const sheet = $('#sheet');
const sheetBody = $('#sheetBody');
const sheetFoot = $('#sheetFoot');
const sheetTotal = $('#sheetTotal');
const sheetSend = $('#sheetSend');

/* ---- Descuento por medio de pago (Ronda 3) ----
   Puramente informativo: nunca se resta de cartTotal(), que sigue siendo
   el número definitivo — el medio de pago recién se confirma por
   WhatsApp, no acá. Sólo se agrega UNA línea aparte cuando corresponde. */

/** El tramo más alto de SETTINGS.promos.tiers cuyo minAmount es <= total,
    o null si el total no alcanza ninguno (incluye total === 0). */
function applicablePromo(total) {
  const tiers = SETTINGS.promos?.tiers;
  if (!Array.isArray(tiers) || !tiers.length) return null;
  let best = null;
  for (const t of tiers) {
    if (total >= t.minAmount && (!best || t.minAmount > best.minAmount)) best = t;
  }
  return best;
}

/** Las líneas de texto del descuento aplicable — mismo cálculo para el
    panel del pedido (HTML) y el mensaje de WhatsApp (texto plano), así
    no hay dos lugares que puedan quedar diciendo cosas distintas.
    Vacío si no hay tramo aplicable para ese total. */
function promoLines(total) {
  const tier = applicablePromo(total);
  if (!tier) return [];
  const ahorro = Math.round((total * tier.percent) / 100);
  const lines = [`Pagando en efectivo o transferencia: -${tier.percent}% · ahorrás ${money(ahorro)}`];
  if (SETTINGS.promos?.chachosPercent) {
    lines.push(`Pagando con CHACHOS: ${SETTINGS.promos.chachosPercent}% adicional`);
  }
  return lines;
}

// Se crea una sola vez, apenas se conoce dónde va (junto a .sheet__total)
// — renderSheet() sólo actualiza su contenido y visibilidad en cada
// llamada, no la reconstruye. No se tocó templates.js: este es el único
// elemento nuevo que pide la Ronda 3, así que nace acá mismo.
const sheetPromoLine = document.createElement('div');
sheetPromoLine.id = 'sheetPromo';
sheetPromoLine.className = 'sheet__promo';
sheetPromoLine.hidden = true;
$('.sheet__total')?.after(sheetPromoLine);

// Ronda 1.2: los estilos del chip viven en styles-parts.css
// (.sheet__promo-chip) con los tokens de marca — acá sólo se decide el
// texto y cuál línea es la principal vs. la secundaria (CHACHOS).
function renderPromoLine(total) {
  if (!sheetPromoLine) return;
  const lines = promoLines(total);
  if (!lines.length) {
    sheetPromoLine.hidden = true;
    return;
  }
  sheetPromoLine.innerHTML = [
    `<span class="sheet__promo-chip">${lines[0]}</span>`,
    ...lines.slice(1).map((l) => `<span class="sheet__promo-chip sheet__promo-chip--sub">${l}</span>`),
  ].join('');
  sheetPromoLine.hidden = false;
}

function bumpFab() {
  if (!fab) return;
  fab.dataset.bump = 'true';
  setTimeout(() => delete fab.dataset.bump, 430);
}

function syncCartUI() {
  const n = cartCount();
  if (fab) {
    fab.hidden = n === 0;
    fabCount.textContent = String(n);
    fabTotal.textContent = money(cartTotal());
  }
  // Marca los botones "+" de los productos que ya están en el pedido
  $$('[data-add]').forEach((btn) => {
    const inCart = cart.has(btn.dataset.add);
    btn.dataset.inCart = String(inCart);
    if (btn.classList.contains('card__add') || btn.classList.contains('pick__add')) {
      btn.innerHTML = inCart ? ico.check : ico.plus;
    }
  });
  if (sheet?.open) renderSheet();
}

function renderSheet() {
  if (!sheetBody) return;

  if (cart.size === 0) {
    sheetBody.innerHTML = `<div class="sheet__empty">
      ${ico.bag}
      <p>Todavía no agregaste nada.</p>
      <p class="t-small" style="margin-top:6px">Tocá el <strong>+</strong> en cualquier producto para sumarlo.</p>
    </div>`;
    sheetFoot.hidden = true;
    return;
  }

  sheetBody.innerHTML = [...cart]
    .map(([slug, qty]) => {
      const p = bySlug.get(slug);
      if (!p) return '';
      return `<div class="line" data-slug="${slug}">
      <img class="line__img" src="${thumbOf(p.images[0])}" alt="" width="58" height="58" loading="lazy">
      <div class="line__info">
        <a class="line__name" href="/p/${p.slug}/">${p.name}</a>
        <p class="line__price">${money(p.price)} c/u · <strong>${money(p.price * qty)}</strong></p>
        <div class="line__actions">
          <div class="qty">
            <button data-qty="-1" aria-label="Quitar uno">${ico.minus}</button>
            <span>${qty}</span>
            <button data-qty="1" aria-label="Agregar uno">${ico.plus}</button>
          </div>
          <button class="line__remove" data-remove>Quitar</button>
        </div>
      </div>
    </div>`;
    })
    .join('');

  sheetFoot.hidden = false;
  const total = cartTotal();
  sheetTotal.textContent = money(total);
  renderPromoLine(total);
  sheetSend.href = buildOrderLink();
}

/** Arma el mensaje del pedido en un solo texto — lo usan tanto el link
    de WhatsApp como el botón de copiar (el plan B si WhatsApp Web no
    está vinculado en la compu). */
function buildOrderMessage() {
  const lines = [...cart].map(([slug, qty]) => {
    const p = bySlug.get(slug);
    return `• ${qty} x ${p.name} — ${money(p.price * qty)}`;
  });
  const total = cartTotal();
  // Mismas líneas que ve el panel del pedido, más el disclaimer de "no
  // acumulable" — acá sí, porque quien recibe el pedido por WhatsApp no
  // vio el panel y necesita esa aclaración para confirmarlo bien.
  const promo = promoLines(total);
  const promoBlock = promo.length
    ? ['', ...promo, ...(SETTINGS.promos?.disclaimer ? [SETTINGS.promos.disclaimer] : [])]
    : [];
  return [
    '¡Hola! Quiero hacer este pedido:',
    '',
    ...lines,
    '',
    `Total estimado: ${money(total)}`,
    ...promoBlock,
    '',
    '¿Me confirman stock y forma de pago?',
  ].join('\n');
}
const buildOrderLink = () => `https://wa.me/${SETTINGS.whatsapp}?text=${encodeURIComponent(buildOrderMessage())}`;

function openSheet() {
  if (!sheet) return;
  // Por si quedó en el estado "pedido enviado" de una visita anterior
  // al panel — siempre se abre mostrando el pedido, no la confirmación.
  showSheetCart();
  renderSheet();
  sheet.showModal();
  // Sin esto, showModal() enfoca solo el botón de cerrar — en mobile
  // Safari eso dispara el anillo de foco sobre un botón chico y se ve
  // roto. El dialog tiene tabindex="-1" para poder recibir el foco así.
  sheet.focus();
}

fab?.addEventListener('click', openSheet);
wireDialog(sheet, $('#sheetClose'));
enableDragToClose(sheet, { header: $('.sheet__head', sheet), scrollEl: sheetBody });

/* ---- Confirmación tras enviar + plan B si WhatsApp no abrió ---- */
const sheetSent = $('#sheetSent');

function showSheetCart() {
  if (!sheetSent) return;
  sheetSent.hidden = true;
  sheetBody.hidden = false;
  sheetFoot.hidden = cart.size === 0;
}
function showSheetSent() {
  if (!sheetSent) return;
  sheetBody.hidden = true;
  sheetFoot.hidden = true;
  sheetSent.hidden = false;
}

/* ---- Pop-up de "sumá algo en oferta" antes de mandar el pedido ----
   Una sola vez por sesión, y sólo si de verdad hay algo que ofrecer: una
   oferta activa que la persona todavía no agregó. Ronda 3 (total del
   pedido) no se toca acá — esto sólo decide si se agrega algo antes de
   navegar, el cálculo del total sigue igual que siempre. */
const PROMO_POPUP_KEY = 'arias.promoPopupShown';
const promoNudgeDlg = $('#promoNudge');
const promoNudgePicksEl = $('#promoNudgePicks');

const eligiblePromoPicks = (n = 3) => PRODUCTS.filter((p) => offerActive(p) && !cart.has(p.slug)).slice(0, n);

function openPromoNudge(picks) {
  promoNudgePicksEl.innerHTML = picks
    .map(
      (p) => `<label class="promonudge__pick">
      <input type="checkbox" checked value="${p.slug}">
      <img src="${thumbOf(p.images[0])}" alt="" width="46" height="46" loading="lazy">
      <span class="promonudge__pick-info">
        <span class="promonudge__pick-name"></span>
        <span class="promonudge__pick-price">
          ${
            offerHasDiscount(p)
              ? `<span class="pick__price-old">${money(p.price)}</span> <b>${money(p.offer.price)}</b>`
              : `<b>${money(p.price)}</b>`
          }
        </span>
      </span>
    </label>`
    )
    .join('');
  // El nombre por textContent: puede tener comillas o signos
  [...promoNudgePicksEl.querySelectorAll('.promonudge__pick-name')].forEach((el, i) => (el.textContent = picks[i].name));
  promoNudgeDlg.showModal();
  // Mismo motivo que el resto de los <dialog> del sitio: showModal() por
  // sí solo enfocaría el primer checkbox, y en mobile Safari eso dispara
  // el anillo de foco sobre un control chico — se ve roto.
  promoNudgeDlg.focus();
}

function markPromoShown() {
  try {
    sessionStorage.setItem(PROMO_POPUP_KEY, 'true');
  } catch {}
}
// Se marca "ya se mostró" al cerrarse SEA COMO SEA (botón, X, Esc, click
// afuera) — así no vuelve a interrumpir en la misma sesión ni aunque la
// persona lo haya cerrado sin elegir ninguna de las dos acciones. El
// evento 'close' cubre X/Esc/backdrop; finishPromoNudge (abajo) además lo
// marca directo por las suyas, sin depender sólo del evento.
promoNudgeDlg?.addEventListener('close', markPromoShown);
wireDialog(promoNudgeDlg, $('#promoNudgeClose'));

function finishPromoNudge(addChecked) {
  markPromoShown();
  if (addChecked) {
    const checked = $$('input[type="checkbox"]:checked', promoNudgePicksEl).map((el) => el.value);
    checked.forEach((slug) => addToCart(slug, { silent: true }));
    if (checked.length) {
      toast(`${checked.length} producto${checked.length === 1 ? '' : 's'} agregado${checked.length === 1 ? '' : 's'}`, ico.check);
    }
  }
  closeDialog(promoNudgeDlg).then(() => {
    // El <a> original nunca navegó (se le hizo preventDefault más abajo):
    // se abre la misma URL a mano, con el pedido ya actualizado si se
    // agregó algo (buildOrderLink() lee el carrito en el momento).
    window.open(buildOrderLink(), '_blank', 'noopener');
    showSheetSent();
  });
}
$('#promoNudgeSkip')?.addEventListener('click', () => finishPromoNudge(false));
$('#promoNudgeAdd')?.addEventListener('click', () => finishPromoNudge(true));

sheetSend?.addEventListener('click', (e) => {
  let yaMostrado = true;
  try {
    yaMostrado = !!sessionStorage.getItem(PROMO_POPUP_KEY);
  } catch {
    /* sin sessionStorage no hay forma de recordar que ya se mostró: se
       omite el pop-up en vez de arriesgarse a mostrarlo en cada pedido */
  }

  if (!yaMostrado) {
    const picks = eligiblePromoPicks();
    if (picks.length) {
      e.preventDefault();
      openPromoNudge(picks);
      return;
    }
  }

  // Sin ofertas elegibles, o ya mostrado esta sesión: el click funciona
  // exactamente como antes de esta ronda — no se cancela la navegación,
  // el <a target="_blank"> abre WhatsApp igual.
  showSheetSent();
});

$('#sheetSentContinue')?.addEventListener('click', showSheetCart);
$('#sheetSentClear')?.addEventListener('click', () => {
  cart.clear();
  saveCart();
  syncCartUI();
  showSheetCart();
  renderSheet();
});

$('#sheetCopy')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(buildOrderMessage());
    toast('Pedido copiado', ico.check);
  } catch {
    toast('No se pudo copiar — probá seleccionar el texto a mano');
  }
});

sheetBody?.addEventListener('click', (e) => {
  const line = e.target.closest('.line');
  if (!line) return;
  const slug = line.dataset.slug;

  const qtyBtn = e.target.closest('[data-qty]');
  if (qtyBtn) {
    setQty(slug, (cart.get(slug) || 0) + Number(qtyBtn.dataset.qty));
    return;
  }
  if (e.target.closest('[data-remove]')) setQty(slug, 0);
});

/* Delegación global del botón "+": sirve para las tarjetas de la grilla
   (que se re-renderizan), los picks del asistente y los dos botones de
   agregar de la ficha de producto (el de arriba y el de la barra fija
   de mobile). Sólo estos dos últimos suman más de 1 de una vez (Ronda
   8): leen el stepper de cantidad de la ficha si existe, y sólo si el
   botón tocado es uno de esos dos — la grilla y los picks del
   asistente no tienen ningún stepper propio, siguen sumando 1 como
   siempre. */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-add]');
  if (!btn) return;
  e.preventDefault();
  const qtyEl = document.getElementById('productQtyVal');
  const isProductPageAdd = qtyEl && (btn.closest('.product__actions') || btn.classList.contains('stickycta__add'));
  const qty = isProductPageAdd ? Number(qtyEl.textContent) || 1 : 1;
  addToCart(btn.dataset.add, { qty });
  if (isProductPageAdd) qtyEl.textContent = '1';
});

/* ==========================================================================
   AVISOS
   ========================================================================== */
const toastHost = $('#toasts');
function toast(text, icon = '', duration = 2500) {
  if (!toastHost) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${icon}<span></span>`;
  el.querySelector('span').textContent = text;
  el.style.animationDuration = `${duration / 1000}s`;
  toastHost.append(el);
  setTimeout(() => el.remove(), duration);
}

/* ==========================================================================
   CAMPANITA DE NOVEDADES
   No hay una colección aparte de "notificaciones": el feed se arma en el
   momento a partir de products.json (ofertas activas, productos cargados
   hace poco, destacados). Así nunca se puede desincronizar de lo que
   realmente está publicado — no hay nada que Fran tenga que mantener aparte.
   ========================================================================== */

const bellBtn = $('#bellBtn');
const bellDot = $('#bellDot');
const notify = $('#notify');
const notifyBody = $('#notifyBody');

const { chevron: arrowIco, tag: offerIco, sparkle: sparkIco, fire: fireIco } = tIco;

/** Arma el feed: ofertas primero (son las más urgentes), después lo nuevo,
    después una muestra de los destacados. */
function buildFeed() {
  const offers = PRODUCTS.filter(offerActive).sort(
    (a, b) => new Date(a.offer.until) - new Date(b.offer.until)
  );
  // Tope de 8: si se carga un lote grande de una (como la migración inicial
  // del catálogo), sin esto la campana se llena de decenas de "Nuevo" el
  // mismo día y deja de servir para avisar nada.
  const news = PRODUCTS.filter((p) => isNew(p) && !offerActive(p))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);
  const popular = PRODUCTS.filter((p) => p.featured && !offerActive(p) && !isNew(p)).slice(0, 6);
  return { offers, news, popular };
}

function nitemHtml(p, kind) {
  const meta =
    kind === 'offer'
      ? `Oferta hasta el ${dateFmt(p.offer.until)}${p.offer.price ? ` · ${money(p.offer.price)}` : ''}`
      : kind === 'new'
      ? `Nuevo en el catálogo · ${money(p.price)}`
      : `De lo más pedido · ${money(p.price)}`;
  const icon = kind === 'offer' ? offerIco : kind === 'new' ? sparkIco : fireIco;
  const img = p.images?.[0];
  return `<a class="nitem nitem--${kind}" href="/p/${p.slug}/">
    ${img ? `<img class="nitem__ico" src="${thumbOf(img)}" alt="" width="36" height="36" loading="lazy">` : `<span class="nitem__ico">${icon}</span>`}
    <span class="nitem__info">
      <span class="nitem__title"></span>
      <span class="nitem__meta">${meta}</span>
    </span>
    <span class="nitem__go">${arrowIco}</span>
  </a>`;
}

function renderFeed() {
  if (!notifyBody) return;
  const { offers, news, popular } = buildFeed();

  if (!offers.length && !news.length && !popular.length) {
    notifyBody.innerHTML = `<div class="notify__empty">
      ${offerIco}
      <p>Por ahora no hay novedades.</p>
      <p class="t-small" style="margin-top:6px">Las ofertas y los productos nuevos van a aparecer acá.</p>
    </div>`;
    return;
  }

  const section = (title, items, kind) =>
    items.length
      ? `<div class="notify__group">${title}</div>${items.map((p) => nitemHtml(p, kind)).join('')}`
      : '';

  notifyBody.innerHTML =
    section('Ofertas', offers, 'offer') + section('Nuevo', news, 'new') + section('Lo más pedido', popular, 'popular');

  // El nombre por textContent, igual que en el resto de la app
  const all = [...offers.map((p) => [p, 'offer']), ...news.map((p) => [p, 'new']), ...popular.map((p) => [p, 'popular'])];
  $$('.nitem', notifyBody).forEach((el, i) => {
    $('.nitem__title', el).textContent = all[i][0].name;
  });
}

/** El punto sólo se apaga cuando de verdad se abrió el panel con algo adentro
    más nuevo que la última vez — no cada vez que hay novedades viejas. */
function syncBellDot() {
  if (!bellDot) return;
  const { offers, news, popular } = buildFeed();
  if (!offers.length && !news.length && !popular.length) return void (bellDot.hidden = true);

  // Para saber si hay "algo nuevo desde la última vez" lo que importa es
  // cuándo se cargó/tocó cada cosa, no la fecha de vencimiento de la oferta
  // (esa es siempre futura, así que usarla haría sonar la campana para
  // siempre). `updatedAt` ya se actualiza solo al guardar en el panel.
  const newest = Math.max(
    ...offers.map((p) => new Date(p.updatedAt || p.createdAt || 0).getTime()),
    ...news.map((p) => new Date(p.createdAt).getTime()),
    ...popular.map((p) => new Date(p.updatedAt || p.createdAt || 0).getTime()),
    0
  );
  let seen = 0;
  try {
    seen = Number(localStorage.getItem('arias.feed.visto') || 0);
  } catch {}
  bellDot.hidden = newest <= seen;
}

bellBtn?.addEventListener('click', () => {
  renderFeed();
  notify.showModal();
  notify.focus(); // ver comentario en openSheet()
  try {
    localStorage.setItem('arias.feed.visto', String(Date.now()));
  } catch {}
  if (bellDot) bellDot.hidden = true;
});
wireDialog(notify, $('#notifyClose'));
enableDragToClose(notify, { header: $('.notify__head', notify), scrollEl: notifyBody });

/* ==========================================================================
   NAV + REVELADO
   ========================================================================== */

const nav = $('#nav');
if (nav) {
  const onScroll = () => (nav.dataset.scrolled = String(window.scrollY > 8));
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });
}

const revealer = new IntersectionObserver(
  (entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      en.target.dataset.shown = 'true';
      revealer.unobserve(en.target);
    }
  },
  { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
);
const observeReveals = (root = document) => $$('[data-reveal]', root).forEach((el) => revealer.observe(el));

/* ==========================================================================
   GRILLA (sólo en la portada)
   ========================================================================== */

const grid = $('#grid');
const searchEl = $('#search');
const searchWrap = $('#searchWrap');
const chipsEl = $('#chips');
const sortEl = $('#sort');
const priceEl = $('#priceFilter');
const emptyEl = $('#empty');
const resultsLine = $('#resultsLine');
const promoInfo = $('#promoInfo');

let activeCat = 'Todos';

function sortList(list, mode) {
  const out = [...list];
  if (mode === 'destacados') {
    // Estable: entre dos destacados (o dos no-destacados) respeta el
    // orden que ya traían — no hace falta un criterio secundario.
    out.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  } else if (mode === 'precio-asc') out.sort((a, b) => a.price - b.price);
  else if (mode === 'precio-desc') out.sort((a, b) => b.price - a.price);
  else if (mode === 'nombre') out.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  // "relevancia" respeta el orden que devolvió el buscador
  return out;
}

/** "10000-30000" -> [10000, 30000]; "60000-" -> [60000, Infinity]. */
function filterByPrice(list, range) {
  if (!range) return list;
  const [min, max] = range.split('-').map((n) => (n ? Number(n) : null));
  return list.filter((p) => p.price >= (min ?? 0) && p.price <= (max ?? Infinity));
}

function render() {
  if (!grid) return;

  const pool =
    activeCat === 'Todos'
      ? getIndex()
      : activeCat === 'Ofertas'
        ? getIndex().filter((e) => offerActive(e.p))
        : getIndex().filter((e) => e.p.category === activeCat);
  const found = filterByPrice(searchProducts(searchEl.value, pool), priceEl?.value);
  const list = sortList(found, sortEl?.value || 'relevancia');

  grid.innerHTML = list.map(cardHtml).join('');

  if (promoInfo) promoInfo.hidden = activeCat !== 'Ofertas';
  emptyEl.hidden = list.length > 0;
  // "No encontramos nada con esa búsqueda" no aplica si el vacío es
  // porque hoy no hay ninguna oferta activa (no hubo ninguna búsqueda).
  if (!list.length) {
    const title = emptyEl.querySelector('h3');
    const body = emptyEl.querySelector('.t-body');
    if (activeCat === 'Ofertas' && !searchEl.value) {
      title.textContent = 'Por ahora no hay ofertas activas';
      body.textContent = 'Mirá los tramos de descuento de arriba, o escribinos y te contamos qué hay.';
    } else {
      title.textContent = 'No encontramos nada con esa búsqueda';
      body.textContent = 'Probá con otras palabras, o escribinos y lo buscamos por vos.';
    }
  }
  resultsLine.textContent = list.length
    ? `${list.length} ${list.length === 1 ? 'producto' : 'productos'}${activeCat !== 'Todos' ? ` en ${activeCat}` : ''}`
    : '';

  searchWrap.dataset.filled = String(searchEl.value.length > 0);
  syncCartUI();
}

/** Debounce corto: evita re-renderizar 125 tarjetas en cada tecla. */
let searchTimer;
searchEl?.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(render, 110);
});

$('#searchClear')?.addEventListener('click', () => {
  searchEl.value = '';
  searchEl.focus();
  render();
});

/** Activa un rubro (o "Ofertas") por su data-cat, si existe un chip para
    eso. La usan el click en un chip, el ?cat= de la URL y el banner de
    promos — una sola vez, no tres copias de la misma lógica. */
function selectCategory(cat) {
  const chip = $$('.chip', chipsEl).find((c) => c.dataset.cat === cat);
  if (!chip) return false;
  activeCat = cat;
  $$('.chip', chipsEl).forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
  render();
  return true;
}

chipsEl?.addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  selectCategory(btn.dataset.cat);
});

/* Slide de promos del carrusel de atención (Ronda 1.2): el slide entero
   es tocable y abre el detalle de promos (#promoInfoDlg, más abajo) —
   salvo el botón "Ver promociones", que sigue yendo directo a la
   sección Ofertas sin abrir el pop-up (stopPropagation). El slide de
   WhatsApp es un <a> normal, navega solo, no participa de nada de esto. */
const promoBannerEl = $('#promoBanner');

$('#promoBannerCta')?.addEventListener('click', (e) => {
  e.stopPropagation();
  selectCategory('Ofertas');
  $('#catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Distingue un tap real de un swipe/arrastre horizontal para cambiar de
// slide: si el puntero se movió más que unos px entre bajar y soltar, no
// se abre el pop-up (mismo criterio que el resto del sitio: un gesto de
// scroll no debe disparar una acción de click).
let promoBannerDownX = null;
promoBannerEl?.addEventListener('pointerdown', (e) => {
  promoBannerDownX = e.clientX;
});
promoBannerEl?.addEventListener('click', (e) => {
  if (e.target.closest('#promoBannerCta, .attention-carousel__dot')) return;
  const moved = promoBannerDownX != null && Math.abs(e.clientX - promoBannerDownX) > 10;
  promoBannerDownX = null;
  if (moved) return;
  promoInfoDlg.showModal();
  promoInfoDlg.focus();
});
promoBannerEl?.addEventListener('keydown', (e) => {
  if (e.target.closest('#promoBannerCta')) return;
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  promoInfoDlg.showModal();
  promoInfoDlg.focus();
});

/* ==========================================================================
   DETALLE DE "LLEVÁ MÁS, PAGÁ MENOS" — diálogo + lightbox de la imagen
   El bloque que antes era una tarjeta siempre expandida en la sección
   Ofertas ahora es un trigger chico que abre esto como pop-up. La imagen,
   adentro del pop-up, abre a su vez en un lightbox propio.
   ========================================================================== */
const promoInfoDlg = $('#promoInfoDlg');
$('#promoInfoOpen')?.addEventListener('click', () => {
  promoInfoDlg.showModal();
  promoInfoDlg.focus();
});
wireDialog(promoInfoDlg, $('#promoInfoClose'));

const promoImageDlg = $('#promoImageDlg');
$('#promoImageOpen')?.addEventListener('click', () => {
  promoImageDlg.showModal();
  promoImageDlg.focus();
});
wireDialog(promoImageDlg, $('#promoImageClose'));

/* ==========================================================================
   CARRUSEL DE ATENCIÓN (Ronda 1.1) — promos + canal de WhatsApp
   Avanza solo cada 5s, se pausa con cualquier interacción y retoma un
   rato después de soltar. Con prefers-reduced-motion el autoplay ni
   arranca — el carrusel queda 100% a control manual (swipe o puntitos),
   nunca se pierde funcionalidad, sólo el movimiento automático.
   ========================================================================== */
function wireAttentionCarousel() {
  const el = $('#attentionCarousel');
  const track = $('.attention-carousel__track', el || document);
  if (!el || !track) return;
  const slides = $$('.attn__slide', track);
  const dots = $$('.attention-carousel__dot', el);
  if (slides.length < 2) return;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0;
  let timer = null;
  let resumeTimer = null;

  function syncDots() {
    dots.forEach((d, i) => d.setAttribute('aria-current', String(i === index)));
  }

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    track.scrollTo({ left: slides[index].offsetLeft, behavior: 'smooth' });
    syncDots();
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }
  function start() {
    if (reduceMotion) return;
    stop();
    timer = setInterval(() => goTo(index + 1), 10000);
  }

  function pauseThenResume() {
    stop();
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(start, 4000);
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      goTo(i);
      pauseThenResume();
    });
  });

  track.addEventListener('pointerdown', pauseThenResume);
  track.addEventListener('mouseenter', stop);
  track.addEventListener('mouseleave', start);
  // Sincroniza los puntitos si la persona scrollea a mano (swipe).
  track.addEventListener(
    'scroll',
    () => {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      if (i !== index && i >= 0 && i < slides.length) {
        index = i;
        syncDots();
      }
    },
    { passive: true }
  );

  start();
}

sortEl?.addEventListener('change', render);
priceEl?.addEventListener('change', render);

/* ---- Hojas de "Ordenar" y "Precio" para mobile (los <select> se
   esconden ahí) ---- #sortSheet/#priceSheet sólo existen en la portada
   (no en la ficha de producto), por eso todo acá abajo está encadenado
   con ?. — $$ no acepta root null. */
const sortBtn = $('#sortBtn');
const sortSheet = $('#sortSheet');
const sortOpts = sortSheet ? $$('.sortopt', sortSheet) : [];

function syncSortOpts() {
  sortOpts.forEach((o) => o.setAttribute('aria-current', String(o.dataset.sort === sortEl.value)));
}

sortBtn?.addEventListener('click', () => {
  syncSortOpts();
  sortSheet.showModal();
  sortSheet.focus(); // ver comentario en openSheet()
});
wireDialog(sortSheet, $('#sortSheetClose'));
enableDragToClose(sortSheet, { header: $('.sortsheet__head', sortSheet) });

sortSheet?.addEventListener('click', (e) => {
  const btn = e.target.closest('.sortopt');
  if (!btn) return;
  sortEl.value = btn.dataset.sort;
  render();
  closeDialog(sortSheet);
});

const priceBtn = $('#priceBtn');
const priceSheet = $('#priceSheet');
const priceOpts = priceSheet ? $$('.sortopt', priceSheet) : [];

function syncPriceOpts() {
  priceOpts.forEach((o) => o.setAttribute('aria-current', String(o.dataset.price === priceEl.value)));
}

priceBtn?.addEventListener('click', () => {
  syncPriceOpts();
  priceSheet.showModal();
  priceSheet.focus(); // ver comentario en openSheet()
});
wireDialog(priceSheet, $('#priceSheetClose'));
enableDragToClose(priceSheet, { header: $('.sortsheet__head', priceSheet) });

priceSheet?.addEventListener('click', (e) => {
  const btn = e.target.closest('.sortopt');
  if (!btn) return;
  priceEl.value = btn.dataset.price;
  render();
  closeDialog(priceSheet);
});

/* ---- Menú de mobile: links rápidos + guía de compra de 4 pasos ----
   Cada botón de paso "hace" la acción en vez de sólo explicarla. Si el
   elemento de esa acción no existe en esta página (por ejemplo "Buscar"
   desde una ficha de producto, que no tiene buscador propio), cae a
   navegar a la portada con el ancla correspondiente. ---- */
const menuBtn = $('#menuBtn');
const menuSheet = $('#menuSheet');

menuBtn?.addEventListener('click', () => {
  menuSheet.showModal();
  menuSheet.focus(); // ver comentario en openSheet()
});
wireDialog(menuSheet, $('#menuSheetClose'));
enableDragToClose(menuSheet, { header: $('.sortsheet__head', menuSheet), scrollEl: $('.menusheet__body', menuSheet) });

// Los links de Catálogo/Horarios/Visitanos navegan solos (son <a> con
// href) — esto sólo cierra la hoja para que no quede abierta encima.
$('#menusheetLinks')?.addEventListener('click', (e) => {
  if (e.target.closest('a')) closeDialog(menuSheet);
});

menuSheet?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-guide]');
  if (!btn) return;
  const action = btn.dataset.guide;
  closeDialog(menuSheet).then(() => {
    if (action === 'chat') {
      $('#askBtn')?.click();
    } else if (action === 'catalog' && grid) {
      grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (action === 'cart') {
      openSheet();
    } else {
      location.href = '/#catalogo';
    }
  });
});

/* ---- Atajo de teclado: "/" salta al buscador (sólo desktop tiene
   sentido, pero no hace daño dejarlo activo en todos lados) ---- */
addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
  const el = document.activeElement;
  const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  if (typing || !searchEl) return;
  e.preventDefault();
  searchEl.focus();
});

/* ==========================================================================
   GALERÍA DE LA LANDING
   ========================================================================== */

const thumbs = $('#thumbs');
thumbs?.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-src]');
  if (!btn) return;
  const stage = $('#stage')?.closest('.product__stage');
  const img = $('#stage');
  const nextSrc = btn.dataset.src;
  if (!img || img.src === nextSrc) return;

  $$('button', thumbs).forEach((b) => b.setAttribute('aria-current', String(b === btn)));

  // Precarga antes de mostrar: sin esto el cambio de src es instantáneo y
  // el fade-out no tiene nada que "cubrir" mientras la foto nueva llega.
  stage?.classList.add('is-swapping');
  const preload = new Image();
  preload.onload = preload.onerror = () => {
    img.src = nextSrc;
    stage?.classList.remove('is-swapping');
  };
  preload.src = nextSrc;
});

/* "Preguntarle a la IA" de la ficha: reemplaza al viejo botón que abría
   WhatsApp por separado — así una persona mirando varios productos
   termina con un solo pedido consolidado, no 3 mensajes sueltos. */
const askAboutBtn = $('#askAboutBtn');
askAboutBtn?.addEventListener('click', () => {
  document.dispatchEvent(
    new CustomEvent('arias:preguntar', { detail: { pregunta: askAboutBtn.dataset.ask } })
  );
});

/* ---- Selector de cantidad (Ronda 8) ----
   El valor vive en un solo lugar (#productQtyVal): tanto "Agregar al
   pedido" de arriba como el de la barra fija de mobile lo leen desde la
   delegación global de [data-add], más arriba en este archivo. */
const productQtyEl = $('#productQty');
const productQtyVal = $('#productQtyVal');
productQtyEl?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-qty-step]');
  if (!btn || !productQtyVal) return;
  const next = Number(productQtyVal.textContent) + Number(btn.dataset.qtyStep);
  productQtyVal.textContent = String(Math.max(1, next));
});

/* ==========================================================================
   LIGHTBOX DE LA GALERÍA (Ronda 8)
   Pinch-zoom + pan táctil, click-to-zoom + arrastre en desktop, swipe o
   tocar los costados para cambiar de foto — todo con Pointer Events
   nativos (unifican mouse/touch), sin ninguna librería. El open/close
   del <dialog> en sí reusa el patrón de ui.js tal cual.
   ========================================================================== */
const lightboxDlg = $('#galleryLightbox');
if (lightboxDlg && $('#stage')) {
  const stage = $('#lightboxStage');
  const img = $('#lightboxImg');
  const prevBtn = $('#lightboxPrev');
  const nextBtn = $('#lightboxNext');

  // Misma lista de fotos que ya arma #thumbs (data-src) — no hace falta
  // volver a pedirle el producto al servidor ni buscarlo en PRODUCTS.
  const fullSrcsOf = () =>
    thumbs ? $$('button[data-src]', thumbs).map((b) => b.dataset.src) : $('#stage') ? [$('#stage').src] : [];

  function currentIndex() {
    if (!thumbs) return 0;
    const i = $$('button', thumbs).findIndex((b) => b.getAttribute('aria-current') === 'true');
    return i < 0 ? 0 : i;
  }

  let scale = 1, tx = 0, ty = 0;
  function applyTransform() {
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }
  // Sólo el "snap" (doble-tap, reset) anima — el pinch/pan en curso no
  // lleva transición nunca, tiene que seguir al dedo 1:1. La duración
  // real bajo prefers-reduced-motion ya la fuerza a ~0 la regla global
  // (*,*::before,*::after{transition-duration:0.01ms!important}).
  function snapTo(nextScale, nextTx, nextTy) {
    img.style.transition = 'transform 0.2s var(--ease-out)';
    scale = nextScale; tx = nextTx; ty = nextTy;
    applyTransform();
    setTimeout(() => { img.style.transition = 'none'; }, 220);
  }
  const resetZoom = () => snapTo(1, 0, 0);

  function goTo(i) {
    const srcs = fullSrcsOf();
    if (!srcs.length) return;
    const idx = (i + srcs.length) % srcs.length;
    resetZoom();
    img.src = srcs[idx];
    // Sincroniza la miniatura y la foto principal para cuando se cierre.
    if (thumbs) {
      $$('button', thumbs).forEach((b, bi) => b.setAttribute('aria-current', String(bi === idx)));
      const stageImg = $('#stage');
      if (stageImg) stageImg.src = srcs[idx];
    }
  }

  function zoomAt(clientX, clientY) {
    const r = stage.getBoundingClientRect();
    snapTo(2, -(clientX - r.left - r.width / 2), -(clientY - r.top - r.height / 2));
  }

  $('#stage').addEventListener('click', () => {
    scale = 1; tx = 0; ty = 0;
    img.style.transition = 'none';
    applyTransform();
    img.src = fullSrcsOf()[currentIndex()] || $('#stage').src;
    lightboxDlg.showModal();
    lightboxDlg.focus();
  });
  wireDialog(lightboxDlg, $('#lightboxClose'));
  lightboxDlg.addEventListener('close', resetZoom);

  prevBtn?.addEventListener('click', () => goTo(currentIndex() - 1));
  nextBtn?.addEventListener('click', () => goTo(currentIndex() + 1));

  // ---- Gesto: pinch (2 punteros), pan (1 puntero con zoom), tap/doble-tap ----
  const pointers = new Map();
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  let pinchStartDist = 0;
  let pinchStartScale = 1;
  let panStart = null;
  let downAt = 0;
  let downPos = null;
  let moved = false;
  let lastTapAt = 0;

  stage?.addEventListener('pointerdown', (e) => {
    // Sin try/catch, un setPointerCapture que falla (pasa de verdad en
    // algunos navegadores/casos borde) tira una excepción no capturada
    // que corta TODO el resto del handler — ni siquiera queda registrado
    // el puntero, y el gesto entero deja de responder. Sin la captura el
    // gesto igual sigue andando mientras el dedo no se vaya de #stage,
    // sólo se pierde ese caso borde.
    try {
      stage.setPointerCapture(e.pointerId);
    } catch {}
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    img.style.transition = 'none';
    if (pointers.size === 1) {
      downAt = Date.now();
      downPos = { x: e.clientX, y: e.clientY };
      panStart = { x: e.clientX - tx, y: e.clientY - ty };
      moved = false;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStartDist = dist(a, b);
      pinchStartScale = scale;
      moved = true; // un pinch nunca cuenta como tap al soltar
    }
  });

  stage?.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2 && pinchStartDist) {
      const [a, b] = [...pointers.values()];
      scale = Math.min(4, Math.max(1, pinchStartScale * (dist(a, b) / pinchStartDist)));
      applyTransform();
    } else if (pointers.size === 1 && panStart) {
      if (scale > 1) {
        tx = e.clientX - panStart.x;
        ty = e.clientY - panStart.y;
        applyTransform();
      } else {
        // Sin zoom, un arrastre vertical es "tirar para cerrar" — sigue
        // al dedo con un fade sutil (mismo lenguaje que un lightbox de
        // apps de fotos). enableDragToClose (ui.js) no aplica acá: está
        // pensado para hojas que suben desde abajo, no para un visor a
        // pantalla completa.
        const dy = Math.max(0, e.clientY - downPos.y);
        if (dy > Math.abs(e.clientX - downPos.x)) {
          img.style.transform = `translateY(${dy}px)`;
          img.style.opacity = String(Math.max(0.35, 1 - dy / 400));
        }
      }
      if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 8) moved = true;
    }
  });

  function onPointerUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStartDist = 0;
    if (pointers.size > 0) return;

    panStart = null;
    const dy = downPos ? e.clientY - downPos.y : 0;
    const dx = downPos ? e.clientX - downPos.x : 0;
    if (scale <= 1 && dy > 90 && dy > Math.abs(dx)) {
      moved = false;
      closeDialog(lightboxDlg).then(() => {
        img.style.transform = '';
        img.style.opacity = '';
      });
      return;
    }
    if (scale <= 1 && (img.style.transform || img.style.opacity)) {
      // No llegó al umbral: vuelve a su lugar en vez de quedar corrida.
      img.style.transition = 'transform 0.2s var(--ease-out), opacity 0.2s var(--ease-out)';
      img.style.transform = '';
      img.style.opacity = '';
      setTimeout(() => { img.style.transition = 'none'; }, 220);
    }

    const wasQuickTap = !moved && Date.now() - downAt < 400;
    moved = false;
    if (!wasQuickTap) return;

    const now = Date.now();
    if (now - lastTapAt < 300) {
      // doble-tap: alterna zoom
      if (scale > 1) resetZoom();
      else zoomAt(e.clientX, e.clientY);
    } else if (scale <= 1 && fullSrcsOf().length > 1) {
      // un solo tap a un costado cambia de foto; en el centro, zoom simple
      const r = stage.getBoundingClientRect();
      const x = e.clientX - r.left;
      if (x < r.width * 0.25) goTo(currentIndex() - 1);
      else if (x > r.width * 0.75) goTo(currentIndex() + 1);
      else zoomAt(e.clientX, e.clientY);
    } else if (scale <= 1) {
      zoomAt(e.clientX, e.clientY);
    } else {
      resetZoom();
    }
    lastTapAt = now;
  }
  stage?.addEventListener('pointerup', onPointerUp);
  stage?.addEventListener('pointercancel', (e) => {
    pointers.delete(e.pointerId);
    panStart = null;
    moved = false;
  });
}

/* ==========================================================================
   ARRANQUE
   ========================================================================== */

await loadData();
loadCart();
syncCartUI();
observeReveals();
wireAttentionCarousel();
syncBellDot();
renderStatusBadge();

if (grid) {
  // Permite entrar directo a un rubro (o a Ofertas) desde afuera:
  // /?cat=Bazar, /?cat=Ofertas. selectCategory ya llama a render() si
  // encuentra el chip — si no, hace falta el render manual de siempre.
  const wanted = new URLSearchParams(location.search).get('cat');
  if (!wanted || !selectCategory(wanted)) render();
}
