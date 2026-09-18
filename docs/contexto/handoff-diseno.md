# Handoff — rediseño de la home (rama `preview`)

Actualizado: 18/09/2026. Leer esto primero al retomar en un chat nuevo;
después `estado-actual.md` (bitácora completa) y `DESIGN.md` (sección
"Decisiones del 17/09/2026", que manda sobre las reglas viejas).

## Dónde estamos
- Rama `preview`, último commit `90e3545`. Publicado en
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
| Críticos v8 | objetivo FAIL, sistema FAIL, calidad PASS 7/9 | Correcciones aplicadas — **falta re-correr los tres** |
| 6 | Banners como imagen sola (1400x534, fondo transparente) | Bloqueada: faltan los diseños de Fran |
| 8 | Grilla: hoy dibuja los 523 productos de una (≈97.000px de alto) | Pendiente |

## Pendientes concretos
1. Re-correr los tres críticos con la skill `criticos-arias` sobre `90e3545` (vara: `work/design-loop/hero-20260915/bar.md`, v2).
2. A 1280, el Tab hacia adelante saltea Catálogo/Preguntar/WhatsApp (sólo se llega con Shift+Tab).
3. Pastilla de WhatsApp asoma cortada a 375 (shop.app hace lo mismo). Decisión de Fran: ¿scroll, sin ícono, o tres tarjetas chicas?
4. `#waBanner` sigue siendo tarjeta con fondo y borde → Ronda 6.
5. Mensaje de WhatsApp del pedido dice "No acumulable con otras promociones" (puesto a propósito en `src/app.js` ~368). Decisión de Fran si se acorta.
6. Prueba en teléfono real: isla (bajar rápido → se recoge; frenar → se ofrece; tocar → crece; volver arriba → se suelta) y Enter/lupa del teclado → baja a resultados.
7. Nada de esto está en `main`. Pasar a producción requiere OK explícito de Fran.

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

## Cómo está armado el CSS
`glass.css` carga último y es donde viven las capas de corrección; `home.css`
está minificado por línea (editar con scripts de reemplazo exacto, no a mano);
los archivos usan CRLF (normalizar a LF para reemplazar y volver a CRLF).
