# Handoff — rediseño de la home (rama `preview`)

Actualizado: 18/09/2026. Leer esto primero al retomar en un chat nuevo;
después `estado-actual.md` (bitácora completa) y `DESIGN.md` (sección
"Decisiones del 17/09/2026", que manda sobre las reglas viejas).

## Dónde estamos
- **El objetivo cambió el 18/09/2026.** Fran comparó `main` con `preview` y dio
  una dirección nueva: leer `work/design-loop/home-v2-20260918/brief.md`
  (pedidos textuales, decisiones delegadas y rondas A–E). Manda sobre el brief
  del hero del 15/09.
- Rama `preview`. Publicado en https://diseno--libreria-arias.netlify.app
  (alias `diseno`, NO producción).
- Deploy: `npm run build` y luego
  `TEMP="D:\tmp" TMP="D:\tmp" netlify deploy --no-build --dir=dist --alias=diseno`
  (el TEMP en D: es porque C: se queda sin espacio).
- Si sólo cambió CSS/JS de `src/`, alcanza con copiar a `dist/src/` y
  deployar; si cambió `templates.js`, hay que reconstruir.
- Servidor local de `dist/` en http://localhost:4322/.

## Rondas de la home v2 (brief del 18/09)
| Ronda | Tema | Estado |
|---|---|---|
| A | Marca al frente (logo + wordmark con lema), fuera tarjetas flotantes, banner pegado al hero, vuelven los flotantes de WhatsApp e IA | **Hecha** — falta pasarla por críticos |
| B | Carrusel "Elegidos" que rota cada 5 min con transición de vidrio | **Hecha** — mirar la animación en el deploy (el panel de pruebas no genera cuadros) |
| C | Filtros en una fila de pastillas (C1); catálogo en /catalogo/ y home con 50 destacados, sin tocar el contrato de Base44 (C2) | **Hecha** — queda rediseñar las páginas SEO /c/<rubro>/ |
| D | Barra lateral en desktop / isla en mobile (shop.app) | **Hecha** (sin ícono de favoritos hasta que exista la función) |
| E | Transición del buscador tipo Airbnb, de arriba hacia abajo en vidrio | **Hecha** — mirar la suavidad en el deploy / teléfono real |
| + | Compartir productos con vista previa (WhatsApp primero) y mobile más grande: flotantes, chat y tarjetas | **Hecha** — falta probar la vista previa real en WhatsApp con una URL pública |
| + | Filtros en pastillas con desplegable, flotantes con Adolfito, ficha de producto estilo shop.app y splash que aterriza en la home | **Hecha** — mirar splash y animaciones en el deploy; "Calificación" espera a que existan reseñas |
| — | Favoritos por sesión | Más adelante (Fran: "no ahora") |
| — | Reseñas con estrellas (requiere registro) y filtro Calificación | Más adelante (Fran) |

## Rondas anteriores
| Ronda | Tema | Estado |
|---|---|---|
| 1-2 | Promo única 10%, íconos SF, limpieza | Hecha |
| 3 | Sistema de vidrio (`src/glass.css`) | Hecha |
| 4 | Isla que respira con el scroll | Hecha — **falta probar en teléfono real** |
| 5 / 7 | Comparación directa con shop.app | Hecha (las tarjetas flotantes del hero se sacaron en la Ronda A) |
| Críticos v8–v10 | Última medición completa (v9): calidad PASS 9/9, objetivo FAIL, sistema FAIL. Sobre la v10 sólo llegó calidad: PASS 8/9; objetivo y sistema murieron por límite de uso | Corregido lo señalado; la vara cambia con el brief nuevo |
| 6 | Banners como imagen sola, alternando cada 10 s; verticales en celular | **Hecha** (`scripts/build_banners.cjs`; los PNG originales no se versionan) |

## Pendientes concretos (en el orden en que conviene hacerlos)
1. **Fran tiene que mirar en el deploy** lo que el panel de pruebas no deja
   juzgar (no genera cuadros): splash de entrada (pestaña nueva o incógnito),
   rotación de "Elegidos para vos" (cada 5 min), fundido de los banners (10 s),
   vuelo de la isla del buscador al hacer scroll, y **la vista previa real al
   compartir un producto por WhatsApp** (mandarse un enlace de `diseno--…`).
2. ~~Ronda D~~ hecha el 18/09 (barra lateral en desktop).
3. ~~Ronda E~~ hecha el 18/09 (el buscador viaja de arriba hacia abajo y vuelve).
4. Rediseñar las páginas SEO `/c/<rubro>/` con el mismo lenguaje que `/catalogo/`
   (hoy tienen el diseño viejo y nada de la home enlaza a ellas).
5. **Actualizar la vara** (`work/design-loop/hero-20260915/bar.md`) al brief
   nuevo y recién ahí correr `criticos-arias` sobre home, `/catalogo/` y ficha.
   Nada de lo hecho el 18/09 pasó por críticos. Con la marca arriba el buscador
   queda a ~40% de la altura en desktop: es decisión de Fran, no defecto.
6. Limpieza: CSS muerto de `.attn__*`, `.home-scene`, `.sortbtn` y chips viejos;
   `assets/brand/banner-canal.webp`, `assets/promos/adolfito-cupon-descuento.webp`
   y `wordmark-*-logo.webp` sin uso; `glass.css` creció con una capa por ronda y
   conviene consolidarlo cuando el diseño se estabilice.
7. Esperan a Rodri (ver "LEER PRIMERO" en `docs/base44-integracion/RESUMEN-PARA-RODRI.md`):
   CORS del dominio `diseno--…`, texto del aviso en una línea, 10-15 destacados,
   y el OK para mandar el evento `Producto compartido` (la web ya emite
   `arias:share` en `window`; falta conectarlo en `analytics.js`).
8. Decisiones abiertas de Fran: isla en tema claro (¿vidrio claro o siempre
   oscura?); cartel "CUPÓN DESCUENTO" en los banners (no existe cupón, el 10% es
   automático); tarjeta de horarios en amarillo pleno.
9. Más adelante (pedido por Fran, no ahora): favoritos por sesión; reseñas con
   estrellas (requiere registro) y, con ellas, el filtro "Calificación".
10. Hoy los 551 productos tienen una sola foto: la galería con miniaturas y el
    cambio animado de la ficha están listos pero no se ven hasta que se carguen más.
11. Nada de esto está en `main`. Pasar a producción requiere OK explícito de Fran.
    Los PNG originales de banners e ícono (`Banners de Adolfito/`, `Banners Mobile/`,
    `Iconito Chat/`) no se versionan; los WebP sí.

## Trampas del entorno de pruebas (no son defectos del sitio)
- El panel del navegador puede no generar cuadros: `requestAnimationFrame`
  no corre, los eventos de scroll no disparan, las animaciones quedan en
  `currentTime 0` (usar `document.getAnimations().forEach(a=>a.finish())`)
  y las capturas salen negras. Medir por DOM.
- A veces tiene `prefers-reduced-transparency` y `prefers-reduced-motion`
  activos: el sitio vuelve sólido el vidrio a propósito. Para verlo, borrar
  esa regla de `glass.css` desde la consola.
- Una pestaña recién creada está en blanco: `navigate` antes de `resize_window`.
- El carrito vive en `localStorage` y se comparte entre pestañas: limpiar
  antes y después de medir.
- No editar la página mientras los críticos miden: evalúan el localhost en vivo.
- Las secciones con `data-reveal` que no se revelaron quedan con `translate 0 14px`
  (sección + ítem = 28px): las distancias por `getBoundingClientRect` salen mal.
  Medir aire entre secciones con `offsetTop`/`offsetHeight`.
- No hay Python en esta máquina: los scripts de reemplazo van en Node.

## Cómo está armado el CSS
`glass.css` carga último y es donde viven las capas de corrección; `home.css`
está minificado por línea (editar con scripts de reemplazo exacto, no a mano);
los archivos usan CRLF (normalizar a LF para reemplazar y volver a CRLF).
