/**
 * Tema (claro/oscuro), splash de entrada y pop-up de bienvenida.
 *
 * El tema en sí se aplica antes del primer pintado con el script inline
 * que está en el <head> (ver templates.js → themeBootScript). Este módulo
 * se ocupa de lo que puede esperar: el botón, el pop-up y la animación.
 */
import { closeDialog } from './ui.js';

const KEY_THEME = 'arias.tema';
const KEY_ASKED = 'arias.tema.preguntado';
const KEY_SPLASH = 'arias.splash.visto';

const root = document.documentElement;

export const getTheme = () => root.dataset.theme || 'dark';

/**
 * Cambia el tema. `animate` habilita el fundido entre colores; al arrancar
 * la página va en false para que no se vea ninguna transición.
 */
export function setTheme(theme, { animate = true, persist = true } = {}) {
  if (animate) root.setAttribute('data-theme-anim', '');
  root.dataset.theme = theme;

  // La barra del navegador en el celular acompaña el fondo
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'light' ? '#fbfbfd' : '#08080a');

  if (persist) {
    try {
      localStorage.setItem(KEY_THEME, theme);
    } catch {
      /* modo privado: el tema vale para esta visita nomás */
    }
  }
}

/* ==========================================================================
   BOTÓN DE LA BARRA
   ========================================================================== */

const btn = document.getElementById('themeBtn');
btn?.addEventListener('click', () => {
  setTheme(getTheme() === 'light' ? 'dark' : 'light');
  btn.dataset.spin = 'true';
  setTimeout(() => delete btn.dataset.spin, 460);
});

/* ==========================================================================
   SPLASH
   Corre una vez por pestaña: al navegar entre la grilla y las landings no
   tiene que repetirse, sería insoportable.
   ========================================================================== */

/* Los navegadores internos de WhatsApp/Instagram/Facebook (WebViews que
   abren un link tocado adentro de esas apps, no Safari real) tienen bugs
   conocidos con position:fixed + animaciones — se probó a fondo esta
   misma coreografía en Safari real y mide centrada exacta, pero un link
   compartido por WhatsApp seguía mostrando el logo corrido. En vez de
   perseguir un bug de un WebView de terceros que no se puede inspeccionar,
   se salta la animación ahí directamente: mismo criterio que ya existe
   para prefers-reduced-motion, sólo se ve el logo un instante. */
function isInAppBrowser() {
  return /\bFB_IAB\b|FBAN|FBAV|Instagram|\bLine\/|WhatsApp/i.test(navigator.userAgent || '');
}

function runSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return Promise.resolve();

  let visto = false;
  try {
    visto = sessionStorage.getItem(KEY_SPLASH) === '1';
  } catch {
    /* sin sessionStorage lo mostramos igual, no molesta */
  }

  if (visto || isInAppBrowser()) {
    splash.hidden = true;
    root.removeAttribute('data-splash');
    try {
      sessionStorage.setItem(KEY_SPLASH, '1');
    } catch {}
    return Promise.resolve();
  }

  try {
    sessionStorage.setItem(KEY_SPLASH, '1');
  } catch {}

  splash.dataset.run = 'true';

  return new Promise((resolve) => {
    // Se resuelve cuando termina la última animación (la de las cortinas).
    // El timer de respaldo cubre el caso de la pestaña en segundo plano,
    // donde el navegador frena las animaciones y el evento nunca llega.
    const done = () => {
      splash.hidden = true;
      root.removeAttribute('data-splash');
      resolve();
    };
    const panel = splash.querySelector('.splash__panel--bottom');
    panel?.addEventListener('animationend', done, { once: true });
    setTimeout(done, 2200);
  });
}

/* ==========================================================================
   POP-UP DE BIENVENIDA
   Se muestra una sola vez. Los botones cambian el tema en vivo (eso ES la
   preview) y recién al confirmar se guarda la elección.
   ========================================================================== */

function askTheme() {
  const dlg = document.getElementById('welcome');
  if (!dlg) return;

  let asked = false;
  try {
    asked = localStorage.getItem(KEY_ASKED) === '1';
  } catch {
    asked = true; // sin storage no podemos recordar la respuesta: no molestamos
  }
  if (asked) return;

  // Tema con el que entró, para poder volver atrás si cancela
  const original = getTheme();
  let elegido = original;

  const cards = [...dlg.querySelectorAll('.themecard')];
  const marcar = () =>
    cards.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.theme === elegido)));

  cards.forEach((card) =>
    card.addEventListener('click', () => {
      elegido = card.dataset.theme;
      // Preview en vivo, sin guardar todavía
      setTheme(elegido, { persist: false });
      marcar();
    })
  );

  marcar();

  const guardar = () => {
    setTheme(elegido);
    try {
      localStorage.setItem(KEY_ASKED, '1');
    } catch {}
  };

  // Paso 1 -> paso 2. El botón no cierra: primero muestra por dónde arrancar.
  const save = dlg.querySelector('#welcomeSave');
  const step2 = dlg.querySelector('#welcomeStep2');

  save.addEventListener('click', () => {
    if (step2.hidden) {
      guardar();
      step2.hidden = false;
      save.textContent = 'Entrar al catálogo';
      return;
    }
    closeDialog(dlg);
  });

  // Las cuatro opciones rápidas: tres abren el asistente con la consulta
  // ya escrita, la cuarta simplemente baja al catálogo.
  step2.addEventListener('click', (e) => {
    const opt = e.target.closest('.quick__opt');
    if (!opt) return;

    if (opt.dataset.go === 'catalogo') {
      closeDialog(dlg).then(() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' }));
      return;
    }
    // assistant.js escucha esto: así el pop-up no necesita saber cómo
    // funciona el chat, ni el chat necesita saber que existe el pop-up.
    const pregunta = opt.dataset.ask;
    closeDialog(dlg).then(() =>
      document.dispatchEvent(new CustomEvent('arias:preguntar', { detail: { pregunta } }))
    );
  });

  // Si cierra con Esc en el paso 1 no guardamos y volvemos a como estaba
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    if (step2.hidden) setTheme(original, { persist: false });
    closeDialog(dlg);
  });

  dlg.showModal();
}

/* ==========================================================================
   ARRANQUE
   ========================================================================== */

runSplash().then(askTheme);
