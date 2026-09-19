/**
 * Corrige settings/main.siteUrl en Firestore — corrida única, 18/9/2026.
 *
 * El sitio se sirve en https://libreria-arias.netlify.app. El valor guardado
 * (https://libreriaarias.com.ar) es un dominio que no existe: con él, la URL
 * canónica, og:url, el sitemap, los datos estructurados y el enlace del mensaje
 * de "Consultar por WhatsApp" de cada ficha apuntaban a la nada (y Facebook usa
 * og:url para armar la vista previa al compartir).
 *
 * Usa `.update()`: sólo pisa ese campo. Imprime el valor anterior. El panel de
 * administración no edita siteUrl a propósito. Si algún día se conecta un
 * dominio propio, correr esto de nuevo con la URL nueva:
 *
 *   node --use-system-ca scripts/set-site-url.js https://midominio.com.ar
 */
import path from 'node:path';
import { getDb } from '../src/firebase-admin.js';
import { loadEnv } from '../src/ai.js';

const ROOT = path.resolve(import.meta.dirname, '..');
await loadEnv(ROOT);
const db = await getDb(ROOT);

const siteUrl = (process.argv[2] || 'https://libreria-arias.netlify.app').replace(/\/+$/, '');
if (!/^https:\/\/[a-z0-9.-]+$/i.test(siteUrl)) throw new Error(`URL inválida: ${siteUrl}`);

const ref = db.collection('settings').doc('main');
const antes = (await ref.get()).get('siteUrl');
console.log('settings/main.siteUrl ANTES (guardar por si hay que volver):', antes);

await ref.update({ siteUrl });
console.log('settings/main.siteUrl AHORA:', siteUrl);
