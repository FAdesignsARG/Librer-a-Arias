# Verificación · home-search v1 · 13/09/2026
Versión para críticos: archivos hash en version.json; no editar durante evaluación.
## Navegador real, home localhost4322
- Un único #search observado antes/después de scroll y al escribir; texto patito y foco search preservados; primer resultado Velador Patito.
- Cápsula escritorio width600, top904.4, bottom976 en viewport1440×1000. Móvil375×812: width328, top736.4, bottom800. Nav no comparte dock inferior.
- Regreso al inicio: clase home-search sin is-docked, top477.4 escritorio /157 móvil.
- Navegador solicita prefers-reduced-motion:reduce; verificado en ejecución. En home real transición instantánea, sin duplicación.
- Input17px en320,375,768,1024,1440; documento sin overflow horizontal en los cinco anchos, final-metrics.json. Scroll interno de filas intencional. Controles nuevos y nav44px o más. Logo nav omitido solo <=360 para mantener objetivos táctiles; identidad permanece en hero.
- Temas claro/oscuro capturados. En móvil escena superior se oculta; marca/buscador/rubros primero.
- Agregar Lámpara LED de Escritorio X-7188: Mi pedido1; abre diálogo con $4.500; quitar devuelve0. No se abrió/envió WhatsApp.
- Ayuda abre Asistente de Librería Arias y cierra. Escape cierra sugerencias; Tab permite salir sin duplicar input.
- El campo se mantiene acoplado mientras se lo edita para evitar auto-scroll por teclado; al salir del campo vuelve a evaluar posición.
## Animación completa: fixture local explícito
Sistema anfitrión pide reducción. Se sirvió una copia HTML del home en /src/home-motion-preview.local.html con shim matchMedia limitado a JS de movimiento (sin cambiar PC). Mismos módulos y CSS que home; fixture no entra al build. Scope: verifica movimiento WAAPI del componente real; no equivale a prueba de OS con no-preference ni teclado físico.
- full-motion.json/PNGs: el buscador entra desde top828 fuera de pantalla a803.9,776.4,755.8,746.5,740.9,738.6 y736.4 final. Tiempos de muestreo del host, no FPS.
- return-motion.json/PNGs: top736.4→776.2→822.3→827.9, luego mismo campo vuelve a top157 con opacity0→0.79→0.99→1. Sin vuelo a través del contenido.
- Test motion-check.mjs con DOM simulado: PASS umbral, misma instancia, reducción, reversión, teclado300px, limpieza. No prueba dispositivo físico.
## Límites y alcance
- Teclado virtual físico/iOS queda como prueba de dispositivo pendiente; adaptación visualViewport comprobada en simulación. No hay medición FPS ni test con niños.
- Cápsula sobre contenido es comportamiento expresamente pedido; no comparte ese espacio con ayuda/pedido. El documento tiene padding inferior para acceder al final y tarjetas tienen scroll-margin-bottom para foco.
- Tamaños pequeños14px se usan en metadatos, chips y nav; campo/cuerpo principal17px. Umbral scroll y márgenes12/24 son adaptación funcional a nav y safe-area.
- Se preservan datos Firestore, Cloudinary, stack y APIs. Home omite splash/bienvenida bloqueantes y carrusel automático.
