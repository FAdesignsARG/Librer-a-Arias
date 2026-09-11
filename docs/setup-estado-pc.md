# Estado del setup en esta PC

Verificación: 10/9/2026. Carpeta de trabajo acordada: `D:\Descargas\catalogo-arias`.

## Trabajo local comprobado

- Node.js 24.15.0, npm 12.0.1 y Git 2.34.0 instalados.
- Dependencias instaladas y consistentes: firebase 12.17.1, firebase-admin 14.2.0, sharp 0.34.5.
- Conversión de una imagen de prueba a WebP correcta, en memoria.
- Credencial de servicio de Firebase presente y autenticación real comprobada leyendo Firestore.
- Catálogo local: http://localhost:4321. Lectura de 486 productos visibles al momento de la prueba.
- La portada y una ficha de producto respondieron HTTP 200. El catálogo se abrió en el navegador y mostró los productos.
- Panel: http://localhost:4321/admin. Pantalla de ingreso comprobada; no se inició sesión ni se probaron escrituras.
- Compilación local finalizada: 486 fichas y 6 páginas de rubro, salida en `dist/` (12,1 MB). Esta prueba no publicó el sitio.

## Ajuste aplicado

En `package.json`, el comando build pasó a `node --use-system-ca scripts/build.js`, usando los certificados de Windows igual que el comando dev. Antes fallaba la lectura de Firestore con el error de verificación de certificado; después del cambio `npm run build` terminó correctamente. Se mantuvo la validación TLS.

## Pendientes según el uso

- `GROQ_API_KEY` está vacía; `/api/ai/status` respondió `enabled: false`. La IA del catálogo y del panel no está habilitada en esta PC. Fran pidió evaluar una alternativa gratuita más capaz antes de activarla; aún no se eligió ni cambió el proveedor.
- `BUILD_HOOK_URL` no está configurada. Hace falta para disparar una reconstrucción en Netlify desde el panel local; no para desarrollar ni compilar en esta PC.
- Los comandos Claude Code y Netlify CLI no están disponibles en PATH. Son opcionales según la herramienta de desarrollo y el método de publicación que se elijan.
- No se comprobó acceso de escritura a GitHub, inicio de sesión de Netlify, acceso autenticado al panel ni subida de imágenes a Cloudinary.

## Contexto de esta verificación

El repositorio estaba en `preview` y tenía cambios de desarrollo preexistentes/en curso. Esta tarea modificó solamente el comando build de `package.json`, regeneró `dist/` y agregó este informe. No se hicieron commits ni despliegues.

El servidor local necesita conexión a Internet para leer Firestore. La primera prueba desde el entorno restringido del agente devolvió EACCES; repetir con acceso a red funcionó correctamente.
