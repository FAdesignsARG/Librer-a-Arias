# Críticos · ronda 2 sobre la vara v3 (19/09/2026)

Medido sobre `0e6e415` (rama `preview`, con `main` ya adentro), servido desde
`dist/` en localhost:4322. Esta vez shop.app respondió: el A/B es en vivo.

| Crítico | Veredicto | Resumen |
|---|---|---|
| Calidad A/B | **FAIL** (Home PASS 12/14 · Resultados FAIL 7/11 · Ficha PASS 8/10) | La isla abierta se lee como una pieza (shop.app: dos). Pierde grosero en densidad de resultados a 375: 0 productos enteros contra 4. |
| Objetivo | **FAIL** | Los 20 pedidos del brief y los cuatro de la revisión de Fran (vuelo, barrita, flechas, isla) cumplen. Tres defectos: flotantes sobre el panel del buscador acoplado, ficha en celular sin acceso al pedido, aire heredado dentro del chat. |
| Sistema | **FAIL** (Home y Ficha; Catálogo y Rubro PASS con reserva) | T2 (mismo cruce de flotantes), textos y contrastes chicos en la ficha, foco invisible sobre fotos blancas en oscuro, H8 en un punto, recortes a 320. |

## Corregido en esta ronda (capas al final de `src/glass.css`, `app.js`, `home-search-motion.js`)
1. **Flotantes sobre el panel del buscador** (Objetivo + Sistema): con el buscador abierto (`is-searching`) el dock se retira. Medido: `elementFromPoint(325,670)` → "Ver resultados".
2. **Ficha en celular sin acceso al pedido** (Objetivo + Sistema): "Mi pedido" aparece apenas hay productos, sin esperar al scroll.
3. **Chat**: `.picks` dentro del chat ya no hereda el aire de la sección "Elegidos" (76px vacíos).
4. **Vuelo de ida 8px corto**: el destino se mide con las transiciones de tamaño apagadas (`is-measuring`).
5. **Cartelito de "agregado"**: ancho según su texto (340px máx.), ya no media pantalla en 3-4 líneas.
6. **Campo del buscador al escribir** (Calidad): 95 → 193px (Pedido y Menú ya estaban ocultos; ahora el campo usa ese lugar).
7. **Aviso de Base44 en la ficha en celular**: va arriba, debajo de la barra (abajo tapaba el 40% del precio y empujaba el dock sobre el título).
8. **Catálogo en desktop**: 5 columnas desde 1200px (4 → 5 enteros en la primera pantalla; precios alineados).
9. **"Limpiar filtros"** no aparece si el único filtro es el rubro de la propia página; con 0 resultados y sin filtros, la fila de filtros se va.
10. **Barra lateral**: el pedido con productos se enciende (fondo dorado suave); contador a 14px.
11. **Hoja del pedido**: con descuento, manda "Total con descuento" (20px); el estimado queda tachado y chico.
12. **Ficha, piso del sistema**: migas 14px y 44x44, rubro/stock 14px, rubro de relacionados con `--text-2` (3,36 → ≥4,5:1), cantidad 44px en desktop, menú clásico con enlaces y botones de 44px y textos de 14px; el botón Menú deja de ser amarillo.
13. **Foco sobre fotos blancas (oscuro)**: anillo oscuro + halo claro en compartir y "+".
14. **H8**: 48px entre "Elegidos" y el bloque de Base44 (había 8).
15. **320px**: "Librería" ya no pisa la insignia en la ficha; accesos de la home más apretados; placeholder con puntos suspensivos.

## Decisiones de Fran (no se tocaron)
- **Filtros del catálogo en celular, de a uno por fila** (`ecb6988`, decisión de la otra sesión): ocupan 254px (320 en rubros) y la primera tarjeta arranca en y≈563: 0 productos enteros en la primera pantalla. Calidad y Sistema lo marcan (C2 de la vara pide una fila). Propuesta: grilla 2x2 de 48px (104px) y "Limpiar" como enlace junto a "N productos" → 2 productos enteros. **O se cambia la pantalla o se actualiza la vara.**
- **Buscador flotante en la ficha en celular**: hoy queda estático al final (pedido 20 lo quería flotando); sumarlo compite con la barra de "Agregar" y los flotantes.
- **Ficha en celular con barra de arriba** en vez de la isla (Calidad: T1 gana shop.app por consistencia).
- Tarjeta de horarios en amarillo pleno (Sistema: amarillo sin ser acción) — ya estaba abierta.
- Hero → banner a 28px: es el "banner pegado al hero" pedido en la Ronda A.

## Menores que quedan
Precio y orden no quedan en la URL (sólo `cat` y `q`); "+" de 44px en relacionados contra 48 en catálogo; separación 2px/0px entre opciones de Categoría y Precio; a 320 con productos en el pedido el placeholder se abrevia.
