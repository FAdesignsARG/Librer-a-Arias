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
