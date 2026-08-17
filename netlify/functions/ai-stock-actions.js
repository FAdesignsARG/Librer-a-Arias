import { aiEnabled, proposeStockActions } from '../../src/ai.js';
import { json, loadCatalog, aiErrorResponse, noKeyResponse } from './_helpers.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido' });
  if (!aiEnabled()) return noKeyResponse();

  try {
    const { instruction } = JSON.parse(event.body || '{}');
    if (!String(instruction || '').trim()) return json(400, { error: 'Falta la instrucción.' });

    const { products } = await loadCatalog();
    const out = await proposeStockActions({ instruction, products });

    const bySlug = new Map(products.map((p) => [p.slug, p]));
    return json(200, {
      acciones: out.acciones.map((a) => ({ ...a, name: bySlug.get(a.slug)?.name })),
      no_encontrados: out.no_encontrados,
      aclaracion: out.aclaracion,
    });
  } catch (err) {
    return aiErrorResponse(err);
  }
};
