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
