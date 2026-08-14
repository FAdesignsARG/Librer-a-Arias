/**
 * Publica firestore.rules en el proyecto real.
 *
 * Firestore en modo producción arranca con todo bloqueado ("allow read,
 * write: if false") hasta que se suben reglas — escribir el archivo local
 * no alcanza, hay que publicarlo. Normalmente eso se hace con la CLI de
 * Firebase (`firebase deploy --only firestore:rules`), que pide un login
 * interactivo por navegador. Para no depender de eso, se llama directo a
 * la API de reglas de Firebase con el token de la misma clave de servicio
 * que ya usan los scripts de migración.
 *
 *   node scripts/deploy-firestore-rules.js
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { loadEnv } from '../src/ai.js';

const ROOT = path.resolve(import.meta.dirname, '..');
await loadEnv(ROOT);

const serviceAccount = JSON.parse(
  await fs.readFile(path.join(ROOT, process.env.FIREBASE_SERVICE_ACCOUNT), 'utf8')
);
const projectId = serviceAccount.project_id;

const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount) });
const { access_token: accessToken } = await app.options.credential.getAccessToken();

const rules = await fs.readFile(path.join(ROOT, 'firestore.rules'), 'utf8');

async function call(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data;
}

console.log('Creando ruleset...');
const ruleset = await call(`https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`, {
  source: { files: [{ name: 'firestore.rules', content: rules }] },
});
console.log('  ruleset:', ruleset.name);

console.log('Publicando en cloud.firestore...');
// La release "cloud.firestore" es la que Firestore usa en vivo. PATCH la
// actualiza si ya existe (que es el caso normal después de la primera vez).
const releaseName = `projects/${projectId}/releases/cloud.firestore`;
const patchRes = await fetch(`https://firebaserules.googleapis.com/v1/${releaseName}`, {
  method: 'PATCH',
  headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
  body: JSON.stringify({ release: { name: releaseName, rulesetName: ruleset.name } }),
});

if (patchRes.status === 404) {
  // Primera vez: la release todavía no existe, hay que crearla
  await call(`https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`, {
    name: releaseName,
    rulesetName: ruleset.name,
  });
} else if (!patchRes.ok) {
  throw new Error((await patchRes.json())?.error?.message || `HTTP ${patchRes.status}`);
}

console.log('\nListo — las reglas de firestore.rules ya están activas en el proyecto.');
