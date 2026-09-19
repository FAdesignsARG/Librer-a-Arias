/** Bottom capsule motion on the same form: no clones or reparenting.
    Ronda 4 (17/09/2026): acoplada abajo, la cápsula es una isla que respira
    con el scroll — se achica al bajar (is-compact), se agranda al subir, al
    quedarse quieta o al recibir foco — al estilo de shop.app e Instagram.
    El estado se expone con clases; la forma la decide el CSS de home.css. */
/** Ronda E (18/09/2026): la transición ya no es "aparece desde abajo". El mismo
    buscador viaja: sale de su lugar en el hero, baja achicándose hasta acoplarse
    (referencia: el buscador de Airbnb, de grande a chico), y cuando se vuelve
    arriba hace el camino inverso. Durante el vuelo lleva la clase is-flying, que
    le da el brillo de vidrio desde el CSS. */
export function initHomeSearchMotion() {
  const anchor = document.getElementById('homeSearchAnchor');
  const form = document.getElementById('homeSearch');
  if (!anchor || !form || !anchor.contains(form)) return () => {};
  if (form.__homeSearchMotionCleanup) return form.__homeSearchMotionCleanup;
  const nav = document.getElementById('nav');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const viewport = window.visualViewport;
  const properties = ['position', 'left', 'top', 'right', 'bottom', 'width', 'height', 'transform', 'transform-origin', 'transition', 'z-index', 'will-change', 'box-sizing', 'opacity'];
  const original = new Map(properties.map(key => [key, [form.style.getPropertyValue(key), form.style.getPropertyPriority(key)]]));
  const oldKeyboard = form.style.getPropertyValue('--search-keyboard-bottom');
  const oldDock = form.classList.contains('is-docked');
  let docked = oldDock, desired = oldDock, focusedDock = false, animation = null;
  let frame = 0, fallback = 0, disposed = false, keyboardBottom = 0;
  // Respiración de la isla: dirección del scroll + reposo.
  let lastY = window.scrollY, compact = false, idleTimer = 0;
  const IDLE_MS = 900, DOWN_PX = 14;
  function setCompact(next) {
    if (compact === next) return;
    compact = next;
    form.classList.toggle('is-compact', compact);
  }
  function breathe() {
    const y = window.scrollY, dy = y - lastY;
    lastY = y;
    const focused = form.contains(document.activeElement);
    if (!docked || focused) { setCompact(false); return; }
    if (dy > DOWN_PX) setCompact(true);      // bajando: se recoge
    else if (dy < -4) setCompact(false);     // subiendo: se ofrece
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!disposed) setCompact(false); }, IDLE_MS);
  }
  function restore() {
    for (const [key, [value, priority]] of original) {
      if (value) form.style.setProperty(key, value, priority);
      else form.style.removeProperty(key);
    }
    if (docked) form.style.bottom = 'calc(var(--search-bottom-gap, 24px) + env(safe-area-inset-bottom, 0px) + var(--search-keyboard-bottom, 0px))';
  }
  function stop() {
    if (animation) { animation.onfinish = null; animation.cancel(); animation = null; }
    form.classList.remove('is-flying');
    restore();
  }
  function play(keyframes, ms, finish, { flying = false, easing = 'cubic-bezier(.16,1,.3,1)' } = {}) {
    form.classList.toggle('is-flying', flying);
    animation = form.animate(keyframes, { duration: ms, easing, fill: 'both' });
    const current = animation;
    let guard = 0;
    const settle = () => {
      clearTimeout(guard);
      if (animation !== current || disposed) return;
      form.classList.remove('is-flying');
      stop();
      finish?.();
      schedule();
    };
    current.onfinish = settle;
    // Si el navegador no avisa el fin (pestaña sin cuadros), igual se suelta.
    guard = setTimeout(settle, ms + 250);
  }
  // Vuelta al hero con destino vivo: el hueco se mueve mientras la página sigue
  // subiendo, así que cada cuadro se vuelve a leer dónde está. La píldora nunca
  // apunta a una posición vieja (antes se iba hacia arriba y después saltaba) y
  // aterriza exactamente sobre su lugar: se funde con él, sin corte.
  function track(from, ms, finish, { down = false, fade = false } = {}) {
    form.classList.add('is-flying');
    const ease = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    const started = performance.now();
    let raf = 0, timer = 0, done = false;
    const token = { live: true, onfinish: null, cancel() { done = true; cancelAnimationFrame(raf); clearTimeout(timer); } };
    // Dónde queda acoplada, medido desde abajo: si la ventana cambia de alto en
    // pleno vuelo (la barra del navegador del celular), el destino la acompaña.
    const fromBottom = window.innerHeight - (from.top + from.height);
    // f = cuánto del camino hacia el hueco del hero: la vuelta va de 0 a 1 y la
    // ida (down) de 1 a 0, con la misma curva. En la ida el hueco sigue subiendo
    // con la página: la píldora se despega de ella de a poco y recién después
    // baja. Si el hueco quedó muy lejos, arranca apenas por encima del borde.
    const paint = p => {
      const to = anchor.getBoundingClientRect(), f = down ? 1 - ease(p) : ease(p);
      const top = Math.max(to.top, -to.height - 24);
      const dockTop = window.innerHeight - fromBottom - from.height;
      const y = dockTop + (top - dockTop) * f;
      form.style.transform = `translate(${(to.left - from.left) * f}px, ${y - from.top}px)`;
      form.style.width = `${from.width + (to.width - from.width) * f}px`;
      form.style.height = `${from.height + (to.height - from.height) * f}px`;
      if (fade) form.style.opacity = String(Math.min(1, p / .25));
    };
    const end = () => {
      if (done) return;
      token.cancel();
      if (animation !== token || disposed) return;
      stop();
      finish?.();
      schedule();
    };
    const step = now => {
      if (done) return;
      const p = Math.min(1, (now - started) / ms);
      paint(p);
      if (p < 1) raf = requestAnimationFrame(step); else end();
    };
    animation = token;
    paint(0);
    raf = requestAnimationFrame(step);
    // Si el navegador frena los cuadros (pestaña en segundo plano), igual aterriza.
    timer = setTimeout(end, ms + 240);
  }
  function move(next, immediate = false) {
    // Read the animated rect before cancellation: reversing the capsule uses
    // its current visible position, never a stale endpoint or a hero-to-footer flight.
    const first = form.getBoundingClientRect();
    const opacity = getComputedStyle(form).opacity;
    const wasDocked = docked;
    stop();
    desired = next;
    setCompact(false);
    if (immediate || reduced.matches || !form.animate) {
      docked = next;
      form.classList.toggle('is-docked', docked);
      restore();
      if (!docked) anchor.style.removeProperty('min-height');
      return;
    }
    if (!next && !wasDocked) return;
    // During the short exit, keep this original form docked. Only after it
    // clears the lower edge do we restore its normal flow and fade it in.
    if (!wasDocked && first.height > 0) anchor.style.minHeight = `${first.height}px`;
    docked = true;
    form.classList.add('is-docked', 'is-measuring');
    restore();
    // is-measuring apaga las transiciones de tamaño: si no, el destino se medía
    // a mitad de camino (60px de alto) y el vuelo aterrizaba 8px corto.
    const last = form.getBoundingClientRect();
    form.classList.remove('is-measuring');
    const edge = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
    const below = Math.max(last.height + 16, edge - last.top + 16);
    Object.assign(form.style, {
      position: 'fixed', left: `${last.left}px`, top: `${last.top}px`,
      right: 'auto', bottom: 'auto', width: `${last.width}px`,
      height: `${last.height}px`, transform: 'none', transition: 'none',
      zIndex: '120', willChange: 'transform', boxSizing: 'border-box',
      transformOrigin: '0 0',
    });
    const SOFT = 'cubic-bezier(.22,.9,.24,1)';
    // Rectángulo (en pantalla) → cuadro clave respecto de la posición acoplada.
    // Se animan el ancho y el alto reales, no una escala: el texto no se deforma
    // y al aterrizar mide exactamente lo que mide en su lugar. Si el origen quedó
    // muy lejos (salto por un ancla), el vuelo arranca apenas por encima del
    // borde: nunca cruza la página entera.
    const at = (rect) => {
      const top = Math.max(rect.top, -rect.height - 24);
      return {
        transform: `translate(${rect.left - last.left}px, ${top - last.top}px)`,
        width: `${rect.width}px`, height: `${rect.height}px`,
      };
    };
    const docks = { transform: 'translate(0, 0)', width: `${last.width}px`, height: `${last.height}px` };
    if (next && !wasDocked) {
      // Ida: del hero hacia abajo, achicándose; llega con un rebote mínimo.
      // Ida: el mismo vuelo que la vuelta, espejado (misma curva, mismo
      // seguimiento cuadro a cuadro). Despega de donde está, a la vista; sólo
      // se funde si el origen quedó fuera de pantalla (salto por un ancla).
      const seen = first.bottom > 8 && first.top < edge - 8;
      track(last, 620, null, { down: true, fade: !seen });
    } else if (next) {
      // Ya estaba abajo (cambio de tamaño o teclado): sólo se reacomoda.
      play([
        { ...at(first), opacity },
        { ...docks, opacity: '1' },
      ], 280, null, { easing: SOFT });
    } else {
      // Vuelta: sube agrandándose hasta su lugar en el hero y ahí se suelta.
      const home = anchor.getBoundingClientRect();
      const visible = home.bottom > 0 && home.top < edge;
      const land = () => {
        if (desired) return;
        docked = false;
        form.classList.remove('is-docked');
        restore();
        anchor.style.removeProperty('min-height');
      };
      if (visible) track(last, 560, land);
      else play([
        { transform: 'translate(0, 0)', opacity: '1' },
        { transform: `translate(0, ${below}px)`, opacity: '1' },
      ], 160, land);
    }
  }
  // Baja apenas la píldora toca el borde de arriba (todavía se ve: el vuelo se
  // lee entero) y vuelve sólo cuando su lugar está completo en pantalla, con
  // 24px de histéresis para que no titubee en el límite.
  function shouldDock(rect, navBottom) {
    if (window.scrollY <= 1) return false;
    return desired ? rect.top < navBottom + 28 : rect.top < navBottom + 4;
  }
  function update() {
    cancelAnimationFrame(frame); clearTimeout(fallback);
    frame = 0; fallback = 0;
    if (disposed) return;
    breathe();
    const focused = form.contains(document.activeElement);
    // Include browser panning; do not interpret pinch zoom as a keyboard.
    const inset = viewport && focused && viewport.scale <= 1.05 ? Math.max(0, window.innerHeight-viewport.height-viewport.offsetTop) : 0;
    const bottom = Math.round(inset), keyboardChanged = bottom !== keyboardBottom;
    keyboardBottom = bottom;
    form.style.setProperty('--search-keyboard-bottom', `${bottom}px`);
    const rect = anchor.getBoundingClientRect();
    const navBottom = nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0;
    const next = (focusedDock && focused) || shouldDock(rect, navBottom);
    if (next !== desired || keyboardChanged) move(next, keyboardChanged && focused);
  }
  // rAF y un respaldo por tiempo: algunos WebViews lo frenan durante el
  // scroll con inercia, y la isla no puede quedarse en un estado viejo.
  function schedule() {
    if (disposed || frame) return;
    frame = requestAnimationFrame(update);
    if (!fallback) fallback = setTimeout(update, 120);
  }
  function focusIn() {
    // Prevent mobile focus auto-scroll from sending a docked input back up.
    // This focus lock ends on blur; the original selection is untouched.
    focusedDock = docked; schedule();
  }
  function focusOut() { queueMicrotask(() => { if (!form.contains(document.activeElement)) focusedDock = false; schedule(); }); }
  // Un cambio de tamaño en pleno vuelo NO lo corta. Antes sí: al despegar, el
  // hueco del hero se achicaba 2px (el formulario deja de ocuparlo), el
  // ResizeObserver avisaba y la isla aparecía acoplada de golpe (el "salto" de la
  // ida; en la vuelta el hueco no cambia, por eso se veía bien). En el celular
  // pasaba lo mismo cuando la barra del navegador se esconde al hacer scroll.
  // El vuelo relee sus dos extremos en cada cuadro, así que sólo se reprograma.
  function resize() {
    if (disposed) return;
    if (animation && !animation.live) move(desired, true);
    if (docked && !animation) anchor.style.removeProperty('min-height');
    schedule();
  }
  function motionChange() { if (reduced.matches) move(desired, true); schedule(); }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  viewport?.addEventListener('resize', resize, { passive: true });
  viewport?.addEventListener('scroll', schedule, { passive: true });
  form.addEventListener('focusin', focusIn); form.addEventListener('focusout', focusOut);
  reduced.addEventListener('change', motionChange);
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(anchor); if (nav) observer?.observe(nav);
  move(shouldDock(anchor.getBoundingClientRect(), nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0), true);
  schedule();
  function cleanup() {
    disposed = true; cancelAnimationFrame(frame); clearTimeout(fallback); stop();
    docked = oldDock; form.classList.toggle('is-docked', oldDock);
    for (const [key, [value, priority]] of original) { if (value) form.style.setProperty(key, value, priority); else form.style.removeProperty(key); }
    if (oldKeyboard) form.style.setProperty('--search-keyboard-bottom', oldKeyboard); else form.style.removeProperty('--search-keyboard-bottom');
    clearTimeout(idleTimer); form.classList.remove('is-compact');
    window.removeEventListener('scroll', schedule); window.removeEventListener('resize', resize);
    viewport?.removeEventListener('resize', resize); viewport?.removeEventListener('scroll', schedule);
    form.removeEventListener('focusin', focusIn); form.removeEventListener('focusout', focusOut);
    reduced.removeEventListener('change', motionChange); observer?.disconnect();
    anchor.style.removeProperty('min-height');
    delete form.__homeSearchMotionCleanup;
  }
  form.__homeSearchMotionCleanup = cleanup;
  return cleanup;
}


