# Roadmap de Mejoras — Librería Arias

**Proyecto:** catalogo-arias · **Última actualización:** 2/9/2026 · **Estado general:** nada implementado todavía — el lanzamiento previsto ("el viernes" 28/8) ya venció.

Este documento es la fuente única de verdad del plan de mejoras. Cada Ronda es autocontenida: se pega su prompt en Claude Code, se corre hasta cumplir sus criterios de aceptación, se prueba, se commitea, y recién ahí se pasa a la siguiente. No se saltea el orden salvo que la tabla de dependencias lo permita explícitamente.

---

## 0. Por qué este documento existe

Como nada de lo pedido en el audio del 24-25/8 se llegó a implementar y la fecha comprometida ya pasó, el criterio para todo lo que sigue es **cero improvisación**: cada ronda está especificada al nivel de detalle necesario para que un agente la ejecute en un solo intento (*one-shot*), sin exploración innecesaria del repo (ahorra tokens) y sin dejar decisiones de diseño libradas al azar (ahorra retrabajo). Cuando el audio dejaba algo abierto, la decisión tomada queda documentada explícitamente — nada se resuelve "a criterio" sin que quede registrado por qué.

## 1. Glosario de negocio

| Término | Qué es |
|---|---|
| **Adolfo** | Papá de Fran, dueño de Librería Arias. Es la persona detrás de "que el asistente venda como Adolfo". |
| **Adolfito** | La mascota de la marca (el pajarito/grulla origami amarillo, ya presente en `assets/brand/mark-*.webp`). No es una persona — es el personaje que aparece en las piezas gráficas. |
| **Rodri / Gonza** | Equipo de marketing externo al código: arman campañas de Meta Ads, mandan artes gráficas, y consumen los datos de `src/analytics.js` en un dashboard propio (Base44). No tocan el repo. |
| **CHACHOS** | Moneda social/complementaria de La Rioja. Pagando con CHACHOS, la tienda da 10% OFF adicional. |
| **"Llevá más, pagá menos"** | Promoción vigente del local: descuento escalonado por monto de compra, sólo pagando en efectivo o transferencia (ver tabla abajo). No acumulable con otras promociones. |

**Tramos reales de la promo vigente** (fuente: pieza gráfica provista por el negocio, ya cargada en `assets/promos/promo-llevamas-pagamenos.png`):

| Monto de compra | Descuento |
|---|---|
| desde $50.000 | 5% |
| desde $100.000 | 10% |
| desde $150.000 | 15% |
| desde $200.000 | 20% |
| Pagando con CHACHOS | 10% adicional |

*Sólo efectivo o transferencia · descuentos no acumulables con otras promociones.*

## 2. Principios de ingeniería (aplican a todas las rondas)

Estos son los estándares mínimos que cualquier ronda tiene que cumplir. No hace falta repetirlos dentro de cada prompt — se referencian una vez acá y cada prompt de ronda asume que se leyeron.

- **Performance.** Presupuesto orientativo: LCP < 2.5s, CLS < 0.1, INP < 200ms en mobile de gama media. Nada de librerías nuevas para lo que ya se puede resolver con CSS/HTML nativo (scroll-snap en vez de un slider en JS, por ejemplo).
- **Accesibilidad.** WCAG 2.1 AA como piso: contraste de texto, roles/aria ya usados en el proyecto (`aria-haspopup`, `aria-pressed`, etc.), foco visible, y **respeto estricto a `prefers-reduced-motion: reduce`** en toda animación nueva.
- **Mobile-first.** Se diseña y se prueba primero en 375px de ancho, después se adapta a desktop — no al revés. Cada ronda que toque UI se valida en ambos tamaños y en los dos temas (claro/oscuro) antes de darse por terminada.
- **Renderizado consistente con el patrón existente.** El sitio es SSR-first (server.js/build.js generan HTML ya completo); cualquier dato que se pueda calcular en el servidor se calcula ahí, no en el navegador, para evitar *layout shift* y parpadeos.
- **Una sola fuente de verdad por pieza de UI.** `cardHtml`, `money`, `offerActive`, `offerHasDiscount` (todos en `src/templates.js`) son compartidos entre servidor y navegador — ninguna ronda duplica ese HTML a mano.
- **Firestore es producción viva.** Cualquier cambio de esquema es **aditivo y reversible** (agregar campos, nunca renombrar ni borrar sin migración explícita). Los scripts puntuales de una sola corrida se documentan como tales.
- **Scope cerrado por ronda.** Cada prompt lista explícitamente qué archivos toca y qué NO toca. Ver algo mejorable fuera de ese scope se anota como `// TODO:`, no se arregla de paso — eso es lo que evita que una ronda se coma el presupuesto de tokens de la siguiente.
- **Validación mínima antes de cerrar una ronda:** `npm run dev` y `npm run build` sin errores, prueba visual mobile + desktop + tema claro/oscuro + `prefers-reduced-motion`, y un commit atómico con mensaje descriptivo de esa ronda únicamente.

## 3. Mapa del roadmap

| Fase | Ronda | Objetivo | Depende de | Prioridad |
|---|---|---|---|---|
| 1 · Promociones (urgente) | 1 | Motor de promos + banner + carrusel diario | — | 🔴 Alta |
| 1 · Promociones (urgente) | 2 | Promos en el asistente de IA + pop-up antes de WhatsApp | Ronda 1 | 🔴 Alta |
| 1 · Promociones (urgente) | 3 | Descuento real calculado sobre el total del pedido | Ronda 1 | 🟠 Media |
| 2 · Terminado premium | 4 | Pulido visual/motion global estilo Apple / Rappi | Rondas 1-3 | 🟠 Media |
| 3 · Conversión y ventas | 5 | Ficha de producto: urgencia, prueba social, cross-sell inteligente | — | 🟠 Media |
| 3 · Conversión y ventas | 6 | Asistente con personalidad de vendedor ("modo Adolfo") | Ronda 2 | 🟠 Media |
| 4 · Datos y confianza | 7 | "Más pedido" real, alimentado por analytics (Base44) | — | 🟡 Baja |
| 4 · Datos y confianza | 8 | Fricciones de compra: cantidad, zoom de foto, recordatorio de carrito | — | 🟡 Baja |
| 4 · Datos y confianza | 9 | SEO por rubro: páginas de categoría indexables | — | 🟡 Baja |
| 4 · Datos y confianza | 10 | Señales de confianza: garantías, devoluciones, testimonios | — | 🟡 Baja |

Las Rondas 1 a 4 tienen el prompt completo listo para pegar en Claude Code (secciones 4 a 7). Las Rondas 5 a 10 están especificadas a nivel objetivo/alcance/criterio de aceptación — el prompt hiperdetallado de cada una se termina de redactar justo antes de ejecutarla, tomando como base el estado real del código en ese momento (así no se arma en el aire un prompt "exacto" contra archivos que todavía van a cambiar en el camino — es la misma lógica de planificación incremental que ya usa este roadmap).

---

## 4. Ronda 1 — Motor de promociones, sección "Ofertas" y carrusel diario

**Objetivo:** el dato de las promos por medio de pago, una sección "Ofertas" en el catálogo público, un banner de atención en el home, y un carrusel de 5 productos que cambia una vez por día.

**No incluye (a propósito):** asistente de IA, pop-up de WhatsApp, cálculo real del descuento sobre el total, panel de admin. Son las Rondas 2, 2, 3 y — nunca, en esta fase — respectivamente.

```
# Ronda 1 — Motor de promociones, sección "Ofertas" y carrusel diario "Elegidos para vos"

## Contexto (no re-audites el repo, ya está mapeado)
Catálogo de Librería Arias: Node sin bundler, HTML server-rendered (scripts/build.js +
server.js), Firestore como fuente de verdad, Cloudinary para fotos. Cambios quirúrgicos
sobre los archivos listados abajo — no reestructures nada que no se pida acá.

Ya existen y NO hay que reinventar:
- src/templates.js: `renderHome`, `renderProduct`, `cardHtml`, `money`, `offerActive`,
  `offerHasDiscount`, `esc`, `ico` — se comparten entre servidor y navegador. Cualquier
  HTML de tarjeta de producto nuevo usa `cardHtml`, nunca duplica el markup.
- src/app.js: maneja `activeCat`, `render()`, los chips de rubro, el buscador y el pedido
  por WhatsApp.
- src/search-engine.js: buscador semántico — no lo toques en esta ronda.
- data/settings.json (generado desde Firestore `settings/main`): storeName, whatsapp,
  categories, hours, social, etc.
- Ya están en `assets/promos/`: `promo-llevamas-pagamenos.png` (placa con los tramos de
  descuento) y `adolfito-cupon-descuento.png` (mascota con un cupón). Son artes de
  referencia reales del negocio — optimizalas vos (paso 2), no las reemplaces.

## Objetivo de esta ronda (y qué queda para después, a propósito)
Construir: (a) el dato de las promos por medio de pago, (b) una sección "Ofertas" en el
catálogo público, (c) un banner de atención en el home que lleve ahí, y (d) un carrusel de
5 productos que cambia una vez por día, reutilizable a futuro.

NO toques en esta ronda (son rondas separadas, ya planificadas):
- src/ai.js, src/assistant.js, netlify/functions/* — integración con el asistente de IA y
  el pop-up antes de mandar el pedido por WhatsApp son la Ronda 2.
- El cálculo real del descuento sobre el total del pedido — Ronda 3.
- src/admin/* — no se toca el panel en esta ronda.
- El sistema de oferta por producto (`product.offer`) — se REUSA tal cual, no se modifica.

## Paso 1 — Dato de las promos por medio de pago
Agregá un campo `promos` al documento `settings/main` de Firestore con un script puntual
de una sola vez (seguí el patrón de conexión de scripts/deploy-firestore-rules.js o
scripts/migrate-to-firestore.js contra src/firebase-admin.js). Valor exacto (son datos
reales del negocio, no los inventes ni los cambies):

  promos: {
    tiers: [
      { minAmount: 50000,  percent: 5  },
      { minAmount: 100000, percent: 10 },
      { minAmount: 150000, percent: 15 },
      { minAmount: 200000, percent: 20 }
    ],
    paymentNote: "Solo efectivo o transferencia",
    chachosPercent: 10,
    disclaimer: "Descuentos no acumulables con otras promociones"
  }

Después de escribir el doc, esto ya sale solo en data/settings.json vía el flujo
existente — no hace falta tocar ningún fetch nuevo.

## Paso 2 — Optimizar las imágenes de assets/promos/
Convertilas a WebP con `sharp` (ya es dependencia del proyecto), ancho máximo 1200px,
calidad 82 — mismo criterio que ya usa el proyecto para sus assets. Dejalas como
`promo-llevamas-pagamenos.webp` y `adolfito-cupon-descuento.webp` en el mismo directorio,
y borrá los .png originales una vez confirmado que las .webp se ven bien.

## Paso 3 — Función compartida de recomendación diaria
Nuevo archivo `src/recommend.js` (mismo estilo de comentarios explicativos en español que
el resto del proyecto). Exportá una función pura:

  export function dailyPicks(products, { count = 5, date = new Date() } = {}) { ... }

- Sólo considera productos `visible !== false` e `inStock`.
- Selección DETERMINÍSTICA por día: mismo día → mismos 5 productos para todo el mundo.
  Usá un hash simple de la fecha en formato YYYY-MM-DD como seed de un PRNG chiquito
  (mulberry32 o similar, no traigas una librería nueva) para barajar el array y cortar
  los primeros `count`.
- Si hay menos de `count` productos elegibles, devolvé los que haya.
- La va a usar `renderHome` ahora, y el asistente de IA / el pop-up de WhatsApp en una
  ronda futura — por eso vive aparte y no adentro de templates.js.

## Paso 4 — Sección "Ofertas" en el catálogo
En src/app.js, extendé el manejo de `activeCat` para que exista un valor especial
`'Ofertas'` además de las categorías reales: cuando está activo, `render()` filtra con
`offerActive(p)` en vez de por `category`. Agregá el chip correspondiente en
src/templates.js → `renderHome` (junto a los chips de rubro, con el ícono `ico.tag` que
ya existe). Mismo patrón que ya usa `?cat=` para entrar directo a un rubro (ver el final
de app.js): agregá que `?cat=Ofertas` también funcione.

## Paso 5 — Bloque informativo de promos por medio de pago
Dentro de la sección "Ofertas", un card con: la imagen `promo-llevamas-pagamenos.webp`,
los tramos renderizados DESDE `settings.promos.tiers` (no hardcodeados en el HTML, con
`money()` para los montos), el `paymentNote`, el `chachosPercent` y el `disclaimer`.
Mobile-first: en mobile la imagen arriba y los tramos abajo en lista clara; en desktop
pueden ir lado a lado. Usá las clases/tokens que ya existen (mirá cómo están armadas
`.info-card` y `.banner` en styles.css/styles-parts.css para mantener consistencia).

## Paso 6 — Banner de atención en el home
Nuevo elemento entre `<header class="hero">` y el `<div class="banner">` del canal de
WhatsApp (ya existe) en renderHome. Tiene que:
- Usar `adolfito-cupon-descuento.webp`.
- Texto corto tipo "Promos activas — mirá cuánto ahorrás", con link a
  `?cat=Ofertas#catalogo` — si ya estás en la portada, que dispare la misma función de
  filtrado que el chip "Ofertas" (no dupliques la lógica).
- Movimiento sutil y con buen gusto (estilo Apple, no un GIF de los 2000): elegí UNO —
  shimmer suave en loop lento (~3s, gradient animado, GPU-friendly) o un pulso muy sutil
  de sombra. Respetá `prefers-reduced-motion: reduce` (estático si está activo — mismo
  criterio de "no perseguir la animación a cualquier costo" que ya usan theme.js/ui.js).
- Probalo en un viewport de 375px antes de dar el paso por terminado.

## Paso 7 — Carrusel "Elegidos para vos"
En renderHome, calculá `dailyPicks(products, { count: 5 })` en el servidor (Node, no en
el navegador, para evitar salto de layout) y renderizá una fila horizontal con
scroll-snap usando `cardHtml` para cada producto (reusalo tal cual). Ubicación: entre el
banner del paso 6 y `<div class="controls">`.
- Encabezado corto: "Elegidos para vos hoy" (o similar, tu criterio de copy).
- Scroll horizontal nativo (`scroll-snap-type: x mandatory` / `scroll-snap-align: start`)
  — nada de JS para el swipe, es más liviano y más nativo en mobile.
- Desktop: mostrá las 5 si entran, o scroll horizontal suave si no — sin flechas de
  navegación salvo que quede visualmente necesario.
- Entrada en pantalla: reusá el patrón `data-reveal`/`observeReveals` que ya existe en
  app.js, con un stagger sutil (~60-80ms entre tarjeta y tarjeta). Es lo único "premium"
  que quiero acá — no rediseñes el resto del sitio.

## Criterios de aceptación
- `npm run dev` y `npm run build` corren sin errores.
- Orden en el home: hero → banner de promos → carrusel "Elegidos para vos" (5 productos,
  cambian si simulás otra fecha en `dailyPicks`) → banner del canal de WhatsApp (ya
  existía) → controles/grilla.
- El chip "Ofertas" filtra bien y muestra el bloque de tramos arriba de los productos.
- Se ve bien en mobile (375px) y desktop (1440px), tema claro y oscuro.
- Con `prefers-reduced-motion: reduce`, ninguna animación nueva se reproduce.
- No se tocó nada fuera de esta lista: settings de Firestore (script puntual),
  src/recommend.js (nuevo), src/app.js, src/templates.js, styles.css/styles-parts.css
  (sólo clases nuevas, sin reescribir existentes), assets/promos/*.

## Cómo trabajar (para no gastar de más)
Leé sólo los archivos que necesitás tocar y data/settings.json para confirmar el shape
actual. No re-audites todo el repo ni refactorices nada fuera de esta lista — si ves algo
mejorable, un comentario `// TODO:` como mucho. Si algo acá choca con lo que encontrás en
el código real, priorizá el código y avisá al final qué tuviste que ajustar y por qué.
```

---

## 5. Ronda 2 — Promos en el asistente de IA y pop-up antes de enviar por WhatsApp

**Depende de:** Ronda 1 (usa `src/recommend.js`, el chip "Ofertas" y `settings.promos`).

**Objetivo:** que el asistente pueda hablar de las promos vigentes, que sus recomendaciones muestren el precio con descuento cuando corresponda, y que antes de mandar el pedido por WhatsApp aparezca una oportunidad de sumar algo en oferta — tal como lo pidió Fran en el chat con Rodri.

```
# Ronda 2 — Promos en el asistente de IA y pop-up antes de WhatsApp

## Contexto
Continúa la Ronda 1 (ya implementada: src/recommend.js con `dailyPicks`, chip "Ofertas"
en app.js/templates.js, `settings.promos` con los tramos de descuento). No repitas ese
trabajo ni lo re-audites — asumí que existe y usalo.

## Objetivo
1. Las recomendaciones del asistente (con y sin IA) reflejan ofertas activas.
2. El asistente puede responder sobre las promos por medio de pago cuando le preguntan.
3. Antes de enviar el pedido por WhatsApp, si hay productos en oferta que no están en el
   carrito, se ofrece sumarlos — una sola vez por sesión, sin ser invasivo.

NO toques: el motor de búsqueda semántico en sí (src/search-engine.js), el panel admin,
el cálculo del total del pedido (eso es Ronda 3).

## Paso 1 — Recomendaciones con precio de oferta
En src/assistant.js, la función `addPicks(items)` arma las tarjetas de producto del chat.
Hoy sólo muestra `money(p.price)`. Extendé el shape que le llega (tanto desde
`answerLocally` como desde la respuesta de `/api/ai/ask`) para incluir si el producto
tiene oferta activa (usá `offerActive`/`offerHasDiscount` de templates.js, ya importado
en varios lugares del proyecto) y, si la tiene, mostrá el precio tachado + el precio con
descuento, igual que ya hace `cardHtml` en la grilla — mismo criterio visual, no inventes
uno nuevo. Esto aplica tanto al lado servidor (netlify/functions/ai-ask.js arma el
`bySlug` que se devuelve al cliente — agregá ahí los campos de oferta) como al buscador
local (src/search-engine.js ya te da el producto completo, sólo hay que pasar los campos).

## Paso 2 — El asistente puede hablar de las promos por medio de pago
En src/ai.js, la función `askCatalog` arma el prompt de sistema `SYSTEM_TIENDA` y la
lista de productos candidatos. Sumale al contexto que le pasás al modelo una línea con
los tramos de `settings.promos` (ej: "Promos vigentes: 5% off desde $50.000, 10% desde
$100.000, 15% desde $150.000, 20% desde $200.000 (efectivo/transferencia, no acumulable);
10% adicional pagando con CHACHOS.") para que el asistente pueda mencionarlas cuando
corresponda — sin inventar nada nuevo, sólo repitiendo estos datos reales. No cambies las
reglas existentes del prompt (seguir sin inventar precios, sin prometer envíos, etc.) —
esta es una línea de contexto más, no una reescritura del system prompt.
En src/search-engine.js / assistant.js (modo sin IA), si la pregunta detecta intención de
"promo"/"oferta"/"descuento" (podés reusar `esConsultaDeDestacados` como referencia de
cómo ya se detecta intención por regex, pero con sus propias palabras clave: /promo|oferta|
descuento|rebaja/i), respondé mostrando los productos con `offerActive` true (via
`getIndex().filter(...)`), no `destacados()`.

## Paso 3 — Pop-up de "sumá algo en oferta" antes de WhatsApp
En src/app.js, el botón `#sheetSend` es un `<a target="_blank" href="wa.me/...">` que hoy
navega directo. Intercept el click: si hay al menos un producto con `offerActive(p)` true
que NO está ya en el carrito, y todavía no se mostró este popup en esta sesión
(sessionStorage, mismo patrón que `CART_HINT_KEY`/`NUDGE_KEY` que ya existen en el
proyecto — usá una key nueva, ej. `arias.promoPopupShown`), hacé `preventDefault()` y
abrí un dialog nuevo (seguí el patrón de los demás `<dialog>` del proyecto: `wireDialog`/
`openDialog`/`closeDialog` de src/ui.js) mostrando 2 o 3 productos en oferta (podés usar
`dailyPicks` filtrado a `offerActive`, o simplemente los primeros por `offerActive` — tu
criterio, que sea rápido) con su botón de agregar (`data-add`, ya existe la delegación de
evento global). Dos acciones: "Agregar y continuar" (agrega los tildados y sigue a
WhatsApp) y "No gracias, continuar" (sigue directo). Cualquiera de las dos marca la
sessionStorage y deja que la navegación a WhatsApp siga su curso normal.
Si no hay productos en oferta elegibles, o ya se mostró esta sesión, el click funciona
exactamente como hoy (no rompas el flujo existente).

## Criterios de aceptación
- Preguntarle al asistente "qué ofertas tenés" (con IA activada y sin ella) devuelve
  productos realmente en oferta, con precio tachado + precio final visible.
- Con IA activada, preguntar "puedo pagar con Chachos?" o "tenés descuento por cantidad"
  obtiene una respuesta que menciona los tramos reales, sin inventar nada.
- Al armar un pedido sin productos en oferta y tocar "Enviar pedido por WhatsApp", si hay
  ofertas disponibles aparece el pop-up una sola vez por sesión; la segunda vez que se
  intenta enviar, ya no vuelve a aparecer.
- Si no hay ninguna oferta activa en el catálogo, el botón de enviar funciona exactamente
  igual que antes de esta ronda (sin popup).
- `npm run dev` y `npm run build` sin errores. Mobile 375px y desktop, tema claro/oscuro.

## Cómo trabajar
Leé src/assistant.js, src/ai.js, netlify/functions/ai-ask.js, src/app.js, src/ui.js y
src/recommend.js antes de tocar nada — son los únicos archivos de esta ronda. No toques
search-engine.js más allá de una función de filtro/detección puntual si hace falta.
```

---

## 6. Ronda 3 — Descuento real aplicado sobre el total del pedido

**Depende de:** Ronda 1 (`settings.promos`).

**Objetivo:** que el resumen del pedido (antes de mandarlo por WhatsApp) muestre cuánto se ahorra según el tramo alcanzado, tanto en pantalla como en el texto del mensaje — para que el local pueda honrarlo al confirmar.

```
# Ronda 3 — Descuento real aplicado sobre el total del pedido

## Contexto
Continúa las Rondas 1 y 2. `settings.promos.tiers` ya existe en Firestore/settings.json.
No la re-crees.

## Objetivo
En src/app.js, las funciones `cartTotal()`, `renderSheet()` y `buildOrderMessage()`
manejan el resumen del pedido. Agregá una función `applicablePromo(total)` que, dado el
total del carrito, devuelva el tramo más alto de `SETTINGS.promos.tiers` cuyo `minAmount`
sea <= total (o null si no alcanza ninguno).

## Qué mostrar
- En el panel del pedido (`#sheetFoot`, donde hoy está `#sheetTotal`), si hay un tramo
  aplicable, mostrá una línea adicional: "Pagando en efectivo o transferencia: -X% ·
  ahorrás $Y" (calculado sobre el total actual), y por separado una mención a que pagando
  con CHACHOS el descuento es `chachosPercent`. Si no hay tramo aplicable, no mostrás nada
  (no inventes un mensaje de "casi llegás", eso es una decisión de copy que no te toca acá).
- En `buildOrderMessage()`, agregá al final del texto (antes de la pregunta de "¿me
  confirman stock...") una línea con el mismo cálculo, para que quien reciba el pedido por
  WhatsApp vea el descuento potencial y lo pueda confirmar. Usá `settings.promos.disclaimer`
  textual ahí para dejar claro que no es acumulable.
- Esto es SIEMPRE informativo ("si pagás así, esto es lo que corresponde"): no se resta
  del total mostrado como definitivo, porque el medio de pago se confirma recién por
  WhatsApp — dejalo como una línea aparte, no reescribas `cartTotal()`.

## Criterios de aceptación
- Un carrito de $120.000 muestra "10% off pagando en efectivo o transferencia · ahorrás
  $12.000"; uno de $40.000 no muestra ninguna línea de descuento.
- El texto que se manda por WhatsApp incluye la misma información cuando corresponde.
- `npm run dev` / `npm run build` sin errores; probado con carritos en cada tramo (incluido
  $0 y justo en el límite de cada tramo) y mobile + desktop.

## Cómo trabajar
Sólo tocás src/app.js. No toques templates.js ni el HTML de sheetFoot más allá de agregar
el elemento nuevo para esta línea.
```

---

## 7. Ronda 4 — Pulido visual y de motion, estilo Apple / Rappi

**Depende de:** Rondas 1-3 (se pule lo nuevo junto con el resto del sitio en una sola pasada coherente).

**Objetivo:** una pasada de terminación premium sobre toda la app — no una feature nueva, sino consistencia de movimiento, tacto y detalle. Se hace después de las rondas de promos a propósito: pulir dos veces (una vez por cada feature nueva, otra vez en general) desperdicia tokens y corre el riesgo de que cada pieza quede con un estilo de animación distinto.

```
# Ronda 4 — Pulido visual y de motion, estilo Apple / Rappi

## Contexto
Todo el catálogo (home, ficha de producto, panel de pedido, chat del asistente, campanita
de novedades) ya funciona (Rondas 1-3 incluidas). Esta ronda NO agrega funcionalidad
nueva: mejora terminación, consistencia de movimiento y sensación táctil en mobile.

## Objetivo
1. Un sistema de tokens de motion consistente (duración/easing) en styles.css o theme.css,
   reemplazando los valores sueltos que hoy están hardcodeados en distintas reglas CSS.
   Ej: `--ease-premium: cubic-bezier(0.22, 1, 0.36, 1); --dur-fast: 150ms; --dur-base:
   250ms; --dur-slow: 400ms;` — auditá las transiciones/animaciones existentes en
   styles.css/styles-parts.css/theme.css/notify.css/assistant.css y migralas a estos
   tokens en vez de valores repetidos a mano.
2. Micro-interacciones consistentes en botones y tarjetas: feedback visual sutil al tocar
   (`:active`) en todos los botones principales (`.btn`, `.card__add`, `.chip`, etc.),
   mismo criterio en todos — hoy algunos elementos lo tienen y otros no.
3. Gesto de "arrastrar para cerrar" en los `<dialog>` de mobile (el pedido, el chat, las
   hojas de ordenar/precio) — hoy sólo cierran con la X, el fondo o Esc. Agregalo como
   mejora progresiva: si el navegador no soporta bien el gesto, el cierre por X/fondo/Esc
   sigue funcionando igual (no rompas wireDialog/closeDialog de src/ui.js, extendelos).
4. Transición de imagen más suave en la galería de producto (ya existe un fade en
   `.product__stage.is-swapping` en app.js — llevala a los tokens del punto 1).
5. Auditoría de `prefers-reduced-motion`: cualquier animación de esta ronda y de las
   Rondas 1-3 tiene que degradar a un estado estático cuando está activo. Verificalo una
   por una, no asumas que ya quedó bien en rondas anteriores.

## Qué NO hacer
No rediseñes la paleta de colores, la tipografía ni el layout general — esto es motion y
terminación, no un rediseño visual. No agregues librerías de animación (GSAP, Framer
Motion, etc.): todo esto se resuelve con CSS transitions/animations nativas + como mucho
la Web Animations API que ya se usa en src/ui.js (`getAnimations()`).

## Criterios de aceptación
- Ningún valor de duración/easing hardcodeado a mano en el CSS tocado por esta ronda —
  todos usan los tokens nuevos.
- Con `prefers-reduced-motion: reduce`, TODA la app (no sólo lo de esta ronda) se ve
  estática y sigue siendo 100% usable.
- El gesto de arrastrar para cerrar funciona en un dialog de prueba en mobile (375px) y no
  rompe el cierre por X/fondo/Esc en ningún navegador.
- `npm run build` sin errores, sin regresiones visuales en home/ficha/panel de pedido en
  mobile y desktop, tema claro y oscuro.

## Cómo trabajar
Esta ronda toca muchos archivos CSS/JS a la vez por naturaleza — aun así, no reescribas
reglas que no estén relacionadas con motion/interacción. Priorizá diffs chicos y
localizados por sobre reescribir archivos enteros.
```

---

## 8. Backlog especificado (Rondas 5 a 10)

Estas rondas no dependen del lanzamiento de promociones y se pueden reordenar libremente entre sí. Cada una se detalla a nivel de prompt completo justo antes de ejecutarla.

### Ronda 5 — Ficha de producto: urgencia, prueba social y cross-sell inteligente
**Por qué:** hoy la ficha no da ninguna señal que empuje a decidir ahora, y "también te puede interesar" es sólo *misma categoría + precio parecido* — no aprovecha la taxonomía semántica que ya existe en `search-engine.js` para sugerir complementos reales.
**Alcance:** señales de urgencia/disponibilidad honestas (sin inventar "quedan 2" si no hay dato real de stock numérico — evaluar qué dato existe antes de prometer esto), relacionados basados en la taxonomía (`useCases`/`aliases`/`sub` de search-engine.js) en vez de sólo categoría+precio.
**Criterio de aceptación:** los relacionados de un producto incluyen al menos un complemento de otra categoría cuando la taxonomía lo sugiere (ej. pilas para un juguete a control remoto), no sólo productos de la misma categoría.

### Ronda 6 — Asistente con personalidad de vendedor ("modo Adolfo")
**Por qué:** el `SYSTEM_TIENDA` de src/ai.js informa bien pero no vende activamente: no pregunta edad/ocasión/presupuesto, no hace upsell, no maneja objeciones típicas ("es caro", "no sé cuál elegir").
**Alcance:** reescritura del system prompt (respetando las reglas de "nunca inventar precio/stock" que ya existen) para que el asistente haga preguntas de descubrimiento antes de recomendar cuando la consulta es ambigua, ofrezca una alternativa de menor precio cuando detecta duda por costo, y cierre activamente hacia agregar al pedido o escribir por WhatsApp.
**Criterio de aceptación:** ante "busco algo para mi sobrino" (sin más datos), el asistente pregunta edad/presupuesto antes de tirar productos al azar; ante "está caro", ofrece una alternativa más económica de la lista de candidatos si existe.

### Ronda 7 — "Más pedido" real, alimentado por analytics
**Por qué:** hoy `featured` es 100% curado a mano en el panel; ya existen datos reales de vistas/agregados/pedidos en el dashboard de Base44 (src/analytics.js) que nunca vuelven al catálogo.
**Alcance:** definir cómo traer ese dato de vuelta (¿export periódico a Firestore? ¿lectura directa del lado servidor en build.js?) — esto requiere decidir con Rodri/Gonza el mecanismo de acceso a Base44 antes de especificar el prompt.
**Nota:** esta ronda tiene una dependencia externa (acceso a los datos de Base44) que hay que resolver con el equipo de marketing antes de poder detallarla del todo.

### Ronda 8 — Fricciones de compra
**Por qué:** hay que tocar "+" varias veces para agregar más de 1 unidad, no hay zoom en las fotos de producto, y quien abandona el carrito con cosas adentro no recibe ningún recordatorio.
**Alcance:** selector de cantidad en la ficha de producto antes de agregar, lightbox/zoom en la galería, y evaluar (no implementar sin decidirlo antes) algún recordatorio no invasivo de carrito abandonado — dado que no hay email/teléfono del cliente, las opciones realistas son limitadas (ej. sólo dentro de la misma sesión vía la campanita).

### Ronda 9 — SEO por rubro
**Por qué:** el SEO fuerte está en la home y en cada ficha de producto, pero no hay una URL indexable por categoría ("juguetería en La Rioja") — se pierde tráfico de búsqueda con intención de categoría.
**Alcance:** página estática por categoría (`/c/juegueteria/`, por ejemplo) generada en build.js igual que ya se generan las fichas de producto, con su propio title/description/JSON-LD.

### Ronda 10 — Señales de confianza
**Por qué:** no hay garantía/cambios, testimonios, ni nada que respalde la decisión de compra más allá del precio y la foto.
**Alcance:** a definir con Adolfo qué política real de cambios/garantía tiene el local (no se inventa una política de devoluciones sin confirmarla con el dueño) — esta ronda depende de esa conversación antes de poder especificarse.

---

## 9. Decisiones registradas (para no volver a discutirlas en cada ronda)

- Rotación del carrusel: **diaria** por defecto (no mensual) — a definir junto con Fran/Rodri si se quiere cambiar, pero no bloquea el arranque.
- El descuento por tramo de pago es **informativo** hasta la Ronda 3 — no se resta del total mostrado como definitivo hasta esa ronda.
- El deadline original ("el viernes" 28/8) ya venció al momento de escribir este documento (2/9/2026) — se prioriza calidad y estándares por sobre volver a apurar una fecha ya perdida.
- Toda esta iniciativa de Promociones (Rondas 1-4) es paralela al roadmap de storefront/conversión que ya se había acordado antes (ver `metodologia.md` en la memoria del proyecto) — las Rondas 5-10 de este documento son, en parte, la continuación de esa auditoría original.
