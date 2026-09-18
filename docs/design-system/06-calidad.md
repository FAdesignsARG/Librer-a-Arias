# Calidad y validacion
[Volver al sistema](../../DESIGN.md) · v0.1 · Como saber si mejora.

## Estándar
La calidad se prueba con evidencia: captura, recorrido, teclado, mobile, contraste y estados. Un markdown de referencia inspira, pero no demuestra que Arias funciona mejor.

## Accesibilidad
Objetivo minimo: WCAG 2.2 AA en contraste, foco, reflow, dialogos y controles. Arias adopta 44px como objetivo tactil general aunque WCAG tenga excepciones. Texto normal: contraste 4.5:1; texto grande: 3:1.

## Matriz de prueba
Revisar al menos:
- 375px y 1440px; cuando haya dudas, 320, 768 y 1024px.
- Tema claro y oscuro.
- Teclado completo: tab, enter, escape, retorno de foco.
- Movimiento reducido.
- Estados: carga, vacio, error, sin imagen, sin precio, stock desconocido.
- WhatsApp: mensaje generado y alternativa si falla.

## Prueba de comprensión
Una persona debe poder responder en pocos segundos: que vende Arias, como buscar, cuanto sale o como consultar, y que pasa al continuar por WhatsApp. Para flujo infantil o baja experiencia digital, medir tareas simples: encontrar producto, agregar, quitar y entender confirmacion humana.

## Design Loop
Para rediseños importantes: brief concreto, referencia principal, barra de criterios, pieza renderizada y tres criticos independientes. `PASS` requiere que todos miren la misma version y que las observaciones se puedan comprobar.

## Gobernanza
Fran decide direccion visual y prioridades. Adolfo y el local validan tono, condiciones y promesas operativas. Cambios de datos, proveedor, deploy o compra no se autorizan por una referencia visual.
