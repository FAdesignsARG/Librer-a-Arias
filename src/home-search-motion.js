/** Bottom capsule motion on the same form: no clones or reparenting. */
export function initHomeSearchMotion() {
  const anchor = document.getElementById('homeSearchAnchor');
  const form = document.getElementById('homeSearch');
  if (!anchor || !form || !anchor.contains(form)) return () => {};
  if (form.__homeSearchMotionCleanup) return form.__homeSearchMotionCleanup;
  const nav = document.getElementById('nav');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const viewport = window.visualViewport;
  const properties = ['position', 'left', 'top', 'right', 'bottom', 'width', 'height', 'transform', 'transition', 'z-index', 'will-change', 'box-sizing'];
  const original = new Map(properties.map(key => [key, [form.style.getPropertyValue(key), form.style.getPropertyPriority(key)]]));
  const oldKeyboard = form.style.getPropertyValue('--search-keyboard-bottom');
  const oldDock = form.classList.contains('is-docked');
  let docked = oldDock, desired = oldDock, focusedDock = false, animation = null;
  let frame = 0, disposed = false, keyboardBottom = 0;
  function restore() {
    for (const [key, [value, priority]] of original) {
      if (value) form.style.setProperty(key, value, priority);
      else form.style.removeProperty(key);
    }
    if (docked) form.style.bottom = 'calc(var(--search-bottom-gap, 24px) + env(safe-area-inset-bottom, 0px) + var(--search-keyboard-bottom, 0px))';
  }
  function stop() {
    if (animation) { animation.onfinish = null; animation.cancel(); animation = null; }
    restore();
  }
  function play(keyframes, ms, finish) {
    animation = form.animate(keyframes, {
      duration: ms, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both',
    });
    const current = animation;
    current.onfinish = () => {
      if (animation !== current || disposed) return;
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
    const startX = wasDocked ? first.left - last.left : 0;
    const startY = wasDocked ? first.top - last.top : below;
    Object.assign(form.style, {
      position: 'fixed', left: `${last.left}px`, top: `${last.top}px`,
      right: 'auto', bottom: 'auto', width: `${last.width}px`,
      height: `${last.height}px`, transform: 'none', transition: 'none',
      zIndex: '120', willChange: 'transform', boxSizing: 'border-box',
    });
    play([
      { transform: `translate(${startX}px, ${startY}px)`, opacity: wasDocked ? opacity : '1' },
      { transform: `translate(0, ${next ? 0 : below}px)`, opacity: '1' },
    ], next ? 360 : 160, () => {
      if (next || desired) return;
      docked = false;
      form.classList.remove('is-docked');
      restore();
      // No geometric flight across content: the same input returns to its
      // existing anchor, and this brief fade makes that restoration legible.
      play([{ opacity: 0 }, { opacity: 1 }], 120);
    });
  }
  function update() {
    frame = 0;
    if (disposed) return;
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
  function schedule() { if (!frame && !disposed) frame = requestAnimationFrame(update); }
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
    disposed = true; cancelAnimationFrame(frame); stop();
    docked = oldDock; form.classList.toggle('is-docked', oldDock);
    for (const [key, [value, priority]] of original) { if (value) form.style.setProperty(key, value, priority); else form.style.removeProperty(key); }
    if (oldKeyboard) form.style.setProperty('--search-keyboard-bottom', oldKeyboard); else form.style.removeProperty('--search-keyboard-bottom');
    window.removeEventListener('scroll', schedule); window.removeEventListener('resize', resize);
    viewport?.removeEventListener('resize', resize); viewport?.removeEventListener('scroll', schedule);
    form.removeEventListener('focusin', focusIn); form.removeEventListener('focusout', focusOut);
    reduced.removeEventListener('change', motionChange); observer?.disconnect();
    delete form.__homeSearchMotionCleanup;
  }
  form.__homeSearchMotionCleanup = cleanup;
  return cleanup;
}


