# Trazabilidad de la metodología

Adaptación del 11/09/2026. Fuente: [`origen-extraido.md`](origen-extraido.md) y DOCX exacto adjunto.
Destino operativo: [`../../token-design-optimizer.md`](../../token-design-optimizer.md), abreviado **Método** en las tablas.
Los subidentificadores de T023 y T026 de esta tabla son etiquetas de localización creadas para la adaptación; el texto fuente permanece completo.

## Criterios de adaptación
- **Adoptada:** se aplica el propósito con el alcance autorizado y evidencia real.
- **Adaptada:** se conserva el propósito y se ajusta la ejecución al proyecto, herramientas o límites verificables.
- **Contextual:** título, introducción, afirmación atribuida o ejemplo; no genera una acción por sí solo.
- Los ahorros porcentuales y la superioridad de modelos no se midieron aquí. El corpus de 100 transcripciones citado no fue aportado con este DOCX.
- Las preferencias explícitas del usuario prevalecen sobre ejemplos metodológicos; la arquitectura existente y las capacidades reales guían su aplicación.

## Párrafos del cuerpo

| Fuente | Cláusula o contenido | Tratamiento y destino | Motivo |
| --- | --- | --- | --- |
| P001 | Nombre de la metodología | Contextual; procedencia en README | Se conserva el título del documento sin atribuirle autoridad adicional. |
| P002 | Framework probado; modelos Astra y Claude Code | Contextual; introducción del Método | El calificativo de validación es de la fuente; no se verificó comparativamente. |
| P003 | Validación y contrastación | Contextual; original completo | Encabezado de la justificación aportada. |
| P004 | Revisión de 100 transcripciones y mayor rendimiento | Contextual; límites de evidencia de esta tabla | No se recibió ese corpus ni resultados reproducibles que permitan ratificar la afirmación. |
| P005 | Pilares de reducción | Adoptada; Método §2 | Organiza la búsqueda de eficiencia sin objetivo porcentual inventado. |
| P006 | Técnicas de compresión documentadas | Adaptada; Método §2 | Se aplican técnicas concretas y se conserva la atribución histórica. |
| P007 | Headroom, RTK, Caveman, Ponytail y porcentajes | Adaptada; Método §2 | Salidas focalizadas, texto conciso y cambios mínimos; no se instalan herramientas ni prometen sus cifras. |
| P008 | Graphify, nodos clave y ahorro del 80–82 % | Adaptada; Método §2 y mapa de proyecto | `rg` y mapa de dependencias cubren navegación sin exigir una herramienta no disponible ni afirmar ahorro. |
| P009 | Low/medium; comparación Fable/Astra/Opus; high solo inicial | Adaptada; Método §3 | Respetar configuración del usuario; recomendación según complejidad, sin cambio silencioso ni comparación no verificada. |
| P010 | Orquestación de modelos de frontera y económicos | Adaptada; Método §3 | Delegación acotada útil con modelos realmente disponibles y autorización vigente. |
| P011 | Firecrawl y reducción 80–90 % | Adaptada; Método §4 | Leer Markdown o bloques relevantes; no exigir herramienta ni prometer el porcentaje. |
| P012.a | `/clear`, `/compact`, contexto menor de 200 líneas | Adaptada; Método §8 | Resumen de continuidad y contexto modular; no borrar sesión ni historia necesaria automáticamente. |
| P012.b | Website OS/CMS evita grandes re-prompts | Adaptada; Método §6 y §8 | Reutilizar panel y Firestore existentes; no crear otro CMS ni prometer consumo futuro. |
| P013 | Pilares de entrega de diseño | Contextual; estructura del Método | Encabezado de un grupo de prácticas. |
| P014 | Metodología de sitios de USD 10.000 | Contextual; original conservado | El precio atribuido no es costo, presupuesto ni garantía del trabajo de Arias. |
| P015 | ADN visual y UI Sniping con Firecrawl/extractor | Adaptada; Método §4 | VoltAgent es la fuente principal elegida por el usuario; extraer mecanismos con herramientas disponibles. |
| P016.a | `design.md`, tokens y 60/30/10 | Adaptada; Método §5 | `DESIGN.md` como síntesis y módulos detallados; equilibrio compositivo con usos semánticos y excepciones. |
| P016.b | Cuatro tamaños, espacio >=40 %, lectura en tres segundos | Adaptada; Método §5 | Objetivos de composición, sujetos a legibilidad y uso; no declarar mediciones inexistentes. |
| P017 | Tres críticos Brief/System/Craft | Adoptada con ejecución explícita; Método §7 | Contextos realmente nuevos y evidencias; una revisión interna simulada no cumple independencia. |
| P018 | Assets 2K/4K y motion con servicios nombrados | Adaptada; Método §6 | Resolución adecuada al uso y rendimiento; solo generar cuando el pedido y la disponibilidad lo permitan. |
| P019 | Anti-AI slop, 60 caracteres y conversión | Adaptada; Método §5–6 | Copy concreto y fácil; 60 caracteres como objetivo de frase UI sin romper significado; documentación puede ser extensa. |
| P020.a | Website OS/JSON y edición del cliente | Adaptada; Método §6 y §8 | Mantener edición actual mediante panel, Firestore y Base44 según responsabilidades. |
| P020.b | GitHub/Vercel y sitio de producción | Adaptada; Método §8 | El destino actual es Netlify; desplegar solo dentro del pedido autorizado y con verificación real. |
| P021 | System prompt para cada sesión | Adaptada; `AGENTS.md` y Método | Instrucciones persistentes del proyecto; no configuración global de toda conversación. |
| P022 | Guardar `token-design-optimizer.md` o pegar al inicio | Adoptada; archivo raíz creado | Se crea el archivo y se enlaza desde AGENTS para lectura progresiva. |
| P024 | Tutorial y prompt maestro | Contextual; fuente íntegra | Los pasos se adaptan al objetivo vigente y no ejecutan un proyecto nuevo automáticamente. |
| P025 | Prompt listo para Claude Code o Astra | Contextual; Método §1–8 | Los nombres de agentes no prueban disponibilidad ni obligan a cambiar configuración. |

## Tabla T023: system prompt propuesto

| Subcláusula | Tratamiento y destino | Motivo |
| --- | --- | --- |
| Nombre de skill y objetivo de ahorro hasta 80 % | Adaptada; título y §2 del Método | Objetivo: eficiencia sin reducir calidad; sin prometer una cifra no medida. |
| Compresión 1a: concisión Caveman/Headroom | Adoptada; §2 y AGENTS | Español simple y salida útil; omitir relleno conservando evidencia necesaria. |
| Compresión 1b: solo bloques modificados | Adoptada; §2 | Cambios focalizados y diff útil; una creación nueva puede requerir un archivo completo. |
| Compresión 1c: Firecrawl; jamás HTML bruto | Adaptada; §4 | Preferir contenido estructurado; permitir HTML acotado cuando sea necesario para la tarea. |
| Esfuerzo 2a: configurar low/medium y high/max solo inicial | Adaptada; §3 | No hay autorización para cambiar el modelo/esfuerzo vigente; la complejidad puede aparecer en cualquier fase. |
| Esfuerzo 2b: Triad y proveedores económicos | Adaptada; §3 | Delegar cuando sea útil y autorizado, con herramientas/modelos disponibles y sin afirmar costos. |
| Higiene 3a: ejecutar Graphify al cargar todo repo | Adaptada; §2 y mapa | La indexación forzada consumiría recursos y requiere herramienta ausente; mapa verificado y búsqueda focalizada. |
| Higiene 3b: contextos menores de 200 líneas | Adoptada con alcance; §8 | Cada nuevo contexto queda bajo el límite; conservar documentación detallada y fuentes en módulos. |
| Higiene 3c: `/clear` inmediato | Adaptada; §8 | Resumir continuidad sin perder historia ni ejecutar comandos de sesión automáticamente. |
| Higiene 3d: editar mensaje original del usuario | Adaptada; §8 | Registrar correcciones y decisión vigente; no modificar mensajes del usuario. |
| Diseño 1a: archivo design.md codificado | Adoptada con nombre del proyecto; §5 | `DESIGN.md` concentra la síntesis y enlaza el detalle existente y nuevo. |
| Diseño 1b: color, tipo, 60/30/10, áurea, espacio >=40 % | Adaptada; §5 | Tokens y jerarquía operativos; proporción áurea opcional y metas de composición con excepciones de uso. |
| Diseño 1c: bucle interno de tres críticos | Adaptada; §7 y skill local | Tres agentes independientes con contextos nuevos, misma versión y evidencia; no tres voces internas. |
| Copy 2a: eliminar lenguaje genérico | Adoptada; §6 | Texto directo que ayuda a entender y actuar. |
| Copy 2b: máximo 60 caracteres y beneficios | Adaptada; §5–6 | Frases UI breves si mantienen significado, sin truncar condiciones ni forzar anchos irreales. |
| Entregable 3a: toda salida código producción HTML/Tailwind/React | Adaptada; §8 | El entregable depende del pedido; documentación válida y stack Node/JS actual conservado. |
| Entregable 3b: preparado para Website OS | Adaptada; §6 y §8 | Reutilizar los mecanismos de edición existentes sin introducir un CMS nuevo. |

## Tabla T026: prompt maestro de ejecución

| Subcláusula | Tratamiento y destino | Motivo |
| --- | --- | --- |
| Rol sénior y optimización máxima | Adaptada; objetivo del Método | Calidad, criterio y eficiencia se demuestran con el trabajo, sin promesas de rendimiento. |
| Paso 1a: Firecrawl o extractor sobre URL | Adaptada; §4 | Herramientas disponibles, referencia concreta y lectura selectiva. |
| Paso 1b: paleta, fuentes, componentes, espacio y layout | Adoptada; §4–5 | Extraer y registrar mecanismos observables y cómo se aplican a la pieza. |
| Paso 1c: Apple, Stripe o Linear por defecto | Adaptada; §4 | El usuario ya eligió VoltAgent como fuente principal; seleccionar ejemplos concretos, no recordar estilos vagos. |
| Paso 2a: crear design.md en raíz | Adoptada con estructura del proyecto; §5 | Síntesis en `DESIGN.md`, detalle modular y base heredada preservada. |
| Paso 2b: 60/30/10, cuatro tamaños, 40 %, tres segundos, rejilla | Adaptada; §5 | Rejilla y jerarquía claras; objetivos con excepciones justificadas por legibilidad y tarea. |
| Paso 3a: una pasada HTML/Tailwind/React con modelos citados | Adaptada; §3 y §6 | Implementación proporcional, stack actual y configuración elegida; una sola pasada no garantiza calidad. |
| Paso 3b: sustituir placeholders vía Kia/Higsfield, 2K/4K | Adaptada; §6 | Assets cuando se pidan; no instalar ni gastar por menciones; resolución según destino y peso. |
| Paso 3c: bucle interno Brief/System/Arte | Adaptada; §7 | Críticos independientes reales, versiones y evidencia; la skill local establece el contrato. |
| Paso 4a: Slop Monster y auditoría de texto | Adaptada; §6 | Revisión concreta del texto; no exige un producto o skill con ese nombre. |
| Paso 4b: copy de conversión, 60 caracteres por línea | Adaptada; §6 | Objetivo de frases breves; el ancho de línea se comprueba renderizando, no contando caracteres solamente. |
| Paso 5a: todo texto, botón y SEO en JSON/Markdown local | Adaptada; §6 y §8 | Reutilizar el modelo de contenidos vigente; no mover Firestore a JSON local ni reestructurar sin pedido. |
| Paso 5b: conectar GitHub/Vercel CLI y publicar | Adaptada; §8 | Netlify es la configuración existente; no autoriza publicación ni cambio de plataforma. |
| Paso 5c: enlace vivo + Website OS sin tokens extra | Adaptada; §8 | Entregar lo solicitado y verificado; no prometer ausencia de consumos ni desplegar por el ejemplo. |
| Cierre: confirmar, solicitar URL/datos y comenzar fase 1 | Adaptada; §1 | Recuperar contexto ya aportado, preguntar solo faltantes relevantes y continuar el pedido vigente. |

## Preferencias adicionales incorporadas desde el encargo
- Carpeta exclusiva de trabajo del proyecto en D; español simple; ahorro sin degradar calidad.
- VoltAgent como fuente principal en cada pedido de diseño, con índice y selección progresiva.
- Sistema visual detallado, identidad de Arias, móvil, movimiento útil y comprensión sencilla.
- Base heredada preservada; nuevas propuestas identificadas como tales y no presentadas como aprobadas.
- Ninguna migración, publicación, cambio de proveedor o instalación se deriva del DOCX por sí sola.
- No prometer carga automática en tareas ajenas: iniciar en el proyecto o leer su AGENTS explícitamente.

## Verificación de esta integración
- Copia DOCX comparada por SHA-256 con el original; hash y tamaño en `procedencia.json`.
- Extracción por XML con párrafos y tablas preservados en orden, incluidos saltos y tabulaciones.
- Cada bloque no vacío del cuerpo tiene una fila de trazabilidad o una sección específica para sus cláusulas.
- Instrucciones de arranque y contextos breves, con documentación de procedencia separada.
- Verificación documental; no equivale a build, render, aprobación visual ni prueba actual de servicios externos.
