# Control remoto de la página desde Base44

Integración pedida por marketing (Rodri) el 10/9/2026. Permite gobernar
partes de `libreriaarias.com.ar` desde Base44 sin republicar Netlify.

La página **sigue en Netlify y sigue siendo del desarrollador**. Base44 es
una capa de control encima: si Base44 no responde, o no tiene nada
configurado, la web se ve exactamente como la sirve Netlify.

---

## Lo que ya está hecho del lado de la web (este repo)

| Archivo | Qué hace |
|---|---|
| `src/base44-client.js` | Cliente compartido de Base44 (un solo `appId`, una sola carga del SDK). Lo usan analytics y page-control. |
| `src/page-control.js` | Pide la config a Base44 cada 60 s y la aplica: barra de aviso, bloques, hero, WhatsApp, secciones, destacados, mantenimiento. Fallo seguro. Kill switch. |
| `src/page-control.css` | Estilo de lo que inyecta, con los tokens de la marca y tema claro/oscuro. |
| `src/templates.js` | Se agregaron los `data-arias-section`, `data-arias-slot`, hooks de hero y `data-arias-whatsapp`. |
| `src/app.js` | Escucha `arias:featured-products` (reordena la grilla) y usa el WhatsApp de Base44 en el link del pedido si está configurado. |

**No hay ninguna credencial de Base44 en el frontend.** El SDK habla con la
app pública por su `appId`, igual que analytics desde siempre.

Para desactivar todo: en `src/templates.js`, cambiar
`window.ARIAS_PAGE_CONTROL = { enabled: true, ... }` a `enabled: false` (o
borrar esas dos líneas) y rebuild.

---

## Lo que tiene que hacer Rodri del lado de Base44

1. **Crear las dos entidades** con los esquemas de esta carpeta:
   - `ConfiguracionPagina.jsonc` — una sola fila, `clave = "principal"`.
   - `BloquePagina.jsonc` — una fila por banner/promo.
   - Los `rls` de ambos esquemas ya exigen `role: admin` para todo. Bien.

2. **Agregar la acción `configuracion_pagina`** a la función
   `catalogo-metricas` con el bloque de `accion_configuracion_pagina.ts`.
   Va dentro del `try` principal, después de calcular `action` y antes de
   las acciones de métricas. Reutiliza el `admin`, el `json(origin, ...)` y
   el CORS que ya tiene la función.

3. **CORS**: la función tiene que aceptar el dominio productivo real, que
   es **`https://libreriaarias.com.ar`** (no `libreria-arias.netlify.app`).
   Sumar también `http://localhost:4321` y `http://localhost:4322` para
   desarrollo.

4. La acción `configuracion_pagina` **es de sólo lectura**. No debe
   aceptar ninguna escritura. Todas las ediciones de `ConfiguracionPagina`
   y `BloquePagina` se hacen desde el panel de Base44 con usuario admin.

### Cómo la llama la página

**No** por una URL suelta. La página usa el mismo cliente que analytics:

```js
base44.functions.invoke('catalogo-metricas', { action: 'configuracion_pagina' })
```

O sea: mismo servicio, mismo transporte, sólo cambia el `action`.

---

## Nombres reales (para configurar en Base44)

### `secciones_visibles` / `orden_secciones`

Los nombres de sección de esta web son:

| Nombre | Qué es |
|---|---|
| `hero` | La portada con el logo y los botones |
| `promos` | El carrusel de atención (promos + canal de WhatsApp) |
| `destacados` | La fila "Elegidos para vos hoy" |
| `productos` | La grilla de productos |
| `visitanos` | La sección de dirección / horarios / contacto |

- **Mostrar/ocultar** (`secciones_visibles`): funciona con esos 5 nombres.
- **Reordenar** (`orden_secciones`): **hoy no tiene efecto** — las
  secciones no cuelgan todas del mismo contenedor en esta web, así que el
  script las deja en su orden. Si en el futuro hace falta reordenar de
  verdad, es trabajo del desarrollador. Por ahora: sólo mostrar/ocultar.

### `ubicacion` de los bloques (`BloquePagina`)

Slots disponibles en la home:

| `ubicacion` | Dónde aparece |
|---|---|
| `superior` | Arriba del carrusel de promos |
| `debajo_buscador` | Debajo de los filtros de rubro |
| `antes_productos` | Justo antes de la grilla de productos |
| `pie` | Antes del footer |

`entre_productos` está en el enum del esquema pero **no está implementado**
todavía (necesita meterse dentro de la grilla). No usarlo por ahora.

### `productos_destacados`

Esta web identifica los productos por **slug** (ej. `dinosaurio-dino-world`),
no por un ID de Base44. En `productos_destacados` van los slugs. El slug de
cada producto es la última parte de su URL: `.../p/<slug>/`.

Efecto: los productos con esos slugs pasan al principio de la grilla, en el
orden de la lista. Es no destructivo (no oculta nada, no toca "Elegidos
para vos") y sólo aplica en el orden "Recomendados".

### `stock` / "Última unidad"

**Inerte por ahora.** El catálogo no tiene un campo de stock numérico
(sólo "hay / no hay"). La función `decorateProductCard` está expuesta y la
config viaja, pero no hay con qué dispararla hasta que los productos tengan
un número de unidades. Es una decisión de negocio aparte (¿quién mantiene
ese número al día?).

### `hero`

`hero.titulo`, `hero.subtitulo`, `hero.cta_texto` + `hero.cta_url`
funcionan (aparecen sobre los botones de la portada, ocultos si no hay
nada). `hero.imagen_url` **no está conectado** a propósito: el fondo del
hero es un asset de marca, no algo para cambiar desde marketing.

---

## Convivencia con el panel de admin de la tienda

⚠️ Importante para Fran: varias de estas cosas ya se editan desde
`libreriaarias.com.ar/admin`. Cuando Base44 tiene un valor configurado,
**ese gana** sobre lo del panel, en la web en vivo:

| Cosa | Panel admin | Base44 |
|---|---|---|
| WhatsApp público | Configuración | `config.whatsapp` — si está, pisa al del panel |
| Promos ("Llevá más, pagá menos") | Promociones (Ronda 1.3) | Los bloques tipo Promo son **aparte** — se suman, no reemplazan las promos del panel |
| Destacados | checkbox `featured` por producto | `productos_destacados` — reordena la grilla por encima |
| Secciones / hero / mantenimiento | no existían en el panel | sólo Base44 |

Si Base44 no tiene nada seteado en un campo, manda el panel / el valor
local. Si Base44 está caído, manda el local.

---

## Prueba de aceptación (cuando Rodri tenga su parte)

1. Abrir `libreriaarias.com.ar` sin nada configurado → se ve igual que hoy.
2. Crear `ConfiguracionPagina` con `clave = principal`, `barra_aviso_activa = true`
   y un texto → la barra aparece en ~60 s sin redeploy.
3. Crear un `BloquePagina` activo con `ubicacion = antes_productos` → aparece
   en el slot.
4. Desactivarlo → desaparece en el próximo refresh.
5. DevTools → Network/Sources: no hay ninguna credencial privada de Base44.
