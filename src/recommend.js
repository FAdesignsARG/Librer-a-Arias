/**
 * Selección diaria de productos — "Elegidos para vos hoy".
 *
 * Determinística por día: la fecha en formato YYYY-MM-DD se usa como
 * semilla de un PRNG chiquito (mulberry32, sin traer una librería nueva)
 * para barajar el catálogo. Mismo día → mismos productos para todo el
 * mundo, sin guardar nada en Firestore ni depender de un cron.
 *
 * Vive aparte de templates.js porque no sólo la usa el home (Ronda 1):
 * el asistente de IA y el pop-up antes de WhatsApp la van a reusar en
 * rondas futuras.
 */

/** Hash chiquito de un string a un entero de 32 bits, para armar la semilla. */
function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/** PRNG determinístico — mismo seed, misma secuencia de "aleatorios". */
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// UTC, no hora local: el build corre en Netlify (UTC) y a veces también
// local (Argentina, UTC-3) — con hora local, durante la noche argentina
// (cuando en UTC ya es "mañana") cada build elegiría un día distinto y
// mostraría productos diferentes para lo que debería ser el mismo día.
const dateKey = (d) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

/**
 * Devuelve `count` productos elegidos para el día dado (hoy por defecto).
 * Sólo productos visibles y con stock. Si hay menos elegibles que
 * `count`, devuelve los que haya.
 */
export function dailyPicks(products, { count = 5, date = new Date() } = {}) {
  const eligible = products.filter((p) => p.visible !== false && p.inStock);
  if (eligible.length <= count) return eligible;

  const rand = mulberry32(hashSeed(dateKey(date)));
  const shuffled = [...eligible];
  // Fisher-Yates con el PRNG con semilla — el barajado clásico, nada exótico.
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
