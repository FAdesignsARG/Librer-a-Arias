# Handoff — web-app de Librería Arias (rama `preview`)

Actualizado: 22/09/2026. Leer esto primero al retomar en un chat nuevo;

## NOVEDADES DEL 22/09/2026 (tarde) — bridge 2026-09-22.3 con datos reales
- El auxiliar ya trae contenido: 563 productos resueltos, 8 grupos de alias globales,
  4 relaciones reales y, por producto, `visible` + `visible_web` + `estado_publicacion`.
- **La lógica de visibilidad quedó activa.** Ojo con esto: el payload manda los tres
  campos a la vez, así que **cualquiera que diga ocultar gana**. Tomar el primer
  booleano que aparece era un error (apagar `visible_web` no hacía nada) y ya está
  corregido en `webVisibility()`. "Pendiente", "Publicando" y "Error" NO despublican.
- **Los alias también van al asistente** (`/api/ai/ask`): pide el auxiliar en paralelo
  con el catálogo, con caché de 5 min. Sólo para encontrar, nunca para nombrar: al
  modelo no le llegan los alias.
- `applyAuxiliar()` es compartida entre el build y el asistente (una sola regla).
## NOVEDADES DEL 22/09/2026 — capa auxiliar de Base44 (leer antes que todo lo de abajo)
- **`catalogo_auxiliar` integrado en el build.** Bridge `2026-09-21.2` verificado hoy.
  `src/base44-auxiliar.js` (nuevo) baja la capa por HTTP en cada build y enriquece los
  productos de Firestore **por `slug`**: alias de búsqueda, etiqueta comercial,
  destacados, visibilidad web y relacionados curados.
- **La arquitectura NO cambió y no se negocia**: `products.json` + `/p/<slug>/` siguen
  siendo la fuente del catálogo público (SEO, vista previa de WhatsApp, JSON-LD).
  Base44 enriquece, nunca reemplaza. Si el bridge no contesta, el build sale igual.
- **`data/products.json` ahora tiene SÓLO los productos públicos** (antes traía también
  los ocultos). Lo pidió Rodri porque el centro de salud de Base44 lo compara contra sus
  productos habilitados. Medido: 581 en json = 581 páginas = 581 URLs del sitemap.
- **Falta de parte de Rodri**: `catalogo_auxiliar.productos` no trae visibilidad ni
  estado de publicación, así que los puntos 4 y 5 de su mensaje (ocultar desde Base44)
  todavía no se pueden usar. El código ya lo acepta en cuanto lo mande — el criterio y
  los nombres de campo aceptados están en `RESUMEN-PARA-RODRI.md` (arriba de todo).
- Probado con datos simulados (`BASE44_AUX_URL` apunta el build a un bridge de prueba):
  alias globales, alias por producto, etiqueta, destacado, ocultar y relacionados
  agrupados. Falta probarlo con datos reales cuando Rodri los cargue.
- Sin tocar: eventos y sus nombres, códigos `LAWEB-*`, regla del carrito modificado,
  `configuracion_pagina` y `/api/rebuild` (que ya cumplía lo pedido).

### Publicado en producción (22/09/2026)
`origin/main` = `c852dfe`. Respaldo: etiqueta `prod-antes-20260922`. Push por git (no por
CLI). Verificado en https://libreria-arias.netlify.app: home, catálogo y ficha 200;
`products.json` 581 sin ocultos adentro; sitemap 581 URLs de `/p/`;
`data/search-aliases.json` 200 (hoy `[]`); `/api/ai/status` → `{"enabled":true}`;
canonical y JSON-LD intactos; el buscador devuelve 26 resultados para "cafetera".
El único error de consola es el SDK de Base44 pidiendo `entities/User/me` (403 en una
visita anónima): es de siempre y no afecta nada.

## NOVEDADES DEL 20–21/09/2026 (leer antes que lo de abajo)
- **Se trabaja directo en `main`** (pedido de Fran). Etiquetar antes de cada push; último respaldo `prod-antes-20260920c`.
- **NUNCA publicar a producción con `netlify deploy --prod --no-build`**: en los deploys por CLI las rutas `/api/*` dan 404 (las funciones quedan, los redireccionamientos no). Pasó el 20/09 y dejó caídos el asistente y la IA del panel. El alias `diseno` tiene el mismo problema: sirve para mirar diseño, no para probar `/api`. Producción sólo por `git push origin main`, y verificar `/api/ai/status` después.
- **Cuota de Firestore**: cada carga del servidor local, cada build y cada apertura del panel leen los 565 productos. El 20/09 se agotó la cuota gratuita diaria (builds y panel caídos hasta ~04:00 AR). El servidor local ahora cachea 5 min; para medir diseño usar `dist/` estático en :4322 (`tmp/serve-dist.mjs`).
- Hecho: filtros del catálogo en celular en **2×2** (elegidos por Fran), texto de "Pedido" legible sobre amarillo, panel: stock/visibilidad/orden republican el sitio, Base44 verificado (bridge `2026-09-20.1`, todo 201, CORS de `diseno` OK).
- Pendiente: probar el panel con sesión (Fran entra; no se crean cuentas ni se escriben contraseñas), ponerle sesión a `/api/rebuild` (hoy abierto), prueba punta a punta del pedido con Rodri, ronda 3 de críticos, limpieza de CSS.

## ESTADO AL 20/09/2026 — EMPEZAR POR ACÁ
**Antes de nada, cargar la skill `libreria-arias-control`** (`.claude/skills/`): tiene el
criterio de diseño, movimiento, marca, referencias y flujo de trabajo que Fran aprobó.

**Qué hay en producción** (https://libreria-arias.netlify.app, `origin/main` = `dd87859`):
home v2 con barra lateral, isla del buscador que vuela en los dos sentidos (aprobada:
"AHORA SI! PERFECTO!!"), banners con flechas de vidrio, "Elegidos" rotando, catálogo y
rubros aparte en tandas de 48, Mi pedido v2, Novedades v2, botón flotante de pedido,
ficha v3 (con la isla y la compra integrada), evento "Producto compartido", y el
**panel de administración v2** (capa de diseño + desplegables propios `select.js`).
565 productos. `BUILD_HOOK_URL` cargada: el panel vuelve a publicar solo.
Respaldo para volver atrás: etiquetas `prod-antes-20260919` y `prod-antes-20260920`.
`preview` va 2 commits adelante de `main`, sólo de documentación.

**Cómo se trabaja**: todo en `preview` → `npm run build` → deploy al alias `diseno`
(https://diseno--libreria-arias.netlify.app) → Fran mira → con su OK explícito,
`git tag` de respaldo + `git push origin preview:main` (Netlify construye solo).

**Pendientes, en orden sugerido**
1. **Panel v2 con datos reales**: nadie lo vio con sesión iniciada (no se pueden escribir
   contraseñas). Pedirle a Fran/Adolfo que entren y manden capturas de lo raro: lista,
   filtros (también en celular), editor con el desplegable de rubro, guardar un cambio y
   ver que publica, carga masiva, asistente de stock, reportes, tutorial.
   Queda nativo el selector de fecha/hora de "Válida hasta" (decidir si se arma uno propio).
   Fran pidió que el panel quede "perfectamente conectado": falta definir qué es (propuesta:
   estado de publicación visible, ver/compartir la ficha desde cada fila).
2. **Base44 (Rodri)**: medido el 20/09, el bridge publicado sigue siendo `2026-09-15.2`
   (él dice haber publicado `2026-09-19.2`): "Producto compartido" → 422, CORS de
   `diseno--` → 403, y también "Impresión de tarjeta" y "Consulta por WhatsApp" → 422 en la
   prueba directa. La web no tiene nada pendiente. Cuando Rodri avise, repetir la medición
   (está el procedimiento y el mensaje en `docs/base44-integracion/RESUMEN-PARA-RODRI.md`,
   arriba de todo) y después la prueba punta a punta web → eventos → Base44 → pedido → WhatsApp.
3. **Decisiones abiertas de Fran**: filtros del catálogo en celular (hoy de a uno por fila:
   no entra ningún producto entero en la primera pantalla; recomendación: grilla 2x2 de 48px);
   qué mejorar de la vista previa al compartir; tarjeta de horarios en amarillo pleno; isla en
   tema claro; si los flotantes esperan al scroll en la ficha en celular (tapan el precio web al entrar).
4. **Ronda 3 de críticos** (`criticos-arias`) sobre lo que nunca pasó por críticos: Mi pedido v2,
   Novedades v2, botón de pedido, ficha v3 y panel. Rondas 1 y 2 en
   `work/design-loop/home-v2-20260918/`.
5. **Limpieza técnica**: CSS muerto (`.stickycta`, `.psearch`, barra vieja de la ficha,
   `.attn__*`, `.home-scene`, `.sortbtn`, puntitos del banner) y consolidar `glass.css`
   (una capa por ronda) y `admin.css`. Sin cambios a la vista.
6. Más adelante (pedido de Fran): favoritos por sesión, reseñas con estrellas, más fotos por producto.

**Trampas que ya costaron caro** (detalle en la skill, `references/movimiento.md` y
`flujo-de-trabajo.md`): el panel de pruebas no genera cuadros ni dispara scroll /
ResizeObserver / IntersectionObserver (medir por DOM, despachar eventos a mano y decirle a
Fran qué mirar en el deploy); cargar la página DESPUÉS de fijar el tamaño; los heredocs de
bash se rompen con backticks (escribir los parches de Node con la herramienta de archivos);
una regla general con varios `:not()` gana por especificidad (ya pisó el login del panel).

---
## Historia (rondas del 15 al 19/09)

después `estado-actual.md` (bitácora completa) y `DESIGN.md` (sección
"Decisiones del 17/09/2026", que manda sobre las reglas viejas).

## Dónde estamos
- **El objetivo cambió el 18/09/2026.** Fran comparó `main` con `preview` y dio
  una dirección nueva: leer `work/design-loop/home-v2-20260918/brief.md`
  (pedidos textuales, decisiones delegadas y rondas A–E). Manda sobre el brief
  del hero del 15/09.
- Rama `preview`. Publicado en https://diseno--libreria-arias.netlify.app
  (alias `diseno`, NO producción).
- Deploy: `npm run build` y luego
  `TEMP="D:\tmp" TMP="D:\tmp" netlify deploy --no-build --dir=dist --alias=diseno`
  (el TEMP en D: es porque C: se queda sin espacio).
- Si sólo cambió CSS/JS de `src/`, alcanza con copiar a `dist/src/` y
  deployar; si cambió `templates.js`, hay que reconstruir.
- Servidor local de `dist/` en http://localhost:4322/.

## Rondas de la home v2 (brief del 18/09)
| Ronda | Tema | Estado |
|---|---|---|
| A | Marca al frente (logo + wordmark con lema), fuera tarjetas flotantes, banner pegado al hero, vuelven los flotantes de WhatsApp e IA | **Hecha** — falta pasarla por críticos |
| B | Carrusel "Elegidos" que rota cada 5 min con transición de vidrio | **Hecha** — mirar la animación en el deploy (el panel de pruebas no genera cuadros) |
| C | Filtros en una fila de pastillas (C1); catálogo en /catalogo/ y home con 50 destacados, sin tocar el contrato de Base44 (C2) | **Hecha** (incluidas las páginas de rubro `/c/<rubro>/`) |
| D | Barra lateral en desktop / isla en mobile (shop.app) | **Hecha** (sin ícono de favoritos hasta que exista la función) |
| E | Transición del buscador tipo Airbnb, de arriba hacia abajo en vidrio | **Hecha** — mirar la suavidad en el deploy / teléfono real |
| + | Compartir productos con vista previa (WhatsApp primero) y mobile más grande: flotantes, chat y tarjetas | **Hecha** — falta probar la vista previa real en WhatsApp con una URL pública |
| + | Filtros en pastillas con desplegable, flotantes con Adolfito, ficha de producto estilo shop.app y splash que aterriza en la home | **Hecha** — mirar splash y animaciones en el deploy; "Calificación" espera a que existan reseñas |
| — | Favoritos por sesión | Más adelante (Fran: "no ahora") |
| — | Reseñas con estrellas (requiere registro) y filtro Calificación | Más adelante (Fran) |

## 19/09/2026 — dónde quedó
- `preview` ya contiene `main` (merge `a2a0831`): lo de producción del 18/09 está adentro.
- Encima: arreglo del vuelo del buscador, cabecera de "Elegidos", flechas de
  vidrio + arrastre en banners, isla como un solo componente (celular y desktop),
  choques de la barra lateral, enlace compartido sin splash ni cartel de tema.
  Detalle en `estado-actual.md` ("main dentro de preview…").
- **Fran tiene que mirar en el deploy**: vuelo del buscador (ida y vuelta), isla
  abierta/cerrada en el teléfono, flechas y arrastre de banners.
- Pendiente de la revisión de Fran: "la vista previa al compartir habría que
  mejorarla un poco" (no dijo qué: preguntar o proponer).
- Críticos ronda 2 (19/09): los tres FAIL, corregidos 15 puntos; ver
  `work/design-loop/home-v2-20260918/criticos-ronda2.md`. Falta la ronda 3 sobre
  la versión corregida y **la decisión de Fran sobre los filtros en celular**
  (de a uno por fila vs 2x2: hoy no entra ningún producto entero en la primera
  pantalla del catálogo a 375).

## 19/09/2026 (tarde) — vuelo de ida, carrito, novedades, botón de pedido
- Hecho y publicado en `diseno`: vuelo del buscador hacia abajo (espejo de la
  vuelta), Mi pedido v2, Novedades v2 y `#cartFloat` en desktop. Detalle en
  `estado-actual.md`.
- **Fran tiene que mirar**: el vuelo de ida, el carrito (agregar, cambiar
  cantidades, quitar, vaciar, sugerencias) en teléfono y PC, novedades, y el
  botón flotante de pedido al ir sumando productos.
- Nada de esto pasó por críticos todavía (ronda 3 pendiente, junto con la
  decisión de los filtros en celular).

## 19/09/2026 (noche) — ficha v3
- Las fichas usan la isla, el menú nuevo y la barra lateral; la barra fija de
  "Agregar" vive dentro de la isla (`#islandBuy`). Detalle en `estado-actual.md`.
- **Fran tiene que mirar** una ficha en teléfono y PC: cabecera, vuelo de la
  isla, fila de compra al bajar, "lo que tenés que saber", atajos de relacionados.
- Limpieza pendiente: CSS muerto de `.stickycta`, `.psearch` y de la barra de
  arriba de la ficha (`.page-product .nav …`).

## 19/09/2026 (noche) — EN PRODUCCIÓN
- `main` = `preview` = `66314d5`+; producción tiene todo lo del 18–19/09. Etiqueta de
  respaldo: `prod-antes-20260919`. `BUILD_HOOK_URL` cargada (el panel reconstruye solo).
- Esperan a Rodri: aceptar el tipo "Producto compartido" (hoy 422) y el CORS de
  `diseno--` (hoy 403). Después, prueba punta a punta.
- Siguen abiertos: filtros del catálogo en celular, ronda 3 de críticos, limpieza de CSS muerto.

## Panel de administración v2
- **En producción desde el 20/09/2026** (`dd87859`; respaldo `prod-antes-20260920`): fases 1 y 2 (capa de diseño + `select.js`) y arreglo del login.
- Para seguir: que Fran inicie sesión en el panel del navegador (no escribir
  contraseñas) y revisar pantalla por pantalla con datos reales. Skill:
  `libreria-arias-control` (patrón 13).

## Rondas anteriores
| Ronda | Tema | Estado |
|---|---|---|
| 1-2 | Promo única 10%, íconos SF, limpieza | Hecha |
| 3 | Sistema de vidrio (`src/glass.css`) | Hecha |
| 4 | Isla que respira con el scroll | Hecha — **falta probar en teléfono real** |
| 5 / 7 | Comparación directa con shop.app | Hecha (las tarjetas flotantes del hero se sacaron en la Ronda A) |
| Críticos v8–v10 | Última medición completa (v9): calidad PASS 9/9, objetivo FAIL, sistema FAIL. Sobre la v10 sólo llegó calidad: PASS 8/9; objetivo y sistema murieron por límite de uso | Corregido lo señalado; la vara cambia con el brief nuevo |
| 6 | Banners como imagen sola, alternando cada 10 s; verticales en celular | **Hecha** (`scripts/build_banners.cjs`; los PNG originales no se versionan) |

## Pendientes concretos (en el orden en que conviene hacerlos)
1. **Fran tiene que mirar en el deploy** lo que el panel de pruebas no deja
   juzgar (no genera cuadros): splash de entrada (pestaña nueva o incógnito),
   rotación de "Elegidos para vos" (cada 5 min), fundido de los banners (10 s),
   vuelo de la isla del buscador al hacer scroll, y **la vista previa real al
   compartir un producto por WhatsApp** (mandarse un enlace de `diseno--…`).
2. ~~Ronda D~~ hecha el 18/09 (barra lateral en desktop).
3. ~~Ronda E~~ hecha el 18/09 (el buscador viaja de arriba hacia abajo y vuelve).
4. ~~Páginas `/c/<rubro>/`~~ hechas el 18/09 (mismo diseño que `/catalogo/`, productos en el HTML).
5. Vara v3 escrita: `work/design-loop/home-v2-20260918/bar.md` (home, catálogo, ficha y toda la app).
   Falta **correr `criticos-arias`** contra ella: nada de lo hecho el 18/09 pasó por críticos.
6. Limpieza: CSS muerto de `.attn__*`, `.home-scene`, `.sortbtn` y chips viejos;
   `assets/brand/banner-canal.webp`, `assets/promos/adolfito-cupon-descuento.webp`
   y `wordmark-*-logo.webp` sin uso; `glass.css` creció con una capa por ronda y
   conviene consolidarlo cuando el diseño se estabilice.
7. Esperan a Rodri (ver "LEER PRIMERO" en `docs/base44-integracion/RESUMEN-PARA-RODRI.md`):
   CORS del dominio `diseno--…`, texto del aviso en una línea, 10-15 destacados,
   y el OK para mandar el evento `Producto compartido` (la web ya emite
   `arias:share` en `window`; falta conectarlo en `analytics.js`).
8. Decisiones abiertas de Fran: isla en tema claro (¿vidrio claro o siempre
   oscura?); cartel "CUPÓN DESCUENTO" en los banners (no existe cupón, el 10% es
   automático); tarjeta de horarios en amarillo pleno.
9. Más adelante (pedido por Fran, no ahora): favoritos por sesión; reseñas con
   estrellas (requiere registro) y, con ellas, el filtro "Calificación".
10. Hoy los 551 productos tienen una sola foto: la galería con miniaturas y el
    cambio animado de la ficha están listos pero no se ven hasta que se carguen más.
11. Nada de esto está en `main`. Pasar a producción requiere OK explícito de Fran.
    Los PNG originales de banners e ícono (`Banners de Adolfito/`, `Banners Mobile/`,
    `Iconito Chat/`) no se versionan; los WebP sí.

## Trampas del entorno de pruebas (no son defectos del sitio)
- El panel del navegador puede no generar cuadros: `requestAnimationFrame`
  no corre, los eventos de scroll no disparan, las animaciones quedan en
  `currentTime 0` (usar `document.getAnimations().forEach(a=>a.finish())`)
  y las capturas salen negras. Medir por DOM.
- A veces tiene `prefers-reduced-transparency` y `prefers-reduced-motion`
  activos: el sitio vuelve sólido el vidrio a propósito. Para verlo, borrar
  esa regla de `glass.css` desde la consola.
- Una pestaña recién creada está en blanco: `navigate` antes de `resize_window`.
- El carrito vive en `localStorage` y se comparte entre pestañas: limpiar
  antes y después de medir.
- No editar la página mientras los críticos miden: evalúan el localhost en vivo.
- Las secciones con `data-reveal` que no se revelaron quedan con `translate 0 14px`
  (sección + ítem = 28px): las distancias por `getBoundingClientRect` salen mal.
  Medir aire entre secciones con `offsetTop`/`offsetHeight`.
- No hay Python en esta máquina: los scripts de reemplazo van en Node.

## Cómo está armado el CSS
`glass.css` carga último y es donde viven las capas de corrección; `home.css`
está minificado por línea (editar con scripts de reemplazo exacto, no a mano);
los archivos usan CRLF (normalizar a LF para reemplazar y volver a CRLF).
