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

/** Cada cuánto cambia la selección de la home. */
export const ROTATION_MS = 5 * 60 * 1000;

/** Número de tramo de 5 minutos: el mismo para todo el mundo a la misma hora. */
export const rotationSlot = (now = Date.now()) => Math.floor(now / ROTATION_MS);

const shuffleWith = (list, rand) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/**
 * Selección que rota, determinística por tramo (no por día). El catálogo
 * elegible se baraja una vez por ciclo y cada tramo toma su porción: nada se
 * repite hasta que pasó todo el catálogo (con ~500 productos, más de 8 horas).
 * `preferred` son los slugs destacados que marketing carga en Base44: entran
 * hasta dos por tramo, así la fila igual cambia aunque haya pocos destacados.
 */
export function rotatingPicks(products, { count = 5, slot = rotationSlot(), preferred = [] } = {}) {
  const eligible = products.filter((p) => p.visible !== false && p.inStock);
  if (eligible.length <= count) return eligible;

  const perCycle = Math.floor(eligible.length / count);
  const cycle = Math.floor(slot / perCycle);
  const index = slot % perCycle;
  const deck = shuffleWith(eligible, mulberry32(hashSeed(`cycle:${cycle}`)));
  const chunk = deck.slice(index * count, index * count + count);

  const wanted = new Set(preferred);
  if (!wanted.size) return chunk;
  const rand = mulberry32(hashSeed(`slot:${slot}`));
  const inChunk = new Set(chunk.map((p) => p.slug));
  const fromPreferred = shuffleWith(eligible.filter((p) => wanted.has(p.slug) && !inChunk.has(p.slug)), rand).slice(0, 2);
  return shuffleWith([...fromPreferred, ...chunk.slice(0, count - fromPreferred.length)], rand);
}
