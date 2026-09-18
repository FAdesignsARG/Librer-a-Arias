# Componentes y estados
[Volver al sistema](../../DESIGN.md) · v0.1 · Contrato de interfaz.

## Estados obligatorios
Todo control interactivo debe tener: reposo, hover cuando aplica, foco visible, presionado, cargando, deshabilitado, error y completado si cambia datos. El contenido debe actualizarse antes o junto con la animacion; la animacion no puede esconder un estado viejo.

## Botones
El boton primario usa amarillo con texto `#1a1200`, altura recomendada 48px y verbo claro: "Agregar", "Revisar pedido", "Continuar por WhatsApp". Controles secundarios pueden usar 44px. Evitar botones que prometan compra cerrada: WhatsApp inicia la conversacion, no confirma el pedido.

## Busqueda y filtros
La busqueda debe conservar lo escrito al cambiar filtros o volver desde una ficha. Siempre mostrar cantidad o estado: cargando, resultados, sin resultados o error. En cero resultados ofrecer limpiar filtros y volver a buscar.

Filtros: nombres comprensibles, estado seleccionado evidente y area tactil completa. En mobile los chips o segmentos deben poder recorrerse sin perder el campo de busqueda.

## Tarjeta de producto
Orden estable: foto, categoria cuando ayuda, nombre, precio o consulta, disponibilidad, accion. La tarjeta no debe depender del hover para entenderse. Si falta precio: "Consulta el precio". Si stock es desconocido: "Consulta disponibilidad".

La accion de agregar debe confirmar cantidad y permitir corregir. No usar ratings, ventas o etiquetas de urgencia si no vienen de datos confiables.

## Ficha y galeria
La ficha debe responder tres preguntas: que es, cuanto cuesta o como consultarlo, y que hago ahora. La galeria necesita controles de avance, cierre de 44px o mas, escape por teclado y retorno de foco al elemento que la abrio.

## Pedido
El pedido muestra lineas editables, total estimado cuando los datos alcanzan y aviso de confirmacion humana. Estados distintos: agregado, revisado, link abierto, mensaje enviado por el usuario y pedido confirmado por Arias.

## Promos
Cada promo debe incluir condicion cerca del beneficio. Si es carrusel, debe poder pausarse y no debe mover contenido mientras alguien intenta tocar o leer. Adolfito puede acompanar una promo, pero no tapar precio, cierre ni accion principal.

## Admin
Los formularios admin deben validar antes de guardar, explicar errores y proteger cambios de precio, stock o imagen. No usar ejemplos de documentacion como datos reales.
