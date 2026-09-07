# Roadmap de Mejoras — Librería Arias

**Proyecto:** catalogo-arias · **Última actualización:** 4/9/2026 · **Estado general:** Rondas 1, 1.1, 2 y 3 probadas en `https://preview--libreria-arias.netlify.app/` (deploy-preview de Netlify) — pero confirmado por inspección en vivo tanto que el main de producción (`libreria-arias.netlify.app`) no tiene nada de esto desplegado todavía, como que el propio preview tiene bugs concretos ya identificados (Ronda 1.2, Sección 4.4). Ver detalle en la Sección 9.

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
| 1 · Promociones (urgente) | 1.1 | Corrección: carrusel de atención premium (promos + WhatsApp) | Ronda 1 | 🔴 Alta |
| 1 · Promociones (urgente) | 2 | Promos en el asistente de IA + pop-up antes de WhatsApp | Ronda 1 | 🔴 Alta |
| 1 · Promociones (urgente) | 3 | Descuento real calculado sobre el total del pedido | Ronda 1 | 🟠 Media |
| 1 · Promociones (urgente) | 1.2 | Auditoría integral de preview: unificación, pop-up de promos, "Elegidos para vos" premium, chip de descuento y consistencia mobile | Rondas 1, 1.1, 2, 3 | 🔴 Alta |
| 1 · Promociones (urgente) | 1.3 | Admin: gestión en vivo de promociones/ofertas | Ronda 1 | 🟠 Media |
| 2 · Terminado premium | 4 | Pulido visual/motion global estilo Apple / Rappi | Rondas 1-3 | 🟠 Media |
| 3 · Conversión y ventas | 5 | Ficha de producto: urgencia, prueba social, cross-sell inteligente | — | 🟠 Media |
| 3 · Conversión y ventas | 6 | Asistente con personalidad de vendedor ("modo Adolfo") | Ronda 2 | 🟠 Media |
| 4 · Datos y confianza | 7 | "Más pedido" real, alimentado por analytics (Base44) | — | 🟡 Baja |
| 4 · Datos y confianza | 8 | Fricciones de compra: cantidad, zoom de foto, recordatorio de carrito | — | 🟡 Baja |
| 4 · Datos y confianza | 9 | SEO por rubro: páginas de categoría indexables | — | 🟡 Baja |
| 4 · Datos y confianza | 10 | Señales de confianza: garantías, devoluciones, testimonios | — | 🟡 Baja |

Las Rondas 1, 1.1, 1.2, 1.3, 2, 3 y 4 tienen el prompt completo listo para pegar en Claude Code (secciones 4 a 7). Las Rondas 5 a 10 están especificadas a nivel objetivo/alcance/criterio de aceptación — el prompt hiperdetallado de cada una se termina de redactar justo antes de ejecutarla, tomando como base el estado real del código en ese momento (así no se arma en el aire un prompt "exacto" contra archivos que todavía van a cambiar en el camino — es la misma lógica de planificación incremental que ya usa este roadmap).

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

## 4.1 Ronda 1.1 — Corrección: carrusel de atención premium (promos + WhatsApp)

**Por qué existe esta ronda:** al probar la Ronda 1 en preview, el banner de promos y el banner del canal de WhatsApp quedaron chicos, planos y sin jerarquía — exactamente las dos piezas que más necesitan destacar en toda la home terminaron pareciendo un detalle menor. Es una corrección directa sobre feedback visual real, no un cambio de alcance: no toca datos, ni el chip "Ofertas", ni el carrusel "Elegidos para vos" (todo eso ya quedó bien y sigue igual).

**Depende de:** Ronda 1 (reemplaza dos de sus piezas visuales, reusa el resto tal cual).

```
# Ronda 1.1 — Corrección: carrusel de atención premium (promos + WhatsApp)

## Contexto
Continúa la Ronda 1, ya implementada (banner de promos y banner de WhatsApp del canal,
ambos en renderHome, más el carrusel "Elegidos para vos" ya funcionando con dailyPicks).
Feedback real sobre el resultado visual: el banner de promos y el banner de WhatsApp
quedaron demasiado chicos y planos para ser justamente las dos piezas que más tienen que
llamar la atención de toda la home — tienen que sentirse tan premium y notorias como el
resto de la marca, generar ganas reales de mirarlas (FOMO), y no competir entre sí por
espacio: se fusionan en un único carrusel de atención que alterna automáticamente entre
ambos mensajes.

## Objetivo
Reemplazar los dos elementos actuales — el banner de promos (Paso 6 de la Ronda 1) y el
banner del canal de WhatsApp (el que ya existía antes de la Ronda 1) — por UN SOLO
componente: un carrusel de atención, grande y con jerarquía visual real, que alterna
automáticamente entre 2 slides:
1. Promos activas (mismo contenido de datos que ya existe: imagen
   `adolfito-cupon-descuento.webp`, invitación a ver las promos, enlace a `?cat=Ofertas`).
2. Canal de WhatsApp (mismo contenido/arte que ya existía).
No se pierde ninguna funcionalidad de las dos piezas actuales — se les da el protagonismo
visual que hoy no tienen y se las une en una sola experiencia.

## Qué está mal hoy (para que no se repita)
- Ambos banners son angostos, con ícono chico y texto chico — no se leen como
  promociones importantes a simple vista, se pierden en el scroll.
- Conviven dos elementos separados compitiendo por atención en vez de uno solo bien
  resuelto.
- No hay ninguna sensación de urgencia/FOMO: nada indica "esto es limitado" o "importante,
  mirá ahora".

## Paso 1 — Estructura del carrusel
Nuevo bloque `<section class="attention-carousel" data-attention-carousel>` en
`renderHome` (src/templates.js), en el lugar donde hoy está el primer banner (entre el
hero y "Elegidos para vos"). Adentro: un contenedor con scroll-snap horizontal (mismo
mecanismo nativo que ya usa "Elegidos para vos" — `scroll-snap-type: x mandatory` /
`scroll-snap-align: start`), con 2 slides de ancho completo (`min-width: 100%`), más una
fila de 2 puntitos indicadores debajo (`<button class="attention-carousel__dot"
aria-label="Ver promoción 1" data-index="0">`, etc.). No dupliques HTML de tarjeta de
producto acá — esto es un banner, no aplica `cardHtml`.

## Paso 2 — Rediseño visual: grande, bold, premium
Cada slide ocupa el ANCHO completo del contenedor y una altura notoriamente mayor que el
banner actual (pensalo como un mini-hero, no como una tira delgada) — la imagen
protagonista (la de promos o la del canal de WhatsApp) se ve grande y nítida, no como un
ícono chico al costado. Mobile-first: imagen arriba, texto abajo con buen contraste;
desktop: pueden ir lado a lado. Cada slide incluye:
- Título grande, con peso visual real (escala tipográfica cercana a los títulos de
  sección existentes — nada de tamaño de párrafo).
- En el slide de promos, un badge/cintillo de urgencia con el dato REAL del tramo más
  alto de `settings.promos.tiers` (ej. `Hasta ${maxPercent}% OFF` calculado, no
  hardcodeado — si el tramo más alto cambia en Firestore, el badge cambia solo).
- Un botón de acción visible en cada slide (no sólo texto con link): "Ver promociones" /
  "Sumarme al canal".
- Fondo con la paleta de marca (el amarillo/negro que ya usa el resto del sitio), para que
  se sienta parte del sitio y no un elemento pegado aparte.

## Paso 3 — Autoplay accesible
En src/app.js, función nueva `wireAttentionCarousel()` (se llama junto al resto del
wiring de la home, con guarda `if (!el) return` como ya hacen otras funciones del
archivo):
- Avanza de slide automáticamente cada 5 segundos (`setInterval` + scroll al slide
  siguiente, y vuelve al primero después del último).
- Se pausa mientras el usuario interactúa (touch/drag/hover) y retoma unos segundos
  después de soltar — no compite con el swipe manual.
- Los puntitos son clickeables/tocables, saltan directo a ese slide y resetean el timer.
- Si `matchMedia('(prefers-reduced-motion: reduce)')` da `true`, el autoplay NO arranca
  en absoluto — el carrusel queda 100% a control manual (swipe o puntitos), sin perder
  funcionalidad. No es sólo un detalle estético: un carrusel que se mueve solo y no se
  puede frenar es un problema real de accesibilidad.
- Sin librerías nuevas — `setInterval`, scroll nativo y el mismo criterio que ya usa
  `observeReveals` en el archivo alcanzan de sobra.

## Paso 4 — Limpieza
Borrá el banner de promos viejo (Paso 6 original de la Ronda 1) y el banner de WhatsApp
que existía antes — ambos quedan reemplazados por este componente, no conviven los tres.
El resto del orden del home no cambia: hero → carrusel de atención → "Elegidos para vos"
→ controles/grilla.

## Criterios de aceptación
- Un solo componente, visualmente grande y bold, ocupa el lugar de los dos banners
  anteriores — no quedan banners chicos sueltos en ningún otro lado del home.
- Alterna solo cada ~5s entre promos y WhatsApp, en loop, y se puede navegar a mano
  (swipe en mobile, click en los puntitos) sin pelearse con el autoplay.
- Con `prefers-reduced-motion: reduce` activado, NO avanza solo — sigue siendo 100%
  navegable a mano.
- El badge de descuento muestra el número real del tramo más alto de
  `settings.promos.tiers`.
- Se ve notoriamente más premium que la versión anterior: imagen grande y nítida, texto
  con jerarquía clara, buen contraste en tema claro y oscuro, probado en 375px y desktop.
- `npm run dev` / `npm run build` sin errores.

## Cómo trabajar
Tocás src/templates.js (renderHome), src/app.js (wireAttentionCarousel) y
styles.css/styles-parts.css (estilos nuevos del componente). No toques el carrusel
"Elegidos para vos" ni la sección "Ofertas" del catálogo — quedan igual que en la Ronda 1.
Si definís variables CSS nuevas de duración/easing para la transición (ej.
`--attention-dur`), dejalas con nombres claros — en la Ronda 4 se unifican con el resto de
los tokens de motion del sitio, no hace falta anticiparlo ahora.
```

### Ajuste post-implementación — espaciado y timing del carrusel

Ya probado en preview: el resultado mejoró mucho, pero quedan dos retoques puntuales
sobre lo mismo (no es una reversión, no se toca nada del alcance ya aprobado arriba).

```
# Ronda 1.1 — Ajuste de espaciado y timing del carrusel de atención

## Contexto
El carrusel de atención de la Ronda 1.1 ya está implementado y andando. Dos ajustes
puntuales sobre lo mismo:

## Ajuste 1 — Acercar imagen y texto en el slide de promos
En el slide de promos, la imagen de Adolfito y el bloque de texto (badge + título +
bajada + botón) quedaron demasiado separados — reducí el espacio entre ambos (gap/margen)
para que se perciban como una sola composición compacta y con más impacto, no como dos
elementos sueltos en la misma fila. Ajustá sólo el espaciado (gap/margin/grid-template),
no el tamaño de fuente ni el layout general ya aprobado (imagen+texto, mobile arriba/abajo,
desktop lado a lado).

## Ajuste 2 — Autoplay real, animado, cada 10 segundos
Verificá que el autoplay esté efectivamente funcionando end-to-end (si `wireAttentionCarousel()`
no se está llamando, o el intervalo no está corriendo, es un bug a corregir, no sólo un
ajuste de tiempo) y cambiá el intervalo de 5 a 10 segundos. La transición entre slides
tiene que percibirse como un movimiento animado (scroll suave — `scroll-behavior: smooth`
o transición CSS —, nunca un salto instantáneo). Se sigue respetando
`prefers-reduced-motion: reduce` (sin autoplay ni transición animada en ese caso, sólo
navegación manual por swipe/puntitos), tal como ya se había especificado.

## Criterios de aceptación
- El slide de promos se ve compacto: imagen y texto claramente asociados, sin espacio
  vacío grande entre ambos.
- El carrusel avanza solo cada 10 segundos, con una transición visualmente suave.
- Con `prefers-reduced-motion: reduce`, sigue sin autoplay, sólo navegación manual.
- Mobile (375px) y desktop, tema claro y oscuro.
```

---

## 4.2 Corrección — Splash de entrada roto en WebViews in-app (ej. WhatsApp Business)

**No es parte de las Rondas de promociones** — es un bug de una feature más vieja del sitio (la cortina de entrada con el logo, `src/theme.js` + `theme.css` + `templates.js`), detectado al probar el link dentro de WhatsApp Business en mobile: el logo aparece descentrado, corrido hacia la izquierda.

**Diagnóstico (ya confirmado en el código, no es una suposición):** el propio `theme.js` ya documenta que el centrado de este splash falla en ciertos navegadores internos de apps de terceros (WhatsApp/Instagram/Facebook, no el Safari/Chrome real del celular), y por eso existe una función `isInAppBrowser()` que detecta esos casos por `navigator.userAgent` y salta directo a mostrar la página sin animar, para no arriesgarse a mostrar el bug. El problema puntual: esa detección busca palabras como "WhatsApp" en el user agent, pero el navegador interno de WhatsApp en iOS (y el de WhatsApp Business, que es la app donde se vio ahora) no agrega ningún dato distintivo a ese user agent — es indistinguible de Safari normal para el código, así que el sitio piensa que está en un navegador normal, intenta correr la animación completa, y ahí aparece el logo descentrado.

**Por qué no alcanza con agregar más palabras al detector:** es una limitación conocida de iOS, no del código del sitio — esos WebViews en su mayoría no exponen ninguna pista en el user agent. Por más apps que se sumen a la lista, siempre va a quedar alguna (o una versión nueva de alguna) sin detectar. Hace falta una red de seguridad que no dependa de adivinar qué app está usando cada visitante.

```
# Corrección — Splash de entrada roto en WebViews in-app (ej. WhatsApp Business)

## Contexto
El splash de entrada (src/theme.js, theme.css, templates.js) ya tiene una salida elegante
para navegadores internos de terceros con bugs de centrado conocidos: `isInAppBrowser()`
detecta por `navigator.userAgent` (WhatsApp/Instagram/Facebook/Line) y si matchea, oculta
el splash sin animar en vez de arriesgar el bug. El caso de WhatsApp Business (y de
WhatsApp a secas en iOS en muchos casos) no lo detecta esa función porque esos WebViews no
agregan ningún dato distintivo al user agent en iOS — no es un problema del regex, es que
la información simplemente no está disponible ahí.

## Objetivo
Agregar una verificación en tiempo real: apenas arranca la animación del splash, medir si
el logo efectivamente terminó centrado en la pantalla. Si no lo está, cortar ahí mismo y
mostrar la página sin más animación — la misma salida elegante que ya existe para los
navegadores detectados por user agent, pero disparada por el resultado real en pantalla en
vez de por una lista de nombres de apps. Así el splash completo se sigue viendo premium en
la enorme mayoría de los casos (Safari, Chrome, la mayoría de las apps), y en el puñado de
WebViews rotos que no se pueden detectar de antemano, el sitio se autocorrige al instante
en vez de mostrar un logo descentrado.

## Paso 1 — Verificación de centrado real
En `runSplash()` (src/theme.js), después de poner `splash.dataset.run = 'true'`, esperá un
frame (`requestAnimationFrame`) y medí con `getBoundingClientRect()` el centro horizontal
real de `.splash__logo` contra el centro real de la ventana (`window.innerWidth / 2`). Si
la diferencia supera una tolerancia chica (ej. 24px, para no disparar por redondeos
normales), es el bug conocido: cortar ahí mismo a la misma salida que ya usa el bloque de
`isInAppBrowser()` (ocultar el splash, sacar `data-splash` del root, resolver la promesa) —
extraé esa salida a una función chica reusada por los dos casos, no la dupliques.

## Paso 2 — Ampliar igual la lista de user agents conocidos
Sumá a la regex de `isInAppBrowser()` los tokens de apps in-app comunes que hoy faltan
(ej. `Twitter`, `TikTok`, `Snapchat`, `Pinterest`, `MicroMessenger` de WeChat). No
soluciona el caso de WhatsApp en iOS (por lo explicado arriba), pero ayuda en Android,
donde estos WebViews sí suelen anunciarse en el user agent, y reduce cuántos casos dependen
únicamente de la verificación en tiempo real del Paso 1.

## Qué NO hacer
No reescribas la coreografía de animación en sí (`splash-pop`, `splash-halo`, curtain-up/
down, etc.) — ya está bien resuelta para los navegadores normales, incluido Safari real en
iOS. El problema es puntual a un puñado de WebViews de terceros, no del diseño del splash.

## Criterios de aceptación
- En Safari/Chrome normal (desktop y mobile) y en la mayoría de las apps, el splash sigue
  animándose completo, igual que hasta ahora.
- Forzando un desvío de centrado a propósito durante la prueba (ej. un margen temporal en
  `.splash__stack`, sacándolo después de confirmar), la verificación del Paso 1 lo detecta
  y corta a la salida limpia sin animación — es la única forma de probarlo sin poder abrir
  WhatsApp Business desde una notebook.
- Con `prefers-reduced-motion: reduce` y con los navegadores ya detectados por user agent,
  el comportamiento no cambia respecto a hoy.
- `npm run dev` / `npm run build` sin errores.

## Cómo trabajar
Sólo tocás src/theme.js. No toques theme.css ni templates.js — la salida elegante para
estos casos (ocultar el splash sin animar) ya existe y sólo hay que dispararla desde un
lugar más confiable.
```

---

## 4.3 Corrección — Asistente de stock (admin): sin respuesta visible + rediseño en formato chat

**No es parte del roadmap de promociones** — es un bug + una mejora de UX sobre una feature del panel de admin (`src/admin/admin.js`/`admin.html`, `src/ai.js`, las funciones de Netlify `ai-stock-actions.js`).

**Diagnóstico (confirmado en el código, no es una suposición):** hay dos causas distintas, no una.

1. **El bug de "no responde":** el diálogo del asistente usa `<dialog>.showModal()`, que en todos los navegadores modernos pone el elemento en una capa por encima de TODO el resto de la página (el "top layer"), sin importar z-index. El contenedor de avisos (`#toasts`, al final de `admin.html`) vive fuera de cualquier `<dialog>` — así que cualquier `toast(...)` disparado mientras el diálogo está abierto queda tapado por el propio modal y nunca se ve. Esto pasa en los tres casos posibles de este asistente: cuando falla la llamada a la IA, cuando no hay clave configurada, y cuando la IA no encontró ningún cambio para proponer. En los tres casos, quien está mirando el diálogo ve exactamente lo mismo que si no hubiera pasado nada.
2. **Una brecha real entre lo que promete la UI y lo que hace el backend:** el texto de ayuda del diálogo invita a preguntar cosas como "¿hay algún producto sin stock hace rato?", pero el prompt del modelo (`SYSTEM_STOCK` en `src/ai.js`) sólo está pensado para proponer cambios de stock/visibilidad, no para contestar preguntas informativas — con una pregunta así, el modelo probablemente devuelve todo vacío, y eso combinado con el punto 1 se ve como silencio total. Justo el caso que probaste ("¿Hay productos repetidos?") es exactamente este tipo de pregunta.

```
# Corrección — Asistente de stock: sin respuesta visible + rediseño en formato chat

## Contexto
El diálogo "Asistente de stock" (src/admin/admin.js ~líneas 1197-1315, markup en
admin.html) permite tipear una instrucción y ver una propuesta de cambios antes de
aplicarla. Al preguntar hoy no se ve ningún resultado.

## Diagnóstico (ya confirmado, no hace falta re-investigarlo)
1. El diálogo usa `showModal()`, que promueve el elemento al "top layer" del navegador.
   `#toasts` vive fuera de cualquier `<dialog>`, así que cualquier `toast()` disparado
   mientras el diálogo está abierto queda tapado por el modal — invisible para quien está
   mirando. Afecta los tres casos de esta función: error de la IA, sin clave configurada,
   y "no encontré cambios para proponer".
2. `SYSTEM_STOCK` (src/ai.js) sólo sabe proponer cambios de stock/visibilidad, no
   contestar preguntas informativas — aunque el propio texto de ayuda del diálogo invita a
   hacer ese tipo de preguntas.

## Objetivo
1. Que cualquier respuesta de la IA en este diálogo — informativa, error, o "no encontré
   nada" — se vea siempre dentro del propio diálogo, nunca dependiendo de un toast que
   puede quedar tapado.
2. Rediseñar el diálogo como un chat: cada instrucción/pregunta y su respuesta se apilan
   como una conversación, no se pisan entre sí como hoy.
3. Que el asistente pueda contestar preguntas informativas reales sobre el catálogo (no
   sólo proponer cambios), usando únicamente datos reales de la lista que se le pasa.

## Paso 1 — Backend: sumar una respuesta informativa
En `SYSTEM_STOCK()` y `proposeStockActions()` (src/ai.js), sumá al contrato JSON un campo
`respuesta` (texto libre, opcional) para cuando la instrucción es una pregunta informativa
en vez de (o además de) un pedido de cambio — ej. "¿hay productos repetidos?", "¿qué no
tiene stock hace rato?" (para esto último vas a necesitar pasarle también `updatedAt` de
cada producto en la lista que arma `proposeStockActions`, hoy sólo manda
slug/nombre/rubro/stock/visible). Regla explícita para el modelo: sólo puede mencionar
productos que están literalmente en la lista que se le pasó, con su nombre real, nunca
inventar uno. JSON de salida nuevo:
`{"acciones":[...],"no_encontrados":[...],"aclaracion":"","respuesta":""}`
(mantené el significado de los tres campos que ya existen). Propagá `respuesta` en
netlify/functions/ai-stock-actions.js y en el bloque `/api/ai/stock-actions` de
src/ai-api.js — ambos arman la respuesta campo por campo, sumale éste en los dos.

## Paso 2 — Frontend: el diálogo como chat
En admin.html, reemplazá el cuerpo del diálogo `#stockAI` (textarea + botón "Preguntar" +
`#stockAINote` + tabla `#stockAIPreview`/`#stockAIRows`) por:
- Un contenedor de mensajes con scroll (`<div id="stockAIChat" class="stockchat">`), vacío
  al abrir el diálogo. Dejá visible en algún lugar fijo (ej. debajo del título) la
  aclaración de siempre: "Nunca cambia nada solo: te muestra lo que va a hacer y vos
  confirmás" — no la pierdas en el rediseño.
- Un compositor fijo abajo con el mismo textarea de hoy (podés bajarlo a 1-2 filas que
  crezca con el contenido) + botón de enviar, Enter para enviar y Shift+Enter para salto
  de línea.

En admin.js, reescribí el bloque de "IA: asistente de stock" (~líneas 1197-1315) para que:
- Cada instrucción del usuario se agregue al chat como mensaje propio (alineado a la
  derecha) antes de llamar a la API.
- La respuesta de la IA se agregue como mensaje del asistente (alineado a la izquierda):
  si viene `respuesta`, se muestra ese texto; si viene `acciones.length`, debajo (o como
  único contenido si no hay `respuesta`) se muestra la mini-tabla de cambios propuestos con
  checkboxes y SU PROPIO botón "Aplicar N cambios" — misma lógica de hoy
  (`CAMBIO_LABEL`/`CAMBIO_PATCH`/`writeBatch`), pero acotada a ese mensaje: aplicar uno no
  afecta propuestas de mensajes anteriores del mismo hilo. Aplicado un mensaje, reemplazá
  sus checkboxes/botón por una marca simple ("✓ Aplicado") para que no se pueda aplicar dos
  veces y el hilo quede prolijo.
- Si hay `no_encontrados`, sumalo como línea aparte dentro del mismo mensaje del asistente
  (ya no en un `#stockAINote` separado).
- Si no hay nada de nada, el mensaje del asistente dice algo tipo "No encontré nada para
  proponer con eso." — siempre como mensaje del chat, nunca como `toast()`.
- Un error del `catch` también se muestra como mensaje del asistente dentro del chat, con
  el mismo texto amigable que ya arma `aiError()` (reusá esa función para el texto; el
  destino deja de ser `toast()`, pasa a ser un mensaje del hilo).
- Mientras espera la respuesta, mostrá un indicador simple de "escribiendo…" (CSS liviano,
  sin librerías).
- Auto-scroll del contenedor al fondo con cada mensaje nuevo.
- Al cerrar y reabrir el diálogo, el chat arranca vacío — no hace falta persistir historial
  entre aperturas.

## Paso 3 — Arreglo general: toasts detrás de un modal
En la función `toast()` (admin.js): si hay un `<dialog open>` en la página al momento de
mostrarlo, agregalo como hijo de ESE diálogo (con estilos para que se vea bien ahí, por
ejemplo fijo abajo del todo) en vez de en `#toasts`. Si no hay ningún diálogo abierto, que
siga usando `#toasts` como hasta ahora. No es sólo para este asistente: cualquier otro
diálogo del panel que dispare un `toast()` (carga masiva, editor, etc.) tiene hoy el mismo
problema y con este cambio queda resuelto en todos lados a la vez.

## Qué NO hacer
No cambies qué campos modifica cada tipo de cambio (`CAMBIO_PATCH`) ni el modelo de datos
en Firestore — sólo se agrega `updatedAt` a la lista que ya se le manda al modelo en el
Paso 1. No toques el asistente de cliente (src/assistant.js, ai-ask.js) — es un flujo
completamente aparte.

## Criterios de aceptación
- Preguntar "¿hay productos repetidos?" (o cualquier pregunta informativa) devuelve una
  respuesta de texto visible en el chat, basada en los productos reales de la lista — no
  queda en silencio.
- Un error de la IA (ej. forzando temporalmente una clave inválida) se ve como mensaje
  dentro del chat, no como un toast invisible.
- Pedir un cambio real (ej. "sacá del stock la mochila escolar") sigue proponiendo la fila
  con checkbox y aplicando sólo lo tildado al tocar el botón de ESE mensaje — no se perdió
  ninguna función de la versión anterior.
- Se pueden mandar varias instrucciones seguidas sin cerrar el diálogo, y todas quedan
  visibles como historial, cada una con su propia propuesta si corresponde.
- Un toast disparado desde cualquier otro diálogo del panel (probá forzando un error en
  carga masiva, por ejemplo) ahora se ve, en vez de quedar tapado.
- `npm run dev` sin errores; probado en mobile (375px) y desktop, tema claro y oscuro.

## Cómo trabajar
Tocás src/ai.js, netlify/functions/ai-stock-actions.js, src/ai-api.js, src/admin/admin.html,
src/admin/admin.js y src/admin/admin.css (estilos del chat nuevo). No toques el resto del
panel fuera de la función `toast()` (Paso 3) y el bloque del asistente de stock.
```

---

## 4.4 Ronda 1.2 — Auditoría integral de preview: unificación, pop-up de promos, "Elegidos para vos" premium, chip de descuento y consistencia mobile

**Por qué existe esta ronda:** al probar en preview (`https://preview--libreria-arias.netlify.app/`, el deploy-preview de Netlify — distinto del main de producción) el conjunto de lo hecho hasta ahora (Rondas 1, 1.1, 2 y 3), la sensación general es de "bugueado" y no premium. Se inspeccionó ese link en vivo (DOM real, no capturas) y se confirmaron con evidencia concreta varios de los síntomas reportados — no son percepciones, son bugs puntuales identificables:

- **El carrusel de atención de la Ronda 1.1 quedó a medio terminar.** `#attentionCarousel` existe, pero su `track` tiene **un solo slide** (el de promos, envuelto en un único `<a>`) — no hay segundo slide de WhatsApp, no hay puntitos, no hay estructura de 2 slides con scroll-snap. Y el banner de WhatsApp viejo (`<div class="banner">` con el link al canal) **sigue existiendo tal cual, por separado**, ahora ubicado después de "Elegidos para vos". O sea: se mejoró visualmente el banner de promos (el badge dinámico "Hasta 20% OFF" calculado desde `settings.promos` sí quedó funcionando) pero nunca se completó la fusión en un único carrusel — es exactamente lo que describiste como "deberían unificarse".
- **Ya existe, oculto y desconectado, un pop-up de detalle de promos que sirve casi tal cual para lo que pediste.** Hay un `<div id="promoInfo" hidden>` con un botón `#promoInfoOpen` que abre un `<dialog id="promoInfoDlg">` con los 4 tramos, el `paymentNote`, el dato de CHACHOS y hasta un botón para ver la imagen de la promo ampliada (`#promoImageDlg`) — todo ya armado, pero con `hidden` puesto y sin ningún trigger visible conectado a la home. Es una pieza de una iteración anterior que quedó huérfana cuando se armó el carrusel. Conviene reconectarla al slide de promos en vez de construir un dialog nuevo desde cero.
- **La línea de descuento del carrito (Ronda 3) es texto plano con estilos inline, no un chip.** Se probó en vivo agregando productos hasta $152.000 y abriendo el carrito: `#sheetPromo` sí calcula y muestra bien el dato real ("Pagando en efectivo o transferencia: -15% · ahorrás $22.800"), pero está armado como dos `<p>` con `style="color:...; font-weight:..."` puestos por JS, sin fondo, borde ni `border-radius` — cero aspecto de chip. Esto también va en contra del criterio de "una sola fuente de verdad" del proyecto (los estilos deberían vivir en una clase CSS, no inyectarse inline desde app.js).
- **Sobre "no se ve en mobile":** no se pudo confirmar en vivo si es un bug de layout o si el carrito probado en su momento no llegaba a los $50.000 (el primer tramo) — en ese caso no mostrar nada es el comportamiento correcto ya especificado en la Ronda 3, no un bug. El Paso 4 de esta ronda pide diagnosticar esto primero, con un carrito de prueba que sí supere un tramo, antes de tocar el CSS.

**Hallazgo aparte, sobre el main de producción (confirmado por inspección en vivo del 4/9, no es una suposición):** `https://libreria-arias.netlify.app/` — el main real, no el preview — hoy **no tiene desplegado nada de esto**: ni el carrusel de atención, ni "Elegidos para vos", ni la sección "Ofertas". Se confirmó con tres chequeos independientes: (1) búsqueda de los selectores/clases esperados en la página viva — no aparece ninguno; (2) volcado completo de `document.body.children` — la estructura es exactamente la del sitio original, previa a este proyecto; (3) un `fetch` de la página con `cache-control: no-store` y revisión de las cabeceras de caché (`age` de casi 14 horas) para descartar que sea un artefacto de CDN. Esto confirma que "preview" y "main" son efectivamente dos URLs distintas con contenido distinto ahora mismo, y que el trabajo de las Rondas 1/1.1/2/3 vive sólo en el preview. Por eso el Paso 6 de esta ronda no es opcional: confirmar que todo quede commiteado y efectivamente deployado a la rama que Netlify publica como main es parte de los criterios de aceptación, no un detalle de proceso.

**Depende de:** Rondas 1, 1.1, 2 y 3 (audita y corrige piezas de las cuatro; no repite su trabajo de base).

```
# Ronda 1.2 — Auditoría integral de preview: unificación, pop-up de promos, "Elegidos para vos" premium, chip de descuento y consistencia mobile

## Contexto (no re-audites lo que ya funciona bien)
Ya implementado y funcionando en preview: el motor de promos y `settings.promos` (Ronda 1),
el carrusel de atención `data-attention-carousel` con sus 2 slides y autoplay de 10s
(Ronda 1.1 + su ajuste posterior), las promos integradas al asistente de IA y el pop-up
antes de WhatsApp (Ronda 2), y la línea de descuento por tramo en el resumen del pedido
(Ronda 3). Esta ronda NO repite ese trabajo de base — audita si quedó bien conectado,
corrige lo que no, y suma dos piezas nuevas (pop-up de detalle en el carrusel, pulido de
"Elegidos para vos") más un chequeo de despliegue real.

## Objetivo
Una pasada de auditoría + corrección + una feature nueva chica, para que el resultado se
sienta consistentemente premium — "una web app optimizada 2.0", no una colección de
features probadas por separado. Nada de esto es opcional ni "si da el tiempo": son los
puntos concretos que se detectaron probando el preview.

## Paso 1 — Terminar la unificación del carrusel de atención (Ronda 1.1 quedó incompleta)
Confirmado en el código: `#attentionCarousel` (renderHome, src/templates.js) hoy sólo
contiene UN slide — `<a class="attn__slide attn__slide--promos" id="promoBanner">` con el
badge dinámico de descuento (eso quedó bien, no lo toques) — envuelto directo en un `<a>`,
sin segundo slide, sin puntitos, sin track de scroll-snap de 2 elementos. El banner de
WhatsApp original (`<div class="banner">`, con el `<a>` a
`https://whatsapp.com/channel/...` y la imagen `banner-canal.webp`) sigue existiendo aparte,
hoy ubicado entre la sección `picks` ("Elegidos para vos") y `#catalogo`. Terminá lo que la
Ronda 1.1 dejó a mitad de camino:
1. Restructurá `#attentionCarousel` para que tenga 2 slides dentro del track (el de promos
   actual + uno nuevo con el contenido de `.banner`: imagen `banner-canal.webp`, texto y
   link al canal de WhatsApp), con scroll-snap horizontal y una fila de puntitos debajo
   (`<button class="attention-carousel__dot" data-index="0|1">`), igual que especificaba
   el prompt original de la Ronda 1.1.
2. Borrá el `<div class="banner">` viejo de `renderHome` — su contenido pasa a vivir
   exclusivamente como el segundo slide del carrusel, no en dos lugares.
3. Implementá (o completá, si hay un esqueleto que no se está llamando) `wireAttentionCarousel()`
   en src/app.js: autoplay cada 10 segundos con transición suave, pausa al interactuar,
   puntitos clickeables, y sin autoplay si `prefers-reduced-motion: reduce` — exactamente
   los criterios ya definidos en la Ronda 1.1 y su ajuste posterior. Verificalo de verdad en
   el navegador (contando segundos), no asumas que un `setInterval` en el código alcanza.
4. Restructurá el slide de promos para que el botón "Ver promociones" sea un `<button>`
   real dentro del slide (hoy es un `<span class="attn__cta">` sin comportamiento propio,
   todo el slide es un único `<a>`) — lo vas a necesitar como elemento clickeable
   independiente para el Paso 2. El slide deja de ser un `<a>` que envuelve todo: pasa a
   ser un contenedor (`<div>`/`<article>`) con el botón como único elemento navegable a
   `?cat=Ofertas`, más el listener nuevo del Paso 2 en el resto del slide.

## Paso 2 — Reconectar el pop-up de detalle de promos que ya existe (no crear uno nuevo)
Ya existe en el HTML un dialog completo para esto, hoy oculto y sin usar: `#promoInfo`
(`hidden`, con el botón `#promoInfoOpen`), `#promoInfoDlg` (los 4 tramos, `paymentNote`,
CHACHOS, más un botón que abre `#promoImageDlg` con la imagen ampliada de la promo). Es
contenido de una iteración anterior a la Ronda 1.1 que quedó huérfano. Reusalo:
- Sacá el `hidden` inútil de `#promoInfo` si no vas a mostrar ese bloque en la página (su
  única función real es servir de disparador de `#promoInfoDlg`) — o, si preferís no dejar
  ese markup intermedio sin usar, movés el `id="promoInfoOpen"`/su listener directo al
  slide de promos del carrusel. Cualquiera de los dos caminos es válido: lo que importa es
  que `#promoInfoDlg` (que ya tiene todo el contenido bien armado, incluida la imagen
  ampliada) se abra al tocar el slide.
- Tocar/hacer click en CUALQUIER parte del slide de promos (fuera del botón "Ver
  promociones" reestructurado en el Paso 1) abre `#promoInfoDlg` vía
  `openDialog()`/`wireDialog()` de src/ui.js (el mismo mecanismo que ya usan
  `#promoInfoDlg`/`#promoImageDlg`, no lo reimplementes).
- El botón "Ver promociones" sigue yendo DIRECTO a `?cat=Ofertas` sin abrir el pop-up —
  `stopPropagation()` en su click handler para que no dispare también el listener del
  slide.
- Los puntitos indicadores y cualquier gesto de swipe/drag para cambiar de slide tampoco
  disparan el pop-up (chequeá con `e.target.closest(...)` contra esos elementos, mismo
  criterio defensivo que ya usa el proyecto en otros lados).
- Esto aplica SÓLO al slide de promos. El slide del canal de WhatsApp (nuevo, del Paso 1)
  queda con su única acción de ir al canal — no necesita pop-up de detalle.
- Accesibilidad: si agregás el listener de click al contenedor del slide, sumale también
  `role="button"` + `tabindex="0"` + manejo de `Enter`/`Espacio`, ya que deja de ser un
  único `<a>` enfocable como hoy.

## Paso 3 — Pulido premium de "Elegidos para vos"
Sin tocar `cardHtml` ni la lógica de `dailyPicks`: subile la terminación visual a esta fila
usando los tokens que YA existen en styles.css (nada de colores o sombras nuevas sueltas):
- Encabezado con más jerarquía (usá la escala `.t-h2`/`.t-eyebrow` ya definida, no un
  tamaño de fuente inventado).
- Aplicá `--shadow-card` a las tarjetas si todavía no lo tienen en este contexto puntual, y
  un estado `:active`/hover sutil (mismo criterio de micro-interacción que ya se usa en
  `.btn`/`.chip` en el resto del sitio) para que se sientan tocables, no planas.
- Un desvanecido suave en los bordes izquierdo/derecho del contenedor con scroll
  (`mask-image: linear-gradient(...)` o los dos pseudo-elementos degradados que ya usa el
  proyecto si existe ese patrón en otro carrusel horizontal — revisalo antes de inventar
  uno nuevo) para insinuar que hay más contenido al costado, en vez de un corte seco.
- Separación coherente con el nuevo carrusel de atención — comparalos uno al lado del otro
  y ajustá el `gap`/padding de "Elegidos para vos" si quedó visualmente más chico o más
  apretado que el carrusel de arriba.

## Paso 4 — Chip de descuento en el carrito: sacarlo de estilos inline + arreglo de mobile
Confirmado en el código: `#sheetPromo` (dentro de `#sheetFoot`) ya calcula y muestra bien el
dato real — probado en vivo con un carrito de $152.000 mostró correctamente "Pagando en
efectivo o transferencia: -15% · ahorrás $22.800" — pero está armado en app.js como dos
`<p>` con `style="color:...; font-weight:...; font-size:..."` puestos por JS directo en el
HTML, sin ningún fondo, borde ni `border-radius`: de ahí que no se sienta un chip. Esto
también rompe el principio de "una sola fuente de verdad" del proyecto (estilos que
deberían vivir en una clase de styles.css, no inyectados inline).
- **Diagnóstico de "no se ve en mobile" — hacelo ANTES de tocar nada:** `#sheetPromo` sólo
  se muestra si `applicablePromo(total)` devuelve un tramo, es decir sólo si el carrito
  supera los $50.000 (primer tramo) — si no se ve con un carrito chico, es el comportamiento
  correcto ya especificado en la Ronda 3, no un bug. Probá específicamente con un carrito
  que SÍ supere un tramo (ej. agregando productos hasta pasar $50.000) en un viewport de
  375px real, y recién ahí confirmá si hay o no un problema real de layout/visibilidad —
  no asumas el bug sin haberlo reproducido primero.
- **Rediseño:** movés los estilos de `#sheetPromo` de inline (JS) a una clase nueva en
  styles.css, con aspecto de chip/pill real: fondo `var(--gold-wash)`, borde
  `var(--gold-edge)`, texto `var(--gold-text)`, `border-radius: var(--r-pill)` — mismos
  tokens que ya usa el badge de descuento del carrusel de atención, para mantener el mismo
  lenguaje visual. Un chip para el % del tramo alcanzado + ahorro en pesos, y otro aparte
  (o el mismo con una segunda línea corta) para el % adicional de CHACHOS. `app.js` sólo
  debería seguir poniendo el texto/los datos — no los estilos.
- Mobile-first: los chips tienen que entrar sin cortarse ni forzar scroll horizontal dentro
  de `#sheetFoot` en 375px — si el texto es largo, priorizá abreviar el copy antes que
  reducir la fuente por debajo de lo legible.

## Paso 5 — Auditoría mobile completa (375px)
Repasá en un viewport real de 375px, tema claro y oscuro, TODO lo tocado por las Rondas 1,
1.1, 2 y 3 más lo nuevo de esta ronda:
- Carrusel de atención (los 2 slides, los puntitos, el pop-up nuevo del Paso 2).
- "Elegidos para vos" (scroll, tarjetas, el pulido del Paso 3).
- Sección "Ofertas" y su card informativo de tramos.
- El pop-up de "sumá algo en oferta" antes de WhatsApp (Ronda 2).
- El resumen del pedido con el/los chips nuevos del Paso 4.
Cualquier corte de texto, botón que se sale de la pantalla, tap-target menor a 44px
(`--tap`), o elemento que se superpone a otro en este ancho se corrige acá — es la última
oportunidad de esta tanda de rondas antes de la Ronda 4 (pulido global de motion).

## Paso 6 — Confirmar que quede commiteado y deployado
Dado que se confirmó que producción (`libreria-arias.netlify.app`) no tiene nada de este
trabajo desplegado todavía:
- Corré `git status` y `git log` para confirmar que todo el trabajo de las Rondas 1, 1.1, 2,
  3 y esta 1.2 está efectivamente commiteado (no sólo guardado en el editor).
- Confirmá cuál es la rama que Netlify tiene configurada como la que dispara el build de
  producción (revisá la config de Netlify o preguntá si no es evidente desde el repo) y que
  esos commits estén en esa rama y pusheados al remoto.
- Después de pushear, esperá a que termine el build de Netlify y volvé a cargar
  `libreria-arias.netlify.app` (con un hard refresh o `?_=` para evitar caché) para
  confirmar visualmente que el carrusel de atención y "Elegidos para vos" ya están ahí. No
  des por cerrada esta ronda sin haber visto esto en producción, no sólo en preview/local.

## Qué NO hacer
No rediseñes la paleta de colores ni la tipografía del sitio (eso, si hiciera falta, es
scope de la Ronda 4). No reescribas `cardHtml`, `dailyPicks`, `applicablePromo` ni ningún
cálculo de negocio ya validado en rondas anteriores — esta ronda es de terminación visual,
conexión entre piezas, y un bugfix de visibilidad en mobile, no una reescritura funcional.
No conviertas el slide de WhatsApp en un disparador de pop-up — queda con su único botón
como hasta ahora.

## Criterios de aceptación
- El carrusel de atención tiene 2 slides reales (promos + WhatsApp) con puntitos y
  autoplay de 10s verificado a cronómetro — no queda ningún `<div class="banner">` viejo
  suelto en el DOM ni en el CSS.
- Tocar el slide de promos (fuera del botón/puntitos) abre `#promoInfoDlg` (el dialog que
  ya existía, ahora reconectado) con el detalle real de los tramos; tocar el botón "Ver
  promociones" sigue yendo directo a `?cat=Ofertas` sin abrir el pop-up.
- "Elegidos para vos" se percibe visualmente al mismo nivel de terminación que el carrusel
  de atención (sombra, jerarquía de texto, feedback táctil), sin haber tocado `cardHtml`.
- El chip de descuento del carrito (`#sheetPromo`) usa una clase CSS con los tokens de
  marca (no estilos inline desde JS), y se probó específicamente con un carrito que supera
  un tramo (no sólo con el carrito vacío) en 375px real.
- Recorrida completa en 375px de las 5 piezas del Paso 5 sin cortes, superposiciones ni
  tap-targets menores a 44px.
- Nada de lo que ya funcionaba (buscador, filtros, pedido por WhatsApp, panel admin) se
  rompió — no-regresión respecto al estado previo a esta ronda.
- `git log`/`git status` confirman todo commiteado y pusheado a la rama de producción, y
  una recarga de `libreria-arias.netlify.app` (el main, no el preview) después del build
  muestra el carrusel de atención y "Elegidos para vos" en vivo.
- `npm run dev` y `npm run build` sin errores. Tema claro y oscuro, `prefers-reduced-motion`
  respetado en todo lo nuevo (el pop-up del Paso 2 no necesita animación de entrada más
  allá de la que ya usan los demás dialogs del sitio).

## Cómo trabajar
Tocás src/templates.js, src/app.js, src/ui.js (sólo para reusar sus helpers de dialog, no
reescribirlos), styles.css/styles-parts.css, y los comandos de git para el Paso 6. No toques
src/admin/*, src/ai.js ni netlify/functions/* en esta ronda — quedan para la Ronda 1.3
(admin de promos) y ya fueron tocados por la corrección del asistente de stock.
```

---

## 4.5 Ronda 1.3 — Admin: gestión en vivo de promociones/ofertas

**Por qué existe esta ronda:** hoy `settings.promos` sólo se puede cargar o cambiar con el script puntual de la Ronda 1 (Paso 1) — no hay ninguna forma de que Fran o Adolfo actualicen los tramos de descuento sin pedirle a alguien que edite Firestore a mano. Esta ronda le da al panel de admin un botón para editar esas promos igual que ya existen botones para editar productos/configuración general.

**Sobre "en vivo en tiempo real":** el sitio público es HTML estático (lo genera `scripts/build.js`), no una app que lee Firestore en cada visita — por eso un cambio nunca es instantáneo al 100%. Lo que sí existe y ya se usa en el panel (por ejemplo desde `#settingsForm`) es un *rebuild webhook*: al guardar, el admin le avisa a Netlify que reconstruya el sitio, y en 1-2 minutos el cambio ya está publicado para todo el público, sin que nadie tenga que tocar código. Esta ronda reusa exactamente ese mecanismo — no se promete "tiempo real" literal en la UI, se es honesto sobre el pequeño delay.

**Depende de:** Ronda 1 (el esquema de `settings.promos` en Firestore ya existe y no se modifica, sólo se le agrega una interfaz para editarlo).

```
# Ronda 1.3 — Admin: gestión en vivo de promociones/ofertas

## Contexto
El documento `settings/main` en Firestore ya tiene el campo `promos` (tiers, paymentNote,
chachosPercent, disclaimer) desde la Ronda 1, hoy sólo editable con un script de una sola
corrida. El panel de admin (src/admin/admin.html + admin.js) ya tiene un patrón conocido
para esto: `#settingsForm` edita un documento de Firestore y, al guardar, dispara el mismo
webhook de rebuild que usa `/api/rebuild` en server.js y `netlify/functions/rebuild.js` en
producción — seguí ESE patrón exacto, no inventes uno nuevo.

## Objetivo
Un botón/dialog nuevo en el panel para editar `settings.promos` completo, que al guardar
escriba en Firestore y dispare el rebuild — para que Fran o Adolfo puedan cambiar los
tramos de descuento sin tocar código ni pedirle nada a nadie.

## Paso 1 — Botón y dialog `#promosDlg`
Sumá un botón "Promociones" en el lugar donde ya viven los accesos a `#settingsForm` y
demás herramientas del panel (mismo estilo de botón, mismo lugar de la navegación interna
del admin). Al tocarlo, abrí un `<dialog id="promosDlg">` nuevo siguiendo el mismo patrón
`openDialog`/`closeDialog`/`wireDialog` de src/ui.js que ya usa el resto del panel.

## Paso 2 — Formulario
Adentro del dialog:
- Una lista editable de tramos (`tiers`): cada fila con dos inputs (`minAmount` en pesos,
  `percent` en %) y un botón para borrar esa fila; un botón "Agregar tramo" al final que
  suma una fila vacía. Precargá la lista con los tramos actuales de `settings.promos.tiers`
  al abrir (los datos ya están disponibles en el cliente del admin, mismo lugar de donde
  lee `#settingsForm` para precargar sus campos).
- Un input para `chachosPercent` (%).
- Un input de texto para `paymentNote`.
- Un textarea para `disclaimer`.
- Un texto fijo y visible en el dialog: algo como "Los cambios pueden tardar 1 o 2 minutos
  en verse reflejados en la tienda pública — el sitio se reconstruye automáticamente al
  guardar." — esto es importante, no lo omitas ni lo edulcores a "al instante".

## Paso 3 — Validación antes de guardar
Del lado del cliente, antes de mandar a Firestore:
- Los tramos quedan ordenados de menor a mayor por `minAmount` (si el usuario los cargó
  desordenados, reordenalos vos antes de guardar, no lo rechaces).
- No permitas dos tramos con el mismo `minAmount`.
- `percent` y `chachosPercent` tienen que estar entre 0 y 100.
- Si algo no valida, mostralo con el mismo mecanismo de error que ya usa el panel (no un
  `alert()` nativo) y no dejes guardar hasta corregirlo.

## Paso 4 — Guardado y rebuild
Al confirmar: escribí sólo el campo `promos` en el documento `settings/main` con un merge
(`setDoc(..., { merge: true })` o `updateDoc`, el que ya use `#settingsForm` para no mezclar
dos formas distintas de escribir el mismo documento) — nunca un overwrite completo del
documento que pueda pisar otros campos de settings que no tocó este formulario. Después de
guardar con éxito, disparale al mismo endpoint de rebuild que ya usa `#settingsForm`
(`/api/rebuild` en local, el mismo patrón en producción) y mostrá una confirmación clara
("Guardado. El sitio se va a actualizar en 1-2 minutos.") reusando el sistema de toast/
mensajes que ya tiene el panel.

## Qué NO hacer
No cambies el esquema de `settings.promos` más allá de lo que ya define la Ronda 1 (no
agregues campos nuevos que nadie pidió). No toques `#settingsForm` ni ningún otro formulario
existente del admin — este es un dialog nuevo e independiente. No prometas actualización
instantánea en ningún texto de la UI — el sitio es estático y el rebuild tarda lo que tarda.

## Criterios de aceptación
- Abrir el dialog muestra los tramos, `chachosPercent`, `paymentNote` y `disclaimer` reales
  ya cargados, no un formulario vacío.
- Agregar/borrar/editar un tramo y guardar actualiza `settings/main.promos` en Firestore
  (verificable en la consola de Firebase) y dispara el rebuild.
- Cargar tramos desordenados o con porcentajes fuera de rango se corrige o se bloquea antes
  de guardar, con un mensaje de error visible dentro del panel.
- El texto sobre el delay de 1-2 minutos está visible en el dialog.
- Después de guardar y esperar el rebuild, el badge "Hasta X% OFF" del carrusel de atención
  y el card de tramos de la sección "Ofertas" reflejan el nuevo valor más alto configurado.
- `npm run dev` sin errores; probado en mobile (375px) y desktop, tema claro y oscuro.

## Cómo trabajar
Tocás src/admin/admin.html, src/admin/admin.js y src/admin/admin.css. No tocás
src/templates.js, src/app.js ni el esquema de Firestore más allá de escribir en el campo
`promos` que ya existe.
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

**Antes de correr esta ronda — confirmar con Adolfo:** el prompt calcula el tramo sobre `cartTotal()`, que ya refleja el precio con oferta cuando un producto individual tiene `offer` activa. Es decir, si un producto ya está rebajado por su oferta propia, ese precio rebajado SÍ cuenta para alcanzar un tramo de "Llevá más, pagá menos" — el disclaimer "no acumulable" tal como está redactado en la placa del negocio no aclara si se refiere sólo a no combinar esta promo con otras futuras (cupones, campañas), o también con la oferta por producto. Ver el detalle en la Sección 10.3 de este documento. Es una decisión de negocio, no técnica — hay que confirmarla con Adolfo antes de dar por buena esta ronda, aunque no bloquea empezar a implementarla.

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
   Sumale un `.dialog__grabber` — la barrita pequeña centrada arriba del contenido, mismo
   lenguaje visual que las hojas inferiores de iOS/Rappi — para que se entienda a simple
   vista que el panel es arrastrable, aunque el gesto funcione también tocando cualquier
   parte del header del dialog. Sólo dispará el cierre por arrastre si el gesto empieza
   con el contenido interno ya scrolleado hasta arriba (para no interferir con el scroll
   normal de una lista larga dentro del dialog).
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

## 8. Backlog — Rondas 5 a 10 (prompts completos)

Estas rondas no dependen del lanzamiento de promociones y se pueden reordenar libremente entre sí, salvo las dos marcadas como bloqueadas (7 y 10), que necesitan una respuesta externa antes de poder ejecutarse. Grounding técnico (nombres de archivo/función reales, no supuestos) hecho el 4-5/9/2026 releyendo search-engine.js, ai.js, analytics.js, sitemap.js y scripts/build.js.

### 8.1 Ronda 5 — Ficha de producto: urgencia, prueba social y cross-sell inteligente

**Por qué:** hoy la ficha no da ninguna señal que empuje a decidir ahora, y "también te puede interesar" (`relatedTo()` en scripts/build.js) es sólo *misma categoría + precio parecido* — no aprovecha la taxonomía semántica (`FACETS` de search-engine.js: tags, aliases, audience, ages, occasions, environments, useCases, features) que ya existe para el buscador pero nunca se usó para relacionar productos entre sí.

**Confirmado en el código (no es una suposición):** `product.inStock` es booleano — no existe ningún campo de stock numérico (`stockQty`, `quantity`, etc.) en ningún lado del esquema. Cualquier "urgencia" tiene que basarse en datos reales que sí existen: `product.offer.until` (vencimiento real de una oferta) y `product.featured` (curación manual, ya usada como "Lo más pedido" en la campanita).

**Depende de:** nada de las rondas de promos — independiente.

```
# Ronda 5 — Ficha de producto: urgencia, prueba social y cross-sell inteligente

## Contexto
El catálogo no tiene ningún dato de stock numérico — `product.inStock` es
booleano (confirmado: no hay `stockQty` ni `quantity` en ningún lado del
esquema, ni en Firestore ni en el panel). Por eso cualquier señal de
"urgencia" tiene que basarse en datos que sí existen: el vencimiento real
de una oferta (`product.offer.until`) y la curación manual de
`product.featured` (ya se usa como "Lo más pedido" en la campanita de
app.js). No hay ningún conteo real de "personas compraron esto" ni de
unidades restantes — no se inventa ninguno.

Los relacionados de la ficha de producto (`related`, calculado en
`relatedTo()` de scripts/build.js) hoy son sólo "misma categoría,
ordenado por cercanía de precio". Ya existe una taxonomía mucho más rica
en src/search-engine.js (`FACETS = ['tags','aliases','audience','ages',
'occasions','environments','useCases','features']`, armada por
`enrichProduct`/`buildIndex`) que hoy sólo se usa para el buscador, nunca
para relacionar productos entre sí.

## Objetivo
1. Que `relatedTo()` sugiera, además de la misma categoría, al menos un
   producto de OTRA categoría cuando la taxonomía lo justifica (ej.:
   pilas para un juguete a control remoto).
2. Sumar a la ficha de producto señales honestas de urgencia/prueba
   social, usando sólo datos reales ya disponibles.

NO toques: cardHtml, el comportamiento del buscador principal en la
grilla, ni agregues ningún campo nuevo de stock numérico a Firestore —
eso es una decisión de negocio (¿alguien va a mantener ese número al
día?) que nadie pidió acá.

## Paso 1 — Relacionados por taxonomía, no sólo por categoría
En scripts/build.js, `relatedTo(product)` hoy filtra por
`p.category === product.category` y ordena por cercanía de precio.
Cambiala para que arme la lista en dos pasadas:
1. Igual que hoy: candidatos de la misma categoría, ordenados por
   cercanía de precio (siguen siendo la mayoría de los 4 slots).
2. Antes de completar el cupo de 4, si el producto (enriquecido con
   `useCases` vía `buildIndex`/`getIndex` de search-engine.js) comparte
   al menos un `useCase` con un producto de OTRA categoría, insertá el
   que tenga más solapamiento de `useCases` como uno de los 4
   (desplazando al último de "misma categoría" si hace falta, no
   agregando un 5to producto).
Para esto construí el índice UNA vez en build.js (`buildIndex(visible)`
+ `getIndex()`, mismo patrón que ya usan app.js/assistant.js) y leé
`.facets.useCases` de cada entrada — no reescribas la lógica de
taxonomía que ya vive en search-engine.js. Si `buildIndex`/`getIndex`
no exponen lo necesario, revisá primero si hace falta exportar algo
nuevo de search-engine.js antes de duplicar su lógica en build.js.

## Paso 2 — Señales honestas en la ficha
En templates.js (`renderProduct`) y app.js (donde ya se arma
`product__badges`):
- Si `offerActive(p)` y a `p.offer.until` le quedan 3 días o menos,
  sumá una cuenta regresiva real ("Termina en 2 días", calculada con la
  fecha real, no un texto fijo) — reemplaza o convive con el badge de
  oferta que ya existe, tu criterio, pero no dupliques la información.
- Si `p.featured` es true, sumá un badge/leyenda tipo "Lo más elegido"
  (mismo dato de curación manual que ya alimenta "Lo más pedido" en la
  campanita — no inventes un número de ventas).
- Si ninguna de las dos aplica, la ficha se ve exactamente igual que
  hoy — no fuerces ningún badge sin dato real detrás.

## Qué NO hacer
No agregues ningún campo de stock numérico ni ninguna cuenta de
"personas mirando esto ahora" simulada — son dos patrones muy comunes
en e-commerce, pero sin un dato real detrás van directo en contra del
principio de "no inventar" que ya rige todo el proyecto (IA, descuentos,
todo). No toques cardHtml ni la grilla principal — esto es sólo la
ficha de producto y sus relacionados.

## Criterios de aceptación
- Un producto con complemento real en otra categoría (ej. control
  remoto ↔ pilas, si existe ese par en el catálogo) tiene al menos 1 de
  sus 4 relacionados de una categoría distinta.
- Un producto sin ningún complemento de taxonomía cruzada sigue
  mostrando 4 relacionados de su misma categoría, como hoy (sin
  regresión).
- Un producto en oferta que vence en ≤3 días muestra la cuenta
  regresiva real; uno que vence en más de 3 días no la muestra.
- Un producto destacado (`featured:true`) muestra "Lo más elegido" (o
  el texto que elijas, siempre honesto); uno no destacado no lo muestra.
- `npm run build` sin errores; mobile y desktop, ambos temas.

## Cómo trabajar
Tocás scripts/build.js, src/templates.js y src/app.js (sólo la parte de
`product__badges` de la ficha). Podés importar de src/search-engine.js
lo que ya exporta (`buildIndex`, `getIndex`) — no dupliques su lógica de
taxonomía ni la de `enrichProduct`.
```

---

### 8.2 Ronda 6 — Asistente con personalidad de vendedor ("modo Adolfo")

**Por qué:** el `SYSTEM_TIENDA(s, modo)` de src/ai.js informa bien pero no vende activamente: no pregunta edad/ocasión/presupuesto, no hace upsell, no maneja objeciones típicas ("es caro", "no sé cuál elegir").

**Depende de:** nada — es una reescritura acotada de un único string.

```
# Ronda 6 — Asistente con personalidad de vendedor ("modo Adolfo")

## Contexto
El system prompt actual vive en `SYSTEM_TIENDA(s, modo)`, src/ai.js —
hoy informa bien (no inventa precios/stock, responde en JSON con
`{"respuesta","productos"}`) pero no vende activamente: no pregunta nada
para desambiguar, no ofrece una alternativa más barata cuando detecta
duda por costo, y no cierra hacia agregar al pedido o WhatsApp. Esta
ronda reescribe ESE prompt (no la lógica de `askCatalog`, no el formato
JSON de respuesta, no las reglas de "nunca inventes precio"). El modo
sin IA (`answerLocally` en assistant.js) es sólo buscador por palabras
clave — no tiene forma de tener "personalidad", así que esta ronda sólo
aplica al modo con IA activada.

## Objetivo
1. Ante una consulta ambigua (sin edad/ocasión/presupuesto), el
   asistente pregunta antes de tirar productos al azar.
2. Ante una objeción de precio ("es caro", "no tengo tanta plata"),
   ofrece una alternativa más económica DE LA LISTA de candidatos que ya
   le llegó (nunca inventa un producto fuera de esa lista).
3. Cierra activamente hacia agregar al pedido o escribir por WhatsApp,
   sin ser insistente ni repetir el cierre en cada respuesta.

## Paso 1 — Reescribir SYSTEM_TIENDA
En src/ai.js, extendé el texto de `SYSTEM_TIENDA(s, modo)` (no toques la
firma de la función ni el resto de `askCatalog`) sumando estas
instrucciones de comportamiento, DESPUÉS de las reglas existentes que no
se tocan ("no inventes productos/precios", "no prometas envíos", etc.):
- "Si la consulta es ambigua (no dice para quién es el regalo, para qué
  ocasión, o cuánto quiere gastar) y hay más de 3 candidatos posibles,
  hacé UNA pregunta corta para desambiguar en vez de tirar productos al
  azar — no preguntes si ya tenés dato suficiente."
- "Si la persona dice que algo es caro, no le insistas con el mismo
  producto: mirá la lista de candidatos y ofrecele el que tenga menor
  precio que cumpla lo mismo, si existe uno."
- "Cuando ya recomendaste algo concreto (productos en la respuesta),
  cerrá invitando a agregarlo al pedido o a escribir por WhatsApp si
  tiene dudas — sin repetir este cierre si la conversación ya lo tuvo en
  un turno anterior (mirá el historial)."
Mantené intacto: el límite de 2-3 oraciones, el formato JSON exacto, la
prohibición de inventar precios/stock/promos fuera de lo real.

## Paso 2 — Verificar que el modo sin IA declara sus límites
En assistant.js, si `hasAI` es false, el sub-título del chat ya dice
"Buscador del catálogo" (no "asistente"). Confirmá que sigue siendo así
después de esta ronda — no le agregues ningún intento de "personalidad"
al buscador local, sería inconsistente prometer algo que ese modo no
puede cumplir.

## Qué NO hacer
No cambies el formato de respuesta JSON (`{"respuesta","productos"}`) ni
el límite de 4 productos. No le des al asistente la posibilidad de
inventar un producto que no esté en `candidates`. No agregues lógica de
negociación de precio real (descuentos que no sean los ya reales de
`settings.promos`) — "ofrecer una alternativa más barata" es sugerir
OTRO producto de la lista, nunca bajarle el precio a este.

## Criterios de aceptación
- "Busco algo para mi sobrino" (sin más datos) → el asistente pregunta
  edad y/o presupuesto antes de recomendar, en vez de tirar 4 productos
  al azar.
- "Está caro" sobre un producto recomendado → si existe una alternativa
  más barata en los candidatos, la ofrece por nombre; si no existe
  ninguna más barata, lo dice con honestidad en vez de inventar una.
- Después de una recomendación concreta, el cierre invita a agregar al
  pedido o escribir por WhatsApp, sin repetirse turno tras turno en la
  misma conversación.
- El modo sin IA (`.env` sin `GROQ_API_KEY`, o servidor apagado) sigue
  funcionando exactamente igual que antes de esta ronda.
- `npm run dev` sin errores; probado con conversaciones de varios turnos
  (no sólo una pregunta suelta).

## Cómo trabajar
Tocás sólo src/ai.js (el texto de `SYSTEM_TIENDA`) y, si hace falta
confirmarlo, src/assistant.js sin cambiarle lógica. No tocás
netlify/functions/ai-ask.js, search-engine.js ni el esquema de
Firestore.
```

---

### 8.3 Ronda 7 — "Más pedido" real, alimentado por analytics — 🔒 BLOQUEADA

**Por qué:** hoy `featured` es 100% curado a mano en el panel; ya existen datos reales de vistas/agregados/pedidos que `src/analytics.js` manda a Base44 (`base44.functions.invoke('catalogo-metricas', ...)`, `ARIAS_APP_ID` en ese archivo) — pero esos datos nunca vuelven al catálogo: `analytics.js` sólo ESCRIBE hacia Base44, no hay ninguna credencial ni endpoint acá para LEER de vuelta.

**No tiene prompt completo todavía — falta una respuesta de Rodri/Gonza.**

```
# Ronda 7 — "Más pedido" real, alimentado por analytics

## ⚠️ Esta ronda está bloqueada — falta una decisión externa
`product.featured` hoy es 100% manual (un checkbox en el panel,
admin.js) y alimenta "Destacados primero" en el orden de la grilla y la
sección "Lo más pedido" de la campanita. Los datos reales de
comportamiento (vistas de producto, agregados al pedido, pedidos
enviados) SÍ se están registrando — pero van a Base44
(src/analytics.js, vía `base44.functions.invoke('catalogo-metricas',
...)`), no a Firestore. Este repo no tiene ninguna credencial ni
endpoint para LEER de vuelta esos datos desde Base44 — sólo escribe
hacia allá.

Antes de poder detallar el prompt de esta ronda hace falta que Rodri o
Gonza (el equipo de marketing que administra el dashboard de Base44)
contesten UNA pregunta concreta: **¿Base44 puede exponer esos datos de
vuelta hacia afuera, y de qué forma?** Las 3 respuestas posibles llevan
a implementaciones bien distintas:

**Opción A — Base44 tiene una API/webhook de lectura.**
`scripts/build.js` (que ya corre en cada rebuild y ya lee de Firestore)
llamaría a ese endpoint antes de generar el sitio, calcularía un ranking
real (por vistas/agregados/pedidos de los últimos N días) y lo usaría
para ordenar/marcar automáticamente los productos "más pedidos" — sin
que nadie tenga que tocar el checkbox de `featured` a mano. `featured`
pasaría a ser un ranking calculado, no editado.

**Opción B — Base44 puede exportar (CSV/JSON) pero no tiene API.**
Alguien (Rodri/Gonza) tendría que dejar ese export en un lugar accesible
(un link fijo, un bucket, un Google Sheet publicado) y
`scripts/build.js` lo leería de ahí en cada build — más frágil que la
Opción A (depende de que el export se actualice a tiempo), pero
funciona sin pedirle nada más al equipo de marketing.

**Opción C — Base44 no expone nada de vuelta.**
Esta ronda no se puede hacer con los datos de Base44 tal como están
hoy. La alternativa realista sería que el catálogo empiece a guardar
él mismo un contador simple en Firestore (ej. `orderCount`/`viewCount`
que se incrementa en cada evento relevante, en paralelo a lo que ya
manda a Base44) — pero eso agrega una fuente de datos nueva y paralela,
más trabajo y más lejos del espíritu del pedido original ("usar lo que
ya existe"), así que sólo se haría si se confirma que A y B no son
viables.

## Qué hacer ahora
Preguntale a Rodri/Gonza cuál de las 3 opciones aplica. Una vez
confirmada, este documento se actualiza con un prompt completo tipo
Paso 1/Paso 2/Criterios de aceptación como el resto de las rondas — no
hace falta esperar a que la 5, 6, 8 o 9 estén terminadas para hacer esa
pregunta, se puede mandar en paralelo.

## Depende de
Ninguna otra ronda técnicamente — la única dependencia real es la
respuesta de Rodri/Gonza de arriba.
```

---

### 8.4 Ronda 8 — Fricciones de compra: cantidad y zoom de fotos

**Por qué:** hay que tocar "+" varias veces para agregar más de 1 unidad, y no hay ningún zoom en las fotos de producto — se buscó "lightbox"/"zoom"/"pinch" en todo el repo y no aparece ningún patrón existente para reusar.

**Nota:** el recordatorio de carrito abandonado que mencionaba el alcance original de esta ronda queda A PROPÓSITO fuera del prompt — el propio roadmap lo marcaba como "evaluar, no implementar sin decidirlo antes", y sin email/teléfono del cliente las opciones realistas son pocas (sólo dentro de la misma sesión, vía la campanita). Se retoma en una ronda propia si Fran decide seguir por ahí.

**Depende de:** nada — independiente de las rondas de promos.

```
# Ronda 8 — Fricciones de compra: cantidad y zoom de fotos

## Contexto
Hoy "Agregar al pedido" (tanto en la ficha de producto como en el CTA
fijo de mobile) siempre agrega exactamente 1 unidad — no hay ningún
selector de cantidad antes de agregar, sólo existe un stepper +/- una
vez que el producto YA está en el panel del pedido (`sheetBody`,
app.js, `[data-qty]`). Tampoco existe ningún lightbox/zoom de fotos en
el proyecto: esto es una pieza nueva de punta a punta.

## Objetivo
1. Selector de cantidad en la ficha de producto ANTES de agregar al
   pedido (no cambia nada del stepper que ya existe adentro del panel
   del pedido).
2. Lightbox/zoom en la galería de la ficha de producto.

## Paso 1 — Selector de cantidad en la ficha
En templates.js (`renderProduct`), al lado del botón "Agregar al
pedido" (tanto `.product__actions` como `.stickycta` — son dos lugares
que tienen que quedar sincronizados) sumá un stepper simple (-, número,
+) que arranca en 1, con mínimo 1 (el "-" no baja de ahí). En app.js,
extendé `addToCart(slug, opts)` para aceptar una cantidad
(`addToCart(slug, { qty })`, default 1 si no se pasa) que sume esa
cantidad de una vez al carrito en vez de siempre +1 — el resto de los
llamadores de `addToCart` (delegación global `[data-add]`,
`finishPromoNudge`) siguen mandando 1 como hasta ahora, no los toques.
El stepper de la ficha vive en el DOM de la landing (estado local), se
resetea a 1 después de agregar (no se queda en la cantidad anterior si
la persona vuelve a tocar "Agregar").

## Paso 2 — Lightbox de la galería
En app.js, al tocar la imagen principal (`#stage`) se abre un `<dialog>`
nuevo (patrón `openDialog`/`closeDialog`/`wireDialog` + `enableDragToClose`
de src/ui.js, igual que el resto de los dialogs del sitio) mostrando la
foto a pantalla completa. Adentro:
- Pinch-to-zoom + pan táctil en mobile, click-to-zoom + arrastre en
  desktop — resolvé con CSS transform (scale/translate) y Pointer
  Events nativos, sin ninguna librería (mismo criterio que ya estableció
  la Ronda 4: nada de librerías de animación/interacción, se resuelve
  con CSS + Web Animations API si hace falta).
- Si el producto tiene más de una foto, deslizar (swipe) o tocar los
  costados cambia de foto dentro del mismo lightbox, sincronizado con
  cuál miniatura está activa en `#thumbs` al cerrar.
- Doble-tap (mobile) o doble-click (desktop) alterna entre zoom normal
  y 2x, centrado en el punto donde se tocó.

## Qué NO hacer
No agregues ninguna librería de lightbox/zoom (swiper, photoswipe,
etc.). No toques el stepper que ya existe dentro del panel del pedido
(`sheetBody`), ni `cartTotal()`/`buildOrderMessage()` — esta ronda sólo
cambia CUÁNTO se agrega de una vez, no cómo se calcula el total. No
implementes ningún recordatorio de carrito abandonado (ver nota
arriba).

## Criterios de aceptación
- Poner el stepper en 3 y tocar "Agregar al pedido" deja exactamente 3
  unidades en el panel del pedido (no 1, no hay que tocar "+" tres
  veces).
- El stepper nunca baja de 1 con el botón "-".
- Tocar la foto principal abre el lightbox con esa misma foto;
  pinch-zoom y pan funcionan en un viewport de 375px real.
- Con más de una foto, deslizar dentro del lightbox cambia de foto y la
  miniatura correspondiente queda marcada como activa al cerrar.
- El lightbox cierra con X, fondo, Esc y arrastre hacia abajo (mismo
  criterio que el resto de los dialogs), sin romper el zoom para la
  próxima vez que se abre.
- `prefers-reduced-motion` respetado: el zoom en sí (manipulación
  directa por gesto) no es la clase de animación que ese ajuste busca
  sacar, pero cualquier transición de apertura/cierre del lightbox sí
  debe degradar a un cambio casi instantáneo, igual que el resto de los
  dialogs del sitio.
- `npm run dev`/`npm run build` sin errores; mobile 375px y desktop,
  ambos temas.

## Cómo trabajar
Tocás src/templates.js, src/app.js y styles.css/styles-parts.css. Podés
reusar `enableDragToClose`/`openDialog`/`closeDialog`/`wireDialog` de
src/ui.js tal cual, no los reescribas.
```

---

### 8.5 Ronda 9 — SEO por rubro

**Por qué:** el SEO fuerte está en la home y en cada ficha de producto, pero no hay una URL indexable por categoría ("juguetería en La Rioja") — se pierde tráfico de búsqueda con intención de categoría. Confirmado en el código: `src/sitemap.js` sólo tiene dos patrones de URL (home y producto), y `scripts/build.js` sólo genera esos dos tipos de página — no existe ningún loop por categoría.

**Depende de:** nada — independiente.

```
# Ronda 9 — SEO por rubro

## Contexto
Hoy scripts/build.js genera sólo dos tipos de página: la home
(`index.html`) y una landing por producto (`p/<slug>/index.html`, en un
loop sobre `visible`). No existe ninguna página por categoría —
src/sitemap.js sólo tiene dos patrones de URL: home y producto. Los
rubros viven en `settings.categories` (array de strings tal como los
carga el panel, ej. "Juguetería", con tilde y mayúscula).

## Objetivo
Una página estática por rubro (`/c/<slug-rubro>/`), generada en el
mismo build que ya genera las fichas de producto, indexable y con su
propio SEO — para no perder tráfico de búsqueda con intención de
categoría.

## Paso 0 — Antes de nada: revisá si ya existe una función de slugify
Los productos ya tienen `slug` (se genera al crear el producto, en el
panel). Buscá esa lógica antes de escribir una nueva — los rubros
necesitan el mismo tratamiento (sin tildes, sin espacios, minúsculas:
"Juguetería" → "jugueteria") y no tiene sentido tener dos formas
distintas de slugificar texto en el mismo proyecto.

## Paso 1 — `renderCategory` en templates.js
Nueva función exportada, misma forma que `renderProduct`: recibe la
categoría, la lista de productos visibles de esa categoría y
`settings`, arma un `<title>`/`description`/canonical propios ("Rubro —
Nombre de la tienda"), un JSON-LD `CollectionPage` o `ItemList` (mismo
criterio de `productLd`/`localBusiness` ya existentes, no inventes una
forma nueva de armar structured data), una migaja de pan (Inicio →
Rubro), y la grilla de productos de ese rubro reusando `cardHtml` (no
dupliques esa función).

## Paso 2 — Generarlas en el build
En scripts/build.js, después del loop de productos, un loop sobre
`settings.categories` que escriba `c/<slug>/index.html` con
`renderCategory(...)`, filtrando `visible` por esa categoría. Si un
rubro no tiene ningún producto visible, no genera página (no tiene
sentido indexar una página vacía).

## Paso 3 — Sumarlas al sitemap
En src/sitemap.js, un `entry()` más por cada rubro con página generada
(mismo patrón que ya usa para productos), prioridad intermedia entre
home (1.0) y producto (0.8) — por ejemplo 0.9, ya que es una página de
listado, no la portada ni el detalle.

## Qué NO hacer
No cambies cómo se filtra por rubro en la portada (`?cat=`, los chips)
— esa es una experiencia client-side aparte que ya funciona, esta ronda
es sólo páginas nuevas indexables, no un reemplazo. No inventes
contenido de relleno para el `description` de cada rubro más allá de lo
que ya se puede derivar de datos reales (nombre de la tienda, cantidad
de productos, ciudad).

## Criterios de aceptación
- Cada rubro con al menos un producto visible tiene su página en
  `/c/<slug>/`, con title/description/canonical propios y JSON-LD
  válido.
- Un rubro sin productos visibles no genera página (no hay un 200 con
  una grilla vacía indexable).
- `sitemap.xml` incluye una entrada por cada página de rubro generada.
- Entrar directo a `/c/<slug>/` muestra exactamente los mismos
  productos que tocar ese chip desde la portada (mismo criterio de
  filtro, sin duplicar la lógica).
- `npm run build` sin errores; mobile y desktop, ambos temas.

## Cómo trabajar
Tocás src/templates.js (nueva función `renderCategory`),
scripts/build.js (el loop nuevo) y src/sitemap.js. No tocás app.js ni
el filtro por categoría de la portada.
```

---

### 8.6 Ronda 10 — Señales de confianza — 🔒 BLOQUEADA

**Por qué:** no hay garantía/cambios, testimonios, ni nada que respalde la decisión de compra más allá del precio y la foto. Confirmado: no hay ninguna política de cambios/garantía registrada en ningún lado del proyecto (ni en `settings`, ni en el footer, ni en ningún texto existente) — y no corresponde inventar una.

**No tiene prompt completo todavía — falta una respuesta de Adolfo.**

```
# Ronda 10 — Señales de confianza

## ⚠️ Esta ronda está bloqueada — falta una decisión de negocio
No hay ninguna política de cambios/garantía registrada en ningún lado
del proyecto — y no corresponde inventar una: es un compromiso real que
el local tiene que poder cumplir si alguien lo reclama. Antes de poder
escribir el prompt completo hace falta una respuesta corta de Adolfo a
una pregunta muy concreta:

**"Si alguien compra algo y quiere cambiarlo o devolverlo, ¿qué
hacemos? (plazo, condición del producto, con o sin ticket, quién lo
decide)"**

## Qué sí se puede dejar preparado ya (estructura, no contenido)
Una vez que Fran tenga esa respuesta, la implementación en sí es simple
y de bajo riesgo — la mayor parte del trabajo de esta ronda es la
conversación, no el código:
- La política entraría como texto en `settings` (un campo nuevo, ej.
  `settings.trustPolicy` — additivo, no rompe nada existente), editable
  desde el panel con el mismo patrón que `#settingsForm`/`#promosDlg`
  (Ronda 1.3) — así Fran puede ajustar el texto sin pedir un redeploy
  de código cada vez que cambie una palabra.
- Se mostraría como una sección chica cerca del botón "Agregar al
  pedido" en la ficha de producto (icono + una línea, con un link o
  acordeón a la política completa) — mismo lenguaje visual que el resto
  del sitio, sin colores/sombras nuevos.
- Si en algún momento hay testimonios reales de clientes (no
  inventados), esta ronda también sería el lugar natural para
  mostrarlos — pero eso es un alcance aparte que tampoco está
  confirmado todavía, no asumas que se pide.

## Qué hacer ahora
Preguntale a Adolfo la pregunta de arriba. Con la respuesta, este
documento se actualiza con un prompt completo (Paso 1/Paso 2/Criterios
de aceptación) igual que el resto de las rondas.

## Depende de
Ronda 1.3 (para reusar el mismo patrón de "editar un texto desde el
panel sin redeploy") — ya implementada. La única dependencia real y
bloqueante es la respuesta de Adolfo de arriba.
```

---

## 9. Decisiones registradas (para no volver a discutirlas en cada ronda)

- Rotación del carrusel: **diaria** por defecto (no mensual) — a definir junto con Fran/Rodri si se quiere cambiar, pero no bloquea el arranque.
- El descuento por tramo de pago es **informativo** hasta la Ronda 3 — no se resta del total mostrado como definitivo hasta esa ronda.
- El deadline original ("el viernes" 28/8) ya venció al momento de escribir este documento (2/9/2026) — se prioriza calidad y estándares por sobre volver a apurar una fecha ya perdida.
- Toda esta iniciativa de Promociones (Rondas 1-4) es paralela al roadmap de storefront/conversión que ya se había acordado antes (ver `metodologia.md` en la memoria del proyecto) — las Rondas 5-10 de este documento son, en parte, la continuación de esa auditoría original.
- La Ronda 1.1 se agregó tras probar la Ronda 1 en preview: el banner de promos y el banner de WhatsApp quedaron demasiado chicos/planos para su rol de piezas de mayor atención de la home. Se resuelve fusionándolos en un único carrusel de atención automático (premium, con badge de descuento real y FOMO), no rehaciendo la Ronda 1 completa — el motor de datos, el chip "Ofertas" y "Elegidos para vos" quedaron bien y no se tocan.
- **Hallazgo confirmado por inspección en vivo (4/9/2026):** `libreria-arias.netlify.app` (el "main" de Netlify) no tiene desplegado nada de las Rondas 1/1.1/2/3 ni las correcciones de splash/asistente de stock — se comprobó con selectores esperados ausentes, un volcado completo del DOM idéntico al sitio original pre-proyecto, y un fetch con `cache-control: no-store` que descartó que fuera un problema de caché (headers con `age` de casi 14hs). Esto significa que todo lo probado en preview hasta ahora vive en un deploy preview de Netlify o en el servidor local, no en producción — el pedido de "que quede mejor que la versión original que está en el main" hay que leerlo sabiendo que, en este momento, el main literalmente ES la versión original. Por eso la Ronda 1.2 incluye como criterio de aceptación confirmar que el trabajo quede commiteado y efectivamente deployado, no sólo aprobado en preview.
- La Ronda 1.2 (auditoría integral) y la Ronda 1.3 (admin de promos) se agregaron a pedido de Fran tras probar en preview el conjunto de las Rondas 1, 1.1, 2 y 3: la sensación era de trabajo "bugueado" y no unificado (aun cuando cada ronda individual había cumplido sus propios criterios de aceptación), más dos pedidos nuevos concretos — un pop-up de detalle al tocar el banner de promos, y una forma de editar las promos desde el panel sin tocar Firestore a mano.
- **"Preview" quedó identificado como `https://preview--libreria-arias.netlify.app/`** (el deploy-preview de Netlify de la rama de trabajo), distinto del main de producción mencionado más arriba. Se inspeccionó ese link en vivo (DOM real) el 4/9 y se confirmaron con evidencia concreta tres de los reclamos de Fran: el carrusel de atención de la Ronda 1.1 sólo tiene un slide (el de WhatsApp nunca se fusionó, sigue como banner aparte), ya existe un pop-up de detalle de promos completo pero oculto y desconectado (`#promoInfoDlg`), y el chip de descuento del carrito es texto con estilos inline sin aspecto de chip. Estos hallazgos ya están incorporados como pasos concretos en el prompt de la Ronda 1.2 — no quedaron como una auditoría genérica.

---

## 10. Checklist de validación y profundización senior (Rondas 1-4)

### 10.1 Checklist de validación — Ronda 1 (correr antes de pasar a la Ronda 2)

**Build y datos**
- [ ] `npm run dev` y `npm run build` corren sin errores ni warnings nuevos en consola.
- [ ] `settings/main` en Firestore tiene el campo `promos` completo (4 tramos, `paymentNote`, `chachosPercent`, `disclaimer`) — confirmar en la consola de Firebase o releyendo `data/settings.json` regenerado, no sólo confiar en que el script "corrió bien".
- [ ] Las imágenes en `assets/promos/` son `.webp` (los `.png` originales ya no están).

**Home**
- [ ] Orden exacto: hero → banner de promos → carrusel "Elegidos para vos" → banner de WhatsApp (el que ya existía) → grilla de productos.
- [ ] El carrusel muestra 5 productos reales, en stock y visibles — y si volvés a cargar la página el mismo día, son los mismos 5 (recién cambian al otro día).
- [ ] El banner de atención tiene movimiento sutil (shimmer o pulso, uno solo) y no se siente "gif barato".
- [ ] Las tarjetas del carrusel entran con el stagger sutil al hacer scroll hasta ahí (no todas de golpe).

**Sección "Ofertas"**
- [ ] El chip "Ofertas" aparece con ícono de etiqueta, junto a los rubros.
- [ ] Al tocarlo, sólo aparecen productos con oferta activa real (no todos).
- [ ] Arriba de esos productos hay un card con la imagen de tramos, los 4 montos (tomados de Firestore, no escritos a mano en el HTML), la nota de medio de pago, el % de CHACHOS y el disclaimer.
- [ ] Entrar directo por `tuweb.com/?cat=Ofertas` filtra igual que tocar el chip.

**Mobile, desktop, temas, accesibilidad**
- [ ] Probado en un ancho real de 375px (no sólo estirando la ventana del navegador) y en desktop.
- [ ] Tema claro y tema oscuro, ambos legibles y con buen contraste en el banner y el card de tramos.
- [ ] Con "reducir movimiento" activado en el sistema operativo, ninguna animación nueva se reproduce (banner y stagger del carrusel quedan estáticos).

**Que nada viejo se haya roto**
- [ ] El sistema de oferta por producto (`product.offer`) sigue funcionando exactamente igual que antes de esta ronda.
- [ ] El buscador, los filtros de rubro y el armado de pedido por WhatsApp funcionan como siempre.
- [ ] Un solo commit, con mensaje que hable sólo de la Ronda 1 (nada de la Ronda 2 mezclado ahí).

Si algo de esta lista falla, se corrige dentro de la Ronda 1 antes de avanzar — no se arrastra un defecto a la ronda siguiente.

### 10.2 Profundización — Ronda 2 (asistente + pop-up antes de WhatsApp)

Esta ronda tiene tres piezas independientes entre sí (recomendaciones con precio de oferta, el asistente hablando de tramos, y el pop-up), así que conviene revisarlas por separado en vez de probar todo junto y no saber cuál falló.

**Paso 1 (precio de oferta en el chat).** El riesgo real acá es la duplicación de criterio visual: hoy `cardHtml` decide cómo se ve un precio tachado + precio final en la grilla, y este paso pide reproducir el mismo criterio dentro del chat del asistente, no inventar uno nuevo. Al probarlo, comparar visualmente una tarjeta de oferta en la grilla contra la misma tarjeta dentro del chat — tienen que verse coherentes. Hay que revisar también los dos caminos por separado: con la IA activada (pasa por `netlify/functions/ai-ask.js`) y con la búsqueda local sin IA (pasa por `search-engine.js`) — es fácil que uno de los dos quede andando y el otro no, porque son dos código-fuente distintos armando el mismo dato.

**Paso 2 (el asistente habla de tramos).** Acá el riesgo es que el modelo "invente" o mezcle datos — por eso el prompt es explícito en pasarle los tramos reales como una línea de contexto y no reescribir las reglas existentes de "no inventar precios". Al probar, no alcanza con preguntar "¿tenés promociones?" — conviene forzar también preguntas indirectas ("si compro por 130 mil cuánto me descontás", "puedo pagar con Chachos") para confirmar que responde con los números reales y no aproxima. Con la IA apagada, la detección es por palabras clave (regex) — probar variantes con errores de tipeo o sinónimos ("rebaja", "está en oferta") para ver qué tan sensible queda esa detección; si es demasiado laxa puede disparar en preguntas que no eran sobre promos.

**Paso 3 (pop-up antes de WhatsApp).** El detalle más delicado es el `sessionStorage` de "ya se mostró": probarlo en una sesión nueva (pestaña de incógnito) para confirmar que aparece una vez y no vuelve a aparecer en la misma sesión, y que si se cierra el navegador y se vuelve a entrar, sí puede volver a aparecer (es por sesión, no para siempre). También probar el caso límite: un carrito que YA tiene agregados todos los productos en oferta disponibles — ahí no debería aparecer el pop-up (la condición es "hay oferta que no está ya en el carrito"). Y el caso de catálogo sin ninguna oferta activa: el botón de enviar tiene que comportarse exactamente como antes de esta ronda, sin ningún cambio perceptible.

### 10.3 Profundización — Ronda 3 (descuento real sobre el total)

Esta es la ronda más simple en código y la más delicada en negocio, porque toca un número real de plata que el cliente va a esperar que se respete.

La pregunta de fondo (ya la dejé marcada arriba, en la Sección 6): la promo "Llevá más, pagá menos" está pensada para el ticket total de la compra, pero el catálogo también tiene ofertas por producto individual (`product.offer`) que son un mecanismo distinto y ya existente. Cuando alguien arma un carrito que incluye productos con oferta propia, el total ya viene "rebajado" por esas ofertas antes de evaluar a qué tramo de pago llega. El prompt tal como está escrito toma ese total ya rebajado como base para calcular el tramo — es la interpretación técnica más simple y, para mí, la más razonable del disclaimer "no acumulable" (que probablemente se refiere a no combinar esta promo con otras campañas futuras, no con las ofertas de producto que son parte del precio de lista del día). Pero como es plata real que el local tiene que honrar cuando llega el pedido por WhatsApp, vale la pena que se lo confirmes a tu papá en una frase antes de dar por cerrada esta ronda — algo tan simple como: "si alguien compra productos que ya están en oferta y con eso llega a $150.000, ¿igual le hacemos el 15% adicional sobre ese total, o el descuento por tramo es sólo sobre productos a precio de lista?". La respuesta no cambia una línea de código (el cálculo ya está bien hecho para cualquiera de las dos lecturas de "no acumulable" mientras se refiera a otras campañas) — cambia si hay que agregar una excepción que hoy el prompt no contempla.

Al probar: verificar los montos justo en el límite de cada tramo ($49.999 sin descuento, $50.000 con 5%), y confirmar que el texto que se genera para WhatsApp incluye la misma línea que se ve en pantalla — son dos lugares distintos (`renderSheet()` y `buildOrderMessage()`) y es fácil que uno quede desactualizado si se edita sólo el otro.

### 10.4 Profundización — Ronda 4 (pulido de motion)

Ya sumé al prompt de esta ronda (Sección 7, punto 3) el agregado de una "agarradera" (`.dialog__grabber`) visual en los dialogs de mobile — es el detalle que hace que un gesto de arrastre se sienta "descubrible" en vez de una función oculta que el usuario nunca encuentra; es exactamente el lenguaje visual de las hojas inferiores de iOS y de Rappi que mencionaste como referencia.

El punto más delicado técnicamente es distinguir "el usuario quiere arrastrar para cerrar" de "el usuario quiere hacer scroll dentro del dialog" — por eso el prompt ahora aclara que el gesto de cierre sólo se activa cuando el contenido interno ya está scrolleado hasta arriba. Si se implementa mal, el resultado típico es que cualquier intento de hacer scroll dentro de una lista larga (por ejemplo, el chat del asistente con muchos mensajes) termine cerrando el dialog por accidente — es el bug más común de este patrón y el que hay que probar primero, con un dialog que tenga contenido largo a propósito.

También conviene tener en cuenta que esta ronda toca `prefers-reduced-motion` sobre TODO lo construido en las Rondas 1-3, no sólo lo nuevo de esta ronda — es la única ronda que pide auditar hacia atrás, así que al probarla conviene repasar con la lista de la Sección 10.1 (Ronda 1) y la de esta misma ronda a la vez, activando "reducir movimiento" en el sistema y recorriendo home, ficha de producto, panel de pedido y chat del asistente uno por uno.

Sobre las Rondas 5 a 10: siguen especificadas a nivel de alcance (no como prompt completo) — cuando termines la 4 y quieras seguir, retomamos y armamos el prompt hiperdetallado de la que corresponda con el mismo nivel de profundidad que estas cuatro.
