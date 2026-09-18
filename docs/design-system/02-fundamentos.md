# Fundamentos visuales
[Volver al sistema](../../DESIGN.md) · v0.1 · Base para diseñar y revisar.

## Principio
Librería Arias debe sentirse amplia, cercana y clara. El amarillo da energia y reconocimiento; los neutros dejan que productos, precios y acciones se lean rapido. Las referencias premium se usan como mecanismos de calidad: foco, jerarquia, aire, ritmo y estado, sin copiar identidad.

## Color
El sistema parte de un tema oscuro y uno claro. El amarillo `#fece01` es marca y llamada de atencion; sobre amarillo usar siempre texto oscuro `#1a1200`. En tema claro, el amarillo puro no debe usarse como texto normal sobre blanco: usar `#8a6a00`.

Correcciones propuestas:
- Texto secundario oscuro: `#a1a1a6`, no gris mas bajo para parrafos.
- Exito sobre blanco: `#167b2c`.
- Error sobre blanco: `#b42318`; error sobre oscuro: `#ff8a80`.
- Foco visible: amarillo con separador oscuro o borde adicional cuando el fondo tambien es claro.

## Tipografia
Inter 400 a 700 es la fuente de interfaz. El wordmark es imagen de marca, no una tipografia para imitar en textos. Cuerpo de lectura: 17px en contenido y controles principales. Rotulos utiles no deberian bajar de 14px salvo metadatos secundarios muy acotados.

Escala operativa:
- Display: portada o escena principal.
- H1/H2: titulo de tarea o bloque.
- Body: descripcion, producto y ayuda.
- Small: metadato, categoria y condiciones breves.

En una vista comun usar hasta cuatro tamanos visibles. La excepcion es una pagina de documentacion o specimen donde se muestran escalas.

## Espacio y forma
Escala: 4, 8, 12, 18, 26, 40, 60. Ancho de pagina: 1200px. Gutter: 18 a 32px. Objetivo tactil Arias: 44px minimo, 48px para acciones principales.

Radios: 10, 14, 20, 28 y 999. Las tarjetas de producto pueden usar 20px porque ya es parte del lenguaje existente; controles compactos deben ser mas tensos y claros. Separar superficies con sombra o borde; usar ambos solo si hay una razon funcional, como foco o promo activa.

## Composicion
Objetivo 60/30/10: base neutra, producto/contenido, acento amarillo. El aire cercano al 40% ayuda cuando hay decision o lectura; en catalogo puede bajar para mostrar mas productos, siempre que la comparacion siga siendo comoda.

Mobile primero. Revisar 320, 375, 768, 1024 y 1440px como anchos de control. No ocultar problemas con `overflow-x:hidden`; corregir la causa.

## Activos
Usar los activos reales de `assets/brand/`. La grulla facetada es simbolo; Adolfito es personaje promocional. El logo cromado conserva su volumen como arte, aunque la interfaz use superficies planas.

Fotos de producto: cuadradas, claras, con fondo suficiente y sin recortes que impidan reconocer el objeto. No inventar descuentos, stock, reseñas ni urgencias desde la imagen.
