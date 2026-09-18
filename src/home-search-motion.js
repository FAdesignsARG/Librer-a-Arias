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
  const properties = ['position', 'left', 'top', 'right', 'bottom', 'width', 'height', 'transform', 'transform-origin', 'transition', 'z-index', 'will-change', 'box-sizing'];
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
    current.onfinish = () => {
      if (animation !== current || disposed) return;
      form.classList.remove('is-flying');
      stop();
      finish?.();
      schedule();
    };
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
      return;
    }
    if (!next && !wasDocked) return;
    // During the short exit, keep this original form docked. Only after it
    // clears the lower edge do we restore its normal flow and fade it in.
    docked = true;
    form.classList.add('is-docked');
    restore();
    const last = form.getBoundingClientRect();
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
      play([
        { ...at(first), opacity: '0', offset: 0 },
        { opacity: '1', offset: .22 },
        { ...docks, transform: 'translate(0, 6px)', opacity: '1', offset: .82 },
        { ...docks, opacity: '1', offset: 1 },
      ], 640, null, { flying: true, easing: SOFT });
    } else if (next) {
      // Ya estaba abajo (cambio de tamaño o teclado): sólo se reacomoda.
      play([
        { transform: `translate(${first.left - last.left}px, ${first.top - last.top}px)`, opacity },
        { transform: 'translate(0, 0)', opacity: '1' },
      ], 240);
    } else {
      // Vuelta: sube agrandándose hasta su lugar en el hero y ahí se suelta.
      const home = anchor.getBoundingClientRect();
      const visible = home.bottom > 0 && home.top < edge;
      play(visible
        ? [
            { ...docks, opacity: '1', offset: 0 },
            { ...at(home), opacity: '1', offset: 1 },
          ]
        : [
            { transform: 'translate(0, 0)', opacity: '1' },
            { transform: `translate(0, ${below}px)`, opacity: '1' },
          ], visible ? 520 : 160, () => {
        if (desired) return;
        docked = false;
        form.classList.remove('is-docked');
        restore();
        // Aterriza sobre su lugar real; este fundido corto tapa cualquier
        // diferencia si la página siguió moviéndose durante el vuelo.
        play([{ opacity: .6 }, { opacity: 1 }], 140);
      }, { flying: visible, easing: SOFT });
    }
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
    const next = (focusedDock && focused) || rect.bottom < navBottom + 16;
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
  function resize() { if (!disposed) { if (animation) move(desired, true); schedule(); } }
  function motionChange() { if (reduced.matches) move(desired, true); schedule(); }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  viewport?.addEventListener('resize', resize, { passive: true });
  viewport?.addEventListener('scroll', schedule, { passive: true });
  form.addEventListener('focusin', focusIn); form.addEventListener('focusout', focusOut);
  reduced.addEventListener('change', motionChange);
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(anchor); if (nav) observer?.observe(nav);
  move(anchor.getBoundingClientRect().bottom < (nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0) + 16, true);
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
    delete form.__homeSearchMotionCleanup;
  }
  form.__homeSearchMotionCleanup = cleanup;
  return cleanup;
}


