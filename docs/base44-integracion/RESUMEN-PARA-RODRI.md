# Integración Base44 ↔ página de Librería Arias — estado

**Fecha:** 11/9/2026 · **Última actualización:** 18/9/2026 (ver "LEER PRIMERO")
**Para:** equipo de marketing (Rodri / Gonza)
**Web:** `libreriaarias.com.ar` (sigue en Netlify, sin migrar)

Sobre el paquete `integracion_control_pagina_libreria_arias.zip` que mandaron.

---

## LEER PRIMERO — 18/09/2026: qué cambió en la web y qué necesitamos de ustedes

Todo esto está en la rama `preview` y publicado para revisar en
`https://diseno--libreria-arias.netlify.app`. **Todavía no está en
producción.** La integración sigue funcionando sin que toquen nada; lo de
abajo es para que quede prolija y aproveche lo nuevo.

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
      `/catalogo/?q=termos` (una búsqueda). Los viejos (`/?cat=…`, `/?q=…`,
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
