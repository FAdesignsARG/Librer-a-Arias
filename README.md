# Catálogo Librería Arias

Catálogo web con panel de carga de productos. Se trabaja en local y se publica
como sitio estático.

## Uso diario

```bash
npm run dev
```

- Catálogo: http://localhost:4321
- Panel de carga: http://localhost:4321/admin

En el panel se cargan, editan, ocultan, reordenan y eliminan productos. Las
fotos se arrastran y se optimizan solas (se convierten a WebP en dos tamaños).
Los cambios se guardan al instante en `data/products.json`; alcanza con
recargar el catálogo para verlos.

Con el checkbox de cada fila se seleccionan varios productos a la vez: abajo
aparece una barra para ponerlos/sacarlos de stock, mostrarlos, ocultarlos,
destacarlos o eliminarlos todos juntos. El botón de la caja en cada fila
cambia el stock de uno solo sin abrir el editor.

## Ofertas

Cada producto puede tener **una** oferta por tiempo limitado: se activa desde
su editor ("Oferta por tiempo limitado"), con precio con descuento opcional,
fecha de vencimiento y un texto corto ("2x1", etc.). Se apaga sola cuando pasa
la fecha — no hay que acordarse de desactivarla a mano. Mientras está activa
se ve en la tarjeta y en la ficha con el precio tachado, y aparece en la
campanita de novedades del catálogo.

## Campanita de novedades

Arriba a la derecha del catálogo. Junta en un panel las ofertas activas, los
productos cargados en los últimos 14 días y una muestra de los destacados —
todo sale de `products.json`, no hay nada que cargar aparte. Tocar un ítem
lleva a su ficha.

## Publicar

```bash
npm run build
```

Genera `dist/`, que se sube tal cual al servidor. Incluye la portada, una
página por producto, `sitemap.xml` y `robots.txt`.

**El panel de administración no se publica**: vive sólo en esta máquina, así
que el sitio online no tiene forma de escribir nada.

Antes de publicar por primera vez hay que poner el dominio real en
`data/settings.json` → `siteUrl`. De ahí salen las URLs canónicas, el sitemap
y las imágenes que se ven al compartir por WhatsApp.

## Asistente con IA

Usa **Groq**, que es gratis. Para activarlo:

1. Sacá una clave en https://console.groq.com/keys
2. Copiá `.env.example` como `.env` y pegá la clave en `GROQ_API_KEY`
3. Reiniciá `npm run dev` — al arrancar avisa si quedó activada

La clave vive **sólo en el servidor**: el navegador nunca la ve. Cuando
pases a un hosting, va como variable de entorno de ese servidor y el código
del cliente no cambia.

Sin clave nada se rompe: el asistente del catálogo responde igual usando el
buscador semántico local, y los botones de IA del panel simplemente no
aparecen.

Dónde se usa:
- **Catálogo** → botón "Preguntame" al lado del de WhatsApp. Responde sobre
  productos y stock, con tarjetas que llevan a la landing.
- **Panel → Carga masiva** → "Interpretar con IA" ordena texto desprolijo
  (un mensaje de WhatsApp, una lista del proveedor) y arma las fichas. Si una
  fila se parece a un producto que ya tenés cargado, se marca para
  **actualizar** (precio, rubro, stock) en vez de crear un duplicado — así
  una lista de precios del proveedor sirve para refrescar el catálogo, no
  sólo para sumar cosas nuevas.
- **Panel → Editor** → "Completar ficha desde la foto" propone nombre,
  rubro y descripción mirando la imagen.
- **Panel → Asistente de stock** → escribís en criollo qué cambió ("se
  agotaron el dinosaurio y la mochila", "volvió a haber stock de las
  pizarras") y propone los cambios en una tabla para revisar antes de
  aplicar.

Los precios y el stock que ve el cliente salen **siempre** de
`products.json`, nunca del texto que genera el modelo. Y nada que proponga
la IA se guarda solo: siempre cae en un formulario para revisar.

## Estructura

```
data/products.json     Fuente de verdad del catálogo
data/settings.json     Datos del negocio: WhatsApp, dirección, horarios, redes
assets/products/       Fotos (nombre.webp = ficha, nombre-thumb.webp = grilla)
assets/brand/          Logo, hero, banner del canal, cartel de horarios
src/templates.js       HTML de la portada y de las landings
src/styles.css         Sistema de diseño
src/app.js             Buscador, filtros y pedido por WhatsApp
src/search-engine.js   Motor de búsqueda semántica
src/admin/             Panel de carga (sólo local)
scripts/build.js       Genera dist/
scripts/extract.js     Migración inicial desde el HTML viejo (ya corrida)
```

## Notas

- `_original-backup.html` es el catálogo monolítico original (12 MB). Se
  conserva como respaldo; no se usa.
- El buscador entiende sinónimos ("regalo para nena"), rangos de precio
  ("menos de 10 mil", "barato") y tolera errores de tipeo. Para que un
  producto aparezca con palabras que no están en su nombre, se usa el campo
  de palabras clave del panel.
- El slug de un producto no cambia al editarlo: es su URL pública y cambiarla
  rompería los links compartidos y lo indexado por Google.
