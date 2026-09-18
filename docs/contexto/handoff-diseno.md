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
| D | Barra lateral en desktop / isla en mobile (shop.app) | Pendiente |
| E | Transición del buscador tipo Airbnb, de arriba hacia abajo en vidrio | Pendiente |
| — | Favoritos por sesión | Más adelante (Fran: "no ahora") |

## Rondas anteriores
| Ronda | Tema | Estado |
|---|---|---|
| 1-2 | Promo única 10%, íconos SF, limpieza | Hecha |
| 3 | Sistema de vidrio (`src/glass.css`) | Hecha |
| 4 | Isla que respira con el scroll | Hecha — **falta probar en teléfono real** |
| 5 / 7 | Comparación directa con shop.app | Hecha (las tarjetas flotantes del hero se sacaron en la Ronda A) |
| Críticos v8–v10 | Última medición completa (v9): calidad PASS 9/9, objetivo FAIL, sistema FAIL. Sobre la v10 sólo llegó calidad: PASS 8/9; objetivo y sistema murieron por límite de uso | Corregido lo señalado; la vara cambia con el brief nuevo |
| 6 | Banners como imagen sola (1400x534, fondo transparente) | Bloqueada: faltan los diseños de Fran |

## Pendientes concretos
1. Seguir con la Ronda D del brief nuevo (barra lateral en desktop / isla en mobile). Antes de volver a lanzar críticos,
   **actualizar la vara** (`work/design-loop/hero-20260915/bar.md`): con la
   marca arriba, el buscador queda a ~40% de la altura en desktop (mecanismo 3
   pedía primer tercio) y eso es decisión de Fran, no defecto.
2. Resuelto por el feedback del 18/09: el lema vuelve (wordmark con "El Temu
   2.0 riojano"); la pastilla de WhatsApp cortada ya no existe (WhatsApp e IA
   son flotantes; las pastillas son Catálogo · Ofertas · Novedades).
3. Siguen abiertas para Fran: isla en tema claro (¿vidrio claro o siempre
   oscura?); cartel "CUPÓN DESCUENTO" de la mascota (no hay cupón); tarjeta de
   horarios en amarillo pleno. El bloque "¿No encontraste…?" de Base44 arriba
   de los resultados y las dos barras a 1280 se resuelven en las rondas C y D.
4. Aviso flotante: su enlace mide 258x55 (59% del buscador) y tapa el "10% OFF";
   el crítico de calidad propone una sola línea y ~48px de alto. El texto lo
   carga Rodri en Base44.
5. Las ideas del buscador se comprueban con el buscador real (correr
   `src/search-engine.js` en Node sobre `products.json`), no por cantidad.
6. `#waBanner` y la tarjeta de promo (radio 20 + borde) siguen fuera del sistema de 28px → Ronda 6.
7. Prueba en teléfono real: isla (bajar rápido → se recoge; frenar → se ofrece; tocar → crece; volver arriba → se suelta), Enter/lupa del teclado → baja a resultados, y que los flotantes suban cuando la isla se acopla.
8. Nada de esto está en `main`. Pasar a producción requiere OK explícito de Fran.

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
