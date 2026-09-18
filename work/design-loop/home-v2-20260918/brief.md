# Brief — Home v2 y catálogo aparte

**Fecha:** 18/09/2026 · **Rama:** preview · **Loop:** `home-v2-20260918`
Reemplaza como objetivo vigente a `work/design-loop/hero-20260915/brief.md`
(sus pedidos 1-10 siguen en pie salvo donde este brief los cambia).

## Qué dijo Fran (18/09/2026, comparando `main` con `preview`)

1. El catálogo de `main` **presenta mejor la marca a primera vista**: logo al
   centro, el mensaje "El Temu 2.0 riojano" y el banner visible rápido. Eso
   tiene que volver. El buscador se queda: es mucho mejor que los botones de
   redes y de catálogo que había.
2. **Vuelven los botones flotantes de WhatsApp y de la IA**: "forman parte de
   la esencia y el alma de lo que estábamos construyendo".
3. Sobran secciones. De estas tres hay que **sacar por completo al menos una**:
   tarjetas flotantes del hero · "Un mundo para descubrir" · carrusel de 5
   productos. Tarjetas y carrusel no conviven: queda el que encaje mejor con lo
   ya armado en Base44 con Rodri.
4. Lo que quede (tarjetas o carrusel) **cambia solo cada 5 minutos, en tiempo
   real**, recomendando otros productos, con una animación de cambio llamativa
   y profesional, tipo glass.
5. **El catálogo está roto a nivel de diseño**: filtros mal diseñados, botones
   a distintas alturas, no se siente premium.
6. Entrar a un rubro desde "Un mundo para descubrir" y aparecer en el mismo
   catálogo sin que se note es raro. Tiene que sentirse **una sección aparte**
   donde la única atención es el buscador, lo buscado y esa categoría.
   Probablemente **páginas separadas**, para que la home no sea invasiva.
7. La home **no muestra todos los productos**: ~50 destacados y un botón
   "Ver más" que lleva al catálogo bien construido. Llegar al pie tiene que
   ser fácil.
8. **Transición del buscador como Airbnb** (de grande a chico, súper suave),
   pero en Arias: de arriba hacia abajo, en vidrio, llamativa, suave e intuitiva.
9. **Panel lateral en desktop como shop.app, que en mobile es la isla
   flotante.** Mismos íconos (inicio, categorías, pedido, ofertas, favoritos),
   más tema claro/oscuro. Arriba el logo de Arias; abajo, en lugar de "Iniciar
   sesión", el Menú. WhatsApp e IA siguen del otro lado (flotantes a la derecha).
10. **Favoritos: más adelante, 100%.** Guardar favoritos por sesión. No ahora.
11. Referencia de la búsqueda de shop.app: buscar lleva a **una página de
    resultados aparte**, con filtros en pastillas arriba, el buscador que
    cambia levemente de diseño y queda flotando abajo, y la barra lateral para
    volver al inicio. "Hay que acercarnos muchísimo a ese nivel de diseño,
    simpleza e intuitividad constante en toda la web-app."

Referencias: shop.app, Mercado Libre, Airbnb. Tokens y specs en
`D:/Descargas/Shop Web - Example/` y `D:/Descargas/Airbnb Example/`
(`DESIGN (2).md`, `tokens.json`, `variables.css`, `theme.css`).

## Decisiones tomadas por Claude donde Fran delegó (revisables)

- **Se van las tarjetas flotantes del hero; queda el carrusel "Elegidos para
  vos hoy".** Motivo: el carrusel es la sección `destacados` que Rodri ya
  controla desde Base44 (orden, visibilidad y productos destacados por
  `productIds`); las tarjetas flotantes no tienen nada del otro lado. Además
  liberan la primera pantalla para la marca, el lema y el banner (punto 1).
- **"Un mundo para descubrir" se queda**: es la puerta a las páginas de rubro
  (punto 6), que ya existen en `/c/<rubro>/`.
- **El catálogo aparte se apoya en lo que ya hay**: `/c/<rubro>/` para rubros y
  una página `/catalogo/` para "todo" y para resultados de búsqueda
  (`/catalogo/?q=`). Sitio estático: la búsqueda sigue corriendo en el navegador.

## Rondas

| Ronda | Tema | Puntos |
|---|---|---|
| A | Primera pantalla con marca (logo, lema, buscador, banner a la vista), fuera tarjetas flotantes, vuelven WhatsApp e IA flotantes | 1, 2, 3 |
| B | Carrusel que rota cada 5 min con transición de vidrio | 4 |
| C | Home liviana: 50 destacados + "Ver más"; página `/catalogo/` y rubros como páginas aparte; filtros en pastillas a una sola altura | 5, 6, 7, 11 |
| D | Barra lateral en desktop / isla en mobile | 9 |
| E | Transición del buscador estilo Airbnb, de arriba hacia abajo en vidrio | 8 |
| — | Favoritos | 10 (más adelante) |

Cada ronda cierra con la skill `criticos-arias`. La vara (`bar.md`) se
actualiza antes de lanzar críticos, porque el objetivo cambió.

## Límites (siguen vigentes)

Sin dependencias nuevas, sin React ni Tailwind, sin librerías de animación.
Se conservan los IDs y atributos que consume Base44 (`data-arias-section`,
`data-arias-hero-*`, `data-arias-whatsapp`, `#homeSearch`, `#search`,
`data-open-order`, `data-open-menu`). Promo única 10% web. Nada a `main` sin
OK explícito de Fran.

## Agregado de Fran (18/09/2026, más tarde)

12. **Mobile: todo más grande y más estético**, fácil de pulsar, con tarjetas
    más lindas. "Hay que mejorar la web a nivel de diseño para desktop, pero
    sobre todo para mobile."
13. **Compartir (importantísimo, foco en WhatsApp).** Cualquier producto se
    tiene que poder compartir con su landing, principalmente por WhatsApp, y
    Adolfo tiene que poder compartirlos por la comunidad. Al compartir se tiene
    que ver **muy estético, con vista previa**. También Instagram, Facebook y
    cualquier red, y usarlo como **plantilla de mail** con preview.
14. **Flotantes de WhatsApp y del asistente un poco más grandes**, y el
    asistente **bien construido como chat**, sobre todo en mobile: tipografía
    de buen tamaño, acciones rápidas más grandes y que destaquen, accesos más
    grandes para sumar al carrito o ir a las landings.
