/**
 * Cliente compartido de Base44.
 *
 * Una sola definición del appId y una sola carga del SDK, que reusan:
 *   - src/analytics.js       — envía métricas de uso del catálogo
 *   - src/page-control.js     — lee configuración remota de la página
 *
 * Antes cada uno traía su propia copia del appId y su propio import del
 * SDK; esto lo unifica (una sola fuente).
 *
 * SEGURIDAD: acá NO hay tokens ni claves. El SDK habla con la app pública
 * de Base44 identificándose sólo por su appId — exactamente como ya lo
 * hacía analytics.js desde siempre. Toda escritura real en Base44 pasa
 * por su propio panel con usuario autenticado, nunca desde acá.
 */

const ARIAS_APP_ID = '6a7e432be6e59ad993e40158';
const SDK_URL = 'https://esm.sh/@base44/sdk@0.8.41?bundle';

let clientPromise = null;

/**
 * Devuelve el cliente de Base44, memoizado (se crea una sola vez).
 * Si el SDK no carga —sin red, la CDN caída, un navegador viejo— resuelve
 * a `null`: quien llama tiene que seguir funcionando igual, la web nunca
 * depende de que esto ande.
 */
export function getBase44() {
  if (clientPromise) return clientPromise;
  clientPromise = import(SDK_URL)
    .then(({ createClient }) => createClient({ appId: ARIAS_APP_ID }))
    .catch(() => null);
  return clientPromise;
}

export { ARIAS_APP_ID };
