import { aiEnabled, draftFromText } from '../../src/ai.js';
import { json, loadCatalog, aiErrorResponse, noKeyResponse } from './_helpers.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido' });
  if (!aiEnabled()) return noKeyResponse();

  try {
    const { text } = JSON.parse(event.body || '{}');
    if (!String(text || '').trim()) return json(400, { error: 'Falta el texto.' });

    const { settings } = await loadCatalog();
    return json(200, { productos: await draftFromText({ text, settings }) });
  } catch (err) {
    return aiErrorResponse(err);
  }
};
