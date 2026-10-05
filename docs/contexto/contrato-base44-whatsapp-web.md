# Contrato WhatsApp → Base44 → web (05/10/2026)

Para Rodri. El lado web ya está corregido (`POST /api/productos`).
Lo de abajo es lo que tiene que hacer Base44 para cerrar el circuito.
Fuente: `netlify/functions/productos.js`; pruebas en `tmp/test-productos.mjs`.

## Qué fallaba
1. `publicar-producto-web` manda `publish: true`. La web lo rechazaba con
   403 `PUBLICAR_DESHABILITADO` porque `CATALOGO_PUBLICAR_DIRECTO` no está
   cargada en Producción. Base44 no recibía slug → quedaba `Pendiente`,
   sin `catalog_slug` ni `catalog_source_id`.
2. La taza se cargó después a mano en el panel (02/10, sin `sourceId`).
   Si Base44 reintentaba `crear`, la web respondía 409 `POSIBLE_DUPLICADO`
   (mismo nombre y precio). Ninguno de los dos lados podía recuperarla
   solo.

## Qué cambió en la web
- **Decisión de Fran (05/10): el "Alta rápida" de Base44 es la revisión.**
  `publish: true` en `crear` y `habilitar` publican directo, sin variable.
  `CATALOGO_PUBLICAR_DIRECTO=0` vuelve al modo "entra oculto".
- `crear` **nunca** se rechaza por `publish`. Con el modo apagado crea
  oculto, devuelve slug y `avisos: ["publish_ignorado_pendiente_revision"]`.
- **Adopción:** si el producto ya está en la web cargado a mano, `crear`
  lo vincula en vez de dar 409. Condiciones: un solo candidato, sin
  vínculo, mismo rubro y (mismo nombre + mismo precio, o misma foto).
  Responde `adoptado: "mismo_nombre_y_precio" | "misma_foto"`. Si la foto
  coincide y el precio no, aplica el precio de Base44.
- `crear` con un `source_id` ya vinculado y `publish: true`: si estaba
  "para revisar", lo publica. Si se ocultó con `ocultar`, NO lo publica
  (para eso está `habilitar`).
- Toda respuesta OK trae `source_id` y `url` (ficha pública).

## Contrato
`POST https://libreria-arias.netlify.app/api/productos`
Encabezado `x-catalogo-token: <CATALOGO_WRITE_TOKEN>`.

### crear (también sirve para recuperar)
```json
{ "action": "crear", "source": "base44", "source_id": "<Product.id>",
  "name": "…", "price": 12000, "category": "Bazar",
  "description": "…", "image_url": "https://…", "publish": true }
```
- `source_id` = **Product.id de Base44**, siempre el mismo. Nunca el id de
  `ProductoImportadoWhatsApp`.
- `category`: Juguetería, Tecnología, Regalería, Bazar o Librería (acepta
  sin tildes y en mayúsculas). Otra cosa → 422 `RUBRO_INVALIDO`.
- Respuestas:

| Estado | Significa | Qué hace Base44 |
|---|---|---|
| 201 `creado:true` | Producto nuevo en la web | Guardar slug + source_id |
| 200 `creado:false` | Ya existía (reintento o doble clic) | Guardar el mismo slug |
| 200 `adoptado:"…"` | Estaba cargado a mano; quedó vinculado | Guardar slug |
| 409 `POSIBLE_DUPLICADO` | Parecido dudoso; no se creó nada | `Error`, mostrar `candidatos`, revisión humana |
| 409 `ELIMINADO_EN_PANEL` | Se borró a propósito en el panel | `Error`, no reintentar solo |
| 422 | Dato inválido (rubro, precio, foto) | `Error`, pedir corrección; sin reintento |
| 401 / 503 | Token o configuración | `Error`, avisar a Fran |
| 500 / 502 / 429 / timeout | Falla temporal | Queda `Pendiente`, reintentar igual |

Cuerpo OK: `{ ok, success, id, slug, source_id, creado, estado, requiere_rebuild, url }`.
`estado` = `publicado` | `oculto` | `pendiente_revision`.

### actualizar / ocultar / habilitar (por vínculo)
```json
{ "action": "actualizar", "source": "base44", "source_id": "<Product.id>",
  "price": 13500, "in_stock": true, "visible": true }
{ "action": "ocultar",   "source": "base44", "source_id": "<Product.id>" }
{ "action": "habilitar", "source": "base44", "source_id": "<Product.id>" }
```
Sólo precio, stock y visible. Nombre, descripción, rubro y foto los maneja
el panel (vuelven en `ignorados`). El slug nunca cambia. Ocultar nunca borra.

### Rebuild y verificación
- Si `requiere_rebuild: true` → `POST /api/rebuild` con
  `x-rebuild-token`. Pedidos dentro de 20 s se agrupan (`deduplicado:true`):
  es normal, no es error.
- Verificar: `GET https://libreria-arias.netlify.app/data/products.json` y
  buscar el `slug`. Recién ahí `Publicado`. Un build tarda 1 a 3 minutos:
  consultar cada 30–60 s, hasta 6 minutos; después dejar `Publicando` y que
  la rutina lo verifique.
- Oculto: verificado cuando el slug **ya no** está en products.json.

## Qué tiene que hacer Base44

### publicar-producto-web (una sola función para todo)
1. Si el Product no tiene `catalog_slug` → `crear` con `publish: true`
   (o `false` + `habilitar`; dan lo mismo). Guardar **en el momento**
   `catalog_slug` y `catalog_source_id = Product.id`, aunque el resto falle.
2. Si ya tiene slug → `actualizar` / `habilitar` / `ocultar` según el caso.
3. `requiere_rebuild` → `/api/rebuild`.
4. Estado `Publicando` → verificar products.json → `Publicado`,
   `catalog_published_at`, `catalog_last_verified_at`,
   `catalog_publish_error = ""`.
5. Error → `catalog_publish_status = Error` + mensaje de la web
   (`message`). **Nunca** borrar slug ni source_id.
6. Bloqueo contra doble clic: si el Product está en `Publicando` hace menos
   de 2 minutos, no lanzar otra vez. Aunque se lance, la web no duplica.

### Producto de la taza (Test 1)
"Publicar en web" desde Productos → `crear` con su Product.id. La web la
adopta (mismo nombre, precio 12000 y Bazar) y devuelve
`taza-de-vidrio-con-asa-y-plato-de-madera`. Ya está publicada: no hace
falta rebuild. Base44 guarda slug + source_id y verifica.

### Botón "Publicar cambios"
1. Products activos, `catalog_visible = true`, sin `catalog_slug` y en
   `Pendiente`/`Error` (sin 4xx de datos) → `publicar-producto-web`, de a 5
   con 1 s de pausa.
2. Los vinculados con cambios → `actualizar`.
3. Un solo `/api/rebuild` al final; verificar.

### Rutina de las 23:00
Mismo criterio que el punto 1 de "Publicar cambios", más los que quedaron
`Publicando` (sólo verificar). Siempre con el mismo Product.id.
Reintentar sólo errores temporales (timeout, 429, 500, 502, 503, 504).

### Alta rápida
WhatsApp → Product (stock 5) → `publicar-producto-web` en la misma
operación. Mensajes: "Producto creado. Publicación web en proceso." mientras
verifica; "Publicado en la web" sólo con el slug en products.json.
Rubro vacío: inferir; si no es seguro, dejar `Pendiente` con "Falta
elegir rubro" **antes** de llamar a la web (la foto queda en Base44).

### Estado visible en Canal → Productos
Derivarlo del Product relacionado, no guardarlo dos veces:
✅ Creado en sistema · 🟡 Web pendiente (sin slug) · 🔵 Publicando ·
✅ Publicado · 🔴 Error web.

## Pruebas de punta a punta
Test 1 a 6 del pedido de Fran. Del lado web se confirman leyendo Firestore
(`sourceId`, `visible`, `price`) y `/data/products.json`.
