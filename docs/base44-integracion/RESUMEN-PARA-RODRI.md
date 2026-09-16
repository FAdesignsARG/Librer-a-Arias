# Integración Base44 ↔ página de Librería Arias — estado

**Fecha:** 11/9/2026
**Para:** equipo de marketing (Rodri / Gonza)
**Web:** `libreriaarias.com.ar` (sigue en Netlify, sin migrar)

Sobre el paquete `integracion_control_pagina_libreria_arias.zip` que mandaron.

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
| `promos` | El carrusel de atención (promos + canal de WhatsApp) |
| `destacados` | La fila "Elegidos para vos hoy" |
| `productos` | La grilla de productos |
| `visitanos` | La sección de dirección / horarios / contacto |

- **Mostrar / ocultar**: funciona con esos 5 nombres.
- Lista vacía o sin ese campo = "no controlar la visibilidad" → todo se ve
  (y se revierte cualquier ocultamiento anterior). Nunca oculta todo.
- **`orden_secciones` no tiene efecto por ahora.** Las secciones de esta
  web no cuelgan todas del mismo contenedor, así que reordenar es trabajo
  del desarrollador. Por ahora: sólo mostrar/ocultar.

### Slots de bloques (`ubicacion` en `BloquePagina`)

| `ubicacion` | Dónde aparece |
|---|---|
| `superior` | Arriba del carrusel de promos |
| `debajo_buscador` | Debajo de los filtros de rubro |
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
no destructivo (no oculta nada, no toca "Elegidos para vos").

### Stock / "Última unidad"

**Inerte por ahora.** El catálogo no tiene un número de unidades por
producto (sólo "hay / no hay"). La config viaja y la función está lista,
pero no hay dato numérico con qué dispararla. Es una decisión aparte:
¿alguien va a mantener ese número al día?

### Hero

`titulo`, `subtitulo`, `cta_texto` + `cta_url` funcionan. `imagen_url`
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
