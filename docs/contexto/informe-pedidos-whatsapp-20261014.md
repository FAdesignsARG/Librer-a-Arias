# Informe: pedidos por WhatsApp (14/10/2026)

Caso: LAWEB-0D110AB7, 14/10 13:36:54, Mochila Negra Dorada ($28.500 −10% =
$25.650). En Base44 figura "Enviado a WhatsApp"; el dueño no recibió nada.

## Diagnóstico
1. **"Enviado a WhatsApp" era un clic.** La web lo registraba al tocar
   "Enviar pedido por WhatsApp". Ese botón sólo abre WhatsApp con el texto
   escrito: el mensaje llega recién si la persona toca Enviar allá. La web
   no puede saber si lo hizo (WhatsApp no avisa).
2. **La página decía "¡Pedido enviado!"** apenas se abría WhatsApp. Si la
   persona no tocaba Enviar, o WhatsApp no se abría (computadora sin
   WhatsApp, navegador dentro de Instagram), creía que el pedido ya estaba
   hecho. Es la causa más probable de que no llegara.
3. **Error con el aviso de ofertas** (cuando hay ofertas activas): se
   registraba "Enviado a WhatsApp" al mostrar el aviso, antes de abrir
   nada; después WhatsApp se abría al terminar una animación y Safari lo
   bloqueaba como ventana emergente; y ese mensaje salía sin el código
   LAWEB. No fue el caso de LAWEB-0D110AB7: ese día no había ofertas.
4. **Detrás de la confirmación se seguía viendo el pedido** (un estilo le
   ganaba al atributo `hidden`).
5. **Número de destino:** el mismo en el panel, en Base44 y en la página:
   `5493804505150` (+54 9 380 450-5150). Falta que el dueño confirme que es
   el suyo y revise solicitudes de mensajes y chats archivados.
6. **El pedido sí queda guardado sin WhatsApp:** Base44 lo registra como
   "Iniciado" al agregar el primer producto, con productos y totales.
   LAWEB-0D110AB7 existe por eso.

## Pruebas contra Base44 (marcadas `es_prueba: true`, código LAWEB-7E570A01)
- Estado nuevo "Clic en WhatsApp" → **422** (estado inválido).
- Evento nuevo "Pedido enviado según cliente" → **422**.
- "Enviado a WhatsApp" con `datos.evidencia: "clic"` → 200.
- Mismo código y estado otra vez → 200 `duplicate: true` (no duplica).
Conclusión: los estados nuevos los tiene que agregar Base44; la web no
puede cambiarlos sola sin perder registros.

## Cambios en la web
- Después de abrir WhatsApp, la hoja dice **"Falta un paso: tocá Enviar en
  WhatsApp"**, con el código y botones "Abrir WhatsApp", "Ya lo envié",
  "Copiar pedido" y "Ver mi pedido". "Ya lo envié" muestra "¡Gracias! Te
  respondemos por WhatsApp".
- **Pedidos sin confirmar:** si la persona vuelve (hasta 72 h) con el pedido
  abierto en WhatsApp y sin "Ya lo envié", al abrir "Mi pedido" se le
  recuerda ese paso con el mismo código (no se crea otro pedido).
- El código LAWEB va **siempre** dentro del mensaje.
- Aviso de ofertas: WhatsApp se abre en el mismo toque, y el clic se
  registra sólo cuando WhatsApp de verdad se abre.
- Base44 recibe "Enviado a WhatsApp" con `datos.evidencia: "clic"`,
  `mensaje_confirmado: false`, `whatsapp_abierto_en` y
  `tracking_version: "3"`. Una vez por código.
- No se tocó: registros existentes, número, carrito, totales, descuento,
  Base44 ni la página nueva.

Archivos: `src/app.js`, `src/analytics.js`, `src/templates.js`,
`src/styles-parts.css`. Respaldo: etiqueta `prod-antes-20261014`.

## Pruebas en la web (local, datos de producción, celular y escritorio)
- Mochila: mensaje con código; "Iniciado" y luego un solo "Enviado a
  WhatsApp" con evidencia "clic"; pantalla "Falta un paso".
- Volver a la página: al abrir el pedido aparece el recordatorio; "Abrir
  WhatsApp" no registra nada nuevo; "Ya lo envié" cierra el ciclo.
- Aviso de ofertas (oferta simulada sólo en local): con el aviso abierto no
  se registra nada; al continuar, WhatsApp se abre dentro del toque y con
  el código.
- Destino del enlace: `wa.me/5493804505150`. Sin errores de consola.

## Para Base44 (Rodri)
1. Mostrar "Enviado a WhatsApp" como **"Clic en WhatsApp"**: no prueba que
   el mensaje llegó (`datos.evidencia: "clic"`).
2. Agregar los estados **"Mensaje recibido"** (lo marca el local cuando ve
   el WhatsApp con ese código) y **"Confirmado"** (venta asociada).
3. Lista de **clics sin confirmar** de más de 2 h, para revisar. La web no
   guarda datos del cliente: si el mensaje no llegó, no hay a quién llamar.
4. Si quieren registrar el "Ya lo envié" del cliente, habilitar un estado o
   evento para eso y la web lo manda.

## 14–15/10: "Cliente indica enviado" y reintentos
- "Ya lo envié" manda `estado: "Cliente indica enviado"` (mismo código,
  `datos.evidencia: "cliente"`, `cliente_indico_envio_en`). Base44 todavía
  responde 422: falta confirmar su despliegue. El clic sigue como
  "Enviado a WhatsApp".
- Cola de registros (pedido de Rodri): cada registro (código + estado) se
  guarda en `localStorage` (`arias.pedidos.cola.v1`) antes de mandarse y se
  borra sólo con respuesta exitosa. Con 429, 5xx o error de conexión se
  reintenta con el mismo código a los 2, 5, 10, 20 y 40 s, respetando
  `Retry-After` si es mayor (tope 2 min). Agotadas las esperas, queda
  guardado y sale en la próxima visita (hasta 7 días). Otro 4xx no se
  reintenta. Un estado nuevo no sale antes que el anterior del mismo
  código. Un envío a la vez aun con varias pestañas (`navigator.locks`).
- Probado en local con un Base44 simulado (500, 429 + Retry-After, sin
  red, 422, recarga, 5 reintentos): sin envíos al Base44 real.
