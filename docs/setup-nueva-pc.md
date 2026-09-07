# Instalar el proyecto en una PC nueva

Guía para seguir trabajando en Librería Arias desde otra computadora, con el código y (opcionalmente) el mismo contexto de Claude Code.

## 1. Instalar en la PC nueva

- **Node.js** (versión 24): [nodejs.org](https://nodejs.org)
- **Git**: [git-scm.com](https://git-scm.com)
- **Claude Code**: `npm install -g @anthropic-ai/claude-code` (o desde [claude.com/code](https://claude.com/code))
- **Netlify CLI** (si vas a seguir deployando desde ahí): `npm install -g netlify-cli`, después `netlify login` — es una sesión nueva, no viaja desde la PC vieja.

## 2. Traer el código

```bash
git clone https://github.com/FAdesignsARG/Librer-a-Arias.git catalogo-arias
cd catalogo-arias
git checkout preview
npm install
```

## 3. Lo que NO viaja por git (a propósito, por seguridad) — llevalo por otro medio

Dos archivos, ambos en la raíz del proyecto, ambos gitignoreados:

### `.env`

```env
# Copiá este archivo como  .env  y completá lo que falte.
# El .env NO se sube a git ni se publica: las claves viven sólo en el servidor.
#
# La clave se saca gratis en https://console.groq.com/keys
GROQ_API_KEY=

# Nombre del archivo de la clave de servicio de Firebase (Project settings →
# Service accounts → Generate new private key). El archivo va en la raíz del
# proyecto, junto a este .env — nunca se sube, está en .gitignore por patrón.
FIREBASE_SERVICE_ACCOUNT=libreria-arias-firebase-adminsdk-fbsvc-c576768993.json

# Cloudinary: cloud name y preset NO van acá — no son secretos (viven en
# src/cloudinary-config.js, committeado, igual que la config de Firebase).
```

Sólo hace falta completar `GROQ_API_KEY` (la misma que ya tenés, o una nueva gratis en console.groq.com/keys).

### `libreria-arias-firebase-adminsdk-fbsvc-c576768993.json`

La clave de servicio de Firebase. Copiala vos mismo (pendrive, gestor de contraseñas) o volvé a generarla desde Firebase Console → Project settings → Service accounts → Generate new private key. Nunca se manda por chat ni por ningún otro medio automático.

## 4. Probar que funciona

```bash
npm run dev
```

Abre en `http://localhost:4321` — catálogo y `/admin` andando en local, con IA activa si pusiste la clave.

## 5. Para tener "la misma dinámica" con el asistente

- **Esta conversación puntual no se puede mover** a otra PC — Claude Code no sincroniza sesiones entre máquinas. Eso es normal, no hay forma de evitarlo.
- **Lo que sí se puede llevar** es la "memoria" del proyecto (decisiones de diseño, bugs ya resueltos, el vínculo con Future Ahead, etc.) — vive en tu perfil de Windows, no en el repo:

  ```
  C:\Users\franc\.claude\projects\D--Descargas-future-ahead-crm\memory\
  ```

  Si copiás esa carpeta entera al mismo path (con tu mismo usuario de Windows) en la PC nueva, un Claude Code nuevo arranca ya al tanto del proyecto. Sin eso, arranca en blanco, pero se pone al día rápido solo con leer el código y `docs/roadmap-mejoras.md` (ese sí viaja solo, ya está en git).

- Detalle estructural: en estas sesiones Claude Code arranca desde `D:\Descargas\future-ahead-crm`, aunque el trabajo real pasa en la carpeta hermana `catalogo-arias`. Para que la memoria copiada "calce", conviene mantener esa misma carpeta al lado en la PC nueva. Si no la tenés a mano, no es grave — arrancá Claude Code directo desde `catalogo-arias` y listo, sólo que sin la memoria vieja hasta que la copies.

Con el código + `docs/roadmap-mejoras.md` (ambos en git) + los dos archivos de la sección 3, tenés el 90% de lo que hace falta. La memoria es un plus, no es bloqueante.
