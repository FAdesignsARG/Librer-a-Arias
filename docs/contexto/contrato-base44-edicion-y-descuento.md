# Gestión edita productos + descuento web (09/10/2026)

Decisión de Fran del 09/10 (reemplaza la del 30/09): Gestión puede editar
todo el producto, con control de conflictos; el descuento web lo manda
Gestión, con el 10% del panel como respaldo. Complementa
`contrato-base44-whatsapp-web.md` (alta) y `contrato-base44-campanas.md`.

Pruebas: `node tmp/test-productos.mjs`, `node tmp/test-aviso-lotes.mjs`,
`node tmp/test-descuento-web.mjs`, `node tmp/test-aviso-rebuild.mjs`.

## 1. `/api/productos` → `actualizar`
Mismo token y vínculo (`source_id`, y `slug` la primera vez). Campos:

| Campo | Tipo | En la web |
|---|---|---|
| `price`, `in_stock`, `visible` | como antes | se aplican **siempre** |
| `name` | texto 1–200 | nombre (el slug NO cambia) |
| `description` | texto ≤3000 | descripción |
| `category` | uno de los 5 rubros | rubro |
| `image_url` | https | foto principal (las demás quedan) |
| `tags` | lista o texto con comas | etiquetas de búsqueda |
| `featured` | true/false | destacado |
| `order` | número | orden (menor = primero) |
| `label` | texto ≤40 ("" la borra) | etiqueta comercial |
| `if_updated_at` | texto | ver conflictos |
| `forzar` | true/false | ver conflictos |

- Una foto externa se importa a Cloudinary una sola vez: si llega la misma
  URL otra vez, no se vuelve a subir.
- Mandar el mismo valor que ya tiene no cuenta como cambio.
- `requiere_rebuild: true` sólo si cambió algo que se ve en la web de un
  producto publicado. Si está oculto, no.
- Respuesta: `cambios` (con los nombres del contrato: `image_url`, `label`;
  `inStock` sigue igual que antes) y `updated_at` (guardarlo).
- `ignorados` ya no existe: nada se ignora.

### Conflictos
Hay conflicto si alguien editó el producto **en el panel** después del
último cambio de Gestión. Entonces:
- precio, stock y visible se aplican igual;
- el contenido NO se pisa y vuelve `conflicto: { campos, mensaje,
  en_la_web: { name, description, category, image_url, tags, featured,
  order, label, updated_at } }`;
- si lo único pedido era contenido → **409 `CONFLICTO`**.

Para resolverlo, Gestión vuelve a mandar con `if_updated_at` = el
`updated_at` que vio (en `en_la_web` o en el último aviso) —"vi la última
versión"— o con `forzar: true`.

## 2. Avisos web → Gestión (`BASE44_PRODUCT_SYNC_URL`)
- Cada producto trae además `tags`, `featured`, `order`, `label` y
  `synced_at`. `last_change_origin: "panel"` con `updated_at` posterior a
  `synced_at` = cambio del panel que Gestión todavía no tomó.
- **Lotes de 100**: cada envío trae `lote` y `lotes` (ej. 2 de 3).
- Lote fallido → se guarda en Firestore (`sync_pendientes`) y se reintenta
  en los próximos avisos con el estado de ese momento (`reintento: n`).
  A los 10 intentos queda `abandonado`.
- Reordenar en el panel ahora avisa (`modificado`, `cambios: ["order"]`)
  sólo los productos que cambiaron de lugar. Reordenar no cuenta como
  edición para los conflictos.

## 3. Descuento web
La web lee `config.descuento_web` de `configuracion_pagina`:

```json
"descuento_web": { "activo": true, "porcentaje": 15,
  "fecha_inicio": "2026-10-01", "fecha_fin": "2026-10-31",
  "leyenda": "No acumulable con otras promociones" }
```
(acepta también `activa`, `percent`, `desde`/`hasta`, `vigente`,
`disclaimer`). Fecha sin hora = hasta el final de ese día en Argentina.

- Activo, vigente y entre 1 y 90 % → manda Gestión.
- Ausente, apagado, vencido, todavía no empezó o Base44 caído → 10% del
  panel. Gestión no puede dejar la web sin descuento; eso se hace en el panel.
- Sigue siendo una sola promo sobre el total, no acumulable.
- En vivo (sin deploy): pedido, resumen, mensaje de WhatsApp, datos del
  pedido a Gestión, ficha, banner y ventana de la promo.
- Cada pedido viaja con el porcentaje y los importes calculados en el
  momento de mandarlo (`descuento_web_porcentaje`, `descuento_web_monto`,
  `total_con_descuento`).
- **Al cambiar el descuento, pedir `/api/rebuild`**: así el HTML (lo que
  ven Google y las vistas previas al compartir) también queda al día.
- Ojo: el arte del banner es una imagen; si dice un porcentaje, hay que
  cambiar la imagen.

## Cuándo pedir rebuild
- `requiere_rebuild: true` en `/api/productos`.
- Cambio de `descuento_web`.
- Campañas, destacados de la home y bloques: **no** (la web los lee en vivo).
