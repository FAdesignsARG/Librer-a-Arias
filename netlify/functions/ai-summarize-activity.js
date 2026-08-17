import { aiEnabled, summarizeActivity } from '../../src/ai.js';
import { json, aiErrorResponse, noKeyResponse } from './_helpers.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido' });
  if (!aiEnabled()) return noKeyResponse();

  try {
    const { entries } = JSON.parse(event.body || '{}');
    if (!Array.isArray(entries) || !entries.length) return json(400, { error: 'No hay actividad para resumir.' });

    return json(200, { resumen: await summarizeActivity({ entries }) });
  } catch (err) {
    return aiErrorResponse(err);
  }
};
