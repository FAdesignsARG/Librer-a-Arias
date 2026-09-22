import { aiEnabled, summarizeActivity } from '../../src/ai.js';
import { json, aiErrorResponse, noKeyResponse, requireAdmin } from './_helpers.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido' });
  // Sólo el panel. Antes esto respondía a cualquiera (medido desde afuera).
  const sinSesion = await requireAdmin(event);
  if (sinSesion) return sinSesion;
  if (!aiEnabled()) return noKeyResponse();

  try {
    const { entries } = JSON.parse(event.body || '{}');
    if (!Array.isArray(entries) || !entries.length) return json(400, { error: 'No hay actividad para resumir.' });

    return json(200, { resumen: await summarizeActivity({ entries }) });
  } catch (err) {
    return aiErrorResponse(err);
  }
};
