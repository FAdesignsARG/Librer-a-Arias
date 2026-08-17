import { aiEnabled, askCatalog } from '../../src/ai.js';
import { buildIndex, getIndex, searchProducts } from '../../src/search-engine.js';
import { json, loadCatalog, aiErrorResponse, noKeyResponse } from './_helpers.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido' });
  if (!aiEnabled()) return noKeyResponse();

  try {
    const { question, history = [], modo = 'cliente' } = JSON.parse(event.body || '{}');
    if (!String(question || '').trim()) return json(400, { error: 'Falta la pregunta.' });

    const { products, settings } = await loadCatalog();
    // Cada invocación es un proceso nuevo (a diferencia del server local, que
    // reconstruía el índice sólo si products.json cambiaba) — se arma de cero
    // cada vez, es liviano y no vale la pena cachear entre invocaciones frías.
    buildIndex(products.filter((p) => p.visible !== false));

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
        };
      }),
    });
  } catch (err) {
    return aiErrorResponse(err);
  }
};
