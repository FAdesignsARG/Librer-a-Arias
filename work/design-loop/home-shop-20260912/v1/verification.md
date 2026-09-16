# Evidencia funcional · v1
12/09/2026, preview localhost:4322, lectura Firestore real.
- Build estático correcto: 486 fichas, 6 rubros, home, assets y sitemap. No se desplegó. node --check de app/templates y git diff --check correctos.
- Primera visita home: sin splash ni bienvenida modal, cambio de tema disponible.
- Buscar «patito» desde hero: query en catálogo «patito», primer resultado Velador Patito, foco transferido a #search. El motor heredado también ofrece coincidencias aproximadas.
- Teclado: input → Tab → Buscar → Tab → Ofertas de sugerencias; panel permanece visible y aria-expanded=true. Enter desde búsqueda filtra.
- Entrar a Librería desde el nuevo acceso: búsqueda vacía, chip Librería activo, todas las tarjetas de resultados corresponden a Librería.
- Agregar Velador Patito: pedido de 1 unidad, total $19.500; diálogo muestra línea y enlace wa.me con nombre/cantidad/total. No se abrió WhatsApp ni se envió. Unidad de prueba retirada.
- Promoción: tocar bloque abre detalle de tramos y condiciones reales. Los dos banners se muestran estáticos, sin autorrotación.
- Renders claros/oscuros de la misma fuente: v1-1440-*.png y v1-375-*.png. v1-1440-explore.png muestra categorías y destacados. v1-375-explore.png es evidencia auxiliar previa al último ajuste de altura intrínseca y NO se usa para evaluar espaciado final.
- Medidas finales en v1-metrics.json: 320/375/768/1024/1440 sin desborde horizontal, texto principal 17px, input 48px, categorías 44–48px. Tras esas medidas, solo se fijó la imagen dentro del cuadrado para impedir que un recurso vertical cambie la altura.
- Imágenes de escena cargadas: cinco, sin fallos. Console error: ninguno en búsqueda y categorías.
- Movimiento: entrada de escena 650ms y feedback CSS; guardas CSS de prefers-reduced-motion y desplazamiento instantáneo condicional leídos. La herramienta no expone emulación de esa preferencia: no afirmar prueba en ejecución con reducción activada ni FPS medidos.
