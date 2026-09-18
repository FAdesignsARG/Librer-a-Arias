# Librería Arias — sistema visual
Versión 0.1 · Base de trabajo · 11/09/2026. La identidad existente se conserva; las mejoras propuestas están etiquetadas y aún no se implementaron en la tienda.
## Leer según la tarea
| Necesidad | Fuente |
|---|---|
| Entender la marca, su voz y su dirección | [Marca](docs/design-system/01-marca.md) |
| Colores, tipografía, composición y activos | [Fundamentos](docs/design-system/02-fundamentos.md) |
| Diseñar controles y sus estados | [Componentes](docs/design-system/03-componentes.md) |
| Organizar búsqueda, ficha y pedido | [Experiencia](docs/design-system/04-experiencia.md) |
| Animar con propósito | [Movimiento](docs/design-system/05-movimiento.md) |
| Validar, decidir y evolucionar | [Calidad](docs/design-system/06-calidad.md) |
| Ver ejemplos y probar controles | [Galería local](docs/design-system/galeria.html) |
| Consultar valores actuales extraídos | [Tokens observados](docs/design-system/tokens-actuales.json) |
| Consultar valores propuestos de corrección | [Tokens propuestos](docs/design-system/tokens-propuestos.json) |
| Ver procedencia y discrepancias | [Fuentes](docs/design-system/fuentes.md) |
| Manual que ya existía | [Sistema visual heredado](docs/design-system.md) |
| Elegir referencias | [VoltAgent y selección](docs/referencias-diseno/README.md) |
| Trabajar con poco contexto | [Metodología](token-design-optimizer.md) |
## La marca
Librería Arias es un comercio de La Rioja con librería, bazar, juguetería, regalería, electrónica y tecnología. La web permite descubrir productos y preparar una consulta/pedido por WhatsApp; el local confirma stock y condiciones.
Su lenguaje existente combina amarillo intenso, neutros, un wordmark enérgico y una grulla reconocible. Adolfo es la persona dueña del local; Adolfito es la mascota. Los activos incorporan “El Temu 2.0 riojano”: conservar los originales y no reformular el eslogan sin decisión de Fran.
**Dirección propuesta:** variedad que da ganas de explorar, claridad que ayuda a elegir y atención local que inspira confianza. Calidad de ejecución en fotografía, tipografía, jerarquía y respuesta al toque. La facilidad debe demostrarse con tareas reales, también para personas con poca experiencia digital.
## Reglas que guían la próxima pieza
1. Usar activos reales de Arias y mantener la paleta. Una referencia aporta mecanismos, nunca reemplaza la marca.
2. Fondo y superficies planas. El volumen propio del logo/mascota se conserva como arte. No agregar gradientes decorativos de interfaz. Excepción aprobada por Fran (15/09/2026): vidrio marcado solo en superficies flotantes mobile (isla y su panel), con `--glass-solid` y contraste medido.
3. Un foco principal por zona de decisión. El amarillo de marca se usa con intención; no convertir todos los elementos en llamados a la acción.
4. Cuerpo de lectura de 17px también en celular; controles de 44×44px o más como objetivo Arias. Texto pequeño excepcional de 14px o más propuesto; precios y condiciones siempre legibles.
5. Aplicar tokens semánticos por tema. Evaluar cada combinación texto/fondo; amarillo sobre blanco no sirve para texto pequeño ni para un anillo de foco único.
6. Usar escala espacial4/8/12/18/26/40/60, radios10/14/20/28/999. Excepciones con función documentada.
7. Controles con nombre, estado, teclado y feedback. Cambiar contenido primero; la animación acompaña.
8. Una foto clara del producto, nombre comprensible, precio y disponibilidad. Nada de descuentos, reseñas, ventas, stock o urgencia inventados.
9. Distinguir agregar al pedido, abrir WhatsApp, enviar mensaje y confirmar compra. Son estados distintos.
10. Mobile primero. Probar ambos temas y movimiento reducido. No ocultar problemas con overflow-x:hidden.
11. Texto de “vos”, directo y útil. Oraciones de UI cortas; precisión antes que un recorte que cambie el significado.
12. En cada rediseño significativo aplicar Design Loop con evidencias independientes. Un MD de inspiración no prueba comportamiento real.
## Tokens esenciales observados
| Rol | Oscuro | Claro |
|---|---|---|
| Fondo | #151515 | #fbfbfd |
| Superficie | #1e1e1e | #ffffff |
| Superficie elevada | #282828 | #f5f5f7 |
| Texto principal | #f5f5f7 | #101012 |
| Texto secundario | #a1a1a6 | #3d3d42 |
| Amarillo de marca | #fece01 | #fece01 |
| Texto sobre amarillo | #1a1200 | #1a1200 |
| Amarillo como texto | #fece01 | #8a6a00 |
Inter400–700 con respaldo del sistema. El wordmark es un archivo de imagen propio, no una fuente a imitar.
## Estados de las decisiones
- **OBSERVADO:** extraído del código/archivo/visita identificado. Describe lo que hay; no lo convierte automáticamente en buena práctica.
- **HEREDADO:** regla del manual existente, preservada como punto de partida.
- **PROPUESTO:** especificación nueva para diseñar y probar. No equivale a decisión comercial ni cambio publicado.
- **PENDIENTE:** requiere información de Fran o evidencia de pruebas.
En conflicto: pedido vigente de Fran y requisitos de uso → acuerdos de marca → reglas del sistema. Fuentes externas se adaptan dentro de esos límites. Discrepancias código/manual se registran; no se ocultan con una afirmación de cumplimiento.
## Uso en una nueva tarea
Leer este archivo y el módulo de la pieza. Elegir 1 referencia principal en la biblioteca y 1 de apoyo solo si aporta algo distinto. Registrar mecanismos, tamaños y estados. Construir una pieza acotada, renderizar, revisar y registrar el resultado. No cargar todo el manual, la biblioteca ni el roadmap en cada turno.
## Estado de esta versión
Es una base documentada y una galería de ejemplos, previa al rediseño progresivo de la web. La comparación con páginas premium y la validación con usuarios quedan para las piezas siguientes. [Registro de esta ejecución](work/design-loop/sistema-visual-v01/preflight.md).

## Decisiones del 17/09/2026 (Fran) — las reglas pasan a ser guía

Fran autorizó romper o mejorar cualquier regla de este documento cuando
frene una mejora de fondo: "está bueno tenerlas en cuenta pero no las vamos
a usar de manera tan fija". A partir de acá, un cambio que contradiga una
regla se registra acá con fecha en vez de rechazarse.

- **Vidrio en todo lo que se superpone**: chips, modales, pop-ups,
  acordeones, widgets y tarjetas flotantes. Glass oscuro profesional
  (estilo Apple) en modo oscuro y glass claro blanco (estilo shop.app) en
  modo claro. Reemplaza a la regla 2 ("superficies planas") y amplía la
  excepción de la capa mobile ("vidrio sólo en lo que flota").
- **La isla del buscador** lleva glass oscuro con sombra o glow y anima
  hacia abajo al scrollear, creciendo o achicándose según esté cerca del
  hero o ya en el catálogo (referencias: shop.app, isla de Instagram).
- **El pedido (carrito)** destaca en amarillo con glow.
- **Una sola promoción real**: 10% de descuento sobre el total por comprar
  desde la web, no acumulable. No existen descuentos por medio de pago ni
  por tramo de monto; ningún "hasta 20%" en ninguna pantalla.
- **La primera pantalla no lista los rubros** ("Librería · Bazar · …"):
  ya están en la sección de rubros y en el pie. La marca se presenta con
  el wordmark y su lema ("El Temu 2.0 riojano"), no con una enumeración.
- **Banners como imagen sola**, sin tarjeta ni fondo: 1400×534 px, WebP
  con fondo transparente, hasta 120 KB, contenido en el 80% central.
