/**
 * Panel de administración del catálogo.
 *
 * Alta, edición, baja, orden y carga de fotos — todo escribe directo en
 * Firestore desde acá (el navegador), sin pasar por un servidor propio.
 * Las fotos van a Cloudinary. La única pieza que sigue necesitando un
 * servidor es la IA (para no exponer la clave de Groq en el navegador):
 * esos botones se apagan solos si no hay uno corriendo — ver la sección
 * de IA más abajo.
 *
 * Login con Firebase Auth: nada de esto se ejecuta hasta que la sesión es
 * válida (ver ARRANQUE, al final).
 */

import { stems } from '../search-engine.js';
import { offerActive, dateFmt, cardHtml, esc } from '../templates.js';
import { closeDialog, wireDialog, openDialog } from '../ui.js';
import { cloudinaryUrl, cloudinaryConfig } from '../cloudinary-config.js';
import {
  db,
  auth,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  serverTimestamp,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from '../firebase-client.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const money = (n) => '$' + Number(n || 0).toLocaleString('es-AR');
const thumbOf = (id) => cloudinaryUrl(id, { width: 160 });

const ico = {
  grip: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3z"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l16 16"/><path d="M9.9 5.8A9.8 9.8 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.3 4.1M6.4 7.6A16.6 16.6 0 0 0 2 12s3.6 6.5 10 6.5c1 0 1.9-.1 2.7-.4"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12 5.5 5.5L20 7"/></svg>',
  boxOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v13H3V8M1 3h22v5H1z"/><path d="M10 12h4"/></svg>',
  boxOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v13H3V8M1 3h22v5H1z"/><path d="M9 12l4 4m0-4l-4 4"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l1.8 5.7 5.7 1.8-5.7 1.8L12 17.5l-1.8-5.7-5.7-1.8 5.7-1.8L12 2.5z"/></svg>',
};

/* ==========================================================================
   ESTADO
   ========================================================================== */

let products = [];
let settings = {};
/** Slug del producto en edición, o null si es un alta. */
let editing = null;
/** Fotos del formulario abierto (public_ids de Cloudinary ya subidos). */
let shots = [];
/** createdAt real del producto en edición — para que la vista previa
    muestre el badge "Nuevo" igual que lo vería un cliente, no como si
    se acabara de crear ahora mismo. */
let previewCreatedAt = null;
/** Slugs marcados con el checkbox, para las acciones en lote. */
const selected = new Set();

/**
 * Empareja un nombre suelto (de una lista pegada) contra el catálogo que ya
 * existe, por superposición de raíces de palabras — nada de IA acá, es
 * gratis e instantáneo. Sirve para que una lista de proveedor actualice
 * precio/stock de lo que ya está cargado en vez de duplicarlo.
 * Umbral 0.55: alcanza para "Dinosaurio Dino World" ~ "Dino World" pero no
 * confunde dos productos de la misma categoría con nombres distintos.
 */
function matchExisting(name, pool = products) {
  const target = new Set(stems(name));
  if (!target.size) return null;

  let best = null;
  let bestScore = 0;
  for (const p of pool) {
    const cand = new Set(stems(p.name));
    if (!cand.size) continue;
    const overlap = [...target].filter((t) => cand.has(t)).length;
    const score = overlap / Math.max(target.size, cand.size);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return bestScore >= 0.55 ? best : null;
}

const productsCol = () => collection(db, 'products');
const productRef = (slug) => doc(db, 'products', slug);

async function loadAll() {
  const [snap, settingsDoc] = await Promise.all([getDocs(productsCol()), getDoc(doc(db, 'settings', 'main'))]);
  products = snap.docs.map((d) => d.data());
  settings = settingsDoc.data();
  fillCategorySelects();
  render();
}

function fillCategorySelects() {
  const opts = settings.categories.map((c) => `<option value="${c}">${c}</option>`).join('');
  $('#fCat').innerHTML = `<option value="">Todos los rubros</option>${opts}`;
  $('#fCatSel').innerHTML = opts;
}

/* ==========================================================================
   LISTA
   ========================================================================== */

const listEl = $('#list');
const emptyEl = $('#empty');

function visibleList() {
  const q = $('#q').value.trim().toLowerCase();
  const cat = $('#fCat').value;
  const state = $('#fState').value;

  return products.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q)) return false;
    if (cat && p.category !== cat) return false;
    if (state === 'oculto' && p.visible !== false) return false;
    if (state === 'sinstock' && p.inStock) return false;
    if (state === 'destacado' && !p.featured) return false;
    if (state === 'oferta' && !offerActive(p)) return false;
    if (state === 'sinfoto' && p.images?.length) return false;
    return true;
  });
}

function render() {
  const list = visibleList();

  $('#stats').innerHTML =
    `<span><b>${products.length}</b> productos</span>` +
    `<span><b>${products.filter((p) => p.visible === false).length}</b> ocultos</span>` +
    `<span><b>${products.filter((p) => !p.inStock).length}</b> sin stock</span>`;

  listEl.innerHTML = list.map(itemHtml).join('');
  // El nombre va por textContent para que un producto llamado <script> no rompa nada
  $$('.item', listEl).forEach((el) => {
    const p = products.find((x) => x.slug === el.dataset.slug);
    $('.item__name', el).textContent = p.name;
  });

  emptyEl.hidden = list.length > 0;
  // Reordenar sólo tiene sentido sobre la lista completa
  const filtering = $('#q').value || $('#fCat').value || $('#fState').value;
  $('#hint').hidden = !!filtering || !list.length;

  // La selección puede tener slugs que ya no están en la lista filtrada
  // (se limpian solos, no hace falta destildarlos a mano)
  $('#selectAll').checked = list.length > 0 && list.every((p) => selected.has(p.slug));
  $('#selectAllLabel').textContent =
    list.length && list.every((p) => selected.has(p.slug)) ? 'Deseleccionar todo' : 'Seleccionar todo';
  syncSelbar();
}

function itemHtml(p) {
  const img = p.images?.[0];
  const onOffer = offerActive(p);
  return `<div class="item${p.visible === false ? ' item--hidden' : ''}" data-slug="${p.slug}" data-selected="${selected.has(p.slug)}" draggable="true">
    <label class="item__check" title="Seleccionar">
      <input type="checkbox" data-select ${selected.has(p.slug) ? 'checked' : ''}>
    </label>
    <div class="item__grip" aria-hidden="true">${ico.grip}</div>
    ${
      img
        ? `<img class="item__img" src="${thumbOf(img)}" alt="" width="52" height="52" loading="lazy">`
        : `<div class="item__img item__img--none">sin<br>foto</div>`
    }
    <div class="item__main">
      <div class="item__name"></div>
      <div class="item__meta">
        <span class="item__price">${money(p.price)}</span>
        <span>${p.category}</span>
        ${!p.inStock ? '<span class="tag tag--out">Sin stock</span>' : ''}
        ${p.visible === false ? '<span class="tag tag--hidden">Oculto</span>' : ''}
        ${p.featured ? '<span class="tag tag--featured">Destacado</span>' : ''}
        ${onOffer ? `<span class="tag tag--offer">Oferta hasta ${dateFmt(p.offer.until)}</span>` : ''}
        ${!img ? '<span class="tag tag--nophoto">Falta foto</span>' : ''}
      </div>
    </div>
    <div class="item__actions">
      <button class="iconbtn" data-toggle-stock title="${p.inStock ? 'Marcar sin stock' : 'Marcar con stock'}">
        ${p.inStock ? ico.boxOn : ico.boxOff}
      </button>
      <button class="iconbtn" data-toggle-visible title="${p.visible === false ? 'Mostrar' : 'Ocultar'}">
        ${p.visible === false ? ico.eyeOff : ico.eye}
      </button>
      <button class="iconbtn" data-edit title="Editar">${ico.edit}</button>
    </div>
  </div>`;
}

listEl.addEventListener('click', async (e) => {
  const item = e.target.closest('.item');
  if (!item) return;
  const p = products.find((x) => x.slug === item.dataset.slug);

  if (e.target.closest('[data-select]')) {
    e.target.checked ? selected.add(p.slug) : selected.delete(p.slug);
    item.dataset.selected = String(selected.has(p.slug));
    syncSelbar();
    // El checkbox de "seleccionar todo" tiene que reflejar el estado real
    const list = visibleList();
    $('#selectAll').checked = list.length > 0 && list.every((x) => selected.has(x.slug));
    return;
  }

  if (e.target.closest('[data-edit]')) return openEditor(p);

  if (e.target.closest('[data-toggle-stock]')) {
    const next = !p.inStock;
    try {
      await updateDoc(productRef(p.slug), { inStock: next, updatedAt: new Date().toISOString() });
      p.inStock = next;
      render();
      toast(next ? 'Marcado con stock' : 'Marcado sin stock');
    } catch (err) {
      toast(err.message);
    }
    return;
  }

  if (e.target.closest('[data-toggle-visible]')) {
    const next = p.visible === false;
    try {
      await updateDoc(productRef(p.slug), { visible: next, updatedAt: new Date().toISOString() });
      p.visible = next;
      render();
      toast(next ? 'Producto visible en el catálogo' : 'Producto oculto');
    } catch (err) {
      toast(err.message);
    }
  }
});

['#q', '#fCat', '#fState'].forEach((sel) => $(sel).addEventListener('input', render));

/* ---------- Reordenar la lista arrastrando ---------- */

let dragSlug = null;

listEl.addEventListener('dragstart', (e) => {
  const item = e.target.closest('.item');
  if (!item) return;
  dragSlug = item.dataset.slug;
  item.dataset.dragging = 'true';
  e.dataTransfer.effectAllowed = 'move';
});

listEl.addEventListener('dragover', (e) => {
  e.preventDefault();
  const over = e.target.closest('.item');
  if (!over || over.dataset.slug === dragSlug) return;
  $$('.item', listEl).forEach((el) => delete el.dataset.over);
  over.dataset.over = 'true';
});

listEl.addEventListener('dragend', () => {
  $$('.item', listEl).forEach((el) => {
    delete el.dataset.dragging;
    delete el.dataset.over;
  });
});

listEl.addEventListener('drop', async (e) => {
  e.preventDefault();
  const over = e.target.closest('.item');
  $$('.item', listEl).forEach((el) => {
    delete el.dataset.dragging;
    delete el.dataset.over;
  });
  if (!over || !dragSlug || over.dataset.slug === dragSlug) return;

  const from = products.findIndex((p) => p.slug === dragSlug);
  const to = products.findIndex((p) => p.slug === over.dataset.slug);
  if (from === -1 || to === -1) return;

  const [moved] = products.splice(from, 1);
  products.splice(to, 0, moved);
  products.forEach((p, i) => (p.order = i));
  render();

  const batch = writeBatch(db);
  products.forEach((p) => batch.update(productRef(p.slug), { order: p.order }));
  await batch.commit();
  dragSlug = null;
});

/* ==========================================================================
   SELECCIÓN Y ACCIONES EN LOTE
   ========================================================================== */

const selbar = $('#selbar');

function syncSelbar() {
  const n = selected.size;
  selbar.hidden = n === 0;
  if (n) $('#selCount').textContent = `${n} seleccionado${n === 1 ? '' : 's'}`;
}

$('#selectAll').addEventListener('change', (e) => {
  const list = visibleList();
  if (e.target.checked) list.forEach((p) => selected.add(p.slug));
  else list.forEach((p) => selected.delete(p.slug));
  render();
});

$('#selCancel').addEventListener('click', () => {
  selected.clear();
  render();
});

$('#selbar').addEventListener('click', async (e) => {
  const bulkBtn = e.target.closest('[data-bulk]');
  if (bulkBtn) {
    const [field, raw] = bulkBtn.dataset.bulk.split(':');
    const value = raw === 'true';
    const slugs = [...selected];

    bulkBtn.disabled = true;
    try {
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      slugs.forEach((slug) => batch.update(productRef(slug), { [field]: value, updatedAt: now }));
      await batch.commit();

      slugs.forEach((slug) => {
        const p = products.find((x) => x.slug === slug);
        if (p) p[field] = value;
      });
      toast(`${slugs.length} producto${slugs.length === 1 ? '' : 's'} actualizado${slugs.length === 1 ? '' : 's'}`, ico.check);
      const n = slugs.length;
      const BULK_LABELS = {
        'inStock:true': `Marcó con stock ${n} producto${n === 1 ? '' : 's'}`,
        'inStock:false': `Marcó sin stock ${n} producto${n === 1 ? '' : 's'}`,
        'visible:true': `Mostró ${n} producto${n === 1 ? '' : 's'} en el catálogo`,
        'visible:false': `Ocultó ${n} producto${n === 1 ? '' : 's'} del catálogo`,
        'featured:true': `Destacó ${n} producto${n === 1 ? '' : 's'}`,
      };
      logActivity('bulk_field', BULK_LABELS[bulkBtn.dataset.bulk] || `Actualizó ${n} producto${n === 1 ? '' : 's'} en lote`);
      // Sin esto, la selección seguía marcada después de actuar sobre ella:
      // tocar otro botón de la barra volvía a aplicarse sobre los mismos
      // productos sin que la persona lo pidiera de nuevo.
      selected.clear();
      render();
    } catch (err) {
      toast(err.message);
    } finally {
      bulkBtn.disabled = false;
    }
    return;
  }

  if (e.target.closest('#btnBulkDelete')) {
    const n = selected.size;
    if (!confirm(`¿Eliminar ${n} producto${n === 1 ? '' : 's'}?\n\nNo se puede deshacer.`)) return;

    try {
      const slugs = [...selected];
      const batch = writeBatch(db);
      slugs.forEach((slug) => batch.delete(productRef(slug)));
      await batch.commit();
      products = products.filter((p) => !selected.has(p.slug));
      selected.clear();
      render();
      toast(`${slugs.length} producto${slugs.length === 1 ? '' : 's'} eliminado${slugs.length === 1 ? '' : 's'}`);
      logActivity('products_deleted', `Eliminó ${slugs.length} producto${slugs.length === 1 ? '' : 's'} en lote`);
    } catch (err) {
      toast(err.message);
    }
  }
});

/* ==========================================================================
   EDITOR
   ========================================================================== */

const editor = $('#editor');
const form = $('#form');

const slugify = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

/** El input datetime-local trabaja en hora local ("2026-08-20T15:30"),
    sin zona horaria — hay que convertir a mano en los dos sentidos. */
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p2 = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
};
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);

function openEditor(p = null) {
  editing = p?.slug || null;
  shots = [...(p?.images || [])];
  previewCreatedAt = p?.createdAt || null;

  $('#editorTitle').textContent = p ? 'Editar producto' : 'Nuevo producto';
  $('#fName').value = p?.name || '';
  $('#fPrice').value = p ? String(p.price) : '';
  $('#fCatSel').value = p?.category || settings.categories[0];
  $('#fDesc').value = p?.description || '';
  $('#fTags').value = p?.tags || '';
  $('#fStock').checked = p ? p.inStock !== false : true;
  $('#fVisible').checked = p ? p.visible !== false : true;
  $('#fFeatured').checked = !!p?.featured;
  $('#btnDelete').hidden = !p;

  const onOffer = !!p?.offer;
  $('#fOfferOn').checked = onOffer;
  $('#offerFields').hidden = !onOffer;
  $('#fOfferPrice').value = p?.offer?.price ? String(p.offer.price) : '';
  $('#fOfferUntil').value = toLocalInput(p?.offer?.until);
  $('#fOfferNote').value = p?.offer?.note || '';

  updateDescCount();
  renderShots();

  delete editor.dataset.closing;
  editor.showModal();
  $('#fName').focus();
}

$('#fOfferOn').addEventListener('change', (e) => {
  $('#offerFields').hidden = !e.target.checked;
  // Si activa la oferta y no puso fecha, proponemos una semana — así no
  // guarda por error una oferta "activa" sin vencimiento definido.
  if (e.target.checked && !$('#fOfferUntil').value) {
    const week = new Date(Date.now() + 7 * 86400000);
    $('#fOfferUntil').value = toLocalInput(week.toISOString());
  }
});
$('#fOfferPrice').addEventListener('input', (e) => {
  const clean = e.target.value.replace(/[^\d]/g, '');
  if (clean !== e.target.value) e.target.value = clean;
});

$('#btnNew').addEventListener('click', () => openEditor());
$('#btnCancel').addEventListener('click', () => closeDialog(editor));
$('#editorClose').addEventListener('click', () => closeDialog(editor));

$('#fDesc').addEventListener('input', updateDescCount);
function updateDescCount() {
  $('#descCount').textContent = String($('#fDesc').value.length);
}

// Sólo dígitos en el precio, sin pelear con el cursor del usuario
$('#fPrice').addEventListener('input', (e) => {
  const clean = e.target.value.replace(/[^\d]/g, '');
  if (clean !== e.target.value) e.target.value = clean;
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = $('#fName').value.trim();
  if (!name) return toast('Falta el nombre del producto.');

  const payload = {
    name,
    price: Number($('#fPrice').value) || 0,
    category: $('#fCatSel').value,
    description: $('#fDesc').value.trim(),
    tags: $('#fTags').value.trim(),
    images: shots,
    inStock: $('#fStock').checked,
    visible: $('#fVisible').checked,
    featured: $('#fFeatured').checked,
    offer: null,
  };

  if ($('#fOfferOn').checked) {
    if (!$('#fOfferUntil').value) return toast('Ponele una fecha de vencimiento a la oferta.');
    payload.offer = {
      price: Number($('#fOfferPrice').value) || 0,
      until: fromLocalInput($('#fOfferUntil').value),
      note: $('#fOfferNote').value.trim(),
    };
  }

  const btn = $('#btnSave');
  btn.disabled = true;
  btn.textContent = 'Guardando…';

  try {
    if (editing) {
      payload.updatedAt = new Date().toISOString();
      await updateDoc(productRef(editing), payload);
      Object.assign(products.find((p) => p.slug === editing), payload);
      toast('Cambios guardados', ico.check);
      logActivity('product_updated', `Editó "${payload.name}"`, editing);
    } else {
      const slug = await uniqueSlug(name);
      const now = new Date().toISOString();
      const product = {
        id: slug,
        slug,
        ...payload,
        sub: null,
        order: Math.min(0, ...products.map((p) => p.order ?? 0)) - 1,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(productRef(slug), product);
      products.unshift(product);
      toast('Producto agregado', ico.check);
      logActivity('product_created', `Agregó "${product.name}"`, slug);
    }
    render();
    closeDialog(editor);
  } catch (err) {
    toast(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar';
  }
});

/**
 * El slug tiene que ser único. La lista en memoria alcanza para el caso
 * normal, pero antes de escribir se chequea una vez más contra Firestore
 * (getDoc fresco, no lo que había en `products` al cargar la página) — así
 * dos altas casi simultáneas desde dos PCs distintas no pisan una a la otra
 * con el mismo slug.
 */
async function uniqueSlug(name) {
  let slug = slugify(name);
  let n = 2;
  while (products.some((p) => p.slug === slug) || (await getDoc(productRef(slug))).exists()) {
    slug = `${slugify(name)}-${n++}`;
  }
  return slug;
}

$('#btnDelete').addEventListener('click', async () => {
  const p = products.find((x) => x.slug === editing);
  if (!p) return;
  if (!confirm(`¿Eliminar "${p.name}"?\n\nNo se puede deshacer.`)) return;

  try {
    await deleteDoc(productRef(editing));
    products = products.filter((x) => x.slug !== editing);
    render();
    closeDialog(editor);
    toast('Producto eliminado');
    logActivity('product_deleted', `Eliminó "${p.name}"`, editing);
  } catch (err) {
    toast(err.message);
  }
});

/* ==========================================================================
   FOTOS
   Se optimizan en el propio navegador (Canvas → webp) y se suben directo a
   Cloudinary con el preset "unsigned" — no hay servidor de por medio, así
   que esto funciona igual con o sin `npm run dev` corriendo.
   ========================================================================== */

const drop = $('#drop');
const fileInput = $('#file');
const shotsEl = $('#shots');

/** Redimensiona y convierte a webp en el navegador. `imageOrientation:
    'from-image'` respeta la rotación EXIF de las fotos de celular, igual
    que hacía `sharp().rotate()` del lado del servidor antes. */
async function resizeToWebp(file, maxWidth = 1400, quality = 0.85) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxWidth / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen.'))),
      'image/webp',
      quality
    );
  });
}

async function uploadToCloudinary(blob) {
  const form = new FormData();
  form.append('file', blob, 'foto.webp');
  form.append('upload_preset', cloudinaryConfig.uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'No se pudo subir la foto.');
  return data.public_id;
}

function renderShots() {
  shotsEl.innerHTML = shots
    .map(
      (id, i) => `<div class="shot" data-i="${i}" draggable="true">
      <img src="${thumbOf(id)}" alt="">
      <button type="button" class="shot__del" data-del="${i}" aria-label="Quitar foto">${ico.x}</button>
    </div>`
    )
    .join('');
  $('#shotsHint').hidden = shots.length < 2;
  // El botón de IA sólo tiene sentido si hay foto y hay clave configurada
  $('#aiFromPhoto').hidden = !aiOn || !shots.length;
  $('#aiPhotoNote').hidden = !aiOn || !shots.length;
  updatePreview();
}

/**
 * Espeja el formulario abierto como se vería la tarjeta real en el
 * catálogo. Sólo se calcula el HTML si hay nombre y foto — antes de eso
 * mostraría una imagen rota (Cloudinary con un id vacío), que confunde
 * más de lo que ayuda.
 */
function updatePreview() {
  const el = $('#editorPreviewCard');
  if (!el) return; // no existe en mobile, ver admin.html/admin.css

  const name = $('#fName').value.trim();
  if (!name || !shots.length) {
    el.innerHTML =
      '<p class="editor__preview-empty">Cargá el nombre y al menos una foto para ver cómo queda.</p>';
    return;
  }

  const draft = {
    slug: editing || 'preview',
    name,
    category: $('#fCatSel').value || settings.categories[0],
    price: Number($('#fPrice').value) || 0,
    images: shots,
    inStock: $('#fStock').checked,
    featured: $('#fFeatured').checked,
    offer:
      $('#fOfferOn').checked && $('#fOfferUntil').value
        ? {
            price: Number($('#fOfferPrice').value) || 0,
            until: fromLocalInput($('#fOfferUntil').value),
            note: $('#fOfferNote').value.trim(),
          }
        : null,
    createdAt: previewCreatedAt || new Date().toISOString(),
  };
  el.innerHTML = `<div class="editor__preview-card">${cardHtml(draft)}</div>`;
}
$('#form').addEventListener('input', updatePreview);
$('#form').addEventListener('change', updatePreview);

drop.addEventListener('click', () => fileInput.click());
drop.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener('change', () => {
  uploadFiles([...fileInput.files]);
  fileInput.value = '';
});

// dragover hay que cancelarlo en los dos eventos o el navegador abre el archivo
['dragenter', 'dragover'].forEach((ev) =>
  drop.addEventListener(ev, (e) => {
    e.preventDefault();
    drop.dataset.over = 'true';
  })
);
['dragleave', 'drop'].forEach((ev) =>
  drop.addEventListener(ev, (e) => {
    e.preventDefault();
    delete drop.dataset.over;
  })
);
drop.addEventListener('drop', (e) => {
  const files = [...(e.dataTransfer?.files || [])].filter((f) => f.type.startsWith('image/'));
  if (files.length) uploadFiles(files);
});

async function uploadFiles(files) {
  for (const file of files) {
    // Marcador de carga para que se vea que algo está pasando
    const ph = document.createElement('div');
    ph.className = 'shot shot--loading';
    ph.innerHTML = '<div class="spinner"></div>';
    shotsEl.append(ph);

    try {
      const blob = await resizeToWebp(file);
      const publicId = await uploadToCloudinary(blob);
      shots.push(publicId);
    } catch (err) {
      toast(err.message);
    } finally {
      ph.remove();
    }
    renderShots();
  }
}

shotsEl.addEventListener('click', (e) => {
  const del = e.target.closest('[data-del]');
  if (!del) return;
  shots.splice(Number(del.dataset.del), 1);
  renderShots();
});

/* ---------- Reordenar fotos: la primera es la portada ---------- */

let dragShot = null;

shotsEl.addEventListener('dragstart', (e) => {
  const shot = e.target.closest('.shot');
  if (!shot) return;
  dragShot = Number(shot.dataset.i);
  shot.dataset.dragging = 'true';
});

shotsEl.addEventListener('dragover', (e) => e.preventDefault());

shotsEl.addEventListener('drop', (e) => {
  e.preventDefault();
  const shot = e.target.closest('.shot');
  if (!shot || dragShot == null) return;
  const to = Number(shot.dataset.i);
  if (to === dragShot) return;

  const [moved] = shots.splice(dragShot, 1);
  shots.splice(to, 0, moved);
  dragShot = null;
  renderShots();
});

shotsEl.addEventListener('dragend', () => {
  $$('.shot', shotsEl).forEach((s) => delete s.dataset.dragging);
  dragShot = null;
});

/* ==========================================================================
   MENÚ EXPORTAR
   Se arma en el navegador a partir de lo que ya está cargado en memoria —
   no hace falta ningún servidor para esto.
   ========================================================================== */

const menuExport = $('#menuExport');
const menuPop = $('.menu__pop', menuExport);

$('#btnExport').addEventListener('click', (e) => {
  e.stopPropagation();
  const abierto = !menuPop.hidden;
  menuPop.hidden = abierto;
  $('#btnExport').setAttribute('aria-expanded', String(!abierto));
});
// Cerrar al hacer click afuera o con Esc
document.addEventListener('click', () => {
  menuPop.hidden = true;
  $('#btnExport').setAttribute('aria-expanded', 'false');
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') menuPop.hidden = true;
});
menuPop.addEventListener('click', (e) => e.stopPropagation());

function downloadBlob(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

$('#exportJson').addEventListener('click', () => {
  const stamp = new Date().toISOString().slice(0, 10);
  const list = [...products].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  downloadBlob(JSON.stringify(list, null, 2), `catalogo-arias-${stamp}.json`, 'application/json');
});

$('#exportCsv').addEventListener('click', () => {
  const stamp = new Date().toISOString().slice(0, 10);
  const list = [...products].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const cols = [
    ['slug', (p) => p.slug],
    ['nombre', (p) => p.name],
    ['rubro', (p) => p.category],
    ['precio', (p) => p.price],
    ['descripcion', (p) => p.description],
    ['stock', (p) => (p.inStock ? 'si' : 'no')],
    ['visible', (p) => (p.visible === false ? 'no' : 'si')],
    ['destacado', (p) => (p.featured ? 'si' : 'no')],
    ['palabras_clave', (p) => p.tags || ''],
    ['oferta', (p) => (offerActive(p) ? `hasta ${p.offer.until.slice(0, 10)}` : '')],
    ['precio_oferta', (p) => (p.offer?.price ? p.offer.price : '')],
    ['url', (p) => `${settings.siteUrl}/p/${p.slug}/`],
  ];
  // Comillas dobles duplicadas y campo entrecomillado si trae ; " o salto
  const cell = (v) => {
    const s = String(v ?? '');
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [cols.map(([h]) => h).join(';'), ...list.map((p) => cols.map(([, get]) => cell(get(p))).join(';'))];
  // BOM al principio: sin esto Excel en español mete todo en una sola columna
  downloadBlob('﻿' + rows.join('\r\n'), `catalogo-arias-${stamp}.csv`, 'text/csv;charset=utf-8');
});

/* ==========================================================================
   CARGA MASIVA
   ========================================================================== */

const bulkDlg = $('#bulk');
/** Fichas parseadas, pendientes de confirmar. */
let bulkRows = [];

/**
 * Interpreta una lista pegada a mano.
 *
 * Acepta separadores `|`, tabulación y ` - `, en ese orden de preferencia:
 * se prueba el más explícito primero para no cortar mal un nombre que
 * tenga guiones ("Tic-Tac-Toe") ni una descripción con comas.
 *
 * Orden esperado: nombre, precio, rubro, descripción.
 */
function parseBulk(text) {
  const cats = settings.categories;
  // Sin tildes y en minúscula: al pegar una lista nadie escribe "Librería"
  // con acento, y "Tecnologia" tiene que caer igual en "Tecnología".
  const sinTilde = (s) =>
    String(s)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  const catByNorm = new Map(cats.map((c) => [sinTilde(c), c]));

  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      let parts;
      if (line.includes('|')) parts = line.split('|');
      else if (line.includes('\t')) parts = line.split('\t');
      else if (/\s+-\s+/.test(line)) parts = line.split(/\s+-\s+/);
      else {
        // Sin separador: intentamos "Nombre 12500" con el precio al final
        const m = /^(.*?)[\s$]+([\d.,]+)$/.exec(line);
        parts = m ? [m[1], m[2]] : [line];
      }
      parts = parts.map((p) => p.trim());

      const [name = '', rawPrice = '', rawCat = '', desc = ''] = parts;
      // Los puntos son separador de miles en el formato local, no decimales
      const price = parseInt(String(rawPrice).replace(/[^\d]/g, ''), 10) || 0;
      const category = catByNorm.get(sinTilde(rawCat)) || '';

      return {
        name,
        price,
        // Si el rubro no se reconoce puede ser en realidad la descripción
        category: category || cats[0],
        description: category ? desc : [rawCat, desc].filter(Boolean).join(' ').trim(),
        images: [],
      };
    });
}

/**
 * Para cada fila, busca si ya existe un producto parecido en el catálogo.
 * Así una lista de proveedor no duplica lo que ya está cargado: si
 * "Cuaderno Rayado A4 12500" pegado hoy corresponde al "Cuaderno Rayado A4"
 * que ya tenés, se propone ACTUALIZAR precio/stock en vez de crear otro.
 */
function attachMatches(rows) {
  return rows.map((r) => {
    const match = r.name ? matchExisting(r.name) : null;
    return { ...r, matchSlug: match?.slug || null, matchName: match?.name || null, type: match ? 'update' : 'new' };
  });
}

function renderBulk() {
  const tbody = $('#bulkRows');
  const opts = settings.categories.map((c) => `<option value="${c}">${c}</option>`).join('');

  tbody.innerHTML = bulkRows
    .map((r, i) => {
      const bad = !r.name || (!r.price && r.type === 'new');
      return `<tr data-i="${i}" data-bad="${bad}">
      <td>${i + 1}</td>
      <td><input data-col="name" value="${r.name.replace(/"/g, '&quot;')}" placeholder="Falta el nombre"></td>
      <td><input data-col="price" inputmode="numeric" value="${r.price || ''}" placeholder="0"></td>
      <td><select data-col="category">${opts}</select></td>
      <td>
        <select data-col="type">
          <option value="new">Nuevo</option>
          ${r.matchSlug ? `<option value="update">Actualizar: ${r.matchName}</option>` : ''}
        </select>
      </td>
      <td><button class="iconbtn" data-drop="${i}" title="Quitar de la lista">${ico.x}</button></td>
    </tr>`;
    })
    .join('');

  // El value de un <select> hay que fijarlo por propiedad, no por atributo
  $$('tr', tbody).forEach((tr) => {
    const row = bulkRows[Number(tr.dataset.i)];
    $('[data-col=category]', tr).value = row.category;
    $('[data-col=type]', tr).value = row.type;
  });

  const validos = bulkRows.filter((r) => r.name && (r.price || r.type === 'update')).length;
  const nuevos = bulkRows.filter((r) => r.type === 'new').length;
  const actualiza = bulkRows.length - nuevos;
  const conProblema = bulkRows.length - validos;
  $('#bulkCount').textContent = bulkRows.length
    ? `${nuevos} nuevo${nuevos === 1 ? '' : 's'} · ${actualiza} para actualizar${conProblema ? ` · ${conProblema} con datos faltantes` : ''}`
    : '';
  $('#bulkPreview').hidden = !bulkRows.length;
  $('#bulkSave').disabled = validos === 0;
  $('#bulkSave').textContent = validos ? `Guardar ${validos}` : 'Guardar todos';
}

$('#btnBulk').addEventListener('click', () => {
  bulkRows = [];
  $('#bulkText').value = '';
  renderBulk();
  closeDialog(adminMenuDlg).then(() => openDialog(bulkDlg));
});

$('#bulkParse').addEventListener('click', () => {
  bulkRows = attachMatches(parseBulk($('#bulkText').value));
  if (!bulkRows.length) return toast('No encontramos productos en ese texto.');
  renderBulk();
});

// Edición inline de la tabla de revisión
$('#bulkRows').addEventListener('input', (e) => {
  const tr = e.target.closest('tr');
  const col = e.target.dataset.col;
  if (!tr || !col) return;
  const row = bulkRows[Number(tr.dataset.i)];
  if (col === 'price') row.price = parseInt(e.target.value.replace(/[^\d]/g, ''), 10) || 0;
  else if (col === 'type') row.type = e.target.value;
  else row[col] = e.target.value;
  tr.dataset.bad = String(!row.name || (!row.price && row.type === 'new'));

  const validos = bulkRows.filter((r) => r.name && (r.price || r.type === 'update')).length;
  $('#bulkSave').disabled = validos === 0;
  $('#bulkSave').textContent = validos ? `Guardar ${validos}` : 'Guardar todos';
});

$('#bulkRows').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-drop]');
  if (!btn) return;
  bulkRows.splice(Number(btn.dataset.drop), 1);
  renderBulk();
});

$('#bulkClose').addEventListener('click', () => closeDialog(bulkDlg));
$('#bulkCancel').addEventListener('click', () => closeDialog(bulkDlg));

$('#bulkSave').addEventListener('click', async () => {
  const rows = bulkRows.filter((r) => r.name && (r.price || r.type === 'update'));
  if (!rows.length) return;

  const newItems = rows.filter((r) => r.type === 'new');
  const updateItems = rows.filter((r) => r.type === 'update');

  const btn = $('#bulkSave');
  btn.disabled = true;
  btn.textContent = 'Guardando…';

  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    const taken = new Set(products.map((p) => p.slug));
    let order = Math.min(0, ...products.map((p) => p.order ?? 0));

    for (const r of newItems) {
      let slug = slugify(r.name);
      let n = 2;
      while (taken.has(slug)) slug = `${slugify(r.name)}-${n++}`;
      taken.add(slug);

      const product = {
        id: slug,
        slug,
        name: r.name,
        category: r.category,
        description: r.description || '',
        price: r.price,
        images: [],
        inStock: true,
        featured: false,
        // Sin foto entra oculto: no se publica una ficha a medias
        visible: false,
        tags: '',
        sub: null,
        offer: null,
        order: --order,
        createdAt: now,
        updatedAt: now,
      };
      batch.set(productRef(slug), product);
      products.push(product);
    }

    for (const r of updateItems) {
      const patch = {
        price: r.price,
        category: r.category,
        inStock: true,
        updatedAt: now,
        ...(r.description ? { description: r.description } : {}),
      };
      batch.update(productRef(r.matchSlug), patch);
      Object.assign(products.find((p) => p.slug === r.matchSlug) || {}, patch);
    }

    await batch.commit();
    render();
    closeDialog(bulkDlg);
    const partes = [];
    if (newItems.length) partes.push(`${newItems.length} nuevo${newItems.length === 1 ? '' : 's'}`);
    if (updateItems.length) partes.push(`${updateItems.length} actualizado${updateItems.length === 1 ? '' : 's'}`);
    toast(partes.join(' · '), ico.check);
    logActivity('bulk_loaded', `Carga masiva: ${partes.join(' · ')}`);
  } catch (err) {
    toast(err.message);
  } finally {
    btn.disabled = false;
  }
});

/* ==========================================================================
   IA
   El servidor local (npm run dev) es el único que sabe la clave de Groq —
   estos botones se apagan solos si /api/ai/status no responde, que es
   justamente lo que pasa cuando el panel corre sin ese servidor detrás.
   Nada se guarda solo: todo lo que propone la IA cae en el formulario o en
   la tabla de revisión.
   ========================================================================== */

let aiOn = false;

fetch('/api/ai/status')
  .then((r) => r.json())
  .then((d) => {
    aiOn = !!d.enabled;
    $('#bulkAI').hidden = !aiOn;
    $('#bulkAIHint').hidden = !aiOn;
    $('#btnStockAI').hidden = !aiOn;
    $('#reportAI').hidden = !aiOn;
  })
  .catch(() => {});

const api = async (url, opts = {}) => {
  const res = await fetch(url, { ...opts, headers: { 'content-type': 'application/json' } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
};

/** Muestra el error de la IA en criollo, sin tecnicismos. */
function aiError(err) {
  const m = String(err.message || '');
  if (m.includes('LIMITE')) return toast('Groq está limitando las consultas. Esperá un minuto y probá de nuevo.');
  if (m.includes('CLAVE_INVALIDA')) return toast('La clave de Groq no es válida. Revisá el archivo .env.');
  if (m.includes('SIN_CLAVE')) return toast('Falta poner GROQ_API_KEY en el archivo .env.');
  toast(m || 'La IA no pudo responder.');
}

/* ---------- IA en la carga masiva ---------- */

$('#bulkAI').addEventListener('click', async () => {
  const text = $('#bulkText').value.trim();
  if (!text) return toast('Pegá primero el texto con los productos.');

  const btn = $('#bulkAI');
  btn.disabled = true;
  const antes = btn.innerHTML;
  btn.textContent = 'Interpretando…';

  try {
    const { productos } = await api('/api/ai/draft-text', { method: 'POST', body: JSON.stringify({ text }) });
    if (!productos.length) return toast('La IA no encontró productos en ese texto.');
    // El rubro puede venir vacío si no estaba claro: se completa con el primero
    bulkRows = attachMatches(productos.map((p) => ({ ...p, category: p.category || settings.categories[0] })));
    renderBulk();
    toast(`${productos.length} fichas armadas. Revisalas antes de guardar.`, ico.check);
  } catch (err) {
    aiError(err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = antes;
  }
});

/* ---------- IA desde la foto ----------
   Se le mandan las fotos ya subidas a Cloudinary, no el archivo original. */

async function urlToDataUri(url) {
  const blob = await fetch(url).then((r) => r.blob());
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

$('#aiFromPhoto').addEventListener('click', async () => {
  if (!shots.length) return toast('Subí una foto primero.');

  const btn = $('#aiFromPhoto');
  btn.disabled = true;
  const antes = btn.innerHTML;
  btn.textContent = 'Mirando la foto…';

  try {
    // Hasta 3 fotos: el modelo acepta 5, pero más de 3 no aporta y tarda
    const images = await Promise.all(shots.slice(0, 3).map((id) => urlToDataUri(cloudinaryUrl(id, { width: 1000 }))));
    const { producto } = await api('/api/ai/draft-image', {
      method: 'POST',
      body: JSON.stringify({ images, hint: $('#fName').value.trim() }),
    });

    // No se pisa lo que ya escribió la persona
    if (producto.name && !$('#fName').value.trim()) $('#fName').value = producto.name;
    if (producto.description && !$('#fDesc').value.trim()) {
      $('#fDesc').value = producto.description;
      updateDescCount();
    }
    if (producto.category) $('#fCatSel').value = producto.category;

    const aviso = {
      alta: 'Ficha completada. Revisá que el nombre sea el correcto.',
      media: 'Completé lo que pude ver. Revisá bien el nombre y el rubro.',
      baja: 'La foto no me alcanzó para estar seguro. Revisá todo antes de guardar.',
    };
    toast(aviso[producto.confidence] || 'Ficha completada. Revisala antes de guardar.', ico.check);
  } catch (err) {
    aiError(err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = antes;
  }
});

/* ---------- IA: asistente de stock ----------
   Instrucción libre → propuesta de cambios → confirmación manual antes de
   tocar nada. La confirmación es obligatoria: el endpoint sólo PROPONE. */

const stockAIDlg = $('#stockAI');
/** Última propuesta, para poder aplicar sólo lo que quedó tildado. */
let stockAIProposal = [];

$('#btnStockAI').addEventListener('click', () => {
  $('#stockAIText').value = '';
  $('#stockAIPreview').hidden = true;
  $('#stockAINote').hidden = true;
  $('#stockAIApply').disabled = true;
  stockAIProposal = [];
  openDialog(stockAIDlg);
});
$('#stockAIClose').addEventListener('click', () => closeDialog(stockAIDlg));
$('#stockAICancel').addEventListener('click', () => closeDialog(stockAIDlg));

const CAMBIO_LABEL = {
  sin_stock: 'Pasa a SIN stock',
  con_stock: 'Pasa a CON stock',
  ocultar: 'Se oculta del catálogo',
  mostrar: 'Se muestra en el catálogo',
};
const CAMBIO_PATCH = {
  sin_stock: { inStock: false },
  con_stock: { inStock: true },
  ocultar: { visible: false },
  mostrar: { visible: true },
};

function renderStockAI() {
  const tbody = $('#stockAIRows');
  tbody.innerHTML = stockAIProposal
    .map(
      (a, i) => `<tr data-i="${i}">
      <td><input type="checkbox" data-check checked></td>
      <td>${(a.name || a.slug).replace(/</g, '&lt;')}</td>
      <td>${CAMBIO_LABEL[a.cambio] || a.cambio}</td>
      <td></td>
    </tr>`
    )
    .join('');
  $('#stockAIPreview').hidden = stockAIProposal.length === 0;
  $('#stockAIApply').disabled = stockAIProposal.length === 0;
  $('#stockAIApply').textContent = stockAIProposal.length ? `Aplicar ${stockAIProposal.length}` : 'Aplicar cambios';
}

$('#stockAIAsk').addEventListener('click', async () => {
  const instruction = $('#stockAIText').value.trim();
  if (!instruction) return toast('Contame qué cambió.');

  const btn = $('#stockAIAsk');
  btn.disabled = true;
  btn.textContent = 'Pensando…';

  try {
    const { acciones, no_encontrados, aclaracion } = await api('/api/ai/stock-actions', {
      method: 'POST',
      body: JSON.stringify({ instruction }),
    });
    stockAIProposal = acciones;
    renderStockAI();

    const notas = [];
    if (aclaracion) notas.push(aclaracion);
    if (no_encontrados?.length) notas.push(`No reconocí: ${no_encontrados.join(', ')}.`);
    $('#stockAINote').hidden = !notas.length;
    $('#stockAINote').textContent = notas.join(' ');

    if (!acciones.length && !notas.length) toast('No encontré cambios para proponer con eso.');
  } catch (err) {
    aiError(err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Preguntar';
  }
});

// Tildar/destildar una fila no borra la propuesta, sólo la deja afuera del "Aplicar"
$('#stockAIRows').addEventListener('change', (e) => {
  if (!e.target.matches('[data-check]')) return;
  const n = $$('#stockAIRows [data-check]:checked').length;
  $('#stockAIApply').textContent = n ? `Aplicar ${n}` : 'Aplicar cambios';
  $('#stockAIApply').disabled = n === 0;
});

$('#stockAIApply').addEventListener('click', async () => {
  const checked = $$('#stockAIRows tr').filter((tr) => $('[data-check]', tr).checked);
  if (!checked.length) return;

  const btn = $('#stockAIApply');
  btn.disabled = true;
  btn.textContent = 'Aplicando…';

  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    const applied = [];
    for (const tr of checked) {
      const a = stockAIProposal[Number(tr.dataset.i)];
      const patch = { ...CAMBIO_PATCH[a.cambio], updatedAt: now };
      batch.update(productRef(a.slug), patch);
      applied.push({ slug: a.slug, patch });
    }
    await batch.commit();
    for (const { slug, patch } of applied) Object.assign(products.find((p) => p.slug === slug) || {}, patch);

    render();
    closeDialog(stockAIDlg);
    toast(`${applied.length} producto${applied.length === 1 ? '' : 's'} actualizado${applied.length === 1 ? '' : 's'}`, ico.check);
    logActivity('stock_ai_applied', `Asistente de stock: ${applied.length} producto${applied.length === 1 ? '' : 's'} actualizado${applied.length === 1 ? '' : 's'}`);
  } catch (err) {
    aiError(err);
  } finally {
    btn.disabled = false;
  }
});

/* ==========================================================================
   AVISOS
   ========================================================================== */

const toastHost = $('#toasts');
function toast(text, icon = '') {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${icon}<span></span>`;
  el.querySelector('span').textContent = text;
  toastHost.append(el);
  setTimeout(() => el.remove(), 2500);
}

/* ==========================================================================
   LOGIN
   Nada del panel corre hasta que Firebase confirma una sesión válida. El
   login screen y el panel son dos pantallas separadas — se muestra una u
   otra según el estado de auth, nunca las dos.
   ========================================================================== */

const loginScreen = $('#loginScreen');
const appScreen = $('#appScreen');
const loginForm = $('#loginForm');
const loginError = $('#loginError');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;

  const btn = $('#loginSubmit');
  btn.disabled = true;
  btn.textContent = 'Entrando…';

  try {
    await signInWithEmailAndPassword(auth, $('#loginEmail').value.trim(), $('#loginPass').value);
    // onAuthStateChanged (más abajo) se encarga de mostrar el panel
  } catch (err) {
    const mensajes = {
      'auth/invalid-credential': 'Email o contraseña incorrectos.',
      'auth/invalid-email': 'Ese email no es válido.',
      'auth/too-many-requests': 'Demasiados intentos — esperá un momento y probá de nuevo.',
      'auth/user-disabled': 'Esta cuenta está deshabilitada.',
    };
    loginError.textContent = mensajes[err.code] || 'No se pudo iniciar sesión.';
    loginError.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});

$('#btnLogout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    appScreen.hidden = true;
    loginScreen.hidden = false;
    loginForm.reset();
    return;
  }

  $('#userEmail').textContent = user.email;
  loginScreen.hidden = true;
  appScreen.hidden = false;

  try {
    await loadAll();
  } catch (err) {
    listEl.innerHTML = `<div class="aempty"><p>No se pudo cargar el catálogo.</p><p class="t-small">${err.message}</p></div>`;
  }

  maybeAutoOpenTutorial();
});

/* ==========================================================================
   TUTORIAL DEL PANEL
   Pop-in la primera vez que alguien entra (una vez por navegador, se
   recuerda en localStorage) y reabrible siempre desde el botón "?" de la
   barra. Cada paso trae una maqueta hecha con divs — nada de capturas
   reales, que se desactualizan solas apenas cambia el diseño.
   ========================================================================== */
const camIco =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="14" r="3.4"/></svg>';
const searchIco =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
const arrowIco =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>';

const TUTORIAL_STEPS = [
  {
    title: 'Buscar y filtrar',
    text: 'Escribí en el buscador o usá los filtros de rubro y estado para encontrar un producto rápido.',
    preview: `<div class="tpv tpv--search">
      <div class="tpv__searchbar">${searchIco}<span class="tpv__bar" style="width:60%"></span></div>
      <div class="tpv__chips">
        <span class="tpv__chip">Rubro</span>
        <span class="tpv__chip tpv__chip--active">Sin stock</span>
        <span class="tpv__chip">Destacados</span>
      </div>
    </div>`,
  },
  {
    title: 'Cargar un producto nuevo',
    text: 'Tocá "Nuevo producto", subí las fotos, completá nombre y precio. El resto es opcional.',
    preview: `<div class="tpv tpv--new">
      <div class="tpv__thumb">${camIco}</div>
      <div class="tpv__fields">
        <span class="tpv__bar tpv__bar--lg" style="width:80%"></span>
        <span class="tpv__bar" style="width:45%"></span>
        <div class="tpv__switches"><i></i><i class="on"></i><i class="on"></i></div>
      </div>
    </div>`,
  },
  {
    title: 'Cargar con IA',
    text: 'Subí una foto y tocá "Completar ficha desde la foto". La IA propone nombre, rubro y descripción. El precio siempre lo ponés vos.',
    preview: `<div class="tpv tpv--ai">
      <div class="tpv__thumb">${camIco}</div>
      <div class="tpv__sparkle">${ico.sparkle}</div>
      <div class="tpv__fields">
        <span class="tpv__bar" style="width:70%"></span>
        <span class="tpv__bar" style="width:50%"></span>
        <span class="tpv__bar" style="width:85%"></span>
      </div>
    </div>`,
  },
  {
    title: 'Carga masiva de proveedores',
    text: 'Pegá la lista completa de un proveedor en "Carga masiva", revisá la vista previa y guardá todo junto.',
    preview: `<div class="tpv tpv--bulk">
      <div class="tpv__paste">
        <span class="tpv__line" style="width:92%"></span>
        <span class="tpv__line" style="width:70%"></span>
        <span class="tpv__line" style="width:84%"></span>
      </div>
      <div class="tpv__arrow">${arrowIco}</div>
      <div class="tpv__table">
        <div class="tpv__trow"></div>
        <div class="tpv__trow"></div>
        <div class="tpv__trow"></div>
      </div>
    </div>`,
  },
  {
    title: 'Asistente de stock',
    text: 'Escribile qué cambió, por ejemplo "se agotó el dinosaurio", y te muestra los cambios antes de aplicarlos.',
    preview: `<div class="tpv tpv--stock">
      <div class="tpv__bubble">"Se agotó el dinosaurio"</div>
      <div class="tpv__stockrow">
        <span class="tpv__dot"></span>
        <span class="tpv__bar" style="width:55%"></span>
        <span class="tpv__pill">Sin stock</span>
      </div>
    </div>`,
  },
  {
    title: 'Acciones en lote',
    text: 'Seleccioná varios productos y cambiá stock, visibilidad o destacado, o eliminalos, todos juntos.',
    preview: `<div class="tpv tpv--sel">
      <div class="tpv__rows">
        <div class="tpv__row"><span class="tpv__check tpv__check--on"></span><span class="tpv__bar" style="width:60%"></span></div>
        <div class="tpv__row"><span class="tpv__check tpv__check--on"></span><span class="tpv__bar" style="width:45%"></span></div>
        <div class="tpv__row"><span class="tpv__check"></span><span class="tpv__bar" style="width:70%"></span></div>
      </div>
      <div class="tpv__toolbar">
        <span class="tpv__tbtn">Con stock</span>
        <span class="tpv__tbtn">Destacar</span>
        <span class="tpv__tbtn tpv__tbtn--danger">Eliminar</span>
      </div>
    </div>`,
  },
  {
    title: 'Orden y exportar',
    text: 'Arrastrá las filas para cambiar el orden del catálogo. Con "Exportar" te llevás todo en CSV o JSON.',
    preview: `<div class="tpv tpv--order">
      <div class="tpv__rows">
        <div class="tpv__row"><span class="tpv__grip">${ico.grip}</span><span class="tpv__bar" style="width:55%"></span></div>
        <div class="tpv__row tpv__row--lift"><span class="tpv__grip">${ico.grip}</span><span class="tpv__bar" style="width:65%"></span></div>
        <div class="tpv__row"><span class="tpv__grip">${ico.grip}</span><span class="tpv__bar" style="width:40%"></span></div>
      </div>
      <div class="tpv__badges"><span class="tpv__badge">CSV</span><span class="tpv__badge">JSON</span></div>
    </div>`,
  },
];

const TUTORIAL_KEY = 'arias.adminTutorialSeen';
const tutorialDlg = $('#tutorial');
const tutorialStepEl = $('#tutorialStep');
const tutorialBody = $('#tutorialBody');
const tutorialDots = $('#tutorialDots');
const tutorialBack = $('#tutorialBack');
const tutorialNext = $('#tutorialNext');
let tutorialIdx = 0;

// Los puntos se arman una sola vez; sólo cambia cuál queda "activo".
tutorialDots.innerHTML = TUTORIAL_STEPS.map(
  (_, i) => `<button type="button" data-i="${i}" aria-label="Ir al paso ${i + 1}"></button>`
).join('');

function renderTutorialStep() {
  const step = TUTORIAL_STEPS[tutorialIdx];
  const last = tutorialIdx === TUTORIAL_STEPS.length - 1;

  tutorialStepEl.textContent = `Paso ${tutorialIdx + 1} de ${TUTORIAL_STEPS.length}`;
  tutorialBody.innerHTML = `${step.preview}<h2 id="tutorialTitle">${step.title}</h2><p>${step.text}</p>`;
  tutorialBody.scrollTop = 0;

  $$('button', tutorialDots).forEach((b, i) => {
    if (i === tutorialIdx) b.setAttribute('aria-current', 'true');
    else b.removeAttribute('aria-current');
  });

  tutorialBack.disabled = tutorialIdx === 0;
  tutorialNext.textContent = last ? 'Empezar a usar el panel' : 'Siguiente';
}

function openTutorial() {
  tutorialIdx = 0;
  renderTutorialStep();
  openDialog(tutorialDlg);
}

function maybeAutoOpenTutorial() {
  if (localStorage.getItem(TUTORIAL_KEY)) return;
  // Se marca como visto apenas se abre, no sólo al terminarlo — si alguien
  // lo cierra a la mitad, no queremos que le vuelva a saltar solo la
  // próxima vez que entre; para volver a verlo ya está el botón "?".
  localStorage.setItem(TUTORIAL_KEY, 'true');
  setTimeout(openTutorial, 700);
}

$('#tutorialBtn').addEventListener('click', () => {
  closeDialog(adminMenuDlg).then(openTutorial);
});
wireDialog(tutorialDlg, $('#tutorialClose'));

/* ==========================================================================
   MENÚ DEL PANEL
   Todo lo que no es cargar/editar productos hoy vive acá adentro — ver
   admin.css para el porqué del diálogo compartido en vez de un dropdown.
   ========================================================================== */
const adminMenuDlg = $('#adminMenu');
$('#adminMenuBtn').addEventListener('click', () => {
  openDialog(adminMenuDlg);
});
wireDialog(adminMenuDlg, $('#adminMenuClose'));

tutorialDots.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-i]');
  if (!btn) return;
  tutorialIdx = Number(btn.dataset.i);
  renderTutorialStep();
});

tutorialBack.addEventListener('click', () => {
  if (tutorialIdx === 0) return;
  tutorialIdx -= 1;
  renderTutorialStep();
});

tutorialNext.addEventListener('click', () => {
  if (tutorialIdx === TUTORIAL_STEPS.length - 1) {
    closeDialog(tutorialDlg);
    return;
  }
  tutorialIdx += 1;
  renderTutorialStep();
});

/* ==========================================================================
   CONFIGURACIÓN DE LA TIENDA
   Nombre, contacto, redes, rubros y horarios — todo lo que antes sólo se
   podía cambiar entrando a Firestore a mano. Se deja afuera a propósito
   currency y siteUrl: tocarlos mal rompe el SEO/los links, y no son cosas
   que cambien nunca en el uso normal del día a día.
   ========================================================================== */
const DAY_ORDER = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const DAY_LABEL = {
  Mo: 'Lunes',
  Tu: 'Martes',
  We: 'Miércoles',
  Th: 'Jueves',
  Fr: 'Viernes',
  Sa: 'Sábado',
  Su: 'Domingo',
};

let hoursState = {};
let categoriesState = [];

const settingsDlg = $('#settingsDlg');
const hoursGridEl = $('#hoursGrid');
const catChipsEl = $('#catChips');

/** El array plano de Firestore (varias entradas pueden compartir "days")
    pasa a un objeto por día — más simple para editar de a uno. */
function hoursStateFromArray(hours) {
  const state = Object.fromEntries(DAY_ORDER.map((d) => [d, []]));
  (hours || []).forEach((h) => {
    (h.days || []).forEach((d) => {
      if (state[d]) state[d].push({ opens: h.opens, closes: h.closes });
    });
  });
  return state;
}

const sameRanges = (a, b) => a.length === b.length && a.every((r, i) => r.opens === b[i].opens && r.closes === b[i].closes);

function dayGroupLabel(days) {
  if (days.length === 1) return DAY_LABEL[days[0]];
  if (days.length === 2) return `${DAY_LABEL[days[0]]} y ${DAY_LABEL[days[1]]}`;
  return `${DAY_LABEL[days[0]]} a ${DAY_LABEL[days[days.length - 1]]}`;
}

/** Vuelve a agrupar días consecutivos con los mismos turnos — de lunes a
    viernes con el mismo horario se guarda como una sola entrada, no cinco. */
function deriveHours(state) {
  const groups = [];
  for (const day of DAY_ORDER) {
    const ranges = state[day];
    const last = groups[groups.length - 1];
    if (last && sameRanges(last.ranges, ranges)) last.days.push(day);
    else groups.push({ days: [day], ranges });
  }

  const hours = [];
  const hoursDisplay = [];
  for (const g of groups) {
    if (!g.ranges.length) continue; // cerrado ese/esos día(s): no se guarda nada
    g.ranges.forEach((r) => hours.push({ days: [...g.days], opens: r.opens, closes: r.closes }));
    hoursDisplay.push({
      label: dayGroupLabel(g.days),
      value: g.ranges.map((r) => `${r.opens} a ${r.closes}`).join(' · '),
    });
  }
  return { hours, hoursDisplay };
}

function renderHoursGrid() {
  hoursGridEl.innerHTML = DAY_ORDER.map((day) => {
    const ranges = hoursState[day];
    const rangesHtml = ranges.length
      ? ranges
          .map(
            (r, i) => `<div class="hoursrange" data-i="${i}">
              <input type="time" data-field="opens" value="${r.opens}">
              <span>a</span>
              <input type="time" data-field="closes" value="${r.closes}">
              <button type="button" class="hoursrange__del" data-i="${i}" aria-label="Sacar este turno">${ico.x}</button>
            </div>`
          )
          .join('')
      : `<p class="hoursday__closed">Cerrado</p>`;
    return `<div class="hoursday${ranges.length ? '' : ' hoursday--closed'}" data-day="${day}">
      <span class="hoursday__label">${DAY_LABEL[day]}</span>
      <div class="hoursday__main">
        ${rangesHtml}
        <button type="button" class="hoursday__add" data-day="${day}">+ turno</button>
      </div>
    </div>`;
  }).join('');
}

hoursGridEl.addEventListener('click', (e) => {
  const addBtn = e.target.closest('.hoursday__add');
  if (addBtn) {
    const day = addBtn.dataset.day;
    const last = hoursState[day][hoursState[day].length - 1];
    hoursState[day].push({ opens: last?.closes || '09:00', closes: '13:00' });
    renderHoursGrid();
    return;
  }
  const delBtn = e.target.closest('.hoursrange__del');
  if (delBtn) {
    const day = delBtn.closest('.hoursday').dataset.day;
    hoursState[day].splice(Number(delBtn.dataset.i), 1);
    renderHoursGrid();
  }
});

hoursGridEl.addEventListener('change', (e) => {
  const input = e.target.closest('input[type="time"]');
  if (!input) return;
  const day = input.closest('.hoursday').dataset.day;
  const i = Number(input.closest('.hoursrange').dataset.i);
  hoursState[day][i][input.dataset.field] = input.value;
});

function renderCatChips() {
  catChipsEl.innerHTML = categoriesState
    .map(
      (c, i) =>
        `<span class="catchip">${esc(c)}<button type="button" data-i="${i}" aria-label="Sacar ${esc(c)}">${ico.x}</button></span>`
    )
    .join('');
}

catChipsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-i]');
  if (!btn) return;
  categoriesState.splice(Number(btn.dataset.i), 1);
  renderCatChips();
});

$('#catAddBtn').addEventListener('click', () => {
  const input = $('#catNew');
  const value = input.value.trim();
  if (!value) return;
  if (categoriesState.some((c) => c.toLowerCase() === value.toLowerCase())) {
    toast('Ese rubro ya existe.');
    return;
  }
  categoriesState.push(value);
  input.value = '';
  renderCatChips();
});
$('#catNew').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#catAddBtn').click();
  }
});

$('#btnSettings').addEventListener('click', () => {
  $('#sName').value = settings.storeName || '';
  $('#sTagline').value = settings.tagline || '';
  $('#sWhatsapp').value = settings.whatsapp || '';
  $('#sPhoneDisplay').value = settings.phoneDisplay || '';
  $('#sAddress').value = settings.address || '';
  $('#sMapsUrl').value = settings.mapsUrl || '';
  $('#sInstagram').value = settings.social?.instagram || '';
  $('#sFacebook').value = settings.social?.facebook || '';
  $('#sTiktok').value = settings.social?.tiktok || '';
  $('#sWaChannel').value = settings.social?.whatsappChannel || '';

  categoriesState = [...(settings.categories || [])];
  renderCatChips();

  hoursState = hoursStateFromArray(settings.hours);
  renderHoursGrid();

  closeDialog(adminMenuDlg).then(() => openDialog(settingsDlg));
});

wireDialog(settingsDlg, $('#settingsClose'));
$('#settingsCancel').addEventListener('click', () => closeDialog(settingsDlg));

$('#settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#settingsSave');
  const whatsapp = $('#sWhatsapp').value.trim().replace(/\D/g, '');
  if (!whatsapp) return toast('Falta el WhatsApp.');
  if (!categoriesState.length) return toast('Tiene que quedar al menos un rubro.');

  btn.disabled = true;
  btn.textContent = 'Guardando…';

  const { hours, hoursDisplay } = deriveHours(hoursState);
  const updates = {
    storeName: $('#sName').value.trim(),
    tagline: $('#sTagline').value.trim(),
    whatsapp,
    phoneDisplay: $('#sPhoneDisplay').value.trim(),
    address: $('#sAddress').value.trim(),
    mapsUrl: $('#sMapsUrl').value.trim(),
    social: {
      ...settings.social,
      instagram: $('#sInstagram').value.trim(),
      facebook: $('#sFacebook').value.trim(),
      tiktok: $('#sTiktok').value.trim(),
      whatsappChannel: $('#sWaChannel').value.trim(),
    },
    categories: categoriesState,
    hours,
    hoursDisplay,
  };

  try {
    await updateDoc(doc(db, 'settings', 'main'), updates);
    settings = { ...settings, ...updates };
    fillCategorySelects();
    closeDialog(settingsDlg);
    toast('Configuración guardada.', ico.check);
    logActivity('settings_updated', 'Actualizó la configuración de la tienda');
  } catch (err) {
    toast(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar';
  }
});

/* ==========================================================================
   REGISTRO DE ACTIVIDAD Y REPORTES
   Cada escritura real (crear/editar/eliminar producto, stock, carga
   masiva, configuración) queda anotada acá: quién, cuándo y desde dónde
   —aproximado, por IP, sin pedirle permiso de ubicación al navegador—.
   Sirve como un registro tipo "fin de jornada": qué se hizo, navegable
   por la sesión actual o por mes/trimestre hacia atrás.
   ========================================================================== */
const sessionActivity = [];
let cachedLocation;

/** Se pide una sola vez por sesión y se reusa — no tiene sentido pegarle
    a la API de geolocalización en cada cambio que se guarda. */
async function getApproxLocation() {
  if (cachedLocation !== undefined) return cachedLocation;
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) throw new Error('geo');
    const d = await res.json();
    cachedLocation = { city: d.city || null, region: d.region || null, country: d.country_name || null };
  } catch {
    cachedLocation = null;
  }
  return cachedLocation;
}

/** El guardado en Firestore va "al costado": la UI se actualiza al toque
    con lo que ya se sabe en el navegador, y si el registro en la nube
    falla (sin red, por ejemplo) no se corta el flujo principal — sólo se
    pierde ESE renglón del historial, nunca el cambio real al producto. */
function logActivity(action, summary, target = null) {
  const user = auth.currentUser;
  if (!user) return;

  const now = new Date();
  sessionActivity.unshift({ action, summary, target, email: user.email, at: now });
  renderSessionList();

  getApproxLocation().then((location) => {
    setDoc(doc(collection(db, 'activity')), {
      uid: user.uid,
      email: user.email,
      action,
      target,
      summary,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      quarter: Math.floor(now.getMonth() / 3) + 1,
      day: now.getDate(),
      createdAt: serverTimestamp(),
      clientTime: now.toISOString(),
      location,
    }).catch((err) => console.error('No se pudo registrar la actividad:', err));
  });
}

/* ---------- Diálogo de reportes ---------- */
const reportsDlg = $('#reportsDlg');
const sessionListEl = $('#sessionList');
const historyListEl = $('#historyList');

const fmtTime = (d) => d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
const fmtDay = (d) => {
  const s = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function locationLabel(loc) {
  if (!loc) return '';
  return [loc.city, loc.region].filter(Boolean).join(', ') || loc.country || '';
}

function activityItemHtml(entry) {
  const d = entry.at instanceof Date ? entry.at : null;
  const time = d ? fmtTime(d) : '';
  const meta = [time, entry.email, locationLabel(entry.location)].filter(Boolean).join(' · ');
  return `<div class="activityitem">
    <span class="activityitem__dot"></span>
    <div class="activityitem__body">
      <p class="activityitem__summary"></p>
      <p class="activityitem__meta"></p>
    </div>
  </div>`.replace('<p class="activityitem__summary"></p>', `<p class="activityitem__summary">${esc(entry.summary)}</p>`)
   .replace('<p class="activityitem__meta"></p>', `<p class="activityitem__meta">${esc(meta)}</p>`);
}

function renderSessionList() {
  sessionListEl.innerHTML = sessionActivity.map(activityItemHtml).join('');
  $('#sessionEmpty').hidden = sessionActivity.length > 0;
}

/* ---------- Historial: año → trimestre → mes ---------- */
let historyYear = new Date().getFullYear();
let historyQuarter = null;
let historyMonth = null;
const historyCache = new Map();

const QUARTER_MONTHS = { 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12] };
const MONTH_LABEL = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function renderYearNav() {
  $('#yearLabel').textContent = String(historyYear);
}

function renderQuarterGrid() {
  $('#quarterGrid').innerHTML = [1, 2, 3, 4]
    .map((q) => `<button type="button" class="quarterbtn" data-q="${q}" aria-current="${q === historyQuarter}">T${q}</button>`)
    .join('');
}

function renderMonthList() {
  const el = $('#monthList');
  if (!historyQuarter) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.innerHTML = QUARTER_MONTHS[historyQuarter]
    .map((m) => `<button type="button" class="monthbtn" data-m="${m}" aria-current="${m === historyMonth}">${MONTH_LABEL[m]}</button>`)
    .join('');
}

function resetHistoryView() {
  historyListEl.innerHTML = '';
  $('#historyEmpty').hidden = true;
}

async function loadHistoryMonth(year, month) {
  const key = `${year}-${month}`;
  resetHistoryView();
  $('#historySpinner').hidden = false;

  let entries = historyCache.get(key);
  if (!entries) {
    try {
      const snap = await getDocs(
        query(collection(db, 'activity'), where('year', '==', year), where('month', '==', month))
      );
      entries = snap.docs.map((d) => d.data());
      entries.sort((a, b) => (b.clientTime || '').localeCompare(a.clientTime || ''));
      historyCache.set(key, entries);
    } catch (err) {
      $('#historySpinner').hidden = true;
      toast(err.message);
      return;
    }
  }

  $('#historySpinner').hidden = true;
  if (!entries.length) {
    $('#historyEmpty').hidden = false;
    return;
  }

  let lastDay = null;
  const html = [];
  for (const e of entries) {
    const d = e.clientTime ? new Date(e.clientTime) : null;
    const dayKey = d ? d.toDateString() : '';
    if (dayKey !== lastDay) {
      html.push(`<p class="activityday">${d ? fmtDay(d) : 'Sin fecha'}</p>`);
      lastDay = dayKey;
    }
    html.push(activityItemHtml({ ...e, at: d }));
  }
  historyListEl.innerHTML = html.join('');
}

$('#quarterGrid').addEventListener('click', (e) => {
  const btn = e.target.closest('.quarterbtn');
  if (!btn) return;
  historyQuarter = Number(btn.dataset.q);
  historyMonth = null;
  renderQuarterGrid();
  renderMonthList();
  resetHistoryView();
});

$('#monthList').addEventListener('click', (e) => {
  const btn = e.target.closest('.monthbtn');
  if (!btn) return;
  historyMonth = Number(btn.dataset.m);
  renderMonthList();
  loadHistoryMonth(historyYear, historyMonth);
});

$('#yearPrev').addEventListener('click', () => {
  historyYear -= 1;
  historyMonth = null;
  renderYearNav();
  renderMonthList();
  resetHistoryView();
});
$('#yearNext').addEventListener('click', () => {
  historyYear += 1;
  historyMonth = null;
  renderYearNav();
  renderMonthList();
  resetHistoryView();
});

/* ---------- Tabs ---------- */
$('#tabSession').addEventListener('click', () => {
  $('#tabSession').setAttribute('aria-current', 'true');
  $('#tabHistory').setAttribute('aria-current', 'false');
  $('#reportSession').hidden = false;
  $('#reportHistory').hidden = true;
});
$('#tabHistory').addEventListener('click', () => {
  $('#tabHistory').setAttribute('aria-current', 'true');
  $('#tabSession').setAttribute('aria-current', 'false');
  $('#reportSession').hidden = true;
  $('#reportHistory').hidden = false;
});

/* ---------- Abrir / cerrar ---------- */
$('#btnReports').addEventListener('click', () => {
  $('#tabSession').click();
  historyYear = new Date().getFullYear();
  historyQuarter = null;
  historyMonth = null;
  renderYearNav();
  renderQuarterGrid();
  renderMonthList();
  resetHistoryView();
  renderSessionList();
  openDialog(reportsDlg);
});
wireDialog(reportsDlg, $('#reportsClose'));

/* ---------- Copiar / exportar / compartir / resumen con IA ---------- */
function inSessionTab() {
  return $('#reportSession').hidden === false;
}
function currentReportEntries() {
  return inSessionTab() ? sessionActivity : historyCache.get(`${historyYear}-${historyMonth}`) || [];
}
function reportText() {
  const entries = currentReportEntries();
  if (!entries.length) return 'Sin actividad para mostrar.';
  const title = inSessionTab() ? 'Actividad de esta sesión' : `Actividad de ${MONTH_LABEL[historyMonth]} ${historyYear}`;
  const lines = entries.map((e) => {
    const d = e.at instanceof Date ? e.at : e.clientTime ? new Date(e.clientTime) : null;
    return `• ${d ? fmtTime(d) + ' — ' : ''}${e.summary}`;
  });
  return `${title}\n\n${lines.join('\n')}`;
}

$('#reportCopy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(reportText());
    toast('Copiado', ico.check);
  } catch {
    toast('No se pudo copiar.');
  }
});

$('#reportExport').addEventListener('click', () => {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(reportText(), `reporte-arias-${stamp}.txt`, 'text/plain');
});

$('#reportShare').addEventListener('click', () => {
  window.open(`https://wa.me/?text=${encodeURIComponent(reportText())}`, '_blank', 'noopener');
});

$('#reportAI').addEventListener('click', async () => {
  const entries = currentReportEntries();
  if (!entries.length) return toast('No hay actividad para resumir.');

  const btn = $('#reportAI');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = 'Generando…';

  try {
    const { resumen } = await api('/api/ai/summarize-activity', {
      method: 'POST',
      body: JSON.stringify({ entries: entries.map((e) => e.summary) }),
    });
    await navigator.clipboard.writeText(resumen).catch(() => {});
    toast('Resumen copiado al portapapeles', ico.check);
  } catch (err) {
    aiError(err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
});
