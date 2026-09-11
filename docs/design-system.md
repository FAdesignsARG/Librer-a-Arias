# Sistema visual — Librería Arias

> La fuente de verdad de cómo se ve, se mueve y habla el catálogo de
> Librería Arias. Los valores acá viven en `src/styles.css` (`:root`) y
> `src/theme.css`; este documento explica el **porqué** de cada uno y las
> reglas que no están escritas en el CSS.
>
> Última revisión: 10/9/2026. Si tocás un token, tocá los dos lados.

---

## Índice

1. [La marca en una página](#1-la-marca-en-una-página)
2. [Principios (las 6 reglas duras)](#2-principios-las-6-reglas-duras)
3. [Color](#3-color)
4. [Tipografía](#4-tipografía)
5. [Espacio y layout](#5-espacio-y-layout)
6. [Radios](#6-radios)
7. [Elevación: sombra XOR borde](#7-elevación-sombra-xor-borde)
8. [Movimiento](#8-movimiento)
9. [Iconografía](#9-iconografía)
10. [Imágenes y fotos](#10-imágenes-y-fotos)
11. [La marca: logo, wordmark, Adolfito](#11-la-marca-logo-wordmark-adolfito)
12. [Voz y copy](#12-voz-y-copy)
13. [Accesibilidad y "que lo use un niño"](#13-accesibilidad-y-que-lo-use-un-niño)
14. [Componentes](#14-componentes)
15. [Hacia dónde va](#15-hacia-dónde-va)
16. [Checklist antes de decir "quedó premium"](#16-checklist-antes-de-decir-quedó-premium)

---

## 1. La marca en una página

**Qué es.** El almacén de todo de La Rioja: *Librería · Bazar · Juguetería
· Regalería · Electrónica · Tecnología*. Local físico real en esquina
España y Bulnes. La web es **el catálogo + la forma de escribirles por
WhatsApp** — no un checkout. Todo camino de compra termina en un mensaje
de WhatsApp ya escrito que el local confirma.

**Qué comunica.** La tagline es literal: **"El Temu 2.0 riojano"**.
Barato, muchísima variedad, local, y con una pizca de picardía. No es una
tienda de lujo; es la tienda que tiene *todo* y te atiende como el de
siempre atrás del mostrador.

**Qué NO es.** No es corporativo. No es minimalista frío. No es un
e-commerce genérico con cara de plantilla. No usa "Estimado cliente".

**La sensación que busca.** Orgullo, impulso, diversión — energético, no
sereno. Que se sienta una **app**, no una web. Que un chico entienda cada
botón sin que nadie le explique.

**De dónde sale el "premium".** No del color. Del **movimiento**, la
**tipografía** y el **aire** entre las cosas. Referencias explícitas de
Fran: Instagram (gestos grandes, springs snappy, barras de progreso tipo
stories), Apple (física creíble, nada aparece de golpe, peso y rebote
natural), y el criterio "estilo Apple / Rappi" del roadmap (Rappi = super
app simple, targets grandes, sin fricción).
⚠️ ElevenLabs se citó como referencia pero **su web real es clara y
editorial con tipografía finísima (~300)** — eso NO es esta marca. Acá la
tipografía es gruesa y decidida.

---

## 2. Principios (las 6 reglas duras)

Cada una es chequeable mirando la pantalla.

| # | Regla | Cómo se verifica |
|---|---|---|
| 1 | **Cero gradientes.** Nunca. Ni de fondo, ni wash sutil, ni en texto. | `grep -r "gradient" src/` no debe devolver nada decorativo. La profundidad se hace con superficie plana + elevación. |
| 2 | **Sombra XOR borde.** Un elemento tiene sombra *o* borde para separarse del fondo, nunca los dos a la vez. | Mirá cualquier tarjeta/panel: si tiene borde visible, no tiene sombra, y viceversa. (Excepción: el estado `:hover` de una card puede sumar sombra momentáneamente.) |
| 3 | **Un solo acento dorado por viewport.** El amarillo es EL acento. Si dos cosas doradas pelean por atención en una misma pantalla, una está mal. | Contá los elementos dorados llamativos arriba del fold. Uno manda. |
| 4 | **En mobile la tipografía NO se achica proporcionalmente.** El cuerpo es 17px también en el celular. | Medí `.t-body` en 375px: sigue en `1.0625rem`. Achicarlo es el error #1 que hace que una web se sienta web. |
| 5 | **44px mínimo tocable, siempre** (`--tap`). | Cualquier cosa clickeable en mobile: alto ≥ 44px. Es la medida de Apple y la diferencia entre "anda en el celu" y "se siente una app". |
| 6 | **Nada aparece de la nada.** Toda entrada viene desde una dirección (translate/scale), nunca un fade de opacidad pelado para algo importante. Y `prefers-reduced-motion` lo deja todo estático y 100% usable. | Recargá con "reducir movimiento" activado: todo visible, nada saltando. |

---

## 3. Color

Los grises son neutros y **cálidos** — con el amarillo, un negro apagado
azulado (`#08080A`) enfriaba todo. Se subió medio punto a un casi-negro
tibio.

### Tema oscuro (el default)

| Token | Valor | Uso |
|---|---|---|
| `--ink` | `#151515` | Fondo de la página |
| `--surface` | `#1e1e1e` | Tarjetas, paneles, chips |
| `--surface-hi` | `#282828` | Superficie un escalón arriba (previews, inputs de diálogo) |
| `--surface-max` | `#333333` | El escalón más alto (botón flotante de cerrar) |
| `--line` | `rgba(255,255,255,.1)` | Bordes normales |
| `--line-strong` | `rgba(255,255,255,.18)` | Bordes en hover / énfasis |
| `--gold` | `#fece01` | **El acento.** Es el amarillo medido del wordmark real. |
| `--gold-hi` | `#ffdc3d` | Hover de superficies doradas |
| `--gold-ink` | `#1a1200` | Texto sobre dorado (casi negro, cálido) |
| `--gold-wash` | `rgba(246,190,0,.1)` | Tinte dorado de fondo (chips activos suaves) |
| `--gold-edge` | `rgba(246,190,0,.28)` | Borde dorado sutil |
| `--gold-text` | `var(--gold)` | Dorado como texto (en oscuro = el dorado pleno) |
| `--text` | `#f5f5f7` | Texto principal |
| `--text-2` | `#a1a1a6` | Texto secundario, cuerpo |
| `--text-3` | `#6e6e73` | Texto terciario, eyebrows, hints |
| `--media` | `#ffffff` | Fondo de las fotos de producto (van recortadas sobre blanco) |
| `--glass` | `rgba(21,21,21,.74)` | Barras fijas (nav) con `backdrop-filter: blur(20px)` |
| `--glass-solid` | `rgba(21,21,21,.85)` | Barra fija que necesita más opacidad (sticky CTA) |
| `--fill` | `rgba(255,255,255,.06)` | Relleno neutro (botón ghost) |
| `--fill-hi` | `rgba(255,255,255,.11)` | Relleno neutro en hover |
| `--shadow-card` | `0 18px 40px -12px rgba(0,0,0,.7)` | Sombra de tarjeta (casi no se ve en oscuro — ver §7) |
| `--shadow-pop` | `0 14px 34px -8px rgba(0,0,0,.7)` | Sombra de pop-up / diálogo |
| `--ok` | `#32d74b` | Verde "abierto" / "en stock" |
| `--warn` | `#ff9f0a` | Naranja de aviso |

### Tema claro

Mismos tokens, otros valores. **Ningún componente sabe en qué tema está.**

Base: los grises de Apple (`#F5F5F7` / `#1D1D1F`) en vez de blanco y negro
puros, que a pantalla completa cansan.

| Token | Oscuro → Claro | Por qué |
|---|---|---|
| `--ink` | `#151515` → `#fbfbfd` | |
| `--surface` | `#1e1e1e` → `#ffffff` | |
| `--surface-hi` | `#282828` → `#f5f5f7` | |
| `--surface-max` | `#333333` → `#ebebf0` | |
| `--line` / `--line-strong` | alpha blanco → alpha negro (`.1` / `.2`) | |
| `--gold-text` | `#fece01` → **`#8a6a00`** | El amarillo puro sobre blanco no se lee. Se oscurece hasta pasar **WCAG AA** como texto. El hex `--gold` NO se toca cuando es fondo/borde. |
| `--gold-edge` | → `rgba(203,156,0,.4)` | Un poco más presente sobre blanco |
| `--gold-wash` | → `rgba(246,190,0,.14)` | Idem |
| `--text` | `#f5f5f7` → `#101012` | |
| `--text-2` | `#a1a1a6` → `#3d3d42` | Los grises claros de Apple con Inter quedaban lavados: se bajó un escalón. Pasó de 4.6:1 a 7.4:1. |
| `--text-3` | `#6e6e73` → `#6b6b73` | Pasó de 3.1:1 (ni AA) a 4.8:1. |
| `--media` | `#ffffff` → `#f5f5f7` | Un gris clarísimo separa la foto del fondo blanco |
| `--shadow-card` | invisible → `0 12px 28px -10px rgba(0,0,0,.18)` | En claro la sombra SÍ es lo que da relieve |
| `--shadow-pop` | → `0 12px 30px -8px rgba(0,0,0,.22)` | |
| `--ok` / `--warn` | `#32d74b` / `#ff9f0a` → `#1a9c34` / `#b26a00` | Contraste sobre blanco |

El fondo-foto del hero se **elimina** en claro (ensuciaba el blanco
detrás del logo).

**Los dos temas se cuidan igual.** No hay un "modo bueno" y un
"secundario". La transición entre temas se activa recién cuando el usuario
toca el botón (`html[data-theme-anim]`), nunca al cargar.

---

## 4. Tipografía

**Fuente:** Inter.
`font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`
`font-feature-settings: 'cv11', 'ss01'` (a de un piso + set estilístico).
Antialiased.

### Dos reglas que sostienen todo

1. **El tracking se cierra a medida que crece el tamaño.** Un título
   grande con `letter-spacing: -0.04em` se lee "caro"; el mismo título
   con tracking neutro se ve inflado.
2. **En mobile los tamaños NO bajan.** 17px de cuerpo son 17px en el
   celular. (Ver principio #4.)

### Escala

Todo con `clamp()`: crece con el viewport pero nunca baja del piso mobile.

| Clase | `font-size` | Peso | `letter-spacing` | `line-height` | Uso |
|---|---|---|---|---|---|
| `.t-display` | `clamp(2.2rem, 6vw, 3.6rem)` | 700 | `-0.04em` | 1.04 | El título más grande de una pantalla (rara vez) |
| `.t-h1` | `clamp(1.85rem, 4vw, 2.5rem)` | 660 | `-0.03em` | 1.12 | Título de sección ("Visitanos", nombre de producto) |
| `.t-h2` | `clamp(1.35rem, 2.4vw, 1.65rem)` | 640 | `-0.022em` | 1.22 | Subtítulo ("Elegidos para vos hoy") |
| `.t-body` | `1.0625rem` (17px, fijo) | 400 | `-0.011em` | 1.6 | Cuerpo. Color `--text-2`. |
| `.t-small` | `0.9375rem` (15px) | 400 | `-0.008em` | — | Notas, metadatos. Color `--text-2`. |
| `.t-eyebrow` | `0.72rem` | 620 | `+0.09em` | — | Uppercase. Rótulo arriba de un título. Color `--text-3`. |

### Pesos permitidos

`400` cuerpo · `540` chip · `590` botón · `600` labels · `620` eyebrow ·
`640`–`660` títulos · `700` display.

**Nada de pesos "whisper" (300).** Esa es otra marca. Acá la tipografía es
gruesa y segura.

---

## 5. Espacio y layout

### Escala de espacios (pasos de ~1.5×)

| Token | px |
|---|---|
| `--s-1` | 4 |
| `--s-2` | 8 |
| `--s-3` | 12 |
| `--s-4` | 18 |
| `--s-5` | 26 |
| `--s-6` | 40 |
| `--s-7` | 60 |

**Usá estos 7. No inventes píxeles en cada regla.** Que dos cosas
separadas por `--s-3` se lean hermanas de otras dos separadas por `--s-3`
es lo que hace que el conjunto se vea ordenado.

### Layout

| Token | Valor | |
|---|---|---|
| `--page` | `1200px` | Ancho máximo del contenido (`.shell` lo centra) |
| `--gutter` | `clamp(18px, 4vw, 32px)` | Margen lateral |
| `--nav-h` | `58px` | Alto de la nav sticky |
| Sección | `padding-block: clamp(44px, 7vw, 76px)` | Aire vertical entre bloques grandes |

`scroll-padding-top: calc(var(--nav-h) + 16px)` para que un salto a un
ancla deje aire bajo la nav.

---

## 6. Radios

| Token | px | Rol fijo |
|---|---|---|
| `--r-sm` | 10 | Cosas chiquitas (celda de preview) |
| `--r-md` | 14 | Inputs, media chica, bloques dinámicos |
| `--r-lg` | 20 | **Tarjetas** |
| `--r-xl` | 28 | **Diálogos**, superficies grandes, esquinas superiores de las hojas que suben desde abajo |
| `--r-pill` | 999 | **Todo lo interactivo y compacto**: botones, chips, badges, píldoras |

El radio comunica la función: si algo es un pill, es tocable; si tiene
`--r-lg`, es una tarjeta de contenido.

---

## 7. Elevación: sombra XOR borde

**En oscuro, las sombras casi no se ven.** Un `box-shadow` negro sobre
`#151515` no hace nada. Entonces la elevación en oscuro se hace con:

- **Borde** (`--line` / `--line-strong` / `--gold-edge`), o
- **Glow ambiente** — el caso especial de la tarjeta de promos del
  carrusel: en oscuro, tres capas de luz dorada muy tenue
  (`0 0 30px -6px rgba(254,206,1,.3)` + halo más largo) que hacen de
  elevación sin ser un aro parejo. "Un panel de vidrio Apple: la
  superficie casi no se nota, el borde y la luz sí."

**En claro, la sombra SÍ es lo que da relieve** (`--shadow-card`,
`--shadow-pop`). Los valores del tema claro son sombras premium estilo
Apple: capas de negro muy tenue, ninguna sólida, profundidad sin peso.

**La regla:** sombra *o* borde, nunca los dos en el mismo elemento en el
mismo estado.

---

## 8. Movimiento

**Acá se juega el "premium".** El peso del cambio va siempre en la
animación, no en el color.

### Curvas

| Token | `cubic-bezier` | Para qué |
|---|---|---|
| `--ease-out` | `(.16, 1, .3, 1)` | Entradas y salidas normales. Desaceleración fuerte, tipo iOS. |
| `--ease-soft` | `(.4, 0, .2, 1)` | Movimientos de layout (algo que se corre) |
| `--ease-pop` | `(.34, 1.4, .64, 1)` | Micro-rebote para feedback táctil (`:active`) |
| `--ease-premium` | `(.22, 1, .36, 1)` | Gesto de arrastrar-para-cerrar: un cierre que se siente "soltado", no frenado en seco. Misma familia que `--ease-out` a propósito. |

### Duraciones

| Token | Valor | Para qué |
|---|---|---|
| `--dur-fast` | `.16s` | Hover, foco, toggles chicos |
| `--dur-quick` | `.2s` | Salidas de diálogo (X, fondo, Esc) |
| `--dur` | `.28s` | Default |
| `--dur-moderate` | `.32s` | La mayoría de las entradas: tarjetas, mensajes, líneas |
| `--dur-relaxed` | `.44s` | Entradas con más protagonismo: pop-ups grandes, reveal al scrollear |
| `--dur-slow` | `.5s` | |
| `--dur-slower` | `.6s` | Coreografías (cortinas del splash) |
| `--dur-slowest` | `.85s` | El momento más lento: el halo del splash |

### Animaciones ambiente (fuera de la escala, a propósito)

Shimmer del esqueleto · puntitos de "escribiendo" · pulso del botón de
WhatsApp · flote del origami del hero. Su timing es un **ritmo propio**,
no una "velocidad de transición" reutilizable. Forzarlas a la escala
sería ruido, no consistencia.

### Reglas de motion

- **Feedback táctil universal:** todo botón / chip / card / tarjeta de
  tema lleva `:active { transform: scale(.92–.98) }`. No negociable — es
  la mitad de la sensación "app".
- **Reveal al scrollear:** `[data-reveal]` arranca `opacity: 0` +
  `translate: 0 14px`, resuelve a `0 / 0` cuando entra en viewport
  (`IntersectionObserver` → `data-shown='true'`), con
  `--dur-relaxed --ease-out`. Escalonado en filas (paso ~70ms), tope ~8
  ítems (más se sentiría parpadeo, no premium).
- **Splash** (una vez por sesión): cortina cierra→abre (dos paneles,
  arriba sube / abajo baja) → logo entra con overshoot + halo "ping" →
  barra dorada se dibuja de izq. a der. (el "wipe" que marca el tiempo) →
  sostiene → la cortina vuelve a cerrarse. En desktop el wordmark entra
  apenas después del pop del logo. El contenido "sube" 12px mientras se
  abren las cortinas.
- **Cambio de tema:** giro corto del ícono (`rotate(-90deg) scale(.6) →
  0`), y recién ahí las superficies hacen fade de color.
- **`prefers-reduced-motion: reduce`:** regla global —
  `*, *::before, *::after { animation-duration: .01ms !important;
  transition-duration: .01ms !important }`, `[data-reveal]` snap a
  visible, splash muestra el logo un instante y listo. **Se audita cada
  ronda**, no se asume que quedó bien de antes.

---

## 9. Iconografía

- **SVG inline**, definidos una sola vez en el objeto `ico` de
  `src/templates.js`, reusados en todos lados (nunca dos copias del mismo
  path).
- `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`,
  `stroke-width` entre `1.8` y `2.4`, `stroke-linecap="round"`,
  `stroke-linejoin="round"`.
- **Line icons**, no rellenos — salvo glifos de marca (WhatsApp,
  Instagram, Facebook, TikTok) que sí van `fill`.
- Tamaño en uso: 14–20px según contexto. En botón, `18×18`. En chip,
  `14×14`. `flex: none` siempre (que no los aplaste el flex).
- El color sale de `currentColor` — heredan del texto de al lado.

---

## 10. Imágenes y fotos

| Tipo | Regla |
|---|---|
| **Fotos de producto** | SIEMPRE recortadas sobre blanco / `#f5f5f7` (`--media`). Nada de fondos de ambiente en la grilla. `object-fit: contain`. `width`/`height` en el HTML (funcionan como `aspect-ratio`, reservan el espacio, evitan saltos). `loading="lazy"` salvo la primera. |
| **Fondo del hero** | La foto real de los estantes del local, desaturada, `opacity: .16`, `blur(2px) saturate(115%)`, `scale(1.08)`, con `mask-image` que la funde a transparente al 45%. Textura, nunca compite con el contenido. **Se elimina en tema claro.** |
| **Banners / promos** | Formato panorámico o mascota recortada. Si la imagen ya trae su texto (el banner del canal de WhatsApp), va full-bleed dentro de su tarjeta. |
| **Cualquier imagen** | `img, svg { display: block; max-width: 100% }` y `img { height: auto }` global. |

---

## 11. La marca: logo, wordmark, Adolfito

### El logo (marca / isotipo)

Una **grulla de origami dorada** dentro de un **medallón cromado /
plateado**. Facetada, dimensional, con brillo. Es **la única pieza donde
la regla "todo plano, sin gradientes" se dobla** — porque es un logo, no
UI.

Dos variantes, elegidas por CSS (no por JS, para que no se vea un flash de
la incorrecta al cargar):

- `mark-dark*.webp` — sobre fondo oscuro.
- `mark-light*.webp` — sobre fondo claro. La grulla amarilla sola sobre
  blanco no se leería; esta versión trae su propio aro cromado que la
  hace legible en cualquier fondo (por eso también se usa para compartir
  en WhatsApp/Facebook, que van sobre blanco).

Tamaños: `@128`, `@256`, `@512` + el base. Elegir según el tamaño de
render (evita servir 512px para un ícono de 32).

**Nunca redibujar la grulla.** Si falta el archivo real en un mockup,
dejar `<!-- LOGO: usar mark-{tema}.webp real -->` y seguir.

### El wordmark

"**LIBRERÍA**" en un script pincelado / marcador (amarillo, enérgico,
imperfecto, con un subrayado de trazo rústico) + "**ARIAS**" en una
display pesada e itálica (contorno / blanco). Debajo, la tagline
"**El Temu 2.0 riojano**" en mayúsculas amarillas chicas.

Se sirve como imagen (`wordmark-dark.webp` / `wordmark-light.webp`), no
como fuente — el trazo pincelado no es tipografía.

### Adolfito (la mascota)

Grulla de origami dorada en 3D, ojos grandes de dibujo, **mochila negra
branded** ("LIBRERÍA ARIAS" con una coronita) y **zapatillas amarillas
con el logo de corona**. Amable, jugable, pensada para que le guste a un
chico.

- Se usa en las piezas de mayor atención (carrusel de promos) sosteniendo
  props contextuales — acá tiene un cartel rojo "CUPÓN DESCUENTO %OFF".
- **Es la cara que hace que el sitio sea "apto para un niño".**
- Se usa el render real. Nunca se redibuja.
- El nombre viene de **Adolfo**, el papá de Fran, dueño del local.
  (Cuidado: "Adolfito" = la mascota; "Adolfo" = la persona.)

---

## 12. Voz y copy

- **Rioplatense, de "vos", cálido, directo, corto.** "Mirá cuánto
  ahorrás", "Escribinos", "Armá tu pedido", "Sin stock por ahora".
- Habla como el de atrás del mostrador. Nunca "Estimado cliente", nunca
  "Añadir al carrito", nunca jerga.
- Frases de estado en criollo: "Abierto" / "Cerrado — abre mañana a las
  9", "En stock" / "Sin stock", "Disponible en el local".
- La tagline es la posición en tres palabras: **"El Temu 2.0 riojano"** —
  no se toca.
- El asistente de IA tiene que "vender como Adolfo": preguntar para quién
  es / cuánto querés gastar antes de tirar productos, ofrecer una opción
  más barata si dudás por el precio, cerrar invitando a agregar al pedido
  o escribir por WhatsApp — sin inventar precios ni stock nunca.
- Los errores explican qué pasó y cómo seguir, sin disculpas ni vaguedad.
  "No encontramos nada con esa búsqueda — probá con otras palabras, o
  escribinos y lo buscamos por vos."

---

## 13. Accesibilidad y "que lo use un niño"

- **44px mínimo tocable** (`--tap`), siempre. Principio #5.
- **`:focus-visible`** = `outline: 2px solid var(--gold)` + `offset: 3px`,
  sólo para teclado (nunca al hacer click). Los `<dialog>` no llevan
  anillo alrededor del panel entero.
- **WCAG AA de contraste.** El dorado como texto falla sobre blanco → en
  claro `--gold-text` baja a `#8a6a00`. Los grises de cuerpo se subieron
  un escalón porque Inter los mostraba lavados.
- **Una acción primaria por pantalla**, obvia, dorada (`.btn--gold`). La
  secundaria es ghost (`.btn--ghost`).
- **Sin jerga.** Los estados se nombran en palabras que un chico entiende.
- **Bloques nuevos van colapsados por defecto** (acordeón / diálogo /
  píldora) — nunca un bloque siempre-abierto comiendo alto de pantalla.
  Si adentro hay una señal que importa a diario (un conteo, una alerta),
  va en el header del acordeón, visible con el bloque cerrado — no es
  excusa para dejarlo abierto.
- **La grilla nunca arranca en blanco:** `skeletonCards()` server-render
  mientras carga el JS y llega `products.json`. En un celular con mala
  señal se nota.
- **Todo funciona sin depender de gestos complejos:** el catálogo es
  render server, el buscador cae al modo semántico local si no hay IA, y
  el pedido por WhatsApp funciona aunque WhatsApp Web no esté vinculado
  (botón "Copiar pedido" de plan B).
- **Sin autoplay que atrape:** el carrusel de atención se pausa con
  cualquier interacción y **ni arranca** con `prefers-reduced-motion`.

---

## 14. Componentes

Cada uno: anatomía · tokens · estados · reglas.

### Botón — `.btn`

- **Anatomía:** `inline-flex`, `min-height: var(--tap)`, `padding: 0 22px`,
  `border-radius: var(--r-pill)`, `font-size: .97rem`, `font-weight: 590`,
  `gap: var(--s-2)` (para el ícono).
- **Variantes:**
  - `.btn--gold` — `background: var(--gold)`, `color: var(--gold-ink)`,
    peso 640. Hover → `--gold-hi`. **Una por viewport.**
  - `.btn--ghost` — `background: var(--fill)`, `border: 1px solid var(--line)`,
    `color: var(--text)`. Hover → `--fill-hi` + `--line-strong`.
  - `.btn--sm` — `min-height: 38px`, `padding: 0 15px`, `.9rem`.
  - `.btn--block` — `width: 100%`.
- **Estados:** `:active { transform: scale(.96) }`. `[hidden]` →
  `display: none` (por especificidad, si no sigue ocupando lugar).
- Íconos `18×18`, `flex: none`.

### Chip — `.chip`

- **Anatomía:** pill, `min-height: 38px`, `padding: 0 16px`,
  `background: var(--surface)`, `border: 1px solid var(--line)`,
  `color: var(--text-2)`, `font-weight: 540`.
- **Estados:** hover → `color: var(--text)` + `--line-strong`.
  `:active { scale(.95) }`.
  `[aria-pressed='true']` → **se invierte**: `background: var(--text)`,
  `border-color: var(--text)`, `color: var(--ink)`, peso 600.
- **Layout:** en mobile, fila con `overflow-x: auto`, sin scrollbar, con
  `mask-image` que difumina el corte lateral. En ≥720px, `flex-wrap`
  (con mouse no hay gesto de deslizar).

### Tarjeta de producto — `.card`

- **Anatomía:** `background: var(--surface)`, `border: 1px solid var(--line)`,
  `border-radius: var(--r-lg)`, `overflow: hidden`.
- **Media:** `aspect-ratio: 1`, `background: var(--media)` (blanco),
  `object-fit: contain`.
- **Flags** (arriba a la izquierda, apiladas, pill, `backdrop-filter:
  blur(8px)`, `font-size: .68rem`): `Sin stock` (tapa todo) · `Oferta`
  (rojo `#d43a15`, con ícono etiqueta) · `Nuevo` (dorado) · `Lo más
  elegido` (dorado, con sparkle). Prioridad: sin stock > oferta ≈ nuevo.
- **Estados:** hover → `translateY(-4px)` + `border-color: var(--line-strong)`
  + `box-shadow: var(--shadow-card)` (acá sí conviven borde+sombra, es
  momentáneo). `:active { scale(.97) }` en táctil.
- El nombre es el link (`.card__link::after { inset: 0 }` cubre toda la
  tarjeta salvo el botón "+").

### Diálogo / hoja — `<dialog>` + `src/ui.js`

- **Escritorio:** centrado (`position: fixed; inset: 0; margin: auto`),
  `border-radius: var(--r-xl)`, `box-shadow: var(--shadow-pop)`,
  `::backdrop` con `blur(6px)` + scrim manual de respaldo (`.modalscrim`).
- **Mobile (≤560px):** sube desde abajo (`inset: auto 0 0 0`, esquinas
  superiores `--r-xl`), animación `sheet-up`. Barrita `.dialog__grabber`
  arriba que indica "esto se arrastra".
- **Cierra con:** X · click en el fondo · Esc · **arrastre hacia abajo**
  (si el contenido interno está scrolleado hasta arriba). Todo pasa por
  `closeDialog()`, que anima la salida y tiene un **tope de tiempo** por
  si `.finished` no resuelve (pestaña en segundo plano).
- Entrada: `welcome-in` = `translateY(14px) scale(.97) → 0`.

### Carrusel de atención — `#attentionCarousel`

- **2 slides:** la tarjeta de promos (mascota + badge + título + botón) y
  el banner del canal de WhatsApp (imagen full-bleed).
- **Puntitos** debajo (`.attention-carousel__dot`), el activo se estira a
  pill dorada.
- **Autoplay 10s**, se pausa con `pointerdown` / `mouseenter`, retoma 4s
  después. **No arranca** con `prefers-reduced-motion` (queda 100%
  manual).
- La tarjeta de promos: fondo **exactamente al color de la página**
  (`--ink`), `border: 1px solid var(--gold-edge)`, y elevación que cambia
  de naturaleza según el tema (glow dorado ambiente en oscuro / sombras
  Apple en claro). Tocarla abre el detalle de promos; el botón "Ver
  promociones" va directo a Ofertas (con `stopPropagation`).

### Dock — `.dock`

Cluster flotante abajo a la derecha: link de WhatsApp · botón
"Preguntame" (asistente IA) · FAB "Mi pedido" (aparece sólo con carrito
no vacío, hace un `bump` al agregar). En la ficha de producto sube para no
taparse con la barra fija de "Agregar".

### Campanita de novedades — `#notify`

Feed armado al vuelo desde `products.json`: ofertas activas → nuevos
(tope 8) → destacados. El puntito rojo (`#bellDot`) se apaga sólo cuando
de verdad hay algo más nuevo que la última visita (`localStorage`
`arias.feed.visto`), no cada vez que hay novedades viejas.

---

## 15. Hacia dónde va

- **Roadmap** (`docs/roadmap-mejoras.md`): el motor de promociones ya está
  (Rondas 1–4, 1.1–1.3). Sigue el backlog de conversión (Rondas 5–10):
  señales de urgencia honestas en la ficha, asistente "modo Adolfo",
  "más pedido" real alimentado por analytics, fricciones de compra
  (selector de cantidad, zoom de fotos), SEO por rubro
  (`/c/jugueteria/`…), señales de confianza (cambios/garantía).
- **Capa Base44** (`docs/base44-integracion/`): deja que marketing
  active/programe banners y promos sin republicar. Cualquier cosa que
  inyecte esa capa **igual respeta las reglas de este documento** —
  estilos con tokens de marca, tema claro/oscuro, `prefers-reduced-motion`.
- **North star:** un catálogo que **puede usar un chico**. Cada tap
  obvio, cada estado nombrado en palabras simples, movimiento que explica
  qué pasó, y que **nunca se sienta "una web"** — se siente la app del
  almacén de todo de la otra cuadra.

---

## 16. Checklist antes de decir "quedó premium"

Recorré la pantalla nueva (mobile 375px + desktop, tema claro + oscuro):

- [ ] **Cero** `linear-gradient` / `radial-gradient` / texto con gradiente.
- [ ] Ningún elemento tiene sombra **y** borde a la vez (salvo hover
      momentáneo de card).
- [ ] Un solo elemento dorado manda arriba del fold.
- [ ] `.t-body` mide 17px en el celular (no se achicó).
- [ ] Todo lo tocable ≥ 44px de alto.
- [ ] Todo botón/chip/card tiene `:active` con `scale`.
- [ ] Nada aparece con un fade de opacidad pelado — viene desde una
      dirección.
- [ ] Con "reducir movimiento" activado: todo visible, nada saltando,
      100% usable.
- [ ] Los espacios son de la escala `--s-*`, no píxeles sueltos.
- [ ] Los radios respetan su rol (pill = tocable, `--r-lg` = tarjeta).
- [ ] Contraste AA: texto secundario y dorado-como-texto legibles en
      claro.
- [ ] El copy habla de "vos", corto, sin jerga.
- [ ] `npm run build` sin errores; sin regresiones en home / ficha /
      panel del pedido.
