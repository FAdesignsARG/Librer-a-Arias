# bar.md — Mecanismos observables de las referencias

**Capturado el 15/09/2026**, navegador propio, viewport 375x812.
Referencias elegidas por Fran, en orden: Mercado Libre (principal),
Airbnb, Nike, Shop.app.

Medido en vivo, no de memoria:

| Referencia | Buscador | Posición | % del ancho | Tamaños de texto en 1ª pantalla | Tocables en 1ª pantalla |
|---|---|---|---|---|---|
| Mercado Libre | 217x34 | y=7 | 58% | 8 | 34 |
| Shop.app | 343x64, radio 32px, fondo `rgba(255,255,255,.75)` | y=104 | 92% | 3 | 58 |
| Arias hoy (375px) | 343x64 | y=146 | 92% | 4 | 9 |
| Arias hoy (1440px) | 680x72 | **y=523** | 47% | 5 | 23 |

**Advertencia de lectura:** Mercado Libre gana en prominencia de búsqueda
y en llegar al contenido rápido, pero pierde en contención: 8 tamaños de
texto y 34 elementos tocables en una pantalla. Shop.app es lo contrario:
3 tamaños y una búsqueda enorme, pero 58 tocables por la grilla. Se toma
de cada una lo que gana, no su densidad. Ese es el criterio, no un
promedio.

---

## M1 · La búsqueda es el elemento de mayor área de la primera pantalla

Shop.app: la pastilla mide 343x64 = 21.952 px², más que cualquier otro
control visible. Mercado Libre: la caja de búsqueda ocupa el 58% del
ancho de la cabecera y los otros tres controles juntos no la igualan.

**Cómo se comprueba:** calcular el área de cada elemento tocable visible
sobre el pliegue. El buscador tiene que ser el mayor, y ningún botón
puede pasar el 50% de su área.

## M2 · La marca cede lugar a la acción

Shop.app: wordmark de 77x32 en y=60; la pastilla de búsqueda mide 2x su
alto y 4,5x su ancho. Mercado Libre: no hay wordmark grande, sólo un
logo de 48px al costado de la búsqueda.

**Cómo se comprueba:** área del wordmark contra área del buscador. El
buscador tiene que ser al menos el doble. Hoy en Arias a 375px son
10.238 px² contra 21.828 px² — **ya cumple, por poco**. A 1440px no.

## M3 · La búsqueda aparece antes del pliegue, sin scroll

Mercado Libre: y=7. Shop.app: y=104. En las dos, la búsqueda entra en el
primer tercio de la pantalla.

**Cómo se comprueba:** posición vertical del buscador respecto del alto
del viewport. Tiene que estar en el primer tercio. Hoy: 375px → y=146
sobre 812 (18%, cumple). **1440px → y=523 sobre 900 (58%, no cumple).**

## M4 · Nada saca de la página en la primera pantalla

Mercado Libre y Shop.app: **cero** enlaces a redes sociales sobre el
pliegue. Las redes viven en el pie, si están.

**Cómo se comprueba:** contar enlaces salientes (`target=_blank`, redes,
mapas) visibles sobre el pliegue. Tiene que ser cero. El preview
desplegado hoy tiene **5**.

## M5 · Como mucho tres tamaños de texto sobre el pliegue

Shop.app: 12px, 14px, 18px. Nada más. Mercado Libre usa 8 y por eso su
primera pantalla se lee como un tablón, no como una tienda cuidada.

**Cómo se comprueba:** juntar los `font-size` computados de los nodos de
texto visibles sobre el pliegue. Máximo 3, sin contar el wordmark, que
es una imagen.

## M6 · Una sola fila o grilla de accesos, todos del mismo tamaño, después de la búsqueda

Shop.app: pastillas de categoría idénticas justo debajo del buscador.
Mercado Libre: círculos de categoría, todos iguales, debajo del banner.
En ninguna hay un botón suelto de distinto tamaño compitiendo.

**Cómo se comprueba:** los accesos comparten ancho y alto (tolerancia
2px) y ninguno aparece antes que el buscador. Hoy a 375px: cuatro de
166x64 — **cumple**. Sobra un "Ver productos" suelto más abajo.

## M7 · El acento marca una sola cosa por pantalla

Mercado Libre: el azul es sólo de los botones de acción; el amarillo es
fondo, no acción. Shop.app: el violeta aparece una vez, en el wordmark.

**Cómo se comprueba:** contar superficies con el amarillo de marca
(`--gold` / `#fece01`) sobre el pliegue. Hoy en el hero de Arias son
**3**: el botón de enviar la búsqueda, el punto de novedades y
"Ver productos".
