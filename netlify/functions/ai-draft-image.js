import { aiEnabled, draftFromImages } from '../../src/ai.js';
import { json, loadCatalog, aiErrorResponse, noKeyResponse } from './_helpers.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido' });
  if (!aiEnabled()) return noKeyResponse();

  try {
    const { images, hint } = JSON.parse(event.body || '{}');
    if (!Array.isArray(images) || !images.length) return json(400, { error: 'No llegó ninguna foto.' });

    const { settings } = await loadCatalog();
    return json(200, { producto: await draftFromImages({ images, settings, hint }) });
  } catch (err) {
    return aiErrorResponse(err);
  }
};
