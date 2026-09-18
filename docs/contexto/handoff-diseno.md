# Handoff — rediseño de la home (rama `preview`)

Actualizado: 18/09/2026. Leer esto primero al retomar en un chat nuevo;
después `estado-actual.md` (bitácora completa) y `DESIGN.md` (sección
"Decisiones del 17/09/2026", que manda sobre las reglas viejas).

## Dónde estamos
- Rama `preview`, última ronda de diseño: "v9" (ver `git log`). Publicado en
  https://diseno--libreria-arias.netlify.app (alias `diseno`, NO producción).
- Deploy: `npm run build` y luego
  `TEMP="D:\tmp" TMP="D:\tmp" netlify deploy --no-build --dir=dist --alias=diseno`
  (el TEMP en D: es porque C: se queda sin espacio).
- Si sólo cambió CSS/JS de `src/`, alcanza con copiar a `dist/src/` y
  deployar; si cambió `templates.js`, hay que reconstruir.
- Servidor local de `dist/` en http://localhost:4322/.

## Rondas
| Ronda | Tema | Estado |
|---|---|---|
| 1-2 | Promo única 10%, íconos SF, limpieza | Hecha |
| 3 | Sistema de vidrio (`src/glass.css`) | Hecha |
| 4 | Isla que respira con el scroll | Hecha — **falta probar en teléfono real** |
| 5 / 7 | Comparación directa con shop.app, tarjetas flotantes | Hecha |
| Críticos v8 | objetivo FAIL, sistema FAIL, calidad PASS 7/9 | Corregido |
| Críticos v9 | objetivo FAIL, sistema FAIL, calidad PASS 9/9 | Correcciones aplicadas — **falta re-correr objetivo y sistema** |
| 6 | Banners como imagen sola (1400x534, fondo transparente) | Bloqueada: faltan los diseños de Fran |
| 8 | Grilla: hoy dibuja los 523 productos de una (≈97.000px de alto) | Pendiente |

## Pendientes concretos
1. Re-correr los críticos de objetivo y sistema con la skill `criticos-arias` sobre la v9 (vara: `work/design-loop/hero-20260915/bar.md`, v2). Calidad ya dio PASS 9/9.
2. Decisiones de Fran que dejaron abiertas los críticos (no resolver solo):
   - ¿Va el lema bajo el wordmark en la primera pantalla? (DESIGN.md dice "wordmark y su lema"; hoy no está.)
   - Isla en tema claro: ¿vidrio claro (como está) o siempre oscuro?
   - La mascota de la promo sostiene un cartel "CUPÓN DESCUENTO" y no existe cupón: ¿nuevo dibujo?
   - El bloque "¿No encontraste lo que buscabas?" (lo configura Rodri desde Base44) queda arriba de los resultados de búsqueda: ¿se baja debajo de la grilla?
   - Tarjeta de horarios en amarillo pleno; a 1280 conviven la barra de arriba y la isla de abajo.
   - Pastilla de WhatsApp cortada a 375: ¿scroll, sin ícono, o tres tarjetas chicas?
3. `#waBanner` y la tarjeta de promo (radio 20 + borde) siguen fuera del sistema de tarjetas de 28px → Ronda 6.
4. Mensaje de WhatsApp del pedido dice "No acumulable con otras promociones" (a propósito, `src/app.js`). Decisión de Fran si se acorta.
5. Prueba en teléfono real: isla (bajar rápido → se recoge; frenar → se ofrece; tocar → crece; volver arriba → se suelta) y Enter/lupa del teclado → baja a resultados.
6. Nada de esto está en `main`. Pasar a producción requiere OK explícito de Fran.

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
