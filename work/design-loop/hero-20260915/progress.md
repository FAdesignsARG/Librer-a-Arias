# Progreso — Hero home

## Versión congelada en revisión

- **Versión:** v5
- **Fecha:** 17/09/2026
- **Rama/commit:** `preview` / `8f41fb1`
- **Publicación:** no publicada; el alias público `preview` conserva el hero anterior y la corrección de la Ronda 0.
- **Fuente visual revisada:** `dist/`, cuyos `styles.css` y `page-control.js` coinciden byte a byte con `src/`.
- **Limitación:** la cuota de Firestore impide por ahora un build nuevo con datos reales. Se revisa la copia estática generada previamente. `serve-v5-fixture.cjs` agrega únicamente el aviso Base44 con la estructura real para poder inspeccionarlo en localhost; no modifica el artefacto ni producción.

## Historial recuperado

| Versión | Calidad | Objetivo | Sistema | Resultado |
| --- | --- | --- | --- | --- |
| v1 | FAIL | FAIL | FAIL | Rehacer |
| v2 | PASS | FAIL | FAIL | Iterar |
| v3 | PASS | FAIL | FAIL | Iterar |
| v4 | PASS | FAIL | FAIL | Iterar |
| v5 | FAIL | FAIL | FAIL | Iterar |
| v6 | En revisión | En revisión | En revisión | Pendiente |

Los PASS anteriores no se trasladan a v5: los tres críticos se ejecutan de nuevo sobre el mismo commit.

## Cambios de v5

- Ofertas queda oculta también dentro del menú cuando no hay ofertas reales.
- Los tres accesos móviles usan una sola fila, igual ancho y el ícono sobre el texto.
- Pedido conserva presencia pero reduce su peso visual.
- La separación entre sugerencias y WhatsApp deja de ser de 2px.
- El foco dentro del aviso usa tinta oscura sobre amarillo.
- El aviso reduce su alto móvil por debajo del límite del 10%.
- Un refresh con configuración idéntica no reconstruye el aviso y conserva el foco.

## Evidencia reconstruida

Pruebas realizadas con navegador real y viewport explícito:

| Vista | Buscador | Aviso | Accesos | Overflow horizontal |
| --- | --- | --- | --- | --- |
| 375×812, oscuro | 328×69,6 px, y=77,8 | 336×56 px = 6,9% del alto | 3 × ~101,3×71,1 px | No (`scrollWidth` 360 = `clientWidth` 360) |
| 320×700, oscuro | 272,8×69,6 px, y=77,8 | 280,8×56 px = 8% del alto | 3 iguales en una fila | No (`scrollWidth` 305 = `clientWidth` 305) |
| 1440×900, oscuro | 760×81,6 px, y=188,2 | 363×64 px | 3 iguales en una fila | No (`scrollWidth` 1425 = `clientWidth` 1425) |

Observaciones visuales verificadas:

- En reposo hay una sola isla de búsqueda.
- Después de hacer scroll, esa misma isla queda fija abajo con Buscar, Pedido y Menú.
- Ofertas no aparece entre los accesos del hero.
- El aviso no tapa la isla ni las acciones del hero.
- En 320 px los tres accesos siguen en la misma fila.
- El aviso y su botón Cerrar entran completos en 320 px.

## Siguiente puerta

### Veredictos de v5

- **Calidad FAIL:** el aviso Base44 y la isla inferior coexistían durante el scroll y ocupaban juntos 17–20% del viewport móvil.
- **Objetivo FAIL:** con cero ofertas activas, el chip Ofertas del catálogo seguía visible.
- **Sistema FAIL:** coexistían dos flotantes y el enlace del aviso medía 42,5 px de alto.

### v6

- Oculta cada instancia de Ofertas, incluido el chip del catálogo; el CSS garantiza que `hidden` gane sobre layouts flex.
- Cuando la isla queda acoplada, el aviso pasa a `opacity:0`, `visibility:hidden` y `pointer-events:none`; queda un solo flotante.
- El enlace del aviso tiene `min-height:44px`.
- Verificación local 320×700: las cuatro instancias de Ofertas miden 0×0; el enlace del aviso mide 210,8×44 px; durante scroll la isla está acoplada y el aviso queda oculto.

Cerrar v6 únicamente si Calidad, Objetivo y Sistema devuelven PASS sobre el nuevo commit congelado. Si cualquiera falla, registrar los bloqueos, crear otra versión y reiniciar los tres críticos.
