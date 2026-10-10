/**
 * Descuento web manejado desde Gestión (Base44) — 09/10/2026.
 *
 * Sigue siendo UNA sola promo: un porcentaje sobre el total por pedir desde
 * la web, no acumulable (ver webPromo en templates.js). Lo que cambia es de
 * dónde sale el número:
 *   - Si Gestión manda `config.descuento_web` activo, vigente y con un
 *     porcentaje válido, manda Gestión.
 *   - Si no lo manda, está apagado, vencido, no empezó o Base44 no responde:
 *     el porcentaje del panel (settings.promos.webPercent, 10%).
 * Decisión de Fran: Gestión no puede dejar la web SIN descuento por un dato
 * vacío o una fecha vencida; para apagarlo está el panel (porcentaje 0).
 *
 * Forma esperada (tolerante a nombres): { activo, porcentaje, fecha_inicio,
 * fecha_fin, vigente?, leyenda? }. También acepta activa/enabled,
 * percent/valor, desde/hasta, inicio/fin, disclaimer/texto.
 *
 * Lo usan el build (HTML y settings.json), app.js (pedido y textos), las
 * métricas del pedido, el asistente local y el de IA. Sin dependencias.
 */

const pick = (o, ...keys) => {
  for (const k of keys) if (o?.[k] !== undefined && o[k] !== null && o[k] !== '') return o[k];
  return undefined;
};

const verdadero = (v) => v === true || v === 1 || /^(true|si|sí|1|activo|activa)$/i.test(String(v ?? '').trim());

function fecha(raw, finDelDia) {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  // "2026-10-31" sin hora: vale hasta el final de ese día en Argentina (UTC-3).
  if (finDelDia && /^\d{4}-\d{2}-\d{2}$/.test(String(raw).trim())) return new Date(d.getTime() + 27 * 60 * 60 * 1000 - 1);
  if (!finDelDia && /^\d{4}-\d{2}-\d{2}$/.test(String(raw).trim())) return new Date(d.getTime() + 3 * 60 * 60 * 1000);
  return d;
}

/** { percent, disclaimer } si Gestión manda un descuento válido hoy; si no, null. */
export function descuentoGestion(d, now = new Date()) {
  if (!d || typeof d !== 'object') return null;
  if (!verdadero(pick(d, 'activo', 'activa', 'activado', 'enabled'))) return null;
  if (pick(d, 'vigente') !== undefined && !verdadero(d.vigente)) return null;
  const percent = Number(pick(d, 'porcentaje', 'percent', 'valor', 'porcentaje_descuento'));
  if (!Number.isFinite(percent) || percent <= 0 || percent > 90) return null;
  const desde = fecha(pick(d, 'fecha_inicio', 'desde', 'inicio', 'vigencia_desde'), false);
  const hasta = fecha(pick(d, 'fecha_fin', 'hasta', 'fin', 'vigencia_hasta'), true);
  if (desde && now < desde) return null;
  if (hasta && now > hasta) return null;
  const leyenda = String(pick(d, 'leyenda', 'disclaimer', 'texto') ?? '').trim();
  return { percent: Math.round(percent * 100) / 100, disclaimer: leyenda };
}

/**
 * Deja en `settings.promos.webPercent` el porcentaje que corresponde ahora.
 * Guarda el del panel en `webPercentPanel` (una sola vez) para poder volver
 * a él cuando el de Gestión vence, y el dato crudo de Gestión en
 * `descuentoGestion` para que el navegador lo reevalúe con su reloj.
 * Devuelve el porcentaje efectivo.
 */
export function aplicarDescuento(settings, d, now = new Date()) {
  if (!settings || typeof settings !== 'object') return null;
  const promos = (settings.promos = settings.promos || {});
  if (promos.webPercentPanel === undefined) promos.webPercentPanel = promos.webPercent ?? 10;
  if (promos.disclaimerPanel === undefined) promos.disclaimerPanel = promos.disclaimer ?? '';
  if (d !== undefined) promos.descuentoGestion = d && typeof d === 'object' ? d : null;
  const g = descuentoGestion(promos.descuentoGestion, now);
  promos.webPercent = g ? g.percent : promos.webPercentPanel;
  promos.disclaimer = g?.disclaimer || promos.disclaimerPanel;
  promos.origen = g ? 'gestion' : 'panel';
  return promos.webPercent;
}
