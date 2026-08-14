/**
 * Configuración pública de Firebase.
 *
 * A diferencia de GROQ_API_KEY o la clave de servicio, esto NO es secreto:
 * Firebase está diseñado para que este objeto viva en el código del
 * navegador (así lo entrega la propia consola de Firebase). Lo que protege
 * los datos son las reglas de seguridad de Firestore/Storage y el login,
 * no ocultar este archivo — por eso se puede commitear tranquilo.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyBt-b4uZChXva3Gy4CQNPbWjj9vjLchCvo',
  authDomain: 'libreria-arias.firebaseapp.com',
  projectId: 'libreria-arias',
  storageBucket: 'libreria-arias.firebasestorage.app',
  messagingSenderId: '730134074228',
  appId: '1:730134074228:web:e9ec44d737c3ba22955221',
};
