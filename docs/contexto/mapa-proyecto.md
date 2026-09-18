# Mapa del proyecto

Lectura de código: 11/09/2026. Raíz de trabajo: `D:\Descargas\catalogo-arias`.
Este mapa orienta búsquedas; verificar las relaciones afectadas si el código cambió.

## Flujo principal

`Firestore → server.js → src/templates.js → HTML local + módulos del navegador`

`Firestore → scripts/build.js → dist/ → Netlify`

`Panel /admin → Firebase Auth → Firestore → reconstrucción del sitio cuando está configurada`

- Firestore contiene `products` y `settings/main`: es la fuente de verdad.
- En desarrollo, `server.js` lee mediante `src/firestore-rest.js` y mantiene caché breve.
- Las rutas `/data/products.json` y `/data/settings.json` se generan desde Firestore durante desarrollo.
- El build usa `src/firebase-admin.js`, genera páginas y snapshots JSON dentro de `dist/`.
- `data/*.json` en la raíz corresponde a la etapa anterior; no está sincronizado automáticamente.
- El sitio publicado es estático; las funciones de Netlify atienden APIs específicas.

## Dónde buscar cada cambio

| Área | Archivos de entrada | Consecuencia a revisar |
| --- | --- | --- |
| Servidor local y rutas | `server.js`, `src/firestore-rest.js` | Lectura de datos, HTML, endpoints y respuestas |
| Compilación | `scripts/build.js`, `src/firebase-admin.js`, `netlify.toml` | Páginas, assets, snapshots, redirecciones y publicación |
| HTML compartido | `src/templates.js` | Home, rubros, producto, tarjetas y panel que importa utilidades |
| Catálogo interactivo | `src/app.js` | Búsqueda, filtros, carrito, promociones y WhatsApp |
| Búsqueda/recomendación | `src/search-engine.js`, `src/recommend.js` | Catálogo, asistente, API de IA y panel |
| UI común | `src/ui.js` | Diálogos, foco, cierre e interacción táctil |
| Estilo principal | `src/styles.css`, `src/styles-parts.css` | Tokens, componentes, vistas y tamaños |
| Temas | `src/theme.css`, `src/theme.js` | Claro/oscuro y preferencias |
| Asistente | `src/assistant.js`, `src/assistant.css` | Consulta pública, mensajes y controles |
| Avisos y marketing | `src/notify.css`, `src/page-control.js`, `src/page-control.css` | Notificaciones y configuración remota de bloques |
| IA de servidor | `src/ai.js`, `src/ai-api.js`, `netlify/functions/ai-*.js` | Proveedor opcional y equivalencia local/publicada |
| Panel | `src/admin/admin.html`, `src/admin/admin.js`, `src/admin/admin.css` | Login, edición, stock, promociones, configuración y publicación |
| Firebase navegador | `src/firebase-client.js`, `src/firebase-config.js`, `firestore.rules` | Auth y permisos de lectura/escritura |
| Imágenes | `src/cloudinary-config.js`, `assets/brand/`, logos originales | URLs, tamaños, formatos y recursos de identidad |
| Base44 | `src/base44-client.js`, `src/page-control.js`, `src/analytics.js` | Marketing y analítica; no reemplaza Firestore como catálogo |
| SEO | `src/sitemap.js`, `src/templates.js`, `scripts/build.js` | Metadatos, sitemap, robots y URLs |

## Dependencias que conviene reutilizar
- `src/templates.js`: `money`, `cardHtml`, `offerActive`, `offerHasDiscount`, `dateFmt`, `categorySlug`, `esc`.
- `src/app.js`, `src/assistant.js`, `src/ai-api.js` y `src/admin/admin.js` comparten utilidades de búsqueda o plantillas.
- Cambiar precios, ofertas o tarjetas exige revisar sus consumidores; evitar reimplementar esas reglas por vista.
- Orden de CSS público en las plantillas: `styles.css`, `styles-parts.css`, `theme.css`, `assistant.css`, `notify.css`, `page-control.css`.
- La configuración de Base44 actúa sobre la UI existente; revisar IDs y estructura antes de cambiar secciones.
- `docs/base44-integracion/` documenta esa integración y sus contratos.

## Lecturas de diseño y memoria
- `AGENTS.md`: instrucciones de inicio y preferencias.
- `token-design-optimizer.md`: procedimiento operativo.
- `DESIGN.md`: síntesis visual de uso frecuente.
- `docs/design-system/`: módulos detallados del sistema visual.
- `docs/design-system.md`: manual heredado; conservar su detalle y distinguir sus reglas de propuestas nuevas.
- `docs/referencias-diseno/README.md`: índice para selección progresiva de VoltAgent.
- `.agents/skills/design-loop/SKILL.md`: procedimiento de evaluación independiente.
- `.agents/skills/design-mobile-arias/SKILL.md`: capa mobile (flotante único, vidrio acotado, animaciones); copia local en `.claude/skills/`.
- `docs/metodologia/README.md`: documento metodológico original y trazabilidad de la adaptación.
- `docs/setup-estado-pc.md`: comprobación histórica del entorno, con fecha explícita.
- `README.md` puede contener decisiones antiguas: contrastar arquitectura contra el código actual.

## Comprobaciones disponibles
- `npm run dev`: servidor de desarrollo; usa certificados del sistema y lectura real de Firestore.
- `npm run build`: generación estática desde Firestore; requiere entorno y conectividad apropiados.
- `scripts/test-search.js`: muestra consultas contra `data/products.json` de la raíz; no prueba por sí solo el catálogo actual ni tiene cobertura completa.
- Para cambios visuales: render e interacción en tamaños y estados relevantes; para movimiento, observar reproducción y reducción de movimiento.
- Las credenciales y valores de `.env` no forman parte de este mapa ni se deben volcar en documentación.
