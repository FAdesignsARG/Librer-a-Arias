/**
 * Conexión a Firestore desde el servidor (Node), con permisos totales vía
 * la clave de servicio — la usan scripts/build.js y los scripts de
 * migración. Nunca se importa desde código que corre en el navegador.
 *
 * En local, la clave vive en un archivo (nombrado en `FIREBASE_SERVICE_ACCOUNT`,
 * gitignoreado). En Netlify no hay forma de subir ese archivo sin exponerlo
 * en el repo, así que ahí la clave completa va como variable de entorno
 * `FIREBASE_SERVICE_ACCOUNT_JSON` (el JSON pegado tal cual). Se prueba esa
 * primero porque es la que existe en CI; en local no está seteada y cae al
 * archivo. `server.js` ya carga el `.env` a `process.env` antes de que esto
 * se use, así que acá alcanza con leer las variables.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let dbInstance = null;

async function loadServiceAccount(root) {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      return JSON.parse(json);
    } catch (err) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON no es un JSON válido: ${err.message}`);
    }
  }

  const file = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!file) {
    throw new Error(
      'Falta FIREBASE_SERVICE_ACCOUNT (local) o FIREBASE_SERVICE_ACCOUNT_JSON (Netlify) en las variables de entorno.'
    );
  }

  const keyPath = path.join(root, file);
  try {
    return JSON.parse(await fs.readFile(keyPath, 'utf8'));
  } catch (err) {
    throw new Error(`No pude leer la clave de servicio en ${keyPath}: ${err.message}`);
  }
}

export async function getDb(root) {
  if (dbInstance) return dbInstance;

  const serviceAccount = await loadServiceAccount(root);

  // getApps() evita reinicializar si algo más ya llamó a esto en el mismo proceso
  const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount) });
  dbInstance = getFirestore(app);
  return dbInstance;
}
