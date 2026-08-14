/**
 * Conexión a Firebase desde el navegador.
 *
 * Este proyecto no tiene bundler: los .js se sirven tal cual, sin webpack
 * ni Vite. El paquete `firebase` de npm usa especificadores como
 * `import ... from 'firebase/app'`, que sólo resuelven con un bundler o en
 * Node — un navegador no sabe qué es "firebase/app" sin una URL real.
 *
 * La solución oficial de Firebase para sitios sin bundler es importar
 * directo desde su CDN (gstatic), que publica el mismo SDK modular como
 * URLs reales. Cero herramientas nuevas, mismo patrón "script type=module"
 * que ya usa el resto del sitio.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';

import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
};
