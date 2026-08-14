/** Utilidades de interfaz compartidas entre el catálogo y el panel. */

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
  if (!dlg?.open || dlg.dataset.closing) return Promise.resolve();

  dlg.dataset.closing = 'true';

  const finish = () => {
    delete dlg.dataset.closing;
    if (dlg.open) dlg.close();
  };

  const anims = dlg.getAnimations?.({ subtree: true }) ?? [];
  const done = anims.length
    ? Promise.all(anims.map((a) => a.finished.catch(() => {})))
    : Promise.resolve();

  return Promise.race([done, new Promise((r) => setTimeout(r, timeout))]).then(finish, finish);
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
