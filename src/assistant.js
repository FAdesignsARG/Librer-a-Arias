/**
 * Asistente del catálogo.
 *
 * Tiene dos modos y elige solo:
 *   - Con servidor y clave de Groq: responde con IA.
 *   - Sin eso (sitio estático publicado, o .env sin clave): responde con
 *     el buscador semántico local, que ya entiende "regalo para nena" o
 *     "menos de 10 mil". Muestra los productos igual, sin texto redactado.
 *
 * O sea: el botón nunca queda roto. Con IA conversa; sin IA, busca.
 */
import { buildIndex, getIndex, searchProducts } from './search-engine.js';
import { wireDialog } from './ui.js';
import { cloudinaryUrl } from './cloudinary-config.js';

const $ = (s, r = document) => r.querySelector(s);
const money = (n) => '$' + Number(n || 0).toLocaleString('es-AR');
const thumbOf = (id) => cloudinaryUrl(id, { width: 400 });

const arrow =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>';
const plusIco =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
const checkIco =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

const SEEDS = [
  'Regalo para una nena de 6 años',
  '¿Qué tenés por menos de 10 mil?',
  'Algo para la cocina',
  'Juguetes para el agua',
];

let hasAI = false;
/** Historial que se manda al modelo para que siga el hilo. */
const history = [];

const dlg = $('#chat');
const body = $('#chatBody');
const form = $('#chatForm');
const input = $('#chatInput');
const sendBtn = $('#chatSend');

/* ==========================================================================
   Render
   ========================================================================== */

const scrollDown = () => (body.scrollTop = body.scrollHeight);

function addMsg(text, who = 'bot') {
  const el = document.createElement('div');
  el.className = `msg msg--${who}`;
  el.textContent = text;
  body.append(el);
  scrollDown();
  return el;
}

function addPicks(items) {
  if (!items.length) return;
  const wrap = document.createElement('div');
  wrap.className = 'picks';
  wrap.innerHTML = items
    .map(
      (p) => `<div class="pick">
      <a class="pick__link" href="/p/${p.slug}/">
        ${p.image ? `<img src="${thumbOf(p.image)}" alt="" width="46" height="46" loading="lazy">` : ''}
        <span class="pick__info">
          <span class="pick__name"></span>
          <span class="pick__meta"><b>${money(p.price)}</b> · ${p.inStock ? p.category : 'sin stock'}</span>
        </span>
        <span class="pick__go">${arrow}</span>
      </a>
      ${
        p.inStock
          ? `<button type="button" class="pick__add" data-add="${p.slug}" aria-label="Agregar ${p.name} al pedido">${plusIco}</button>`
          : ''
      }
    </div>`
    )
    .join('');
  // El nombre por textContent: puede tener comillas o signos
  [...wrap.querySelectorAll('.pick__name')].forEach((el, i) => (el.textContent = items[i].name));
  body.append(wrap);
  scrollDown();
}

function addTyping() {
  const el = document.createElement('div');
  el.className = 'typing';
  el.innerHTML = '<i></i><i></i><i></i>';
  body.append(el);
  scrollDown();
  return el;
}

function addSeeds() {
  const wrap = document.createElement('div');
  wrap.className = 'seeds';
  wrap.innerHTML = SEEDS.map((s) => `<button class="seed" type="button"></button>`).join('');
  [...wrap.children].forEach((b, i) => {
    b.textContent = SEEDS[i];
    b.addEventListener('click', () => {
      input.value = SEEDS[i];
      form.requestSubmit();
    });
  });
  body.append(wrap);
  scrollDown();
}

/* ==========================================================================
   Respuestas
   ========================================================================== */

/**
 * El índice lo arma app.js en la portada, pero en una landing de producto
 * app.js no lo construye para nada y acá haría falta igual. search-engine.js
 * es un módulo único compartido, así que si ya está armado no se rehace.
 */
async function ensureIndex() {
  if (getIndex().length) return;
  const list = await fetch('/data/products.json').then((r) => r.json());
  buildIndex(list.filter((p) => p.visible !== false));
}

/**
 * "Lo más viral" no es algo que el buscador pueda deducir del texto: no hay
 * ninguna palabra en el catálogo que diga "viral". Se resuelve con los
 * productos marcados como destacados en el panel, y si no hay ninguno, con
 * los primeros del orden que definió el local (que es su propia curaduría).
 */
function destacados(n = 4) {
  const todos = getIndex().map((e) => e.p);
  const marcados = todos.filter((p) => p.featured);
  return (marcados.length ? marcados : todos).slice(0, n);
}

const esConsultaDeDestacados = (q) =>
  /viral|vendido|buscado|popular|tendencia|moda|recomenda/i.test(q);

/** Sin IA: buscador semántico local. */
async function answerLocally(question) {
  await ensureIndex();

  if (esConsultaDeDestacados(question)) {
    const picks = destacados();
    addMsg('Esto es lo que más se está buscando:');
    addPicks(
      picks.map((p) => ({
        slug: p.slug,
        name: p.name,
        price: p.price,
        category: p.category,
        inStock: p.inStock,
        image: p.images?.[0],
      }))
    );
    return;
  }

  const found = searchProducts(question, getIndex()).slice(0, 4);

  if (!found.length) {
    addMsg('No encontré nada con eso en el catálogo. Probá con otras palabras, o escribinos por WhatsApp y lo buscamos.');
    return;
  }
  addMsg(
    found.length === 1
      ? 'Encontré esto:'
      : `Encontré ${found.length} cosas que te pueden servir:`
  );
  addPicks(
    found.map((p) => ({
      slug: p.slug,
      name: p.name,
      price: p.price,
      category: p.category,
      inStock: p.inStock,
      image: p.images?.[0],
    }))
  );
}

async function ask(question) {
  addMsg(question, 'me');
  input.value = '';
  input.style.height = '';
  sendBtn.disabled = true;

  if (!hasAI) {
    await answerLocally(question);
    sendBtn.disabled = false;
    return;
  }

  const dots = addTyping();
  try {
    const res = await fetch('/api/ai/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question, history }),
    });
    const data = await res.json();
    dots.remove();

    if (!res.ok) {
      // Si la IA falla por lo que sea, el buscador local responde igual.
      if (data.error === 'LIMITE') {
        addMsg('Estoy recibiendo muchas consultas en este momento. Te busco igual:', 'bot');
      }
      await answerLocally(question);
      return;
    }

    if (data.respuesta) addMsg(data.respuesta);
    addPicks(data.productos || []);

    history.push({ role: 'user', content: question });
    history.push({ role: 'assistant', content: data.respuesta || '' });
  } catch {
    dots.remove();
    await answerLocally(question);
  } finally {
    sendBtn.disabled = false;
  }
}

/* ==========================================================================
   Interacción
   ========================================================================== */

function openChat() {
  if (!body.children.length) {
    addMsg('¡Hola! Contame qué buscás y te digo si lo tenemos. Podés escribirme como le hablarías a alguien del local.');
    addSeeds();
  }
  dlg.showModal();
  // En escritorio conviene el foco puesto; en celular abriría el teclado solo
  if (matchMedia('(min-width: 640px)').matches) input.focus();
}

$('#askBtn')?.addEventListener('click', openChat);
wireDialog(dlg, $('#chatClose'));

/* ---- Globo de invitación al asistente ----
   Aparece una vez por sesión (no en cada página que se visita), apuntando
   al botón del dock. La posición se calcula en el momento de mostrarlo
   con getBoundingClientRect() porque la altura del dock varía según si
   el botón del pedido está visible (con el carrito vacío no está). */
const nudge = $('#aiNudge');
const NUDGE_KEY = 'arias.nudgeShown';

function hideNudge() {
  if (!nudge || nudge.hidden || nudge.dataset.closing) return;
  nudge.dataset.closing = 'true';
  setTimeout(() => {
    nudge.hidden = true;
    delete nudge.dataset.closing;
  }, 240);
}

if (nudge && !sessionStorage.getItem(NUDGE_KEY)) {
  setTimeout(() => {
    // El chat pudo haberse abierto solo (o el usuario ya se fue de la
    // página) en el rato que pasó — no tiene sentido mostrarlo entonces.
    if (dlg.open) return;
    const dock = document.querySelector('.dock');
    if (!dock) return;
    const r = dock.getBoundingClientRect();
    nudge.style.right = `${window.innerWidth - r.right}px`;
    nudge.style.bottom = `${window.innerHeight - r.top + 14}px`;
    nudge.hidden = false;
    sessionStorage.setItem(NUDGE_KEY, 'true');
    setTimeout(hideNudge, 7000);
  }, 3500);
}

$('#aiNudgeClose')?.addEventListener('click', hideNudge);
$('#aiNudgeBody')?.addEventListener('click', () => {
  hideNudge();
  openChat();
});

/* El pop-up de bienvenida dispara esto al elegir una de las opciones
   rápidas: abre el chat y manda la consulta ya escrita. */
document.addEventListener('arias:preguntar', (e) => {
  const pregunta = e.detail?.pregunta;
  if (!pregunta) return;
  openChat();
  ask(pregunta);
});

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (q) ask(q);
});

// Enter manda, Shift+Enter hace salto de línea
input?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

// El textarea crece con el texto hasta el tope del CSS
input?.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';
});

/* ==========================================================================
   Arranque
   ========================================================================== */

// Si no hay servidor (sitio estático) el fetch falla y quedamos en modo local
fetch('/api/ai/status')
  .then((r) => r.json())
  .then((d) => {
    hasAI = !!d.enabled;
    const sub = $('#chatSub');
    if (sub) sub.textContent = hasAI ? 'Te ayudo a encontrar lo que buscás' : 'Buscador del catálogo';
  })
  .catch(() => {
    hasAI = false;
  });
