# Integración Base44 ↔ página de Librería Arias — estado

**Fecha:** 11/9/2026 · **Última actualización:** 18/9/2026 (ver "LEER PRIMERO")
**Para:** equipo de marketing (Rodri / Gonza)
**Web:** `libreriaarias.com.ar` (sigue en Netlify, sin migrar)

Sobre el paquete `integracion_control_pagina_libreria_arias.zip` que mandaron.

---

## VERIFICACIÓN DEL 20/09/2026 (tarde) — TODO OK con el bridge `2026-09-20.1`

Medido desde el navegador con el SDK (`catalogo-metricas`), tráfico marcado `es_prueba: true`,
`product_name: "PRUEBA Claude"`, sesiones `prueba-claude-*`:
- `configuracion_pagina` → **200**, `bridge_version: "2026-09-20.1"` (más nuevo que el `2026-09-19.2` anunciado).
- Desde `https://libreria-arias.netlify.app`: Vista de producto **201**, **Producto compartido 201**,
  **Impresión de tarjeta 201**, **Consulta por WhatsApp 201** (todos `success:true, duplicate:false`).
- Desde `https://diseno--libreria-arias.netlify.app`: `configuracion_pagina` **200** y Producto compartido **201** → CORS resuelto.
- Falta sólo la prueba punta a punta del pedido (web → eventos → Base44 → pedido → WhatsApp), que necesita a una persona enviando un pedido real de prueba.

---
## VERIFICACIÓN DEL 20/09/2026 — el bridge publicado sigue siendo el viejo

Rodri avisó que publicó el bridge `2026-09-19.2` (dominio principal corregido, CORS de
`diseno--`, "Producto compartido" y la red de seguridad de `/api/rebuild`). Medido
desde la web el 20/09, con tráfico marcado `es_prueba`:
- `action: "configuracion_pagina"` responde **`bridge_version: "2026-09-15.2"`** → la
  función publicada NO es la nueva.
- Desde `https://libreria-arias.netlify.app`, mismo cuerpo y misma sesión cambiando sólo
  `tipo`: Visita **201**, Búsqueda **200**, Búsqueda sin resultados **200**, Vista de
  producto **201**, Agregado a pedido **201**; **Producto compartido 422**, y también
  **Impresión de tarjeta 422** y **Consulta por WhatsApp 422**
  (`{"success":false,"error":"Evento, sesión o clave inválidos"}`). Los dos últimos son
  eventos viejos de la web: conviene revisar en Base44 si el tráfico real de esos dos
  tipos está entrando (desde acá no se puede confirmar: en el navegador de pruebas el
  observador de tarjetas no dispara).
- Desde `https://diseno--libreria-arias.netlify.app`: `catalogo-metricas` sigue en **403**.
- Del lado de la web no hay nada pendiente: no se cambió código por estos mensajes.

---
## ESTADO AL 19/09/2026 (noche): LA VERSIÓN NUEVA YA ESTÁ EN PRODUCCIÓN

- `main` = la versión que estaba en `diseno--` (commit `66314d5`). Publicada en
  https://libreria-arias.netlify.app con **565 productos** (antes 551).
- **Arreglado el limbo de productos**: se cargó `BUILD_HOOK_URL` en Netlify.
  Probado: `POST /api/rebuild` → `200 {"ok":true}` y Netlify registró "Deploy
  triggered by hook". Desde ahora cada carga en el panel reconstruye sola.
- **Pendiente de Base44 — "Producto compartido" da 422.** Desde producción, el
  mismo cuerpo con `tipo: "Vista de producto"` responde `201`; con
  `tipo: "Producto compartido"` (y `datos.canal: "enlace"`) responde
  `422 {"success":false,"error":"Evento, sesión o clave inválidos"}`. La web ya lo
  manda; falta que `catalogo-metricas` publicado acepte ese tipo.
- **Pendiente de Base44 — CORS de `https://diseno--libreria-arias.netlify.app`**:
  sigue en 403 (producción responde 200/201).
- Volver atrás si hiciera falta: etiqueta `prod-antes-20260919` (`6e313dc`).

---
## RESPUESTA A LOS MENSAJES DEL 19/09/2026 (Rodri)

**1. Productos que no llegan a producción (551 en la web vs 569 en Base44).**
Causa encontrada: el catálogo público es estático y `data/products.json` se
genera en cada build desde Firestore. El panel de administración pide un build
nuevo después de cada carga (`POST /api/rebuild` → función `rebuild` → build hook
de Netlify), pero **en Netlify falta la variable `BUILD_HOOK_URL`**: la función
responde `503 SIN_HOOK` y no se dispara nada. Por eso producción sólo se
actualizó cuando hubo un deploy de código (el último, 18/09 20:40: 551
productos). No quedaron "en la rama preview": el preview muestra 565 sólo
porque se reconstruyó hoy. Arreglo (pendiente del OK de Fran, es configuración
de producción): cargar `BUILD_HOOK_URL` y reconstruir `main`.

**2. Consumir `action: "productos"` desde Base44 con `products.json` de respaldo.**
No lo recomendamos como fuente principal: cada producto tiene su página
`/p/<slug>/` generada en el build (de ahí salen la vista previa de WhatsApp, el
SEO y los datos estructurados). Un producto que apareciera en la grilla sin
build llevaría a una página que todavía no existe (404), y compartirlo no
tendría vista previa. La salida robusta es que el build se dispare solo:
(a) arreglar el hook (punto 1) y (b) red de seguridad: **cuando la sincronización
de Base44 detecte que la web tiene menos productos públicos que Base44, que
haga `POST https://libreria-arias.netlify.app/api/rebuild`** (sin cuerpo; responde
`{ok:true}`; el build tarda ~2 min). Con eso no hay más limbo.

**3. CORS de `https://diseno--libreria-arias.netlify.app`: todavía devuelve 403.**
Medido el 19/09: desde producción `catalogo-metricas` responde 200/201; desde
`diseno--` las mismas llamadas dan **403** (config y eventos). Revisar que el
origen esté cargado exacto, con `https://` y sin barra final.

**4. "Producto compartido": implementado en la rama `preview`** (`analytics.js`,
`wireShareEvents()`). Se manda como el resto de los eventos, con `product_id`,
`product_name`, `categoria`, `sesion`, `pagina`, `dispositivo`, `origen`,
`clave_evento` y `datos.canal` ∈ whatsapp · sistema · facebook · mail · enlace ·
mail-diseno · imagen. Llega a producción con el próximo pase (o antes, si Fran
lo pide como parche a `main`).

**5–8.** Tomado: 12 destacados desde `config.productos_destacados` (la web ya lo
lee), aviso de hasta 35 caracteres, enlaces internos a `/catalogo/…` y
`/c/<rubro>/` (el menú de la versión nueva ya usa `/c/<rubro>/`), controles
viejos del hero sin efecto, y `entre_productos` sin implementar.
**Ojo con la versión nueva:** las fichas ahora llevan `<body class="page-home
page-product">` (antes sólo `page-product`); si algo de Base44 distingue la home
por `page-home`, tiene que excluir `page-product` y `page-catalog`.

**9.** Prueba punta a punta: la hacemos apenas esté el pase a producción.

---
## LEER PRIMERO — 18/09/2026: YA ESTÁ EN PRODUCCIÓN (`main`)

**Desde el 18/09/2026 esta versión está en `main` y publicada en
`https://libreria-arias.netlify.app`.** La integración sigue funcionando sin que
toquen nada, pero la página cambió mucho: revisen la lista A de abajo contra
la web en vivo y ajusten de su lado lo que corresponda.

Qué entró a producción: primera pantalla con la marca al frente y splash de
entrada; banners-imagen que se alternan cada 10 s; "Elegidos para vos" que rota
cada 5 min; home con 50 destacados; catálogo en `/catalogo/` con filtros en
pastillas (Categoría, Precio, Destacados, Ordenar); ficha de producto nueva
(Agregar, Consultar por WhatsApp, IA, Compartir); compartir productos con vista
previa; flotantes de WhatsApp y del asistente (Adolfito) en todas las páginas.

Qué NO entró todavía (sigue en la rama `preview`, link de revisión
`https://diseno--libreria-arias.netlify.app`): barra lateral de navegación en
desktop, nueva transición del buscador, páginas de rubro `/c/<rubro>/`
rediseñadas y flechas en el carrusel de banners. Cuando pasen a producción se
avisa acá. Ninguna de esas cambia el contrato con Base44.

Dato para las métricas: `/catalogo/` ahora muestra los productos en tandas de 48
con un botón "Ver más productos", así que las impresiones de tarjeta llegan de a
tandas (antes se dibujaban los 551 de una).

**OJO con el dominio:** la web real es `https://libreria-arias.netlify.app`. El dominio
`libreriaarias.com.ar` que figura más abajo en este documento **no existe** (no
resuelve). En CORS tiene que estar `https://libreria-arias.netlify.app`; si sólo
está el `.com.ar`, ni las métricas ni la configuración de página funcionan en
producción. Revisen también cualquier enlace o campaña que use el `.com.ar`.

Para producción, lo urgente de la lista A es: **2** (texto del aviso en una
línea), **3** (10 a 15 destacados), **5** (ningún texto con otra promo) y **7**
(tableros: `pagina` ahora trae `/catalogo/`). El punto 1 (CORS) sólo afecta al
link de revisión; producción ya está habilitada.

### A. Lo que les pedimos que hagan (por prioridad)

- [ ] **1. CORS: sumar `https://diseno--libreria-arias.netlify.app`** a la
      función `catalogo-metricas` (pendiente desde el 17/9). Hoy en ese link no
      se ven ni la barra de aviso ni los bloques, y no salen métricas, así que
      Fran no puede revisar ahí lo que ustedes configuran.
- [ ] **2. Acortar el texto de la barra de aviso a una sola línea** (hasta ~35
      caracteres). Ejemplo: `¿No lo encontrás? Escribinos`. El texto actual
      ("¿No encontraste lo que buscabas? Escribinos por WhatsApp y te
      ayudamos.") ocupa tres líneas en celular: el aviso queda casi tan grande
      como el buscador y tapa el banner de la promo. El link puede seguir igual.
- [ ] **3. Cargar entre 10 y 15 slugs en `productos_destacados`.** Antes sólo
      reordenaban la grilla; ahora se usan en cuatro lugares (ver B). Con pocos
      destacados la home se ve siempre igual. Hoy en el catálogo hay sólo 2
      productos marcados como destacados.
- [ ] **4. Usar los enlaces nuevos** en bloques, avisos y campañas:
      `/catalogo/` (todo), `/catalogo/?cat=Bazar` (un rubro),
      `/catalogo/?q=termos` (una búsqueda). Para un rubro también sirve su página
      propia, que carga más rápido: `/c/bazar/`, `/c/jugueteria/`, `/c/libreria/`,
      `/c/regaleria/`, `/c/tecnologia/`, `/c/electronica/`. Los viejos (`/?cat=…`, `/?q=…`,
      `/#catalogo`) siguen andando porque redirigen solos, pero con los nuevos
      se evita el salto.
- [ ] **5. Revisar que ningún texto cargado en Base44 hable de otra promo.**
      La única real es **10% por comprar desde la web**, sobre el total, no
      acumulable. Nada de "hasta 20%", descuentos por medio de pago ni por monto.
- [ ] **6. Confirmarnos si podemos mandar un evento nuevo: `Producto compartido`.**
      La web ahora permite compartir productos (WhatsApp primero). Todavía **no
      mandamos nada** a métricas por esto, para no meterles un `tipo` que su
      función o sus tableros no esperan. Propuesta, con la misma forma que los
      demás eventos (`action: 'evento'`):
      `tipo: 'Producto compartido'`, `product_id` (slug), `product_name`,
      `categoria`, y en `datos.canal` uno de: `whatsapp`, `sistema` (menú de
      compartir del teléfono: Instagram, etc.), `facebook`, `mail`, `enlace`,
      `mail-diseno`, `imagen`. Si nos dicen que sí (y si `tipo` es una lista
      cerrada, que lo sumen), lo conectamos del lado de la web.
- [ ] **7. Tableros:** el campo `pagina` de los eventos ahora trae
      `/catalogo/` además de `/` y `/p/<slug>/`. Las búsquedas y los cambios de
      rubro pasan a venir casi todos de `/catalogo/`. Si algún tablero filtra
      por `pagina = "/"`, hay que ampliarlo.

### B. Qué hace ahora cada cosa que ustedes controlan

| Lo que configuran | Qué pasa en la web hoy |
|---|---|
| `secciones_visibles` / `orden_secciones` | Igual que siempre, con los mismos 5 nombres, **sólo en la home**. El orden sí se aplica (se arregló el 15/9). |
| Sección `hero` | Logo, nombre con el lema, buscador y accesos. Los campos de texto del hero (título, subtítulo, botón) **no tienen efecto desde el 17/9**: esos elementos ya no existen en la home. |
| Sección `promos` | Carrusel de dos banners-imagen (promo de la web y canal de WhatsApp) que se alternan cada 10 s. |
| Sección `destacados` | La fila "Elegidos para vos", que ahora **rota sola cada 5 minutos**. |
| Sección `productos` | En la home son **50 destacados + botón "Ver todo el catálogo"**, no los 551. El catálogo completo vive en `/catalogo/`, que **no es una sección**: ocultar `productos` no lo apaga. |
| `productos_destacados` (slugs) | (1) van primero entre los 50 de la home; (2) entran en "Elegidos para vos", hasta dos por tramo de 5 minutos; (3) ordenan `/catalogo/` cuando no hay una búsqueda escrita; (4) son los que muestra el filtro **Destacados** del catálogo. Con una búsqueda escrita manda la relevancia, no los destacados. |
| Bloque en `debajo_buscador` | En la home aparece junto a los productos (antes de `antes_productos`). En `/catalogo/` aparece **después de los resultados**, para no tapar lo que la persona buscó. Para un bloque tipo "¿No encontraste…?" es el lugar lógico. |
| Bloques en `superior`, `antes_productos`, `pie` | `superior` sólo existe en la home. `antes_productos` y `pie` existen en la home y en `/catalogo/`. |
| `barra_aviso` | Globito flotante que aparece unos segundos y se va. Aplica en todas las páginas. Se oculta mientras el buscador está acoplado abajo. |
| WhatsApp público | Cambia el número en todos lados, incluido el botón nuevo **"Consultar por WhatsApp"** de cada ficha, que conserva su mensaje con el producto (usa `data-arias-whatsapp-message`). Ese botón ya cuenta como `Consulta por WhatsApp` en las métricas. |
| Modo mantenimiento | Igual que siempre, en todas las páginas. |

### C. Qué cambió en la página (contexto, no requiere nada de ustedes)

- Primera pantalla con la marca al frente (logo, "El Temu 2.0 riojano"),
  buscador grande y splash de entrada.
- Catálogo en página aparte con filtros en pastillas: Categoría, Precio,
  Destacados y Ordenar. Los rubros siguen siendo los mismos botones por dentro,
  así que el evento de cambio de rubro no cambió.
- Ficha de producto nueva: precio con la promo web calculada, Agregar,
  Consultar por WhatsApp, Preguntarle a la IA, Compartir, y 12 relacionados.
- Compartir productos: cada ficha tiene una imagen de vista previa de 1200x630
  (marca, nombre, precio y promo) para que el enlace se vea bien en WhatsApp,
  Facebook e Instagram.
- Botones flotantes de WhatsApp y del asistente (con Adolfito) en todas las
  páginas, incluida la home.
- Pendiente del lado de la web: barra lateral de navegación en desktop,
  favoritos por sesión y reseñas con estrellas (estas dos últimas van a
  necesitar hablarlo con ustedes cuando lleguen, porque implican guardar datos).

---

## 0. Actualización 15/9/2026 (última prueba del día) — ya responde

Volvimos a probar al cierre del día desde el sitio de preview y **la acción
`configuracion_pagina` ya está andando**. Capturado en vivo sobre
`https://preview--libreria-arias.netlify.app`, leyendo el evento
`arias:page-config-updated` que dispara `src/page-control.js`:

```json
{
  "orden_secciones":    ["hero","promos","destacados","productos","visitanos"],
  "secciones_visibles": ["hero","promos","destacados","productos","visitanos"],
  "barra_aviso": {
    "activa": true,
    "texto":  "¿No encontraste lo que buscabas? Escribinos por WhatsApp y te ayudamos.",
    "link":   "https://wa.me/5493804505150"
  }
}
```

Así que el checklist de la sección 7 **sí quedó aplicado**: los nombres de
sección que mandan son los reales de esta página y la barra de aviso se
está pintando. La nota de más abajo (400 "Acción no admitida") queda
**superada** — era de unas horas antes, el mismo día.

**Un bug nuestro que esto destapó, ya corregido:** al recibir
`orden_secciones` por primera vez, nuestro código reordenaba las
secciones con `append()`, que sobre nodos que ya existen no ordena sino
que los **manda al final** del documento. Resultado: en el preview el pie
de página aparecía arriba y el hero, el carrusel y las 486 fichas
quedaban debajo. Arreglado en `src/page-control.js` marcando la posición
original de cada sección y reinsertando ahí. **No hay nada que cambiar de
su lado por esto.**

---

## 0. Actualización 15/9/2026 — SUPERADA — sigue pendiente del lado de Base44

Volvimos a probar hoy, directo contra la función (no el SDK, para
descartar cualquier tema de caché o versión del sitio):

```
POST https://base44.app/api/apps/6a7e432be6e59ad993e40158/functions/catalogo-metricas
{ "action": "configuracion_pagina" }
```

- ❌ **`configuracion_pagina` sigue devolviendo 400 `"Acción no admitida"`.**
  El checklist de la sección 7 (entidades + bloque en la función + CORS)
  todavía no está aplicado del lado de Base44 — puntos 1 a 5 del último
  pedido (config dinámica, hero, barra de aviso, bloques, destacados)
  dependen 100% de esto y quedan en pausa hasta que exista.
- ✅ **Buena noticia:** la acción nueva `pedido` (para el seguimiento de
  pedidos con código `LAWEB-XXXXXXXX`, punto 8) **sí está andando** —
  devuelve `pedido_id`, `codigo` y `estado` correctamente. Esa parte ya se
  puede dar por confirmada.

Mientras tanto seguimos con todo lo que no depende de Base44 (búsqueda,
mensaje de WhatsApp, checkout). Avisar cuando esté lista la parte de
`configuracion_pagina` para volver a probar antes de prometer fecha.

---

## 1. Resumen en una línea

La **parte de la página ya está hecha y desplegada en preview**. Falta la
parte de ustedes en Base44 (2 entidades + un bloque en la función
`catalogo-metricas` + CORS). Hasta que hagan eso, la web se ve exactamente
igual que hoy: la capa de control está instalada pero dormida.

---

## 2. Qué quedó hecho del lado de la página

| Archivo | Qué hace |
|---|---|
| `src/base44-client.js` | Cliente compartido de Base44 (un solo `appId`, una sola carga del SDK). Lo usan las métricas y el control de página. |
| `src/page-control.js` + `.css` | Cada 60 s le pide la config a Base44 y la aplica. Fallo seguro, backoff, sin credenciales. |
| `src/templates.js` | Se agregaron los `data-arias-section`, `data-arias-slot`, hooks del hero y `data-arias-whatsapp`. |
| `src/app.js` | Escucha productos destacados y usa el WhatsApp de Base44 en el link del pedido. |
| `docs/base44-integracion/` | Los esquemas de las entidades, el bloque `.ts` y esta doc. |

Funciones implementadas y probadas (con respuestas simuladas de Base44):

- ✅ Barra de aviso arriba de todo (texto + link opcional).
- ✅ Bloques / promos en slots.
- ✅ Hero editable: título, subtítulo, CTA.
- ✅ Cambiar el WhatsApp público (afecta nav, dock, footer y el link del
  pedido armado).
- ✅ Mostrar / ocultar secciones.
- ✅ Productos destacados (reordenan la grilla, sin borrar nada).
- ✅ Modo mantenimiento (pantalla completa).

**No usa ninguna credencial en el frontend.** La página sólo consume una
acción pública de lectura, con el mismo SDK que ya usaba para métricas.

---

## 3. Cómo la página pide la config (importante)

**No es una URL suelta.** La página usa el mismo cliente del SDK que las
métricas y llama:

```js
base44.functions.invoke('catalogo-metricas', { action: 'configuracion_pagina' })
```

O sea: misma función `catalogo-metricas`, mismo transporte, sólo cambia el
`action`. Por eso el bloque `.ts` que mandaron va **adentro** de esa
función, no en un endpoint nuevo.

La respuesta que espera la página es la del `CONTRATO_API.md` de ustedes:

```json
{ "success": true, "version": 1, "generated_at": "...", "config": { ... }, "bloques": [ ... ] }
```

El SDK puede envolver eso en `{ data: ... }` — la página maneja las dos
formas.

---

## 4. Nombres reales para configurar en Base44

### Secciones (`secciones_visibles` en `ConfiguracionPagina`)

| Nombre | Qué es en la web |
|---|---|
| `hero` | La portada con el logo y los botones |
| `promos` | El carrusel de dos banners-imagen (promo de la web + canal de WhatsApp) |
| `destacados` | La fila "Elegidos para vos" (rota cada 5 minutos) |
| `productos` | En la home: 50 destacados + "Ver todo el catálogo". La grilla completa vive en `/catalogo/` |
| `visitanos` | La sección de dirección / horarios / contacto |

- **Mostrar / ocultar**: funciona con esos 5 nombres.
- Lista vacía o sin ese campo = "no controlar la visibilidad" → todo se ve
  (y se revierte cualquier ocultamiento anterior). Nunca oculta todo.
- **`orden_secciones` sí se aplica** desde el 15/9 (ver sección 0), sólo en la home.

### Slots de bloques (`ubicacion` en `BloquePagina`)

| `ubicacion` | Dónde aparece |
|---|---|
| `superior` | Arriba del carrusel de promos |
| `debajo_buscador` | Home: junto a los productos. `/catalogo/`: después de los resultados |
| `antes_productos` | Justo antes de la grilla de productos |
| `pie` | Antes del footer |

`entre_productos` está en el enum del esquema pero **no está implementado**
(necesita meterse dentro de la grilla). No usarlo por ahora.

### Productos destacados (`productos_destacados`)

La web identifica los productos por **slug**, no por un ID de Base44. El
slug es la última parte de la URL del producto: `.../p/<slug>/`
(ej. `p/dinosaurio-dino-world/` → slug `dinosaurio-dino-world`).

En `productos_destacados` van esos slugs, en el orden deseado. Efecto: esos
productos pasan al principio de la grilla, en el orden "Recomendados". Es
no destructivo (no oculta nada). Desde el 18/9 también entran en "Elegidos para
vos" y alimentan el filtro Destacados (ver "LEER PRIMERO", tabla B).

### Stock / "Última unidad"

**Inerte por ahora.** El catálogo no tiene un número de unidades por
producto (sólo "hay / no hay"). La config viaja y la función está lista,
pero no hay dato numérico con qué dispararla. Es una decisión aparte:
¿alguien va a mantener ese número al día?

### Hero

**Desde el 17/9 no tienen efecto**: el bloque de título, subtítulo y botón ya
no existe en la home. Antes: `titulo`, `subtitulo`, `cta_texto` + `cta_url` funcionaban. `imagen_url`
**no está conectado** a propósito: el fondo del hero es un asset de marca.

---

## 5. Semántica: quién manda

⚠️ Varias de estas cosas ya se editan desde el panel de admin de la tienda.
**Cuando Base44 tiene un valor configurado, ese gana sobre el panel**, en
la web en vivo:

| Cosa | Panel admin de la tienda | Base44 |
|---|---|---|
| WhatsApp público | sí | si está configurado, pisa al del panel |
| Promos "Llevá más, pagá menos" | sí | los bloques tipo Promo son **aparte**, se suman, no reemplazan |
| Destacados | sí (`featured` por producto) | `productos_destacados` reordena por encima |
| Secciones / hero / mantenimiento | no existían | sólo Base44 |

Si Base44 no tiene nada seteado en un campo, o está caído, manda el valor
local. La web nunca depende de que Base44 responda.

---

## 6. CORS — hoy bloquea el preview

La función `catalogo-metricas` hoy acepta `libreriaarias.com.ar` y
localhost, pero **NO** el dominio de preview. Lo probamos:

- `https://libreriaarias.com.ar` → OK (métricas ya funcionan desde ahí).
- `https://preview--libreria-arias.netlify.app` → **403** en
  `functions/catalogo-metricas`. Ni métricas ni page-control funcionan
  desde ahí.

Para poder probar el flujo completo en preview antes de producción, hay
que sumar `https://preview--libreria-arias.netlify.app` a la lista de CORS
de la función.

---

## 7. Checklist para el equipo de Rodri

- [ ] Crear la entidad `ConfiguracionPagina` (esquema en
      `docs/base44-integracion/ConfiguracionPagina.jsonc`). Una sola fila,
      `clave = "principal"`.
- [ ] Crear la entidad `BloquePagina` (esquema en
      `docs/base44-integracion/BloquePagina.jsonc`).
- [ ] Los `rls` de ambos esquemas ya exigen `role: admin` para todo. ✔
- [ ] Agregar el bloque de `docs/base44-integracion/accion_configuracion_pagina.ts`
      dentro de la función `catalogo-metricas`, después de calcular
      `action` y antes de las acciones de métricas. Reutiliza `admin`,
      `json(origin, ...)` y el CORS que ya tiene.
- [ ] Sumar a CORS: `https://libreriaarias.com.ar`,
      `https://preview--libreria-arias.netlify.app`, `http://localhost:4321`,
      `http://localhost:4322`.
- [ ] Confirmar que la acción `configuracion_pagina` es **sólo lectura**
      (no acepta escrituras).
- [ ] Avisar a Fran cuando esté para probar.

---

## 8. Cómo se prueba (cuando la parte de Base44 esté)

1. Abrir `libreriaarias.com.ar` sin nada configurado → se ve igual que hoy.
2. En `ConfiguracionPagina` (`clave = principal`): `barra_aviso_activa = true`
   + un texto → la barra aparece en ~60 s, sin redeploy.
3. Crear un `BloquePagina` activo con `ubicacion = antes_productos` →
   aparece en el slot.
4. Desactivarlo → desaparece en el próximo refresh.
5. DevTools → Sources/Network: no hay ninguna credencial privada de Base44.

---

## 9. Otros cambios de la web en esta sesión (contexto)

No tienen que hacer nada con esto, pero para que sepan que la página
cambió (todo en preview, todavía no en producción):

- **Bug crítico arreglado**: "Agregar al pedido" no funcionaba en ninguna
  ficha de producto (un error de JS frenaba medio script). Ya anda.
- Rondas del roadmap: señales de urgencia/destacado en la ficha, asistente
  de IA con más "vendedor", selector de cantidad + zoom de fotos, y
  páginas indexables por rubro (`/c/jugueteria/`, etc.).

---

## 10. Recordatorio: Ronda 7 (datos de Base44 → catálogo)

Sigue pendiente la pregunta para poder avanzar con "más pedidos" real en
la web: **¿Base44 puede exponer de vuelta los datos de vistas / agregados
/ pedidos, y de qué forma?** (API/webhook de lectura, export a un link
fijo, o nada). Según la respuesta hay 3 caminos ya redactados en
`docs/roadmap-mejoras.md` (sección 8.3).

## Cambios del 17/9/2026 que los tocan

- **El bloque de hero (título, subtítulo y botón) ya no se muestra en la
  home.** Fran lo sacó: repetía lo que ya está en la sección de rubros y
  en el pie, y "Ver productos" repetía a "Catálogo". La acción
  `configuracion_pagina` sigue funcionando para todo lo demás (barra de
  aviso, secciones, destacados, WhatsApp, mantenimiento).
- **El aviso (`barra_aviso`) dejó de ser una banda fija arriba**: ahora es
  un globito que aparece unos segundos, se va y vuelve cada tanto, con
  cierre. El texto y el link siguen saliendo de su configuración.
- **Promociones: la única real es 10% por comprar desde la web.** Si en
  Base44 hay textos con "hasta 20%" o descuentos por medio de pago, hay
  que sacarlos: no existen.
- Para que el aviso se vea también en el link de revisión de diseño, hace
  falta habilitar en CORS `https://diseno--libreria-arias.netlify.app`.

## Cambio del 18/09/2026 (rama `preview`, todavía no en producción): catálogo en página aparte

**No hay que tocar nada en Base44.** La configuración que ya existe sigue
funcionando igual. Lo que cambia es del lado de la página:

- La home conserva las cinco secciones con los mismos nombres (`hero`,
  `promos`, `destacados`, `productos`, `visitanos`): ordenarlas y ocultarlas
  funciona como siempre. La sección `productos` de la home ahora muestra 50
  destacados y un botón "Ver todo el catálogo", en vez de los 551 productos.
- El catálogo completo (buscador, rubros, orden, precio) vive en `/catalogo/`.
  Esa página no es una sección: aunque se oculte `productos` en la home, el
  catálogo sigue disponible.
- Los cuatro slots siguen existiendo (`superior`, `debajo_buscador`,
  `antes_productos`, `pie`). En la home, `debajo_buscador` sigue junto a los
  productos (justo antes de `antes_productos`), igual que antes. En `/catalogo/`
  ese mismo bloque se muestra **después de los resultados**, para no tapar lo
  que la persona buscó.
- La sección `promos` ahora es un carrusel de dos banners-imagen (promo de la
  web y canal de WhatsApp) que se alternan cada 10 segundos. Se sigue pudiendo
  ordenar y ocultar con el mismo nombre.
- Productos destacados (`productIds`): ordenan los 50 de la home, entran en la
  fila "Elegidos para vos" (que ahora rota cada 5 minutos, hasta dos destacados
  por tramo) y ordenan `/catalogo/` cuando no hay una búsqueda escrita.
- Enlaces viejos: `/?cat=Ofertas`, `/?cat=Bazar`, `/?q=algo` y `/#catalogo`
  redirigen solos a `/catalogo/…`. Los bloques o campañas que ya los usen no se rompen.
- Métricas: los eventos de búsqueda, rubro y producto siguen saliendo con los
  mismos nombres. Compartir un producto por WhatsApp **no** se cuenta como
  `Consulta por WhatsApp` (se excluyó a propósito). Lo único nuevo es que el campo `pagina` va a traer
  `/catalogo/` además de `/`.
- Aviso flotante, número de WhatsApp y modo mantenimiento aplican en todas las
  páginas, igual que antes.
