# Movimiento
[Volver al sistema](../../DESIGN.md) · v0.1 · Animar para orientar.

## Regla
El movimiento existe para explicar cambio, confirmar accion o mantener ubicacion. No debe competir con producto, precio ni lectura. Si `prefers-reduced-motion` esta activo, el contenido sigue completo y los cambios son inmediatos o casi inmediatos.

## Duraciones
- Presionado: 120 a 180ms.
- Cambio de filtro o tema: 160 a 280ms.
- Agregar al pedido: 240 a 360ms.
- Panel o modal: 280 a 440ms.
- Escena principal: 440 a 850ms, una sola vez y sin bloquear.

Curvas base: `cubic-bezier(.16,1,.3,1)` para entrada, `cubic-bezier(.4,0,.2,1)` para cambios suaves y `cubic-bezier(.34,1.4,.64,1)` solo para microconfirmaciones.

## Patrones
Agregar producto: el contador cambia, la linea aparece y el boton confirma. La tarjeta puede moverse pocos pixeles; no saltar ni reducir tanto que parezca rota.

Filtros: actualizar lista con transicion corta y mantener el foco. No escalonar cientos de productos; limitar el escalonado a una coleccion visible pequena.

Modal o lightbox: entrar desde la direccion esperada, cerrar rapido y devolver foco. En mobile respetar safe area.

Mascota: usar Adolfito para bienvenida breve, ayuda o promo. No loops permanentes ni apariciones que interrumpan busqueda.

## Rendimiento
Preferir `transform` y `opacity`. No prometer FPS sin medir. Una animacion linda que retrasa compra o rompe lectura se elimina.
