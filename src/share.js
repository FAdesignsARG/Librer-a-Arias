/**
 * Compartir un producto — con foco en WhatsApp.
 *
 * Cualquier botón con `data-share` (la ficha, cada tarjeta de la grilla, los
 * productos que recomienda el asistente) abre la misma hoja: muestra cómo se
 * va a ver la vista previa y ofrece WhatsApp primero, después el menú de
 * compartir del teléfono (Instagram, Messenger, lo que tenga instalado),
 * Facebook, mail, copiar el enlace y bajar la imagen.
 *
 * La vista previa linda no se arma acá: la leen WhatsApp y las redes de los
 * metadatos de la ficha (`og:image` = tarjeta 1200x630 de Cloudinary, ver
 * `shareCardUrl`). Por eso lo que se comparte es siempre el enlace a la ficha.
 *
 * No depende de app.js ni de products.json: los datos viajan en el botón.
 */
import { shareCardUrl } from './cloudinary-config.js';
import { wireDialog, closeDialog, enableDragToClose } from './ui.js';

const sheet = document.getElementById('shareSheet');

if (sheet) {
  const $ = (sel) => sheet.querySelector(sel);
  const preview = $('#sharePreviewImg');
  const nameEl = $('#shareName');
  const priceEl = $('#sharePrice');
  const urlEl = $('#shareUrl');
  const nativeBtn = $('#shareNative');
  const copyBtn = $('#shareCopy');
  const mailCopyBtn = $('#shareMailCopy');
  let current = null;

  wireDialog(sheet, $('#shareSheetClose'));
  enableDragToClose(sheet, { header: $('.sortsheet__head'), scrollEl: $('.sharesheet__body') });

  // El menú de compartir del sistema sólo existe en teléfonos y algunos navegadores.
  if (!navigator.share) nativeBtn.hidden = true;

  const note = () => sheet.dataset.promo || '';

  /** Texto del mensaje: el nombre en negrita de WhatsApp, precio, promo y el enlace al final
      (WhatsApp arma la vista previa con el último enlace del mensaje). */
  const message = (p, { bold = true } = {}) =>
    [bold ? `*${p.name}*` : p.name, [p.price, note()].filter(Boolean).join(' · '), p.url].join('\n');

  const flash = (btn, text) => {
    const label = btn.querySelector('.shareopt__label');
    const before = label.textContent;
    label.textContent = text;
    setTimeout(() => { label.textContent = before; }, 1800);
  };

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      ta.style.cssText = 'position:fixed;opacity:0';
      sheet.append(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    }
  }

  /** Bloque listo para pegar en un mail: imagen, nombre, precio y botón. Estilos en línea
      porque los clientes de correo descartan las hojas de estilo. */
  const mailHtml = (p) => `<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:600px;font-family:Arial,Helvetica,sans-serif;border:1px solid #e5e5ea;border-radius:16px;overflow:hidden">
<tr><td><a href="${p.url}"><img src="${p.card}" width="600" alt="${p.name.replace(/"/g, '&quot;')}" style="display:block;width:100%;height:auto;border:0"></a></td></tr>
<tr><td style="padding:20px 24px">
<p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#1d1d1f">${p.name}</p>
<p style="margin:0 0 16px;font-size:16px;color:#3d3d42">${[p.price, note()].filter(Boolean).join(' · ')}</p>
<a href="${p.url}" style="display:inline-block;padding:14px 24px;border-radius:999px;background:#fece01;color:#1a1200;font-size:16px;font-weight:bold;text-decoration:none">Ver en Librería Arias</a>
</td></tr></table>`;

  function open(btn) {
    const d = btn.dataset;
    const url = new URL(`/p/${d.share}/`, location.origin).href;
    current = {
      slug: d.share,
      name: d.shareName,
      price: d.sharePrice,
      url,
      card: shareCardUrl({ imageId: d.shareImg, name: d.shareName, priceText: d.sharePrice, note: note() }),
      download: shareCardUrl({ imageId: d.shareImg, name: d.shareName, priceText: d.sharePrice, note: note(), download: true }),
    };
    const p = current;
    preview.src = p.card;
    preview.alt = `Vista previa de ${p.name}`;
    nameEl.textContent = p.name;
    priceEl.textContent = [p.price, note()].filter(Boolean).join(' · ');
    urlEl.textContent = url.replace(/^https?:\/\//, '');

    $('#shareWa').href = `https://wa.me/?text=${encodeURIComponent(message(p))}`;
    $('#shareFb').href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(p.url)}`;
    $('#shareMail').href = `mailto:?subject=${encodeURIComponent(`${p.name} — Librería Arias`)}&body=${encodeURIComponent(message(p, { bold: false }))}`;
    $('#shareDownload').href = p.download;

    sheet.showModal();
    sheet.focus();
    window.dispatchEvent(new CustomEvent('arias:share-open', { detail: { slug: p.slug } }));
  }

  // Delegado: las tarjetas se vuelven a dibujar todo el tiempo.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-share]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    open(btn);
  });

  nativeBtn.addEventListener('click', async () => {
    if (!current) return;
    try {
      await navigator.share({ title: current.name, text: `${current.name} · ${current.price}`, url: current.url });
      closeDialog(sheet);
    } catch {
      /* canceló: la hoja sigue abierta */
    }
  });

  copyBtn.addEventListener('click', async () => {
    if (current && (await copyText(current.url))) flash(copyBtn, 'Enlace copiado');
  });

  mailCopyBtn.addEventListener('click', async () => {
    if (!current) return;
    const html = mailHtml(current);
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([message(current, { bold: false })], { type: 'text/plain' }),
        }),
      ]);
      flash(mailCopyBtn, 'Copiado: pegalo en el mail');
    } catch {
      if (await copyText(message(current, { bold: false }))) flash(mailCopyBtn, 'Texto copiado');
    }
  });

  // Cada salida avisa a las métricas por dónde se compartió.
  sheet.addEventListener('click', (e) => {
    const opt = e.target.closest('[data-share-via]');
    if (opt && current) window.dispatchEvent(new CustomEvent('arias:share', { detail: { slug: current.slug, via: opt.dataset.shareVia } }));
  });
}
