/**
 * Configuración pública de Cloudinary.
 *
 * Igual que firebase-config.js: nada de esto es secreto. El cloud name va
 * en cada URL de imagen pública, y el upload preset "unsigned" está
 * diseñado justamente para vivir en código de navegador — la seguridad la
 * pone Cloudinary del lado del servidor (carpeta permitida, tamaño máximo,
 * formatos aceptados), no ocultar este nombre.
 */
export const cloudinaryConfig = {
  cloudName: 'nzyq1xgf',
  uploadPreset: 'Librería Arias',
};

/**
 * Arma la URL de entrega de una imagen ya subida a Cloudinary.
 *
 * `f_auto,q_auto` deja que Cloudinary elija el formato (webp/avif si el
 * navegador lo soporta) y la calidad óptima — reemplaza el trabajo que
 * antes hacía `sharp` a mano en el servidor. `width` sólo se manda cuando
 * hace falta un tamaño puntual (miniatura de grilla vs. foto de ficha);
 * sin él, Cloudinary entrega el original ya optimizado.
 */
export function cloudinaryUrl(publicId, { width } = {}) {
  const t = ['f_auto', 'q_auto', width ? `w_${width}` : null].filter(Boolean).join(',');
  return `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/${t}/${publicId}`;
}

/**
 * Tarjeta para compartir (vista previa de WhatsApp, Facebook, Instagram, mail).
 *
 * 1200x630 en JPG — el formato que todas las redes aceptan; con `f_auto` el
 * robot de WhatsApp a veces recibía AVIF/WebP y no mostraba nada. La arma
 * Cloudinary en la URL: foto del producto a la derecha, y a la izquierda la
 * marca, el nombre, el precio y la promo, con los colores de Arias. No hay
 * que generar ni guardar ninguna imagen: cambia el precio, cambia la URL.
 */
const cardText = (s) => encodeURIComponent(s).replace(/%2C/g, '%252C').replace(/%2F/g, '%252F');

export function shareCardUrl({ imageId, name, priceText, note = '', download = false }) {
  const title = name.length > 64 ? `${name.slice(0, 61).trimEnd()}…` : name;
  const layers = [
    'c_pad,w_1200,h_630,b_rgb:151515,g_east',
    `l_text:Montserrat_30_bold_letter_spacing_3:${cardText('LIBRERÍA ARIAS')},co_rgb:fece01,g_north_west,x_64,y_64`,
    `l_text:Montserrat_50_bold_line_spacing_-6:${cardText(title)},co_rgb:f5f5f7,c_fit,w_480,g_north_west,x_64,y_132`,
    `l_text:Montserrat_76_bold:${cardText(priceText)},co_rgb:fece01,g_south_west,x_64,y_${note ? 118 : 64}`,
    note ? `l_text:Montserrat_28_semibold:${cardText(note)},co_rgb:a1a1a6,g_south_west,x_64,y_64` : null,
    `f_jpg,q_auto:good${download ? ',fl_attachment' : ''}`,
  ].filter(Boolean);
  return `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/${layers.join('/')}/${imageId}`;
}
