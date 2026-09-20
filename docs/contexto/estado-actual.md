# Estado actual y continuidad

Actualizado: 17/09/2026, hora local Argentina. Carpeta acordada: `D:\Descargas\catalogo-arias`.
Snapshot de Git al retomar el rediseño: rama `preview`, HEAD `8f41fb1` (`hero v5`).
Comprobar el estado real al retomar: hay trabajo concurrente y modificaciones previas.

## Personas, producto y prioridades
- Fran coordina el trabajo; la librería pertenece a su padre, Adolfo.
- Adolfito, una grulla, es la mascota de la marca.
- La prioridad de esta etapa es consolidar un sistema visual muy detallado que guíe las próximas mejoras.
- El catálogo debe resultar sencillo de entender y usar, especialmente en móvil, con mejores flujos, estados y movimiento útil.
- El usuario pide ahorrar tokens sin reducir calidad y usar VoltAgent como fuente principal de referencias en cada pedido de diseño.
- Mantener comunicación en español simple y preguntar solo por faltantes que afecten el trabajo.

## Decisiones persistentes
- Trabajar sobre la carpeta D acordada; estas instrucciones pertenecen al proyecto.
- Para una tarea nueva iniciada fuera del repo, cargar explícitamente `D:\Descargas\catalogo-arias\AGENTS.md`.
- Aplicar la metodología de `token-design-optimizer.md`; su original y adaptación están en `docs/metodologia/`.
- Consultar referencias con selección progresiva; no cargar todo el repositorio de VoltAgent en cada turno.
- Respetar decisiones del usuario y requisitos de accesibilidad/uso; distinguir base visual existente, propuestas y aprobación.
- `DESIGN.md` resume el sistema; `docs/design-system/` mantiene los módulos; conservar `docs/design-system.md` como base heredada.
- Un Design Loop requiere evidencia y tres críticos independientes; no hay aprobación válida por una revisión simulada.
- Mantener modelo/esfuerzo elegidos; recomendaciones de eficiencia no equivalen a cambiar la configuración.

## Arquitectura verificada por lectura de código el 11/09/2026
- Node.js con módulos JavaScript y HTML generado por plantillas; no hay una migración a React/Tailwind seleccionada.
- Firestore es la fuente de verdad; el servidor lee datos y el build genera `dist/` para Netlify.
- Firebase Auth protege el panel y Firestore conserva sus cambios.
- Cloudinary gestiona imágenes; Base44 aporta control de marketing y analítica.
- `data/*.json` de la raíz es material anterior; no usarlo como fuente actual sin una razón explícita.
- Los comandos `dev` y `build` de `package.json` incluyen `--use-system-ca`.
- El mapa de entradas, dependencias y verificaciones está en `mapa-proyecto.md`.

## Evidencia histórica disponible, no reejecutada en esta adaptación
Fuente: `docs/setup-estado-pc.md`, comprobación fechada 10/09/2026.
- El setup registró servidor en `http://localhost:4321`, home y una ficha con HTTP 200.
- Registró 486 productos visibles y compilación de 486 fichas más 6 páginas de rubro.
- Registró acceso a la pantalla de ingreso del panel; no inició sesión ni verificó escrituras.
- Registró `GROQ_API_KEY` vacía y `/api/ai/status` con `enabled: false`.
- Registró `BUILD_HOOK_URL` sin configurar y ausencia de Netlify CLI y Claude Code en PATH.
- No se deben presentar esas cantidades, procesos o credenciales como comprobados nuevamente hoy.

## Rediseño de la home — estado autoritativo (17/09/2026)
- La publicación `preview` todavía muestra el hero anterior con el arreglo de orden de la Ronda 0. **Ninguna versión del hero nuevo fue publicada.** Los commits v1–v5 existen solamente en la rama local `preview`.
- Ronda 0 (orden roto): publicada en preview. Ronda 1 (medición, objetivo y referencias): cerrada. Ronda 2 (hero): v5 local en revisión. Rondas 3–7 (grilla/tarjeta, ficha/agregar, pedido/WhatsApp, estados y cierre desktop/producción): pendientes.
- La v4 obtuvo Calidad PASS, Objetivo FAIL y Sistema FAIL. La v5 corrige los puntos señalados: oculta Ofertas también en el menú cuando no hay ofertas reales; presenta tres accesos iguales en una fila móvil con ícono sobre texto; reduce el énfasis de Pedido; separa sugerencias de WhatsApp; usa foco oscuro visible sobre el aviso amarillo; reduce el aviso móvil por debajo del 10%; y evita reconstruir un aviso idéntico para conservar el foco.
- El foco del aviso se comprobó con Tab real. Falta reconstruir y guardar el paquete de evidencia de v5 y ejecutar tres críticos independientes sobre la misma versión congelada. Un PASS anterior no se arrastra a v5.
- La prueba actual usa una copia estática parcheada porque la cuota de Firestore impide reconstruir con datos reales. Cuando el servicio se reponga, hay que generar nuevamente, revisar con datos reales y recién después publicar el hero en `preview`.
- Pendientes conocidos: páginas de rubro y fichas desbordan 14px a 320px y hoy lo ocultan con `overflow-x: hidden`; avisar a Rodri que `configuracion_pagina` funciona y que el destino inexistente de “Ver productos” fue corregido; retirar `src/home-motion-preview.local.html`, incluido por error en un commit; y reservar el paso de `preview` a `main` para la Ronda 7.
- Decisión vigente de Fran: una sola isla/buscador; al hacer scroll se transforma en el buscador flotante inferior al estilo de Shop.app. Vidrio solo en superficies flotantes. En móvil, Pedido permanece visible y el menú se integra en la misma isla.

## Pendientes y límites conocidos
- PDF premium del sistema visual generado en `output/pdf/libreria-arias-sistema-visual-v0.1.pdf` el 11/09/2026; render verificado con Poppler en 9 páginas A4.
- El generador reproducible está en `scripts/build_visual_system_pdf.py`; usa ReportLab, assets reales de marca y producto, y resume la base de `DESIGN.md`.
- Se pidió evaluar una alternativa gratuita de IA antes de activar la integración; no hay proveedor nuevo seleccionado.
- La disponibilidad del servidor, la IA y servicios externos debe comprobarse cuando la tarea los necesite.
- Publicación desde el panel, escritura autenticada, GitHub, Netlify y subida a Cloudinary requieren comprobación específica según el alcance.
- Esta adopción metodológica no ejecuta publicación, migración de datos, instalación de herramientas ni cambio de stack.
- No afirmar reducción porcentual de tokens, superioridad de modelos ni resultados de Design Loop sin evidencia real.

## Cómo continuar
1. Leer `AGENTS.md` y revisar cambios actuales antes de editar.
2. Recuperar el objetivo vigente del usuario; usar este estado como apoyo, no como sustituto de su pedido.
3. Para diseño, abrir `DESIGN.md`, el módulo relevante y el índice de referencias; identificar qué reglas están vigentes y cuáles son propuestas.
4. Consultar solo la implementación afectada con ayuda del mapa y verificar dependencias compartidas.
5. Registrar nuevas decisiones y pruebas con fecha, versión y alcance; conservar el historial necesario por enlaces.

## Promo única 10% web (17/09/2026, rama `preview`)
- Decisión de Fran: los tramos "Llevá más, pagá menos" (5-20%) y el 10%
  por CHACHOS no existen; la única promo es 10% sobre el total por comprar
  desde la web, no acumulable.
- `settings/main.promos` en Firestore pasó a `{ webPercent: 10, disclaimer }`
  con `scripts/set-web-promo.js` (imprime el valor anterior). `webPromo(s)`
  en `src/templates.js` es la única fuente para página, pedido, WhatsApp,
  asistente local, prompt de la IA y admin.
- Verificado sobre el build: sin ningún "20%"/tramo/CHACHOS en la home;
  pedido de $54.450 → "Descuento web 10%: -$5.445 · Total con descuento:
  $49.005", mismas líneas en el mensaje de WhatsApp.
- Se sacan de la home el lema de rubros (`.home-tagline`) y el bloque de
  título/subtítulo/CTA que mandaba Base44 (redundante con la sección de
  rubros y el pie). `applyHero` sigue existiendo y no rompe si no hay nodos.
- Borrada `assets/promos/promo-llevamas-pagamenos.webp` (mostraba los
  tramos falsos).
- Link de revisión aparte de preview y producción:
  https://diseno--libreria-arias.netlify.app (Base44 no tiene ese dominio
  habilitado: ahí no aparece el aviso flotante).
- Pendiente de confirmar en un teléfono real: que Enter en el buscador
  baje a los resultados (el navegador de pruebas manda la tecla sin `key`).

## Sistema de vidrio (17/09/2026, Ronda 3, rama `preview`)
- `src/glass.css` (se carga último, en todas las páginas): tokens `--glass-*`
  por tema y su aplicación. Oscuro: rgba(24,24,26,.86) + blur 28px + borde
  de luz arriba (Apple). Claro: rgba(255,255,255,.88) + blur 24px (shop.app).
- Lleva vidrio todo lo que se superpone: hojas y modales (pedido, orden,
  menú, promo, pop-up de ofertas, bienvenida, asistente, novedades),
  sugerencias del buscador, isla, dock, botón flotante, barra pegajosa,
  nav, barra de filtros del catálogo, chips y accesos. El pedido (FAB,
  contador de la isla, Mi pedido) lleva glow amarillo. El contenido
  (tarjetas de producto, hero, secciones) sigue plano.
- Fallbacks: sin `backdrop-filter` → superficie sólida; con
  `prefers-reduced-transparency: reduce` → sólido y sin blur. OJO: el
  navegador de pruebas del panel tiene esa preferencia activa, así que ahí
  el vidrio no se ve salvo que se borre esa regla en la pestaña; en un
  teléfono o desktop normal sí se ve.
- Verificado a 375 (oscuro y claro) y 1280 (claro): valores computados
  correctos en isla, chips, hoja del pedido, menú y nav; fondo detrás de
  los modales desenfocado.

## Isla que respira (17/09/2026, Ronda 4, rama `preview`)
- `src/home-search-motion.js`: acoplada abajo, la cápsula pasa a `is-compact`
  al bajar más de 14px entre lecturas, y vuelve a ofrecerse al subir, al
  quedarse quieta 900ms o al recibir foco. El vuelo de acople entra con un
  leve rebote de escala (.96 → 1.02 → 1, 440ms). `schedule()` suma un
  respaldo por `setTimeout(120)` porque algunos WebViews frenan rAF con
  scroll de inercia.
- `src/home.css`: ofrecida 64px (60 en desktop), recogida 52px (48) sin el
  rótulo "Pedido" (queda ícono + cantidad); con foco crece a 1.02 y sube el
  glow. `src/glass.css`: glow amarillo permanente mientras está acoplada.
- Verificado por clases a 375: ofrecida 72/64, recogida 60/52 sin rótulo,
  foco con glow. Con scroll real: una corrida completa correcta (recogida
  al bajar, ofrecida al quedarse quieta y al enfocar, suelta al volver al
  hero); las siguientes no son concluyentes porque el panel del navegador
  no genera cuadros y en Chrome los eventos de scroll van atados a ellos.
  **Probar en teléfono real**: bajar rápido por el catálogo (se recoge),
  frenar (se ofrece), subir un poco (se ofrece), tocar (crece y brilla).

## Comparación directa con shop.app (17/09/2026, skill design-mobile-arias)
Referencia: `D:/Descargas/Shop Web - Example/DESIGN (2).md` + medición en vivo
de shop.app a 375px. Medido en vivo, no de memoria:

| Mecanismo | shop.app | Arias ahora |
|---|---|---|
| Píldora de búsqueda | 343x64, radio 32, y=104 | 343x70, radio 999, y=78 |
| Círculo de acción | 40x40, siempre visible | 44x44 (la lupa), siempre visible, sombra teñida amarilla |
| Chips/accesos | 44px de alto, 16px, radio 9999, una fila | 48px, 16px, radio 999, una fila desplazable |
| Tarjetas de imagen | radio 28, sombra doble, sin borde, rótulo como chip | radio 28, sombra doble, sin borde, chip de vidrio abajo a la izquierda |
| Tamaños de texto sobre el pliegue | 3 (12/14/18) | 3 (14/17/22) |
| Títulos | 20px semibold, tracking apretado | 22px 600, tracking -.04em |
| Aire entre secciones | 64-80px | 48px celular / 64px desktop |
| Pedido y menú dentro de la píldora | no | sí (decisión: isla única) |

Cambios de esta pasada: la lupa pasa a ser el botón de buscar (círculo
amarillo siempre visible, con lo que el envío ya no depende del botón
oculto); el rótulo "Pedido" se oculta hasta 420px (queda ícono + cantidad,
el campo gana 56px); accesos como pastillas en una fila; tarjetas de
"Un mundo para descubrir" y "Elegidos" con radio 28, sombra doble y chip
de vidrio; tarjetas de la escena con nombre en una línea y precio debajo.
Verificado a 375 (oscuro y claro) y 1280: sin desborde, 3 tamaños de texto.

## Ronda de los tres críticos sobre la home v8 (18/09/2026)
Veredictos: objetivo FAIL, sistema FAIL, calidad PASS (7/9 contra shop.app;
eligió Arias). Corregido en esta ronda (capa al final de `src/glass.css`):
- Aviso flotante y aviso de "agregado" pasan a vidrio; el aviso baja de
  343x76 amarillo sólido a ~60px con un punto amarillo (ya no supera al
  buscador ni compite con la lupa).
- Sin bold: 42 pesos >600 bajados a 600 en todo el CSS, más `strong/b/h*`.
- Halo de la promo acotado (se recortaba en rectángulo); promo alineada a
  16px y hueco descubrir→promo de 118 a 48px.
- Pedido con productos: fondo amarillo tenue en la isla; "Mi pedido"
  amarillo pleno en desktop (`data-empty` en `#homeOrderCount`).
- Tarjetas de producto sin borde, foto enmarcada con radio propio.
- Hoja del pedido: toques ≥44, textos ≥14px, secundarios en `--text-2`.
- Chips de filtros a 44px; × del buscador ya no queda bajo Menú; anillo de
  foco del buscador y de la promo con `--text`; fila de pastillas arranca
  en x=16; placeholder entra a 320; menú dice "Novedades".
Pendiente, no resuelto: a 1280 el Tab hacia adelante salta los accesos
(Catálogo/Preguntar/WhatsApp); la pastilla de WhatsApp sigue asomando
cortada en celular (shop.app hace lo mismo con su fila); `#waBanner`
todavía es tarjeta (Ronda 6, banners); falta re-correr los críticos.

## Ronda de los tres críticos sobre la home v9 (18/09/2026)
Medido sobre `90e3545`. Veredictos: calidad PASS (9/9 contra shop.app, eligió
Arias), objetivo FAIL, sistema FAIL. Corregido en esta ronda (capa "v9" al
final de `src/glass.css` + `src/app.js` + ideas en `src/templates.js`):
- Tab hacia adelante a 1280 salteaba Catálogo/Preguntar/WhatsApp: los accesos
  seguían `inert` hasta el `focusout`, y el navegador elige el destino antes.
  Se les saca `inert` en el `keydown` de Tab de la última parte de la búsqueda.
  Verificado con Tab real: Ver resultados → Catálogo → Preguntar → WhatsApp.
- Ideas del buscador: "Regalos" devolvía los 551 productos (es ocasión de casi
  todos los rubros) y "Mochilas" 1. Ahora Peluches (28), Lapiceras (16) y
  Auriculares (4): una por rubro fuerte.
- Promo: `home.css` dejaba todos los slides con `padding:0`; la tarjeta de
  promo tiene borde y el contenido lo tocaba. 20px en celular, 32/40 desktop.
- "Un mundo para descubrir" sangra hasta el borde (antes corte recto en x=359)
  y las tarjetas pasan a 156px para que la tercera asome ~23px.
- Pedido vacío: ícono amarillo en la isla; en desktop, contador con anillo.
- Hoja del pedido: vacía tiene "Ver el catálogo" (cierra y baja a la grilla),
  mensaje a contraste ≥4,5:1, tamaños 14/16/20, nombre del producto con toque ≥44.
- `has-text` quedaba pegado tras Borrar o tocar una idea; `aria-expanded` del
  Menú no volvía a `false`; el aviso de "agregado" ahora es `role="status"`.
- Piso 14px y contraste en pie y estado de horarios; toques ≥44 en "Ver en el
  mapa", teléfono, enlaces del pie y botones del chat.
- 320px: el placeholder entra (99,7 de 110px) y la consulta escrita gana 70px útiles.
Descartado por artefacto del entorno: el hueco Elegidos→catálogo "de 28px" era
el `translate 14px` de las tarjetas sin revelar (sección + ítem); en layout
hay 56px en celular y 64 en desktop. Tampoco es defecto que la isla acoplada
no se achique sin scroll real (se recoge sólo al bajar rápido).
Pendiente de decisión de Fran: lema bajo el wordmark; isla clara en tema claro
(¿o siempre oscura?); cartel "CUPÓN DESCUENTO" de la mascota (no hay cupón);
bloque "¿No encontraste…?" configurado desde Base44 que queda arriba de los
resultados; tarjeta amarilla de horarios; dos barras flotantes a 1280;
pastilla de WhatsApp cortada a 375.

## Ronda de los tres críticos sobre la home v10 (18/09/2026)
Medido sobre `aff3d25` (v9). Veredictos: calidad PASS (9/9), objetivo FAIL,
sistema FAIL. Corregido:
- Las ideas de la v9 se habían elegido por cantidad de resultados y no por lo
  que devolvían ("Lapiceras": 16 productos, ninguna lapicera). Ahora Termos,
  Relojes y Auriculares, comprobadas corriendo `src/search-engine.js` en Node
  sobre `products.json` (todo lo que devuelven corresponde).
- Con una búsqueda escrita manda la relevancia: los destacados de Base44 sólo
  reordenan el catálogo sin buscar (antes "Peluches" abría con un secaplatos).
- `aria-expanded` del Menú sigue al atributo `open` del `<dialog>` con un
  `MutationObserver` (el evento `close` no dispara en el panel de pruebas y
  puede no disparar en WebViews); cubre también `#menuBtn` en desktop.
- La × de borrar a 375: el `mousedown` le daba foco al botón, la isla cambiaba
  de forma y el click caía en otro lado. Ningún botón de la búsqueda roba foco.
  Verificado con click real: borra al primer intento.
- Pedido con productos en celular: botón entero amarillo con glow, como a 1280.
- Placeholder a 16px (3 tamaños sobre el pliegue); vista de resultados en
  14/16/17 (chips y bloque de Base44 tenían tamaños fraccionarios).
- Pedido y Menú ya no saltan al medio del panel al buscar; las pastillas
  tapadas no dejan hueco (`display:none`; `app.js` las destapa antes del Tab).
Decisión de diseño registrada (no es defecto): en celular el Tab recorre
campo → × → ideas → Ver resultados y recién después Pedido y Menú. Mientras se
busca, Pedido y Menú están ocultos; si fueran antes en el orden, enfocarlos
cerraría el panel y las ideas quedarían inalcanzables con teclado.

## Home v2 — cambio de objetivo y Ronda A (18/09/2026)
Fran comparó `main` con `preview` y cambió la dirección: brief textual en
`work/design-loop/home-v2-20260918/brief.md` (rondas A–E). Sobre la v10 sólo
llegó el crítico de calidad (PASS 8/9; brecha: el aviso flotante de Base44
mide 59% del buscador); objetivo y sistema murieron por límite de uso y no se
relanzaron porque el objetivo cambió.
Ronda A, hecha:
- Logo (grulla) al centro y wordmark **con el lema** "El Temu 2.0 riojano"
  (`wordmark-dark/light.webp`, los mismos de `main`; los `*-logo.webp` sin lema
  quedan sin uso y nunca estuvieron en git).
- Fuera las tarjetas flotantes del hero (`.home-scene`). Queda el carrusel
  "Elegidos para vos hoy" porque es la sección `destacados` que Rodri controla
  desde Base44.
- El carrusel de banners (`promos`) sube: va pegado al hero y asoma en la
  primera pantalla a 375 y a 1280.
- Vuelven los flotantes de WhatsApp y de la IA en la home (`.dock`); "Mi
  pedido" no se duplica. Suben 88px cuando la isla está acoplada o está el
  aviso (hasta 1040px de ancho).
- Pastillas: Catálogo · Ofertas (si hay) · Novedades. Preguntar y WhatsApp
  salieron de ahí para no duplicar los flotantes.
Medido a 375 y 1280: sin desborde. A 1280 el buscador queda en y=342 (40% de
la altura): la marca arriba es pedido de Fran; hay que actualizar la vara
antes de los próximos críticos.

## Home v2 — Ronda B: "Elegidos para vos" rota cada 5 minutos (18/09/2026)
- `src/recommend.js`: `rotatingPicks()` baraja el catálogo elegible una vez por
  ciclo y cada tramo de 5 minutos (`rotationSlot()` = hora / 5 min) toma su
  porción de 5: todos ven lo mismo a la misma hora, sin guardar nada, y nada se
  repite hasta dar la vuelta al catálogo (comprobado en Node: 50 tramos
  seguidos, 0 repetidos). Los destacados que Rodri carga en Base44
  (`arias:featured-products`) entran hasta dos por tramo. `dailyPicks()` sigue
  existiendo para el build y para quien lo use.
- `src/app.js`: al cargar los datos pinta el tramo vigente sin animar; en cada
  cambio de tramo cambia tarjeta por tarjeta con 110ms de escalón
  (`is-leaving` 420ms → `is-entering`). Con pestaña oculta o movimiento
  reducido cambia sin animación; al volver a la pestaña se pone al día.
- `src/glass.css`: la tarjeta que sale se empaña y se achica; la que entra
  aparece detrás de un barrido de vidrio (`backdrop-filter` + franja de luz).
  Barrita de tiempo bajo el título que se llena en 5 minutos.
- Verificado en el navegador esperando el cambio real de tramo: secuencia de
  clases correcta en las 5 tarjetas y 5 productos nuevos. La calidad visual de
  la animación no se puede juzgar en el panel (no genera cuadros): **mirarla en
  el deploy**.

## Home v2 — Ronda C1: filtros del catálogo en una fila (18/09/2026)
Fran: "lo veo roto, con los filtros mal diseñados y los botones a diferentes
alturas". Medido antes: orden y precio en una fila aparte, a la derecha, con
radio 14; pastillas de rubro en otra fila con radio 999; sin título. Ahora la
sección tiene título ("Catálogo") y una sola fila: todo 44px y radio de
pastilla. En celular van primero los dos botones redondos (orden, precio) y
las pastillas siguen en la misma fila, desplazables hasta el borde; en desktop
las pastillas a la izquierda y orden/precio a la derecha. Sin desborde a 375
ni a 1280. Falta el resto de la Ronda C (catálogo como página aparte y home con
50 destacados), que espera el OK de Fran porque saca de la home la sección
`productos` que Rodri ordena desde Base44.

## Home v2 — Ronda C2: catálogo como página aparte, sin afectar a Base44 (18/09/2026)
Condición de Fran: "que no afecte a Rodri". Contrato relevado en
`src/page-control.js` y `src/analytics.js`: cinco secciones, cuatro slots,
`productIds` destacados, aviso, WhatsApp, mantenimiento; las métricas leen
`#search`, `#grid` y `#chips .chip[aria-pressed]`.
- `renderHome({ mode })` arma las dos páginas con un solo cuerpo: los bloques
  van marcados `<!--home-only-->` / `<!--catalog-only-->` y `only()` deja los
  que corresponden. `scripts/build.js` escribe `catalogo/index.html`; entra al sitemap.
- Home: mismas 5 secciones y 4 slots. `productos` = "Destacados" (50, los
  `featured` y los `productIds` de Base44 primero) + "Ver todo el catálogo".
  La página pasó de ~97.000px a ~12.500px de alto a 375. Sin filtros en la home.
- `/catalogo/` (`body.page-home.page-catalog`, así reutiliza todo el CSS y el JS
  de la isla): marca chica que vuelve al inicio, buscador, `h1` que dice
  "Catálogo", el rubro o `Resultados para "x"`, filtros en una fila, grilla.
  Sin `data-arias-section` (ocultar `productos` en la home no la vacía). La URL
  refleja búsqueda y rubro (`?q=`, `?cat=`) con `replaceState`.
- Buscar desde la home, las pastillas, "Un mundo para descubrir", el menú y la
  ficha de producto llevan a `/catalogo/…`. Los enlaces viejos (`/?cat=`,
  `/?q=`, `/#catalogo`) redirigen con `location.replace`.
- El slot `debajo_buscador` en el catálogo va después de la grilla (el bloque
  "¿No encontraste…?" tapaba los resultados; lo habían marcado dos críticos).
- Verificado a 375 y 1280: home con 50 tarjetas; `/catalogo/?q=termos` → 7
  termos; `/?cat=Bazar#catalogo` → `/catalogo/?cat=Bazar` con 127 productos y
  la primera tarjeta en y=332; tocar un rubro actualiza título y URL; buscar
  desde la home navega; sin desborde. Nota para Rodri en
  `docs/base44-integracion/RESUMEN-PARA-RODRI.md`.
- Pendiente de la ronda C: las páginas estáticas `/c/<rubro>/` (SEO) siguen con
  el diseño viejo y sin buscador; hoy nada de la home enlaza a ellas.

## Compartir productos + mobile más grande (18/09/2026)
Pedido de Fran (puntos 12-14 del brief `home-v2-20260918`).
**Compartir**
- `shareCardUrl()` en `src/cloudinary-config.js`: tarjeta 1200x630 en JPG armada
  por Cloudinary en la URL (foto a la derecha; marca, nombre, precio y "10% OFF
  comprando por la web" a la izquierda, colores de Arias). No se genera ni se
  guarda ninguna imagen. Antes el `og:image` era la foto cuadrada con `f_auto`
  (el robot de WhatsApp podía recibir AVIF/WebP) y sin medidas declaradas.
- Fichas `/p/<slug>/`: `og:image` = esa tarjeta, más `og:image:width/height/type/alt`,
  `product:price:amount/currency` y `og:availability`.
- `src/share.js` (módulo propio, en todas las páginas; hubo que sumarlo a la
  lista de copias de `scripts/build.js`): cualquier `[data-share]` abre una hoja
  de vidrio con la vista previa real, "Enviar por WhatsApp" como acción
  principal (`wa.me/?text=` con nombre en negrita, precio, promo y el enlace al
  final, que es lo que WhatsApp usa para la vista previa), "Instagram y más"
  (menú de compartir del teléfono; sólo aparece si existe `navigator.share`),
  Facebook, Mail (`mailto:`), Copiar enlace, "Copiar diseño para mail" (bloque
  HTML con imagen, nombre, precio y botón, al portapapeles) y "Bajar imagen"
  (`fl_attachment`, para historias y publicaciones de Instagram).
- Botón "Compartir" en la ficha y botón redondo de 44px arriba a la derecha en
  cada tarjeta (los datos viajan en `data-share-*`, no depende de products.json).
- Emite `arias:share-open` y `arias:share` (con `via`) en `window`. **No** se
  mandan a las métricas de Base44 todavía: sumar un evento nuevo hay que
  coordinarlo con Rodri.
- Probado en local: la hoja abre con la imagen 1200x630 cargada y los enlaces
  bien armados. **Falta probar la vista previa real en WhatsApp**, que sólo se
  puede con una URL pública: hoy las fichas de `diseno--…netlify.app` ya la
  tienen; en `libreriaarias.com.ar` recién cuando esto pase a producción.
**Mobile más grande**
- Flotantes de WhatsApp y asistente: 60px (antes 52), íconos de 28px.
- Chat: mensajes 16px, accesos rápidos de 52px con acento amarillo, productos
  con foto de 76px, nombre 16px, precio 17px en amarillo y "+" de 52px; campo de
  52px a 16px (evita el zoom de iOS), enviar de 52px; en celular ocupa 92dvh.
- Tarjetas en celular: radio 26, nombre 16px, precio 20px en amarillo, "+" de
  48px amarillo siempre visible, compartir de 44px.

## Tercera tanda del 18/09/2026: filtros, flotantes, ficha y splash
Pedidos 15-20 del brief `home-v2-20260918`.
**Filtros del catálogo (pedido "importantísimo")**
- Pastillas con desplegable como las de shop.app: Categoría · Precio ·
  Destacados (interruptor) · Ordenar, más "Limpiar filtros" cuando hay algo
  aplicado. Cada pastilla muestra lo elegido y se invierte cuando filtra.
- Los `<select>` nativos (`#sort`, `#priceFilter`) siguen guardando el estado
  pero ya no se ven: el desplegable del sistema era lo que se veía mal. Los
  rubros pasaron a la hoja de Categoría y siguen siendo `#chips .chip[data-cat]`
  (las métricas de Base44 no cambian).
- `openFilterSheet()`: en celular, hoja inferior con filas de 52px y tilde; en
  desktop (≥721px), desplegable de vidrio anclado debajo de la pastilla, sin
  oscurecer la página.
- "Destacados" filtra `p.featured` + los `productIds` de Base44; se oculta si no hay.
- **"Calificación" no se construyó**: no existen reseñas (Fran las pidió para
  más adelante, con registro) y el proyecto prohíbe reseñas inventadas. Queda
  el lugar previsto en la fila.
- Probado: Precio → 91 productos; + Bazar → 32; + Destacados → 3; Limpiar → 551.
**Flotantes**
- WhatsApp vuelve a ser amarillo pleno (el sistema de vidrio lo había dejado
  como un círculo oscuro con aro). El asistente lleva la cara de Adolfito
  (`assets/brand/adolfito-cara.webp` y `@96`, recortadas con sharp de la
  ilustración de la promo): asoma de una pastilla de vidrio "Preguntame" en
  desktop y de un círculo con aro amarillo en celular; se inclina al pasar el mouse.
**Ficha de producto (referencia: shop.app)**
- Desktop: foto grande a la izquierda (radio 28, fondo blanco); si hay más de
  una foto, miniaturas en columna y cambio con desenfoque + barrido de luz.
  **Hoy los 551 productos tienen una sola foto**: la galería queda lista.
- Columna de compra: precio grande, línea "Comprando por la web: $X · 10% OFF"
  (la promo real, ya calculada), cantidad, Agregar al pedido, Consultar por
  WhatsApp (con `data-arias-whatsapp-message`, así Base44 puede cambiar el
  número sin perder el mensaje), Preguntarle a la IA y Compartir.
- Desplegables con información real: Descripción (con "Leer más" si pasa de 320
  caracteres), Cómo comprar, Retiro en el local y horarios.
- "También te podría gustar": 12 relacionados (antes 4; completa con otros
  rubros por precio parecido) en grilla de 6 columnas, y un buscador de vidrio
  que flota abajo (en celular va fijo en su lugar, porque abajo está la barra
  de Agregar) y lleva a `/catalogo/?q=`.
**Splash de entrada**
- El splash de siempre (logo redondo con rebote y anillo) vuelve a correr en
  todas las páginas, una vez por sesión. En la home usa la variante
  `splash--home`: logo y nombre apilados como en el hero; el nombre se descubre
  de izquierda a derecha, de borroso a nítido; a los 1,5s los dos vuelan hasta
  la posición exacta del logo y el nombre del hero (medida por layout) mientras
  el fondo se desvanece. El último cuadro del splash es la home. Verificado a
  375 y 1280: aterrizaje con ≤1px de diferencia; al terminar se oculta solo y
  guarda `arias.splash.visto`.
- La calidad del movimiento no se puede juzgar en el panel de pruebas: mirarlo
  en el deploy (en una pestaña nueva o de incógnito, porque corre una vez por sesión).

## Ronda 6 — banners como imagen sola (18/09/2026, con los diseños de Fran)
Fran: "hay que quitar estas tarjetas horribles" y usar sólo la imagen, en buen
tamaño, como en `main`, alternando cada 10 segundos con una animación suave.
- `scripts/build_banners.cjs` (sharp): toma los PNG originales (4096x1562 y
  3066x3164, 3-4 MB cada uno, en `Banners de Adolfito/` y `Banners Mobile/`,
  **sin versionar**: pesan 14 MB), recorta el margen transparente con la misma
  caja para los dos banners de cada par (misma proporción → se funden sin que
  la página salte) y exporta WebP con transparencia: desktop 1600/1000px
  (56-112 KB) y celular vertical 1000/640px (84-149 KB) en `assets/promos/`.
- La sección `promos` (mismo `data-arias-section`, mismo id `attentionCarousel`)
  pasa a ser `.banners`: dos `<picture>` apilados en la misma celda; el activo
  está nítido y el otro desenfocado, agrandado y transparente; el cambio es un
  fundido de 0,9s. `<source media="(max-width:720px)">` sirve los verticales.
  Sin tarjeta, fondo, borde ni glow.
- `wireHomeBanners()` en `src/app.js`: cambia cada 10s; se pausa con el mouse
  encima, con foco, con la pestaña oculta y 6s después de tocar un puntito o
  deslizar; con movimiento reducido no avanza solo. Puntitos con toque de 44px.
- El banner de la promo (`#promoBanner`, ahora un `<button>`) abre "Comprando
  por la web" (el detalle de la promo); el del canal (`#waBanner`) va al canal
  de WhatsApp. Verificado: clic, puntitos, rotación real a los 10s, 1280 y 375.
- El slot `debajo_buscador` de Base44 en la home volvió junto a los productos:
  pegado al hero (como quedó en la C2) empujaba el banner fuera de la primera pantalla.
- Queda sin uso el CSS viejo de `.attn__*` y `assets/brand/banner-canal.webp`.

## Ícono oficial de Adolfito en el asistente (18/09/2026)
Fran pasó el ícono oficial (Adolfito con auriculares, globito y pulgar arriba;
`Iconito Chat/Iconito Chat oficial.png`, 2670x2560, sin versionar). Se recortó el
margen, se dejó cuadrado y se exportó a `assets/brand/adolfito-chat.webp` (256px,
24 KB) y `adolfito-chat@128.webp` (10 KB). Va entero, sin recortar en círculo, en el
botón flotante del asistente (80px asomando de la pastilla en desktop, 84px sobre
el círculo en celular) y como avatar de 52px en la cabecera del chat. Se borró el
recorte provisorio `adolfito-cara*.webp`.

## Botones flotantes, versión única (18/09/2026)
Fran: Adolfito quedaba pegado al texto y desproporcionado; en celular "se ve raro";
pidió que "Preguntame" destaque mucho más y que no se superpongan con nada.
- Se borraron las tres capas anteriores del dock en `glass.css` y quedó un solo bloque.
- Desktop: los dos a 64px de alto, alineados por abajo, 14px entre sí. WhatsApp es un
  círculo amarillo limpio (se sacó el aro que latía). "Preguntame" es una pastilla de
  vidrio con aro amarillo de 1,5px y glow que respira (3,6s); Adolfito a 80px con 10px
  de aire a la izquierda y 12px antes del texto, asoma 20px por arriba y tiene un vaivén
  suave (se acelera al pasar el mouse); 31px de aire a la derecha del texto; 17px/600.
- Celular: WhatsApp 60px, asistente círculo de 68px con el mismo aro y glow y Adolfito
  de 84px asomando; 16px entre los dos.
- No pisan nada (medido): con la isla acoplada o el aviso suben 92px (24px de aire sobre
  la isla); en la ficha quedan 20px arriba de la barra de "Agregar"; los puntitos del
  carrusel de banners se corren a la izquierda en celular; en la ficha a ≤1100px el
  buscador flotante deja de flotar; con cualquier diálogo abierto los flotantes se ocultan.
  `.dock` tiene `padding-top` para que el globito de ayuda se ubique arriba de la cabeza
  de Adolfito y no encima.
- Con movimiento reducido no hay respiración ni vaivén.

## Ronda D — barra lateral de navegación en desktop (18/09/2026)
Pedido 9 del brief: panel lateral como el de shop.app; en mobile la navegación
sigue siendo la isla flotante.
- `railHtml()` en `src/templates.js`, en todas las páginas: logo arriba (con un
  punto verde/rojo de abierto/cerrado y el detalle en el título), Inicio,
  Catálogo, Mi pedido (contador; amarillo con glow cuando hay productos),
  Ofertas (se oculta sola si no hay ofertas activas), Novedades (con el punto
  de la campanita), tema claro/oscuro, y abajo el Menú. Etiqueta al costado al
  pasar el mouse o con foco. Marca la página actual con `aria-current`.
- No trae lógica nueva: usa `data-open-order`, `data-open-menu` y `data-guide`
  (news / theme), que ya existían. `#themeBtn` y `#bellBtn` siguen en la barra
  de arriba, que en desktop queda oculta pero sigue en el DOM.
- Desde 1024px: `body` con 80px de margen izquierdo, `.nav` oculta (ya no
  conviven la barra de arriba y la isla de abajo: era un pendiente de los
  críticos), la isla acoplada y el aviso se centran respecto del contenido, y
  el hero arranca más arriba (el buscador pasó de 40% a 35% de la altura).
- Favoritos no tiene ícono todavía: Fran lo pidió para más adelante y un botón
  que no hace nada sería peor que no tenerlo.
- Verificado a 1280 en home, catálogo y ficha (todos los botones, página actual,
  sin desborde) y a 375 (la barra no existe, la de arriba sigue, sin cambios).

## Ronda E — el buscador viaja de arriba hacia abajo (18/09/2026)
Pedido 8 del brief: la transición del buscador de Airbnb (de grande a chico,
muy suave), pero en Arias de arriba hacia abajo y en vidrio.
- Antes la isla aparecía desde abajo del borde de la pantalla con un rebote.
  Ahora **el mismo formulario viaja** (`src/home-search-motion.js`, sin clones):
  sale de su lugar en el hero, baja hasta acoplarse mientras se achica
  (760x82 → 600x80 en desktop; en celular mantiene el ancho) y llega con un
  rebote mínimo; 640ms, curva `cubic-bezier(.22,.9,.24,1)`. Al volver arriba
  hace el camino inverso (520ms) y aterriza sobre su lugar real; un fundido de
  140ms tapa cualquier diferencia si la página siguió moviéndose.
- Se animan el ancho y el alto reales, no una escala: el texto no se deforma.
  (No se usa `filter` en el formulario: rompería el `backdrop-filter` del vidrio.)
- Si el origen quedó muy lejos (salto por un ancla), el vuelo arranca apenas por
  encima del borde; nunca cruza la página entera. Si al volver el hero no está
  a la vista, sale hacia abajo como antes.
- Durante el vuelo el formulario lleva `is-flying`: más glow amarillo, borde de
  luz y un barrido que cruza la píldora una vez (`.search::after`); no recibe
  toques a medio camino. Con movimiento reducido no hay vuelo (ya era así).
- Verificado por DOM forzando el scroll (el panel no genera cuadros): cuadros
  clave correctos en los dos sentidos y aterrizaje exacto en x, y y ancho.
  **La suavidad hay que mirarla en el deploy o en un teléfono.**

## Páginas de rubro `/c/<rubro>/` con el diseño del catálogo (18/09/2026)
- `renderCategory()` conserva sus metadatos (título, descripción, canónica,
  `CollectionPage` + migas + `ItemList` en JSON-LD) y delega el cuerpo en
  `renderHome({ mode: "catalog", category, inCategory })`: es la misma página
  que `/catalogo/` (buscador, filtros en pastillas, grilla), abierta en ese
  rubro, con `h1` = rubro y **los productos del rubro ya en el HTML** (antes
  de que cargue el JS y para buscadores).
- `app.js`: `PAGE_CAT` (de `#catalogo[data-initial-cat]`) es el rubro inicial.
  Mientras se ve ese rubro sin búsqueda la URL sigue siendo `/c/<rubro>/`; al
  cambiar de rubro o buscar pasa a `/catalogo/?cat=…&q=…` con `replaceState`.
  Un rubro con página pero sin opción en el filtro (Electrónica, 6 productos)
  se filtra igual.
- "Un mundo para descubrir" y la miga de la ficha enlazan a `/c/<rubro>/`.
- Verificado: `/c/bazar/` (127), cambio a Librería → `/catalogo/?cat=Librería`
  (8), `/c/electronica/` (6), barra lateral marca "Catálogo".
- Las fichas pesan ~70 KB de HTML (12 relacionados, hoja de compartir, barra
  lateral); `dist/` pasó de 31 a 49 MB. Comprimido es poco, pero si molesta, el
  primer recorte es bajar los relacionados de 12 a 8.

## `main` dentro de `preview` + revisión de Fran en el deploy (19/09/2026)
- **Merge de `main` en `preview`** (`a2a0831`): `preview` ya trae lo que se pasó a
  producción el 18/09 (precio legible en relacionados, relacionados en 2 columnas,
  tamaños de la ficha, globito anclado al dock, tandas de 48 con "Ver más
  productos", `aria-expanded` en las pastillas, pausa del carrusel, Tab a Pedido
  y Menú, foco sobre fotos, hoja de compartir, filtros 2x2 en celular, "celular
  más grande" y `siteUrl` real). Conflictos sólo en el final de `glass.css` (van
  las capas de las dos ramas, primero las de `preview`) y en dos constantes de `app.js`.
- **Bug del vuelo del buscador (Fran: "se va hacia arriba")**, `home-search-motion.js`:
  en desktop la barra de arriba está oculta, así que la vuelta se disparaba con
  el hueco apenas asomando; y el destino se calculaba una sola vez al despegar,
  con la página todavía subiendo. Ahora: despega apenas la píldora toca el borde
  de arriba (todavía a la vista, opacidad 1: no "aparece de la nada"), vuelve
  sólo cuando su lugar está entero en pantalla (24px de histéresis), y el vuelo
  de vuelta (`track()`) relee el hueco en cada cuadro: aterriza exacto y se funde.
  Respaldos por tiempo en los dos sentidos (`is-flying` nunca queda puesto).
- **"Elegidos para vos"**: `.picks__head` (grilla en línea): la barrita mide lo que
  el título (4px de alto) y "Cambian cada 5 minutos" pasa a 14px sin mayúsculas.
  De paso: `.picks > .shell` se encogía y centraba (título suelto) → `width:100%`.
- **Banners**: puntitos → flechas circulares de vidrio (52px; 44px en celular, a
  caballo del borde). En celular se arrastra y el banner acompaña al dedo
  (`--drag`, `touch-action:pan-y`). Abajo queda sólo la pausa (la de `main`);
  con la pausa puesta, una flecha no reanuda el avance solo.
- **La isla es un solo componente** (Fran: "que no se separe al abrirlo"): la regla
  genérica de vidrio le ponía `position:relative` al panel de ideas y quedaba en
  el flujo, corrido. Ahora el panel **envuelve** a la píldora (8px alrededor) y se
  despliega desde ella con `clip-path` (hacia abajo en el hero, hacia arriba
  acoplada); la píldora pasa a ser el campo de adentro. En celular: círculo de
  buscar 52px, íconos 24px, botones 48px, isla de 68px (56 recogida), el "0" del
  pedido vacío se oculta (el campo gana ~20px). El menú en celular se despliega
  desde la forma de la isla; en desktop abre pegado a la barra lateral.
- **Barra lateral, lo que quedó corrido**: los flotantes suben sobre la isla
  acoplada entre 1041 y 1400px (pisaba 38px a WhatsApp a 1280); el aviso de
  Base44 arranca después de la barra (`left: rail + 24`) y sube cuando hay isla o
  buscador de ficha; el cartelito de "agregado" sale arriba en celular.
- **Enlace compartido**: en `/p/…` no corre el splash ni se abre el cartel de
  elegir tema (queda para cuando pasen por la home).
- Los rubros del menú van a `/c/<rubro>/` (`catHref`), igual que la home.
- Medido por DOM a 320, 375 y 1280: sin desborde; vuelo con aterrizaje exacto;
  isla abierta 12,206–363,553 envolviendo la píldora 20,214–355,284.
  **La suavidad del vuelo, el despliegue de la isla y el arrastre hay que
  mirarlos en el deploy / teléfono** (el panel de pruebas no genera cuadros).

## Ronda 2 de críticos sobre la vara v3 (19/09/2026)
Veredictos y detalle en `work/design-loop/home-v2-20260918/criticos-ronda2.md`.
Los tres dieron FAIL, con los pedidos de Fran cumplidos; se corrigieron 15 puntos
(flotantes vs panel del buscador, acceso al pedido en la ficha, aire en el chat,
aterrizaje del vuelo, cartelito, campo al escribir, aviso en la ficha, 5 columnas,
"Limpiar" en rubros, pedido en la barra lateral, total con descuento, piso de
tamaños y contraste en la ficha, foco sobre fotos, H8, 320px). Quedan como
decisión de Fran: filtros de a uno por fila en celular (densidad), buscador
flotante en la ficha en celular, e isla en la ficha.

## Vuelo de ida, Mi pedido v2, Novedades v2 y botón flotante de pedido (19/09/2026)
Fran aprobó el vuelo de vuelta ("quedó hermosa") y pidió lo mismo hacia abajo,
reconstruir el carrito y las notificaciones "en el estilo de shop.app" y un
botón de pedido arriba a la derecha en desktop.
- **Vuelo de ida** (`home-search-motion.js`): usa el mismo motor que la vuelta
  (`track()`, ahora con `{ down, fade }`), espejado: misma curva, seguimiento del
  hueco cuadro a cuadro. La píldora se despega de la página de a poco y baja a
  acoplarse (620 ms). Sólo se funde si el origen quedó fuera de pantalla.
- **Mi pedido v2** (`renderSheet()` en `app.js`, marcado en `templates.js`, capa
  "MI PEDIDO v2" al final de `glass.css`): panel de vidrio flotante con margen en
  desktop (480px, radio 32) y hoja alta en celular (hasta 94dvh). Cabecera con
  título de 26px + cantidad. Bloques: promo aplicada, **una tarjeta por producto**
  (foto 96px, nombre 17px, precio unitario, cantidad con botones de 44px, total de
  línea 19px, quitar con tachito), "Vaciar pedido" con **confirmación en un cartel
  de vidrio dentro de la hoja** (`#cartConfirm`, role alertdialog), **"Sumá algo
  más"** (8 sugerencias deslizables con "+", salen de `rotatingPicks` sin lo que ya
  está en el pedido) y **resumen** (subtotal, descuento web, total de 30px). Pie:
  total a pagar (con descuento), "Enviar pedido por WhatsApp" de 60px, y "Copiar
  pedido" / "Llamar" como botones de 48px. Vacío con Adolfito + sugerencias.
  Cambiar una cantidad **no redibuja** la lista (actualiza números en su lugar y
  late el número); quitar pliega la tarjeta (300 ms) antes de sacarla.
  Se conservan `#sheet`, `#sheetBody`, `#sheetFoot`, `#sheetTotal`, `#sheetSend`,
  `#sheetCopy`, `#sheetSent*` y el mensaje de WhatsApp (no cambió). `#sheetTotal`
  ahora muestra el total CON descuento; el desglose vive en el resumen
  (`#sheetPromo` queda siempre oculto).
- **Novedades v2**: mismo cuerpo de panel. Cada novedad es una tarjeta con foto de
  72px, motivo ("Nuevo en el catálogo", "Oferta hasta…"), nombre 16px, precio 17px
  y **"+" de 48px para sumarla al pedido** sin salir (si no hay stock, flecha).
  Secciones con título de 18px y contador.
- **Botón flotante de pedido en desktop** (`#cartFloat`, ≥1024px, arriba a la
  derecha): aparece con el primer producto (entrada con rebote), muestra cantidad
  y total; al sumar late, suelta un aro dorado y sube un "+N". Abre el pedido. El
  "Mi pedido" del bloque de flotantes se oculta en desktop (quedaban tres entradas).
- Medido por DOM a 375 y 1280: sin desborde en las hojas, ningún texto <14px,
  ningún toque <44px, el href de WhatsApp sigue llevando "Descuento web 10%".

## Ficha de producto v3: con la isla y sin la barra vieja (19/09/2026)
Pedido de Fran: las fichas "quedaron con el diseño viejo de la nav arriba y no
tienen el buscador de isla flotante ni nada de lo nuevo". Referencias: shop.app
y Mercado Libre. Vale para las 565 fichas (salen todas de `renderProduct()`).
- **Misma base que home y catálogo**: el `<body>` de la ficha es ahora
  `page-home page-product` (carga `home.css`, usa el menú de la isla y la barra
  lateral). En `app.js`, `IS_PRODUCT` excluye a la ficha de `IS_HOME`; buscar desde
  la ficha lleva a `/catalogo/?q=` y los rubros del menú navegan por su `href`.
- **La isla es una pieza reutilizable**: `searchIslandHtml(buy)` en `templates.js`
  (la usan home, catálogo y ficha; mismos IDs: `#homeSearchAnchor`, `#homeSearch`,
  `#search`, `data-open-order`, `data-open-menu`). En la ficha vuela y se acopla
  igual que en la home.
- **Cabecera mínima** (`.product-hero__bar`): volver al rubro, marca (lleva al
  inicio) y compartir; debajo, el buscador. Se fue la barra de arriba vieja (en
  celular ya no se ve `#nav`; en desktop está la barra lateral). Las migas quedan
  sólo en pantallas anchas.
- **La barra fija de "Agregar" se integró a la isla**: `#islandBuy` (foto, precio,
  nombre y "Agregar") aparece como una fila más de la MISMA superficie de vidrio
  cuando el botón "Agregar al pedido" ya quedó arriba de la pantalla (clase
  `has-buy`; se calcula en el scroll). Respeta la cantidad elegida. Se eliminaron
  `.stickycta` y `.psearch` del HTML. Los flotantes suben por encima.
- **Más información para decidir**: bloque "lo que tenés que saber" (`.pfacts`):
  retiro en el local con la dirección, abierto/cerrado en vivo (`#hoursCardStatus`)
  y "confirmamos por WhatsApp". Todo sale de `settings`: nada inventado.
- **Relacionados**: cabecera con "Ver todo <rubro>" y atajos "más como este"
  (las palabras de `tags` del producto → `/catalogo/?q=`).
- Desktop: la galería queda fija (sticky) mientras se lee la columna de compra;
  "Agregar" y "WhatsApp" siguen entrando sin scroll a 1280x860 (y=649 y 717).
- Medido por DOM a 320, 375 y 1280: sin desborde, ningún texto <14px, vuelo y
  aterrizaje exactos, fila de compra y menú funcionando. Sin errores de JS.

## El "salto" del vuelo de ida (19/09/2026)
Fran: "pega un salto y de golpe aparece abajo" (la vuelta sí se veía bien).
Causa: al despegar, el formulario deja de ocupar `#homeSearchAnchor` y el hueco
se achicaba de 82 a 80px (su `min-height`); el `ResizeObserver` llamaba a
`resize()`, que ante cualquier animación en curso hacía `move(desired, true)`:
acople inmediato. En la vuelta el hueco no cambia durante el vuelo. En celular lo
mismo lo disparaba la barra del navegador al esconderse (`visualViewport.resize`).
Arreglo en `home-search-motion.js`: (1) un vuelo "live" (`track()`) ya no se corta
por un resize: se reprograma y listo; (2) el extremo acoplado se mide desde abajo y
se relee en cada cuadro (acompaña a la ventana si cambia de alto); (3) el hueco
conserva su alto (`min-height` en línea) mientras el formulario está afuera: la
página no se mueve ni un píxel al despegar o aterrizar. **Ojo al probar:** en el
panel de pruebas el ResizeObserver no dispara; se reproduce despachando
`window.dispatchEvent(new Event('resize'))` en pleno vuelo.

## Mensajes de Rodri del 19/09 (Base44)
- **"Producto compartido"** conectado en `analytics.js` (`wireShareEvents()`
  escucha `arias:share` de `share.js`; `datos.canal`). Sólo en `preview`.
- **Productos que no llegan a producción**: en Netlify falta `BUILD_HOOK_URL`
  (sólo están `FIREBASE_SERVICE_ACCOUNT_JSON`, `GROQ_API_KEY`, `NODE_VERSION`,
  `SECRETS_SCAN_OMIT_PATHS`); `/api/rebuild` responde 503 y el panel de
  administración nunca dispara el build. Existe un build hook creado el 20/08.
  Producción: 551 productos (último deploy 18/09 20:40); preview: 565.
  **Pendiente del OK de Fran**: cargar la variable y reconstruir `main`.
- CORS de `diseno--`: medido, sigue en 403 (producción responde 200/201).
- Respuesta completa para Rodri: arriba de todo en
  `docs/base44-integracion/RESUMEN-PARA-RODRI.md`.

## Pase a producción del 19/09/2026 (noche)
Con el OK de Fran ("promoverla a producción en el main"): `origin/main` avanzó de
`6e313dc` a `66314d5` (avance directo, sin forzar: `main` ya era ancestro de
`preview`). Netlify construyó solo desde GitHub. Respaldo: etiqueta
`prod-antes-20260919`. Verificado en https://libreria-arias.netlify.app: 565
productos, home/catálogo/rubro/fichas 200, barra lateral, flechas, `#cartFloat`,
isla y `#islandBuy` en la ficha, `og:url` correcto, las 5 `data-arias-section`.
- Se cargó `BUILD_HOOK_URL` (contexto production). `POST /api/rebuild` → 200 y
  build "triggered by hook": el panel de administración vuelve a publicar solo.
- Base44 desde producción: config 200, Visita/Vista 201, aviso corto visible
  ("¿No lo encontrás? Escribinos"). **"Producto compartido" → 422** (Base44 todavía
  no acepta el tipo; el mismo cuerpo con "Vista de producto" da 201).
- Desde ahora `preview` y `main` están en el mismo commit: lo nuevo se trabaja en
  `preview` y se promueve con `git push origin preview:main` (siempre con OK).

## Skill "Librería Arias - Control" y Panel v2, fase 1 (19/09/2026)
- Fran aprobó todo lo de la sesión y pidió guardarlo como skill:
  `.claude/skills/libreria-arias-control/` (principios, tokens, patrones, movimiento,
  referencias y flujo de trabajo). Cargarla en todo trabajo de Arias.
- **Panel de administración, fase 1 (sólo CSS)**: capa "PANEL v2" al final de
  `src/admin/admin.css`. Entrada, barra de arriba en vidrio, buscador y filtros en
  pastilla, lista como tarjetas, barra de selección como isla, diálogos como paneles
  de vidrio, campos grandes con foco dorado. **No se tocó `admin.js` ni ningún id.**
  Verificado a 375 y 1280 con filas de muestra (sin sesión no hay datos): sin
  desborde, toques ≥44. Falta verlo con datos reales (Fran inicia sesión) y la fase 2.
- Fase 2 propuesta: desplegables propios en lugar de los `<select>` nativos, estado
  de publicación visible ("publicando… / publicado hace X"), acceso a ver y compartir
  la ficha desde cada fila, y revisar editor de fotos, carga masiva, asistente de
  stock, reportes y tutorial pantalla por pantalla.
