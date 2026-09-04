/** Utilidades de interfaz compartidas entre el catálogo y el panel. */

/**
 * Fondo oscuro manual, de respaldo del ::backdrop nativo del <dialog>.
 * En un caso puntual reportado (un diálogo del panel admin) el ::backdrop
 * no se pintaba y el diálogo quedaba mal posicionado en un navegador
 * específico, sin poder reproducirlo ni identificar la causa exacta.
 * Este scrim es un <div> de verdad, con su propio position:fixed — no
 * depende de que el navegador soporte/pinte bien la pseudo-clase
 * ::backdrop de <dialog>, así que funciona aunque eso falle.
 */
let scrimEl = null;
function scrim() {
  if (scrimEl) return scrimEl;
  scrimEl = document.createElement('div');
  scrimEl.className = 'modalscrim';
  scrimEl.hidden = true;
  scrimEl.addEventListener('click', () => {
    const open = document.querySelector('dialog[open]');
    if (open) closeDialog(open);
  });
  document.body.appendChild(scrimEl);
  return scrimEl;
}

/**
 * Cierra un <dialog> dejando que se vea su animación de salida.
 *
 * El truco es marcar `data-closing` (que es lo que dispara la animación en
 * el CSS) y recién llamar a close() cuando terminó. Detalles que importan:
 *
 *  - Se esperan TODAS las animaciones del elemento, no una sola: hay más de
 *    una corriendo (el panel y su ::backdrop) y quedarse con la última era
 *    una lotería.
 *  - Va con tope de tiempo: si la pestaña está en segundo plano el navegador
 *    frena las animaciones y `finished` no resuelve nunca. Sin el tope, el
 *    panel se quedaba abierto para siempre.
 *  - El estado se limpia siempre, incluso si algo falla, así el próximo
 *    intento de abrir no se encuentra con un `data-closing` colgado.
 */
/** El remate de cerrar-de-verdad: dataset limpio, dlg.close() nativo, y
    apagar el scrim si no queda ningún otro <dialog> abierto. closeDialog()
    lo usa para el cierre normal (X/fondo/Esc); enableDragToClose() (más
    abajo) lo reusa tal cual para el cierre por arrastre — un solo lugar
    con la lógica de "terminar de cerrar", no dos copias que puedan
    desincronizarse. */
function finishClose(dlg) {
  delete dlg.dataset.closing;
  if (dlg.open) dlg.close();
  // Sólo se apaga si no queda ningún otro <dialog> abierto — evita el
  // parpadeo de un diálogo A abriendo a otro B con el scrim ya prendido.
  if (scrimEl && !document.querySelector('dialog[open]')) scrimEl.hidden = true;
}

export function closeDialog(dlg, { timeout = 450 } = {}) {
  if (!dlg?.open) return Promise.resolve();

  // Si ya había un cierre en curso (alguien clickeó dos veces, o se
  // reabrió el diálogo a mitad de la animación de salida anterior sin
  // limpiar el flag), NO se relanza la animación — pero tampoco se
  // aborta el cierre en silencio como antes: eso dejaba el diálogo
  // atascado para siempre, sin volver a responder a la X, al fondo ni a
  // Esc, porque este mismo chequeo bloqueaba cualquier intento futuro.
  // Ahora, ya haya animación nueva o no, SIEMPRE se garantiza terminar
  // cerrando dentro del tope de tiempo.
  if (dlg.dataset.closing) {
    return new Promise((r) => setTimeout(r, timeout)).then(() => finishClose(dlg), () => finishClose(dlg));
  }

  dlg.dataset.closing = 'true';

  const anims = dlg.getAnimations?.({ subtree: true }) ?? [];
  const done = anims.length
    ? Promise.all(anims.map((a) => a.finished.catch(() => {})))
    : Promise.resolve();

  return Promise.race([done, new Promise((r) => setTimeout(r, timeout))]).then(
    () => finishClose(dlg),
    () => finishClose(dlg)
  );
}

/**
 * Abre un <dialog> como modal, con foco puesto en el diálogo mismo (no en
 * el primer botón — en mobile Safari eso dispara el anillo de foco sobre
 * un botón chico, se ve roto) y sin arrastrar un `data-closing` colgado
 * de una animación de salida anterior que nunca llegó a limpiarse.
 */
export function openDialog(dlg) {
  if (!dlg) return;
  delete dlg.dataset.closing;
  scrim().hidden = false;
  dlg.showModal();
  dlg.focus();
}

/**
 * Conecta los cierres habituales de un <dialog>: la X, el clic en el fondo
 * y la tecla Esc. Todos pasan por closeDialog para que se anime igual.
 */
export function wireDialog(dlg, closeBtn) {
  if (!dlg) return;

  closeBtn?.addEventListener('click', () => closeDialog(dlg));

  // Al hacer clic en el ::backdrop el target es el propio <dialog>
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) closeDialog(dlg);
  });

  // Esc dispara 'cancel'; lo tomamos para animar la salida
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeDialog(dlg);
  });
}

/**
 * Gesto de "arrastrar para cerrar" para las hojas que suben desde abajo
 * en mobile (el pedido, el chat, ordenar/precio, novedades) — mismo
 * lenguaje visual que las hojas inferiores de iOS/Rappi. Mejora
 * progresiva sobre wireDialog(), no un reemplazo: se llama ADEMÁS de
 * wireDialog() en el mismo diálogo, y si el navegador no dispara Pointer
 * Events por algún motivo, la X, el fondo y Esc siguen cerrando igual —
 * no dependen de nada de acá.
 *
 * Crea y antepone la barrita (.dialog__grabber) — el CSS de cada hoja la
 * mantiene oculta salvo en su propio breakpoint de mobile (donde ya pasa
 * a ocupar el ancho completo desde abajo), así que en desktop no aparece
 * ni el gesto tiene efecto (isSheetLayout() corta el pointerdown ahí).
 *
 * @param header  Además de la barrita, el gesto también arranca tocando
 *                cualquier parte de esta zona (normalmente el header).
 * @param scrollEl El contenedor con scroll propio de adentro, si lo hay.
 *                 El arrastre sólo dispara si el gesto arranca con ESE
 *                 contenedor ya scrolleado hasta arriba — si no, se dejar
 *                 pasar el toque para que sea scroll normal de la lista.
 */
export function enableDragToClose(dlg, { header, scrollEl } = {}) {
  if (!dlg) return;

  const grabber = document.createElement('div');
  grabber.className = 'dialog__grabber';
  grabber.setAttribute('aria-hidden', 'true');
  dlg.prepend(grabber);

  const isSheetLayout = () => matchMedia('(max-width: 560px)').matches;
  const ease = () => getComputedStyle(document.documentElement).getPropertyValue('--ease-premium').trim() || 'ease-out';
  // El seguimiento 1:1 del dedo durante el arrastre no es la clase de
  // movimiento que prefers-reduced-motion busca sacar (es manipulación
  // directa, no una animación que se dispara sola) — pero el remate sí
  // lo es: la duración baja a casi cero en vez de animar, mismo criterio
  // que ya usa el resto del sitio (ver el bloque de reduced-motion en
  // styles.css) en vez de un valor mágico propio.
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const settleDuration = (normal) => (reduceMotion() ? 1 : normal);

  // activePointerId (no sólo un booleano) para que el gesto quede atado
  // al dedo/puntero que lo empezó — si por lo que sea el pointerup/
  // pointercancel de ESE puntero nunca llega, un toque nuevo y sin
  // relación no puede "heredar" un arrastre a medio terminar.
  let activePointerId = null;
  let startY = 0;
  let panelH = 1;
  let activeAnim = null;

  function onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!isSheetLayout()) return;
    if (scrollEl && scrollEl.scrollTop > 0) return; // scrolleando una lista, no arrastrando la hoja
    activeAnim?.cancel();
    activePointerId = e.pointerId;
    startY = e.clientY;
    panelH = dlg.getBoundingClientRect().height || 1;
    dlg.style.transition = 'none';
    (e.currentTarget).setPointerCapture?.(e.pointerId);
  }

  function onMove(e) {
    if (e.pointerId !== activePointerId) return;
    const delta = Math.max(0, e.clientY - startY);
    dlg.style.transform = `translateY(${delta}px)`;
  }

  // Mismo motivo que el tope de tiempo de closeDialog(): con la pestaña
  // en segundo plano el navegador puede frenar/nunca resolver
  // `.finished` — sin este respaldo el panel quedaría trabado a mitad de
  // camino, sin responder más a nada.
  const waitAnim = (anim, timeout = 400) =>
    Promise.race([anim.finished.catch(() => {}), new Promise((r) => setTimeout(r, timeout))]);

  function onUp(e) {
    if (e.pointerId !== activePointerId) return;
    activePointerId = null;
    dlg.style.transition = '';
    const delta = Math.max(0, e.clientY - startY);

    if (delta > panelH * 0.28) {
      // Pasa el umbral: sigue el mismo movimiento hasta abajo del todo en
      // vez de saltar al keyframe normal de salida (que siempre arranca
      // desde translateY(0) y se vería como un salto hacia atrás).
      activeAnim = dlg.animate(
        [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(100%)' }],
        { duration: settleDuration(180), easing: ease(), fill: 'forwards' }
      );
      waitAnim(activeAnim).then(() => {
        dlg.style.transform = '';
        finishClose(dlg);
      });
    } else {
      // No llega al umbral: vuelve a su lugar en vez de cerrarse.
      activeAnim = dlg.animate(
        [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }],
        { duration: settleDuration(220), easing: ease(), fill: 'forwards' }
      );
      waitAnim(activeAnim).then(() => {
        dlg.style.transform = '';
      });
    }
  }

  for (const zone of [grabber, header].filter(Boolean)) {
    zone.addEventListener('pointerdown', onDown);
    zone.addEventListener('pointermove', onMove);
    zone.addEventListener('pointerup', onUp);
    zone.addEventListener('pointercancel', onUp);
  }
}
