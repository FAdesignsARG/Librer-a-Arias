# Brief — Hero de la home (pieza 1)

**Fecha:** 15/09/2026 · **Rama:** preview · **Loop:** `hero-20260915`

## Qué se mejora

El hero de la home de Librería Arias: la primera pantalla, antes de la
grilla de productos. Alcance: `header.hero` en `src/templates.js` y sus
estilos en `src/home.css` / `src/styles.css`. No se toca la grilla, la
ficha de producto ni el pedido en esta pieza.

## Para quién

Clientes de un comercio de La Rioja, muchos con poca experiencia digital.
"Premium" acá significa claro, grande y confiable — nunca más elementos
ni gestos escondidos.

## Qué pidió Fran (15/09/2026, sobre captura anotada del preview)

1. El hero "no está bien", tiene que verse **premium y simplificado**.
2. **Menos acciones y más claras.**
3. **El buscador debe tener más presencia que los botones.**
4. Sacar los **botones de redes sociales**: sacan de la página.
5. Marcó en rojo tres zonas: el grupo de la barra superior derecha
   (Catálogo · Visitanos · campanita · tema · Escribinos), el párrafo
   de apoyo desalineado a la izquierda, y la fila de tres botones
   (Ver el catálogo · Cómo llegar · Ver productos).

## Estados y tamaños que se evalúan

375px y 320px (prioridad), 1440px, tema claro y oscuro,
`prefers-reduced-motion: reduce`, teclado completo, teclado virtual
abierto con la búsqueda enfocada.

## Requisitos verificables

- Ningún elemento tocable de la primera pantalla con menos de 44x44px.
- Sin desplazamiento horizontal a 320px.
- Contraste mínimo 4,5:1 para texto normal en ambos temas, medido sobre
  el contenido real que pase por detrás.
- Se conservan los IDs y atributos que consumen otros módulos
  (`data-arias-section`, `data-arias-hero-*`, `data-arias-whatsapp`,
  `#homeSearch`, `#search`, `data-open-order`, `data-open-menu`).

## Límites

Sin dependencias nuevas, sin React ni Tailwind, sin librerías de
animación. Colores, radios, sombras y duraciones salen de los tokens
existentes o se crean como token en `src/styles.css`. Nada de descuentos,
stock, urgencia ni reseñas inventadas.
