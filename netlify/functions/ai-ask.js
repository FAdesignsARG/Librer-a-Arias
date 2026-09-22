import { aiEnabled, askCatalog } from '../../src/ai.js';
import { buildIndex, getIndex, searchProducts, registerAliases } from '../../src/search-engine.js';
import { offerActive, offerHasDiscount } from '../../src/templates.js';
import { json, loadCatalog, aiErrorResponse, noKeyResponse, hasAdminSession } from './_helpers.js';
import { fetchAuxiliar, applyAuxiliar, EMPTY_AUX } from '../../src/base44-auxiliar.js';

/* ---------- capa auxiliar de Base44 para el asistente ----------
   El asistente arma su índice leyendo Firestore en cada invocación, así que
   no pasa por el build ni por data/products.json: si no se pide acá, no ve
   los alias. Se pide en paralelo con el catálogo, así no suma espera.

   Se cachea a nivel módulo por 5 minutos porque Netlify reusa el proceso
   entre invocaciones tibias: una tanda de preguntas seguidas le pega una
   sola vez al bridge.

   Los alias son SÓLO expansión de búsqueda: amplían con qué palabras se
   encuentra un producto que ya existe. No tocan nombre, precio, stock ni
   descripción, y no agregan productos — `applyAuxiliar` enriquece por slug
   y descarta cualquier slug que no exista en el catálogo. Si el bridge
   falla, `fetchAuxiliar` devuelve la capa vacía y el asistente contesta
   igual con lo que hay. */
const AUX_TTL_MS = 5 * 60 * 1000;
let auxCache = { at: 0, aux: EMPTY_AUX };

async function auxiliarParaElAsistente() {
  if (Date.now() - auxCache.at < AUX_TTL_MS) return auxCache.aux;
  // Timeout corto: acá hay una persona esperando la respuesta, no un build.
  const aux = await fetchAuxiliar({ timeout: 4000 });
  // Un fallo no se cachea como bueno, pero sí se anota para no reintentar
  // contra un bridge caído en cada pregunta.
  auxCache = { at: Date.now(), aux };
  return aux;
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido' });
  if (!aiEnabled()) return noKeyResponse();

  try {
    const { question, history = [], modo: modoPedido = 'cliente' } = JSON.parse(event.body || '{}');
    if (!String(question || '').trim()) return json(400, { error: 'Falta la pregunta.' });

    // Este endpoint SÍ es público: es el asistente del catálogo. Pero el modo
    // "interno" (habla con el equipo del local, más directo y técnico) no lo
    // puede pedir cualquiera desde afuera — hasta hoy alcanzaba con mandar
    // modo:"interno" en el cuerpo. Ahora hay que tener sesión del panel; sin
    // ella se atiende como cliente, que es lo que corresponde.
    const modo = modoPedido === 'interno' && (await hasAdminSession(event)) ? 'interno' : 'cliente';

    const [{ products, settings }, aux] = await Promise.all([
      loadCatalog(),
      auxiliarParaElAsistente(),
    ]);

    // Mismo criterio que el build del sitio: enriquecer por slug y respetar la
    // visibilidad de Base44, para que el asistente no ofrezca algo que en la
    // web no está.
    const enriquecidos = applyAuxiliar(products, aux).products;

    // Los sinónimos globales se registran ANTES de indexar (buildIndex canoniza
    // los términos). registerAliases es idempotente: en una invocación tibia
    // vuelve a llamarse y no duplica nada.
    registerAliases(aux.aliases);

    // Cada invocación es un proceso nuevo (a diferencia del server local, que
    // reconstruía el índice sólo si products.json cambiaba) — se arma de cero
    // cada vez, es liviano y no vale la pena cachear entre invocaciones frías.
    buildIndex(enriquecidos.filter((p) => p.visible !== false));

    const encontrados = searchProducts(question, getIndex());
    const candidates = (encontrados.length ? encontrados : getIndex().map((e) => e.p)).slice(0, 20);

    const out = await askCatalog({ question, candidates, settings, history, modo });

    const bySlug = new Map(candidates.map((p) => [p.slug, p]));
    return json(200, {
      respuesta: out.respuesta,
      productos: out.productos.map((s) => {
        const p = bySlug.get(s);
        return {
          slug: p.slug,
          name: p.name,
          price: p.price,
          category: p.category,
          inStock: p.inStock,
          image: p.images?.[0] || null,
          // Mismo criterio que cardHtml (templates.js): precio tachado +
          // precio con descuento cuando hay oferta activa con número propio.
          offerActive: offerActive(p),
          offerPrice: offerHasDiscount(p) ? p.offer.price : null,
        };
      }),
    });
  } catch (err) {
    return aiErrorResponse(err);
  }
};
