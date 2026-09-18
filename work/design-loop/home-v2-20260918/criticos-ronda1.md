# Críticos · ronda 1 sobre la vara v3 (18/09/2026)

Medido sobre `d8ac1fd` (rama `preview`, servido desde `dist/` en localhost:4322)
contra `work/design-loop/home-v2-20260918/bar.md`.

| Crítico | Veredicto | Resumen |
|---|---|---|
| Calidad A/B | **NO_EVALUABLE** | shop.app devolvió 504 en sus tres pantallas (6 intentos en 15 min). Contra los umbrales absolutos, Arias cumple 14 de 17; fallan en parte 6, 8 y 10. **Relanzar cuando shop.app responda.** |
| Objetivo | **FAIL** | 11 de 15 pedidos cumplen. Falla el 2 (los flotantes se superponen en tres casos); parciales 5, 12 y 13. |
| Sistema | **FAIL** | Home, catálogo y rubros cumplen casi toda la vara. Falla la ficha (estilos viejos) y una superposición de flotantes. |

**OJO:** mientras los críticos medían, otra sesión ("Librería Arias mejoras
finales") empezó a cambiar los banners (puntitos → flechas con arrastre), la
cabecera de "Elegidos para vos" y el movimiento del buscador. Lo que sigue se
midió sobre la versión anterior a esos cambios: los puntos 17 y 18 pueden haber
quedado viejos.

## Correcciones pendientes — NINGUNA aplicada todavía

Ordenadas por cuántos críticos las marcaron y por gravedad.

### Flotantes (WhatsApp + asistente) que se pisan con algo — alta
1. **Ficha a 375 con el aviso de Base44 visible** (Objetivo, Calidad): el aviso
   ocupa y=663–724 y los flotantes y=636–704: 41px de solape; Adolfito tapa el
   botón de cerrar del aviso. La regla que sube el dock por el aviso no contempla
   la barra fija de "Agregar". Hace falta `bottom ≈ 74 + 16 + 76` en
   `body.page-product:has(.arias-pc-bar[data-visible="true"]) .dock` a ≤640px.
2. **Home a 1280 con la isla acoplada** (Objetivo): la isla ocupa x=372–972 y
   WhatsApp x=934–998: se pisan 38x60px. Lo introdujo la barra lateral (corre el
   centro 40px). Salida simple: ampliar de 1040 a ~1400px el `max-width` de la
   regla que sube el dock cuando `.home-search.is-docked` (no hay choque desde
   ~1376px de ancho).
3. **Globito "¿Buscás algo puntual?" (`#aiNudge`)** (Objetivo, Sistema): se ubica
   una sola vez con `right/bottom` en línea y no sigue al dock cuando sube por el
   aviso: lo pisa 52px unos 4 s. Como ya vive dentro de `.dock`, alcanza con
   `position:absolute; bottom:100%; right:0; margin-bottom:14px` (con
   `!important` sobre los valores en línea). De paso: botón de cerrar de 22px →
   44px, texto 13,8 → 14px, y vidrio (hoy es sólido, T4).
4. **Aviso de Base44 a 1280**: `left:24px` no contempla la barra lateral; 16px
   quedan debajo. Usar `left: calc(var(--rail-w) + 24px)` y sacar el `margin-left`.

### Ficha de producto — alta
5. **Precio ilegible en "También te podría gustar"** (Sistema): `.card__price` en
   la ficha es pastilla amarilla con texto amarillo (1:1; 3,39:1 en claro). En la
   home el mismo precio no lleva fondo. Unificar en todo el sitio: fondo
   transparente, sin padding, color `--gold-text`.
6. **Desborde de 30px a 320**: "Preguntarle a la IA" + "Compartir" no cortan
   línea. A ≤360px apilarlos (una columna) o permitir el salto.
7. **Relacionados en celular** (Objetivo, Calidad): 12 tarjetas en una columna
   (~6.300px). Pasar a 2 columnas a ≤720px.
8. **Tamaños en la ficha a 375**: botones de la barra superior 36px, selector de
   cantidad 36px, migas 33x20 → todos ≥44px; insignia "Cerrado" 11,5px, migas
   13,1, rubro 12, stock 13,9 → ≥14px. A 1280: "+" de las tarjetas relacionadas
   38px → 44px; rubro 12 y "En stock" 13,1 → 14px.

### Catálogo y tarjetas — media
9. **Precio y stock a distinta altura** cuando el nombre ocupa 1 línea en vez de
   2 (21–22px de diferencia). Anclarlos abajo (`margin-top:auto` en
   `.card__stock`) o reservar siempre 2 líneas.
10. **Filtros en celular**: "Limpiar filtros" queda a dos pantallas de scroll
    horizontal → ponerlo primero cuando aparece; degradado a la derecha que
    indique que la fila sigue; y en el estado vacío, si hay filtros puestos, un
    botón "Limpiar filtros".
11. **`aria-expanded` ausente en las pastillas de filtro** (seguir el atributo
    `open` de cada hoja con un `MutationObserver`, como el Menú). Opciones:
    Categoría usa `aria-pressed` y Precio/Ordenar `aria-current`: unificar.
12. **`/catalogo/` y `/c/<rubro>/` dibujan todo de una** (95.578px en celular):
    tandas de 48 con "Ver más productos".
13. **Tab hacia adelante a 375 no llega a Pedido ni a Menú**: quedan con
    `visibility:hidden` mientras se busca. En el `keydown` de Tab de la última
    parte de la búsqueda, además de sacar `inert`, llamar `setSearching(false)`.
    (Contradice lo registrado en "Decisiones ya tomadas" de la vara: corregir
    una de las dos cosas.)

### Home — media
14. **23–24px entre el bloque "¿No encontraste…?" y "Destacados"** (los tres
    críticos): hacen falta ≥48px.
15. Tarjetas de "Destacados" (`#grid .card`) con radio 20 en desktop → ≥24.
    (Calidad dice que "Un mundo para descubrir" no tiene sombra; Sistema midió
    sombra de dos capas: verificar antes de tocar.)

### Accesibilidad y contraste — media
16. Contraste <4,5:1: nota del chat y condición de la promo (3,51), migas de la
    ficha (3,6), rubro en tarjetas relacionadas (3,36), placeholder del chat
    (3,96) → `--text-2`. Contador del pedido en la barra lateral a 12px → 14px.
    El campo del chat no tiene etiqueta propia (`aria-label`).
17. Puntitos del banner: activo en claro 1,45:1, inactivos ~2,7:1. *(Puede haber
    quedado viejo: la otra sesión los reemplazó por flechas.)*
18. El carrusel de banners no tiene control de pausa (se pausa con mouse/foco,
    pero `03-componentes` pide poder frenarlo). *(Revisar contra las flechas nuevas.)*
19. Anillo de foco invisible en oscuro sobre fotos blancas (compartir y "+" de
    las tarjetas: 1,09:1). Usar anillo oscuro + halo claro, que se ve sobre cualquier foto.
20. Animaciones infinitas de Adolfito (`dock-bob`, `dock-breathe`): `05-movimiento`
    dice "no loops permanentes" para la mascota. Fran pidió explícitamente que
    "Preguntame" destaque "con una animación": registrar la excepción con fecha
    en `DESIGN.md`.

### Menores
- `is-flying` deja la isla con `pointer-events:none`; si el navegador no avisa el
  fin del vuelo queda puesto: sumar un `setTimeout(ms + 250)` de respaldo.
- Hoja de compartir: dos mosaicos con el mismo ícono de sobre; con 5 mosaicos en
  3 columnas queda un hueco.
- "Preguntame" no se lee en celular (queda sólo la mascota con glow).
- Al abrir un enlace compartido, quien lo recibe ve el splash y el cartel de
  elegir tema antes que el producto.
- Los "Destacados" de la home, después de los ~8 marcados, siguen en orden alfabético.
- "Agregar al pedido" de la ficha no cambia de estado después de agregar.
- El menú enlaza a `/catalogo/?cat=Bazar` y la home a `/c/bazar/`.
- Ficha a 375: 11 tamaños de texto sobre el pliegue.

### De Rodri (no son de la web)
- El texto del aviso: con tres líneas su enlace mide 58,9% del buscador (H2) y
  tapa los 44px inferiores del banner. Ya está pedido en `RESUMEN-PARA-RODRI.md`.

## Lo que los críticos vieron funcionar
Rotación real de "Elegidos para vos" a las 16:55:00 (5 productos nuevos, salida
y entrada escalonadas); banners alternando a los 10,0 s; splash que aterriza y
se quita antes de 3 s; buscar desde la home lleva a `/catalogo/?q=`; rubros a
`/c/<rubro>/`; filtros combinados (7 → 6 → 5 → 0) y "Limpiar"; hoja de compartir
con vista previa 1200x630 cargada y mensaje de WhatsApp correcto; chat con
respuesta pertinente en <5 s; barra lateral con todos los botones; foco
atrapado y devuelto en todas las hojas; promo única sin rastros de "20%".
