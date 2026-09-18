# bar.md — Vara v3 · home v2, catálogo y ficha

**Fecha:** 18/09/2026. Reemplaza como vara vigente a
`work/design-loop/hero-20260915/bar.md` (v2). Motivo: el objetivo cambió con el
brief `home-v2-20260918` (Fran comparó `main` con `preview`). Referencias
elegidas por Fran: **shop.app** (home, página de resultados y ficha),
**Airbnb** (transición del buscador) y Mercado Libre. Specs en
`D:/Descargas/Shop Web - Example/` y `D:/Descargas/Airbnb Example/`.

Lo que sigue igual que en la v2, con su forma de medirlo: H2, H5, H6, H7, H8.
Lo que cambió, y por qué, está marcado.

## Home (`/`)

- **H1 · La marca se presenta en la primera pantalla.** Logo y nombre con el
  lema ("El Temu 2.0 riojano") visibles sin scroll, centrados.
  *Nuevo: pedido 1 de Fran.*
- **H2 · El buscador es el control más grande de la primera pantalla** y ningún
  botón supera la mitad de su área (banners, tarjetas y carruseles son
  contenido). Botón de buscar circular, ≥40px, amarillo, siempre visible.
- **H3 · El buscador queda en la primera mitad de la altura, sin scroll.**
  *Cambió: la v2 pedía el primer tercio. Con la marca arriba (decisión de Fran)
  el buscador baja; en shop.app desktop está al 45%.*
- **H4 · El banner asoma en la primera pantalla** (≥25% de su alto visible a
  375x812 y a 1280x860). Es imagen sola: sin tarjeta, fondo ni borde.
  *Nuevo: pedido 1 y ronda de banners.*
- **H5 · Como mucho tres tamaños de texto sobre el pliegue** (sin contar
  imágenes con texto, como el wordmark o el banner).
- **H6 · Tarjetas de imagen sin borde, radio ≥24px, sombra suave.**
- **H7 · Sin bold:** ningún texto con peso ≥700.
- **H8 · Aire entre secciones ≥48px en celular**, medido en layout.
- **H9 · La home es corta:** altura total ≤16.000px a 375 (antes ~97.000) y como
  mucho 50 productos en la grilla, con una salida clara al catálogo.
  *Nuevo: pedido 7.*
- **H10 · De las tres secciones (tarjetas flotantes, "Un mundo para descubrir",
  carrusel de productos) quedan dos.** *Nuevo: pedido 3.*

## Catálogo (`/catalogo/`, `/c/<rubro>/`)

- **C1 · Página aparte:** sólo buscador, título, filtros y resultados. Ninguna
  sección de la home (banners, rubros, elegidos, visitanos).
- **C2 · Filtros en una sola fila de pastillas**, mismo alto (±2px), radio de
  pastilla, ≥44px, con desplegable propio. Ningún `<select>` nativo a la vista.
- **C3 · El título dice dónde estoy:** "Catálogo", el rubro, o lo que se buscó.
- **C4 · Tras una búsqueda, la primera tarjeta de resultado entra en la primera
  pantalla a 375x812** (nada se interpone entre los filtros y los resultados).
- **C5 · La URL refleja lo que se ve** (`?q=`, `?cat=`) y los enlaces viejos
  (`/?cat=`, `/#catalogo`) siguen llegando.

## Ficha (`/p/<slug>/`)

- **P1 · Foto a la izquierda y columna de compra a la derecha en desktop**; la
  foto sin borde, radio ≥24px.
- **P2 · Las dos acciones principales (Agregar al pedido, Consultar por
  WhatsApp) miden ≥56px de alto** y se ven sin scroll a 1280x860.
- **P3 · Están las cuatro acciones que pidió Fran:** agregar, WhatsApp,
  preguntarle a la IA, compartir. Y más información desplegable.
- **P4 · "También te podría gustar" con al menos 8 productos** y un buscador.
- **P5 · Compartir muestra la vista previa real** y WhatsApp es la acción
  principal (la más grande y la única con relleno amarillo de la hoja).

## Toda la app

- **T1 · Una sola barra de navegación por tamaño:** lateral en desktop, isla
  flotante en celular. Nunca dos a la vez.
- **T2 · Los flotantes (WhatsApp y asistente) no se superponen con ningún
  control fijo** (isla acoplada, barra de compra de la ficha, aviso, puntitos
  del banner) en reposo ni con scroll.
- **T3 · Toque ≥44x44 en todo control; texto ≥14px; contraste ≥4,5:1** (3:1 en
  indicadores), en oscuro y claro.
- **T4 · Vidrio en lo que se superpone, plano en el contenido.**
- **T5 · Una sola promo:** 10% por comprar desde la web. Ningún "20%", medio de
  pago, tramo ni "CHACHOS".

## Decisiones ya tomadas (no se piden revertir)

- Pedido y Menú viven dentro de la píldora del buscador en celular; en desktop,
  en la barra lateral.
- Quedó el carrusel "Elegidos para vos" (rota cada 5 min) y se fueron las
  tarjetas flotantes: el carrusel es la sección `destacados` de Base44.
- El filtro "Calificación" no existe todavía: no hay reseñas y el proyecto
  prohíbe inventarlas. Favoritos y reseñas son para más adelante (Fran).
- El cartel "CUPÓN DESCUENTO" es parte del banner que diseñó Fran.
- El splash de entrada corre una vez por sesión; no es parte de lo que se mide
  salvo que deje algo roto al terminar.
- Hoy todos los productos tienen una sola foto: la galería con miniaturas no se
  puede evaluar.
- El orden de Tab en celular recorre campo → ideas → Ver resultados → Pedido →
  Menú (si fuera al revés, las ideas quedarían inalcanzables con teclado).
- El aviso flotante y el bloque "¿No encontraste…?" los carga Rodri desde
  Base44 (texto y contenido no son de esta vara; su tamaño y dónde caen, sí).
