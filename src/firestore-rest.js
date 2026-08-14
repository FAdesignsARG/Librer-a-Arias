/**
 * Lectura de Firestore por REST en vez del SDK Admin (que usa gRPC).
 *
 * server.js es un proceso de larga duración (http.createServer) y ahí las
 * llamadas gRPC del SDK Admin fallan con "unable to verify the first
 * certificate" — parece un problema de la cadena de certificados que usa
 * @grpc/grpc-js en ese contexto puntual, porque el mismo query funciona
 * siempre en scripts sueltos (migrate-to-firestore.js, etc.) y hasta en un
 * script standalone corrido justo después de reiniciar el server. En vez de
 * seguir peleando con gRPC, esto pega directo a la API REST de Firestore
 * con fetch — mismo mecanismo que ya usa scripts/deploy-firestore-rules.js
 * para las reglas, y ahí nunca dio problema.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';

let credential = null;
let projectId = null;
let tokenCache = { token: null, exp: 0 };

async function getCredential(root) {
  if (credential) return credential;

  const file = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!file) {
    throw new Error(
      'Falta FIREBASE_SERVICE_ACCOUNT en el .env — poné ahí el nombre del archivo de la clave de servicio de Firebase.'
    );
  }

  const keyPath = path.join(root, file);
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(await fs.readFile(keyPath, 'utf8'));
  } catch (err) {
    throw new Error(`No pude leer la clave de servicio en ${keyPath}: ${err.message}`);
  }

  projectId = serviceAccount.project_id;
  const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount) });
  credential = app.options.credential;
  return credential;
}

async function getAccessToken(root) {
  if (tokenCache.token && Date.now() < tokenCache.exp) return tokenCache.token;

  const cred = await getCredential(root);
  const { access_token: accessToken, expires_in: expiresIn } = await cred.getAccessToken();
  // Un poco antes del vencimiento real, para no arrancar un fetch con un
  // token que expira a mitad de camino.
  tokenCache = { token: accessToken, exp: Date.now() + (expiresIn ? expiresIn * 1000 : 3600_000) - 60_000 };
  return tokenCache.token;
}

function fromFirestoreValue(value) {
  if (!value || value.nullValue !== undefined) return null;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return Number(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.arrayValue !== undefined) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if (value.mapValue !== undefined) return fromFirestoreFields(value.mapValue.fields || {});
  return null;
}

function fromFirestoreFields(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields)) out[key] = fromFirestoreValue(value);
  return out;
}

async function listDocuments(root, collection) {
  const docs = [];
  let pageToken;
  do {
    const token = await getAccessToken(root);
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`
    );
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Firestore REST (${collection}): HTTP ${res.status} ${await res.text()}`);
    const data = await res.json();
    for (const doc of data.documents || []) docs.push(fromFirestoreFields(doc.fields || {}));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return docs;
}

async function getDocument(root, docPath) {
  const token = await getAccessToken(root);
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${docPath}`,
    { headers: { authorization: `Bearer ${token}` } }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore REST (${docPath}): HTTP ${res.status} ${await res.text()}`);
  const data = await res.json();
  return fromFirestoreFields(data.fields || {});
}

export async function readFirestoreData(root) {
  const [products, settings] = await Promise.all([
    listDocuments(root, 'products'),
    getDocument(root, 'settings/main'),
  ]);
  return { products, settings };
}
