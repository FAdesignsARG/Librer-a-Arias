/**
 * Endpoints de IA.
 *
 *   GET  /api/ai/status      ¿hay clave configurada?
 *   POST /api/ai/ask         pregunta sobre el catálogo
 *   POST /api/ai/draft-text  fichas a partir de texto pegado
 *   POST /api/ai/draft-image fichas a partir de fotos
 *
 * El flujo de /ask hace primero la búsqueda semántica local y recién
 * después llama al modelo, con esos pocos productos como único contexto.
 * Sirve para dos cosas: gastar menos tokens y, sobre todo, para que el
 * modelo no tenga de dónde inventar.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { buildIndex, getIndex, searchProducts } from './search-engine.js';
import { offerActive, offerHasDiscount } from './templates.js';

const json = (res, status, obj) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(obj));
  return true;
};

function readBody(req, limit = 30 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('El pedido es demasiado grande.'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/* El índice semántico se reconstruye sólo si products.json cambió. */
let indexStamp = 0;

async function ensureIndex(ROOT) {
  const file = path.join(ROOT, 'data', 'products.json');
  const { mtimeMs } = await fs.stat(file);
  const products = JSON.parse(await fs.readFile(file, 'utf8'));
  if (mtimeMs !== indexStamp) {
    buildIndex(products.filter((p) => p.visible !== false));
    indexStamp = mtimeMs;
  }
  return products;
}

export async function registerAiApi(req, res, { ROOT, pathname, ai }) {
  const { aiEnabled, askCatalog, draftFromText, draftFromImages, proposeStockActions, summarizeActivity } = ai;
  const settings = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'settings.json'), 'utf8'));

  if (pathname === '/api/ai/status') {
    return json(res, 200, { enabled: aiEnabled() });
  }

  if (!aiEnabled()) {
    return json(res, 503, {
      error: 'SIN_CLAVE',
      mensaje: 'Falta configurar GROQ_API_KEY en el archivo .env para usar la IA.',
    });
  }

  try {
    /* ---------- preguntas sobre el catálogo ---------- */
    if (pathname === '/api/ai/ask' && req.method === 'POST') {
      const { question, history = [], modo = 'cliente' } = JSON.parse(await readBody(req, 256 * 1024));
      if (!String(question || '').trim()) return json(res, 400, { error: 'Falta la pregunta.' });

      await ensureIndex(ROOT);

      // Los candidatos salen del buscador semántico que ya existe. Si la
      // consulta es muy amplia recortamos: el modelo no necesita 125 fichas.
      const encontrados = searchProducts(question, getIndex());
      const candidates = (encontrados.length ? encontrados : getIndex().map((e) => e.p)).slice(0, 20);

      const out = await askCatalog({ question, candidates, settings, history, modo });

      // Se devuelven los productos completos desde nuestros datos, así el
      // precio y el stock que ve el cliente nunca vienen del modelo.
      const bySlug = new Map(candidates.map((p) => [p.slug, p]));
      return json(res, 200, {
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
    }

    /* ---------- comandos de stock ---------- */
    if (pathname === '/api/ai/stock-actions' && req.method === 'POST') {
      const { instruction } = JSON.parse(await readBody(req, 256 * 1024));
      if (!String(instruction || '').trim()) return json(res, 400, { error: 'Falta la instrucción.' });

      const products = await ensureIndex(ROOT);
      const out = await proposeStockActions({ instruction, products });

      // Se devuelven con el nombre para que la tabla de confirmación no
      // tenga que ir a buscar cada producto por separado en el cliente.
      const bySlug = new Map(products.map((p) => [p.slug, p]));
      return json(res, 200, {
        acciones: out.acciones.map((a) => ({ ...a, name: bySlug.get(a.slug)?.name })),
        no_encontrados: out.no_encontrados,
        aclaracion: out.aclaracion,
        respuesta: out.respuesta,
      });
    }

    /* ---------- fichas desde texto ---------- */
    if (pathname === '/api/ai/draft-text' && req.method === 'POST') {
      const { text } = JSON.parse(await readBody(req, 512 * 1024));
      if (!String(text || '').trim()) return json(res, 400, { error: 'Falta el texto.' });
      return json(res, 200, { productos: await draftFromText({ text, settings }) });
    }

    /* ---------- ficha desde fotos ---------- */
    if (pathname === '/api/ai/draft-image' && req.method === 'POST') {
      const { images, hint } = JSON.parse(await readBody(req));
      if (!Array.isArray(images) || !images.length) return json(res, 400, { error: 'No llegó ninguna foto.' });
      return json(res, 200, { producto: await draftFromImages({ images, settings, hint }) });
    }

    /* ---------- resumen de actividad ---------- */
    if (pathname === '/api/ai/summarize-activity' && req.method === 'POST') {
      const { entries } = JSON.parse(await readBody(req, 128 * 1024));
      if (!Array.isArray(entries) || !entries.length) return json(res, 400, { error: 'No hay actividad para resumir.' });
      return json(res, 200, { resumen: await summarizeActivity({ entries }) });
    }

    return false;
  } catch (err) {
    const msg = err.message || 'Error inesperado';
    // El límite del plan gratuito es lo más común: merece un mensaje claro
    if (msg.startsWith('LIMITE')) return json(res, 429, { error: 'LIMITE', mensaje: msg.slice(8) });
    if (msg.startsWith('CLAVE_INVALIDA')) return json(res, 401, { error: 'CLAVE_INVALIDA', mensaje: msg.slice(15) });
    console.error('  error de IA:', err);
    return json(res, 500, { error: 'FALLO', mensaje: msg });
  }
}
