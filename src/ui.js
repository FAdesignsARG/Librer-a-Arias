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
export function closeDialog(dlg, { timeout = 450 } = {}) {
  if (!dlg?.open) return Promise.resolve();

  const finish = () => {
    delete dlg.dataset.closing;
    if (dlg.open) dlg.close();
    // Sólo se apaga si no queda ningún otro <dialog> abierto — evita el
    // parpadeo de un diálogo A abriendo a otro B con el scrim ya prendido.
    if (scrimEl && !document.querySelector('dialog[open]')) scrimEl.hidden = true;
  };

  // Si ya había un cierre en curso (alguien clickeó dos veces, o se
  // reabrió el diálogo a mitad de la animación de salida anterior sin
  // limpiar el flag), NO se relanza la animación — pero tampoco se
  // aborta el cierre en silencio como antes: eso dejaba el diálogo
  // atascado para siempre, sin volver a responder a la X, al fondo ni a
  // Esc, porque este mismo chequeo bloqueaba cualquier intento futuro.
  // Ahora, ya haya animación nueva o no, SIEMPRE se garantiza terminar
  // cerrando dentro del tope de tiempo.
  if (dlg.dataset.closing) {
    return new Promise((r) => setTimeout(r, timeout)).then(finish, finish);
  }

  dlg.dataset.closing = 'true';

  const anims = dlg.getAnimations?.({ subtree: true }) ?? [];
  const done = anims.length
    ? Promise.all(anims.map((a) => a.finished.catch(() => {})))
    : Promise.resolve();

  return Promise.race([done, new Promise((r) => setTimeout(r, timeout))]).then(finish, finish);
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
