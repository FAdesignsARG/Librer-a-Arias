/* ==========================================================================
   Desplegables del panel (19/09/2026)
   El <select> nativo abre la lista del sistema operativo: no se puede diseñar y
   con el tema oscuro quedaba texto claro sobre fondo blanco. Acá cada <select>
   del panel se reemplaza, a la vista, por una pastilla que abre una lista de
   vidrio — el mismo patrón que los filtros del catálogo.

   El <select> original SIGUE SIENDO la fuente de verdad: queda en el DOM
   (oculto), admin.js lo sigue leyendo y escribiendo como siempre, y al elegir
   una opción se le asigna el valor y se disparan `input` y `change`. Por eso no
   hay que tocar nada de admin.js. Si el navegador no tiene la API Popover, se
   deja el nativo (con colores legibles desde admin.css).
   ========================================================================== */

const SUPPORTED = typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype;
const chevron =
  '<svg class="aselect__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const check =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

let openOne = null; // sólo una lista abierta a la vez
let uid = 0;

function labelFor(select) {
  if (select.getAttribute('aria-label')) return select.getAttribute('aria-label');
  const byFor = select.id && document.querySelector(`label[for="${CSS.escape(select.id)}"]`);
  const wrap = select.closest('.field')?.querySelector('label');
  return (byFor || wrap)?.textContent.trim() || 'Elegir';
}

function enhance(select) {
  if (select.dataset.aselect || select.multiple || select.size > 1) return;
  select.dataset.aselect = 'on';
  const id = `aselect-${++uid}`;

  const wrap = document.createElement('span');
  wrap.className = 'aselect';
  if (select.classList.contains('sort') && select.closest('.atools')) wrap.classList.add('aselect--pill');
  if (select.closest('table')) wrap.classList.add('aselect--compact');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'aselect__btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', id);
  btn.innerHTML = `<span class="aselect__label"></span>${chevron}`;
  wrap.append(btn);

  const pop = document.createElement('div');
  pop.className = 'aselect__pop';
  pop.id = id;
  pop.setAttribute('popover', 'manual');
  pop.setAttribute('role', 'listbox');
  pop.tabIndex = -1;

  select.classList.add('aselect__native');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  select.after(wrap);
  // Dentro de un <dialog> modal todo lo de afuera queda inerte: la lista va
  // adentro del diálogo (igual se dibuja en la capa superior, sin recortes).
  (select.closest('dialog') || document.body).append(pop);
  select.__aselectPop = pop;

  const labelEl = btn.querySelector('.aselect__label');
  const sync = () => {
    const opt = select.selectedOptions[0];
    labelEl.textContent = opt ? opt.textContent : '';
    btn.setAttribute('aria-label', `${labelFor(select)}: ${labelEl.textContent}`);
    btn.disabled = select.disabled;
    // Un filtro con algo elegido se marca, igual que en el catálogo.
    wrap.toggleAttribute('data-active', wrap.classList.contains('aselect--pill') && !!select.value);
    pop.querySelectorAll('[role="option"]').forEach((o) => o.setAttribute('aria-selected', String(o.dataset.value === select.value)));
  };
  const build = () => {
    pop.innerHTML = [...select.options]
      .map(
        (o) =>
          `<button type="button" role="option" class="aselect__opt" data-value="${o.value.replace(/"/g, '&quot;')}" ${o.disabled ? 'disabled' : ''} aria-selected="false"><span>${o.textContent
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')}</span>${check}</button>`
      )
      .join('');
    sync();
  };

  // admin.js asigna `select.value = …` sin disparar eventos (al abrir el editor):
  // se intercepta la propiedad en ESTE elemento para que la pastilla acompañe.
  for (const prop of ['value', 'selectedIndex']) {
    const desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, prop);
    Object.defineProperty(select, prop, {
      configurable: true,
      get() { return desc.get.call(this); },
      set(v) { desc.set.call(this, v); sync(); },
    });
  }
  select.addEventListener('change', sync);
  select.addEventListener('input', sync);
  new MutationObserver(build).observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'selected', 'label'] });
  // Un <label for> o un foco programático sobre el select oculto llega a la pastilla.
  select.addEventListener('focus', () => btn.focus());

  const place = () => {
    const sheet = matchMedia('(max-width: 560px)').matches;
    pop.classList.toggle('is-sheet', sheet);
    if (sheet) { pop.style.cssText = ''; return; }
    const r = btn.getBoundingClientRect();
    const width = Math.max(r.width, 240);
    const left = Math.max(12, Math.min(r.left, innerWidth - width - 12));
    const wanted = Math.min(pop.scrollHeight + 2, 360);
    const below = innerHeight - r.bottom - 20;
    const up = below < Math.min(wanted, 220) && r.top > below;
    const max = Math.max(160, Math.min(360, (up ? r.top : below) - 8));
    pop.style.cssText = `left:${left}px;width:${width}px;max-height:${max}px;${up ? `bottom:${innerHeight - r.top + 8}px;top:auto;` : `top:${r.bottom + 8}px;bottom:auto;`}`;
    pop.dataset.up = String(up);
  };
  const close = (focusBtn = true) => {
    if (openOne !== api) return;
    openOne = null;
    pop.hidePopover();
    btn.setAttribute('aria-expanded', 'false');
    wrap.removeAttribute('data-open');
    if (focusBtn) btn.focus({ preventScroll: true });
  };
  const open = () => {
    if (btn.disabled) return;
    openOne?.close(false);
    openOne = api;
    build();
    pop.showPopover();
    place();
    btn.setAttribute('aria-expanded', 'true');
    wrap.setAttribute('data-open', '');
    (pop.querySelector('[aria-selected="true"]') || pop.querySelector('.aselect__opt:not(:disabled)'))?.focus({ preventScroll: true });
  };
  const api = { close, place, pop, wrap };

  btn.addEventListener('click', () => (openOne === api ? close() : open()));
  btn.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); open(); }
  });
  pop.addEventListener('click', (e) => {
    const opt = e.target.closest('.aselect__opt');
    if (!opt || opt.disabled) return;
    if (select.value !== opt.dataset.value) {
      select.value = opt.dataset.value;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    close();
  });
  pop.addEventListener('keydown', (e) => {
    const opts = [...pop.querySelectorAll('.aselect__opt:not(:disabled)')];
    const i = opts.indexOf(document.activeElement);
    const go = (n) => { e.preventDefault(); opts[(n + opts.length) % opts.length]?.focus(); };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(opts.length - 1);
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'Tab') close(false);
    else if (e.key.length === 1) {
      // Escribir una letra salta a la primera opción que empieza así.
      const hit = opts.find((o) => o.textContent.trim().toLowerCase().startsWith(e.key.toLowerCase()));
      hit?.focus();
    }
  });
  build();
}

/** Reemplaza (a la vista) todos los <select> del panel, y los que aparezcan después. */
export function enhanceSelects(root = document) {
  if (!SUPPORTED) return;
  root.querySelectorAll('select').forEach(enhance);
}

if (SUPPORTED) {
  document.addEventListener('pointerdown', (e) => {
    if (!openOne) return;
    if (openOne.pop.contains(e.target) || openOne.wrap.contains(e.target)) return;
    openOne.close(false);
  }, true);
  // Sólo un cambio de ANCHO cierra la lista: en el celular el alto cambia solo
  // (barra del navegador, teclado) y no es motivo para cerrarla.
  let lastWidth = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth === lastWidth) { openOne?.place(); return; }
    lastWidth = innerWidth;
    openOne?.close(false);
  });
  // La lista acompaña a su pastilla si la página o el diálogo se mueven.
  addEventListener('scroll', (e) => { if (openOne && !openOne.pop.contains(e.target)) openOne.place(); }, true);

  const start = () => {
    enhanceSelects();
    // La carga masiva arma sus <select> por JS: se toman apenas aparecen.
    new MutationObserver((muts) => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (n.matches?.('select')) enhance(n);
          n.querySelectorAll?.('select').forEach(enhance);
        }
        // Filas que se van (carga masiva): su lista no queda huérfana.
        for (const n of m.removedNodes) {
          if (n.nodeType !== 1) continue;
          const gone = n.matches?.('select') ? [n] : [...(n.querySelectorAll?.('select') || [])];
          gone.forEach((sel) => { if (!sel.isConnected) sel.__aselectPop?.remove(); });
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
}
