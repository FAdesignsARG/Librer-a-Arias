# Campañas desde Gestión → web (08/10/2026)

La web representa lo que manda `catalogo-metricas` → `configuracion_pagina`.
No hay nada de ninguna campaña en el código: cambiar la campaña es cambiar
el `BloquePagina` en Gestión. La web vuelve a leer la configuración cada
60 s (y al volver a la pestaña): **no hace falta deploy**.

Código: `src/collections.js` (lógica), `src/page-control.js` (bloques),
`src/app.js` (colección y destacados), `src/page-control.css` (diseño).
Prueba: `node tmp/test-colecciones.mjs`.

## 1. Colección por bloque
- Ruta: `/catalogo/?coleccion=<clave>` (ej. `?coleccion=mes-madre-2026`).
- Muestra **sólo** los productos del bloque, en el orden de Gestión. Mientras
  carga muestra tarjetas vacías (nunca el catálogo entero). Si el bloque no
  existe, venció o no tiene productos en la web: aviso + "Ver todo el
  catálogo".
- Rubro, precio y orden filtran dentro de la selección.
- **Buscar no se limita a la colección (08/10):** con texto en el buscador se
  busca en todo el catálogo público ("6 productos en todo el catálogo") y
  aparece "Volver a …" (sale del `cta_texto`: "Ver regalos para mamá" →
  "Volver a regalos para mamá"). Al borrar la búsqueda vuelve la selección.
  Vale para todas las colecciones.
- Carrito, ficha y WhatsApp funcionan igual en los dos modos.
- Productos borrados u ocultos se omiten.
- El CTA del bloque va solo a su colección si `cta_url` está vacío o es
  `/catalogo/`. Cualquier otro `cta_url` se respeta.

### Campo `product_slugs` (Base44 lo manda desde el 08/10)
`product_ids` trae IDs de Product de Base44, que la web no reconoce si el
producto no está vinculado (sin `sourceId`). Por eso cada bloque manda

```json
"product_slugs": ["espejo-con-luz-led-exxtra-tech", "..."]
```

con el `catalog_slug` de cada Product, en el mismo orden. Si viene, la web
usa eso; si no, prueba `product_ids` como slug y como `sourceId` (sirve
para los productos que se vayan vinculando por `/api/productos`).

## 2. Destacados de la home
`config.productos_destacados` (slugs) ya manda: la tanda de "Destacados"
empieza por esos productos en el orden exacto de Gestión y después se
completa con los destacados de la web (hasta 50). También alimentan
"Elegidos para vos". Verificado con la lista actual (espejo, masajeador,
limpiador de brochas…). Se agregó: si Gestión responde antes de que cargue
el catálogo, la lista ya no se pierde.

## 3. Bloque `tipo: "Destacado"`
Tarjeta de campaña: etiqueta con la cantidad real ("16 productos
elegidos"), título grande, texto, CTA amarillo de 56 px y, al costado (abajo
en celular), `imagen_url` si viene o 4 fotos reales de la colección.

### Campo opcional: `estilo`
- `"calido"`: tonos durazno y título display (Fraunces). Para fechas como
  el Día de la Madre.
- vacío o `"marca"`: amarillo y negro de siempre.
El botón sigue amarillo en los dos.

## 4. Lo que ya respeta del bloque
`clave`, `tipo`, `ubicacion` (slot), `titulo`, `texto`, `imagen_url`,
`cta_texto`, `cta_url`, `dispositivo`, `product_ids` / `product_slugs`,
`estilo`. Fechas: si el bloque trae `fecha_inicio` / `fecha_fin` (o
`inicio` / `fin`), la web también las respeta (una fecha sin hora vale
hasta el final del día en Argentina); hoy Base44 no las manda en el
payload y filtra las vencidas de su lado. `prioridad` y `categoria` se
reciben pero la web no las usa: el orden es el que manda Base44.

## Para Rodri, en resumen
1. Sumar `product_slugs` (catalog_slug, mismo orden) a cada bloque con
   productos.
2. Opcional: `estilo: "calido"` en `mes-madre-2026`.
3. Opcional: `cta_url` puede quedar `/catalogo/`; la web lo lleva a la
   colección sola.
