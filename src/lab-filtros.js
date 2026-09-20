/* LABORATORIO — filtros del catálogo en celular. Sólo lo carga /lab/filtros/.
   No toca app.js: el carril de rubros de la variante C dispara los mismos
   chips de #catSheet, así el filtrado es el de siempre. */
import { cloudinaryUrl } from './cloudinary-config.js';

const VARIANTS = [
  ['hoy', 'Hoy'],
  ['a', 'A · Carril'],
  ['b', 'B · 2×2'],
  ['c', 'C · Rubros'],
];
const root = document.documentElement;
const saved = new URLSearchParams(location.search).get('v') || sessionStorage.getItem('lab-filtros') || 'c';

const bar = document.createElement('div');
bar.className = 'labbar';
bar.setAttribute('role', 'group');
bar.setAttribute('aria-label', 'Variantes de filtros');
bar.innerHTML = VARIANTS.map(([id, label]) => `<button type="button" data-v="${id}">${label}</button>`).join('');
document.body.append(bar);

function setVariant(v) {
  root.dataset.filtros = v;
  try { sessionStorage.setItem('lab-filtros', v); } catch {}
  bar.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
}
bar.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) setVariant(b.dataset.v);
});
setVariant(VARIANTS.some(([id]) => id === saved) ? saved : 'c');

/* Contador al lado del título (lo lee el CSS con attr(data-count)). */
const head = document.querySelector('#catalogo .catalog-head');
const line = document.querySelector('#resultsLine');
if (head && line) {
  const sync = () => { head.dataset.count = line.textContent.trim(); };
  new MutationObserver(sync).observe(line, { childList: true, characterData: true, subtree: true });
  sync();
}

/* Variante C: carril de rubros con foto, arriba de los filtros. */
const filters = document.querySelector('#filters');
const chips = [...document.querySelectorAll('#catSheet .chip')].filter((c) => !c.hidden);
if (filters && chips.length) {
  const rail = document.createElement('div');
  rail.className = 'labrail';
  rail.setAttribute('role', 'group');
  rail.setAttribute('aria-label', 'Rubros');
  const gridIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg>';
  const tagIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z"/><circle cx="8" cy="8" r="1.4"/></svg>';
  rail.innerHTML = chips
    .map((c) => `<button type="button" class="labrail__item" data-cat="${c.dataset.cat}" aria-pressed="${c.getAttribute('aria-pressed')}"><span class="labrail__pic labrail__pic--ico">${c.dataset.cat === 'Ofertas' ? tagIco : gridIco}</span><span>${c.dataset.cat}</span></button>`)
    .join('');
  filters.before(rail);

  rail.addEventListener('click', (e) => {
    const item = e.target.closest('.labrail__item');
    if (!item) return;
    chips.find((c) => c.dataset.cat === item.dataset.cat)?.click();
  });
  const mirror = () => rail.querySelectorAll('.labrail__item').forEach((item) => {
    const chip = chips.find((c) => c.dataset.cat === item.dataset.cat);
    item.setAttribute('aria-pressed', chip?.getAttribute('aria-pressed') || 'false');
    item.hidden = Boolean(chip?.hidden);
  });
  chips.forEach((c) => new MutationObserver(mirror).observe(c, { attributes: true, attributeFilter: ['aria-pressed', 'hidden'] }));
  mirror();

  // Foto real de cada rubro: el primer producto con stock e imagen.
  fetch('/data/products.json')
    .then((r) => r.json())
    .then((products) => {
      rail.querySelectorAll('.labrail__item').forEach((item) => {
        const p = products.find((x) => x.category === item.dataset.cat && x.visible !== false && x.inStock && x.images?.length);
        if (!p) return;
        const pic = item.querySelector('.labrail__pic');
        pic.classList.remove('labrail__pic--ico');
        pic.innerHTML = `<img src="${cloudinaryUrl(p.images[0], { width: 160 })}" alt="" width="64" height="64" loading="lazy">`;
      });
    })
    .catch(() => {});
}
