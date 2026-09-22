import { aiEnabled, draftFromText } from '../../src/ai.js';
import { json, loadCatalog, aiErrorResponse, noKeyResponse, requireAdmin } from './_helpers.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido' });
  // Sólo el panel. Antes esto respondía a cualquiera (medido desde afuera).
  const sinSesion = await requireAdmin(event);
  if (sinSesion) return sinSesion;
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
