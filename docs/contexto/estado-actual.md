# Estado actual y continuidad

Actualizado: 17/09/2026, hora local Argentina. Carpeta acordada: `D:\Descargas\catalogo-arias`.
Snapshot de Git al retomar el rediseño: rama `preview`, HEAD `8f41fb1` (`hero v5`).
Comprobar el estado real al retomar: hay trabajo concurrente y modificaciones previas.

## Personas, producto y prioridades
- Fran coordina el trabajo; la librería pertenece a su padre, Adolfo.
- Adolfito, una grulla, es la mascota de la marca.
- La prioridad de esta etapa es consolidar un sistema visual muy detallado que guíe las próximas mejoras.
- El catálogo debe resultar sencillo de entender y usar, especialmente en móvil, con mejores flujos, estados y movimiento útil.
- El usuario pide ahorrar tokens sin reducir calidad y usar VoltAgent como fuente principal de referencias en cada pedido de diseño.
- Mantener comunicación en español simple y preguntar solo por faltantes que afecten el trabajo.

## Decisiones persistentes
- Trabajar sobre la carpeta D acordada; estas instrucciones pertenecen al proyecto.
- Para una tarea nueva iniciada fuera del repo, cargar explícitamente `D:\Descargas\catalogo-arias\AGENTS.md`.
- Aplicar la metodología de `token-design-optimizer.md`; su original y adaptación están en `docs/metodologia/`.
- Consultar referencias con selección progresiva; no cargar todo el repositorio de VoltAgent en cada turno.
- Respetar decisiones del usuario y requisitos de accesibilidad/uso; distinguir base visual existente, propuestas y aprobación.
- `DESIGN.md` resume el sistema; `docs/design-system/` mantiene los módulos; conservar `docs/design-system.md` como base heredada.
- Un Design Loop requiere evidencia y tres críticos independientes; no hay aprobación válida por una revisión simulada.
- Mantener modelo/esfuerzo elegidos; recomendaciones de eficiencia no equivalen a cambiar la configuración.

## Arquitectura verificada por lectura de código el 11/09/2026
- Node.js con módulos JavaScript y HTML generado por plantillas; no hay una migración a React/Tailwind seleccionada.
- Firestore es la fuente de verdad; el servidor lee datos y el build genera `dist/` para Netlify.
- Firebase Auth protege el panel y Firestore conserva sus cambios.
- Cloudinary gestiona imágenes; Base44 aporta control de marketing y analítica.
- `data/*.json` de la raíz es material anterior; no usarlo como fuente actual sin una razón explícita.
- Los comandos `dev` y `build` de `package.json` incluyen `--use-system-ca`.
- El mapa de entradas, dependencias y verificaciones está en `mapa-proyecto.md`.

## Evidencia histórica disponible, no reejecutada en esta adaptación
Fuente: `docs/setup-estado-pc.md`, comprobación fechada 10/09/2026.
- El setup registró servidor en `http://localhost:4321`, home y una ficha con HTTP 200.
- Registró 486 productos visibles y compilación de 486 fichas más 6 páginas de rubro.
- Registró acceso a la pantalla de ingreso del panel; no inició sesión ni verificó escrituras.
- Registró `GROQ_API_KEY` vacía y `/api/ai/status` con `enabled: false`.
- Registró `BUILD_HOOK_URL` sin configurar y ausencia de Netlify CLI y Claude Code en PATH.
- No se deben presentar esas cantidades, procesos o credenciales como comprobados nuevamente hoy.

## Rediseño de la home — estado autoritativo (17/09/2026)
- La publicación `preview` todavía muestra el hero anterior con el arreglo de orden de la Ronda 0. **Ninguna versión del hero nuevo fue publicada.** Los commits v1–v5 existen solamente en la rama local `preview`.
- Ronda 0 (orden roto): publicada en preview. Ronda 1 (medición, objetivo y referencias): cerrada. Ronda 2 (hero): v5 local en revisión. Rondas 3–7 (grilla/tarjeta, ficha/agregar, pedido/WhatsApp, estados y cierre desktop/producción): pendientes.
- La v4 obtuvo Calidad PASS, Objetivo FAIL y Sistema FAIL. La v5 corrige los puntos señalados: oculta Ofertas también en el menú cuando no hay ofertas reales; presenta tres accesos iguales en una fila móvil con ícono sobre texto; reduce el énfasis de Pedido; separa sugerencias de WhatsApp; usa foco oscuro visible sobre el aviso amarillo; reduce el aviso móvil por debajo del 10%; y evita reconstruir un aviso idéntico para conservar el foco.
- El foco del aviso se comprobó con Tab real. Falta reconstruir y guardar el paquete de evidencia de v5 y ejecutar tres críticos independientes sobre la misma versión congelada. Un PASS anterior no se arrastra a v5.
- La prueba actual usa una copia estática parcheada porque la cuota de Firestore impide reconstruir con datos reales. Cuando el servicio se reponga, hay que generar nuevamente, revisar con datos reales y recién después publicar el hero en `preview`.
- Pendientes conocidos: páginas de rubro y fichas desbordan 14px a 320px y hoy lo ocultan con `overflow-x: hidden`; avisar a Rodri que `configuracion_pagina` funciona y que el destino inexistente de “Ver productos” fue corregido; retirar `src/home-motion-preview.local.html`, incluido por error en un commit; y reservar el paso de `preview` a `main` para la Ronda 7.
- Decisión vigente de Fran: una sola isla/buscador; al hacer scroll se transforma en el buscador flotante inferior al estilo de Shop.app. Vidrio solo en superficies flotantes. En móvil, Pedido permanece visible y el menú se integra en la misma isla.

## Pendientes y límites conocidos
- PDF premium del sistema visual generado en `output/pdf/libreria-arias-sistema-visual-v0.1.pdf` el 11/09/2026; render verificado con Poppler en 9 páginas A4.
- El generador reproducible está en `scripts/build_visual_system_pdf.py`; usa ReportLab, assets reales de marca y producto, y resume la base de `DESIGN.md`.
- Se pidió evaluar una alternativa gratuita de IA antes de activar la integración; no hay proveedor nuevo seleccionado.
- La disponibilidad del servidor, la IA y servicios externos debe comprobarse cuando la tarea los necesite.
- Publicación desde el panel, escritura autenticada, GitHub, Netlify y subida a Cloudinary requieren comprobación específica según el alcance.
- Esta adopción metodológica no ejecuta publicación, migración de datos, instalación de herramientas ni cambio de stack.
- No afirmar reducción porcentual de tokens, superioridad de modelos ni resultados de Design Loop sin evidencia real.

## Cómo continuar
1. Leer `AGENTS.md` y revisar cambios actuales antes de editar.
2. Recuperar el objetivo vigente del usuario; usar este estado como apoyo, no como sustituto de su pedido.
3. Para diseño, abrir `DESIGN.md`, el módulo relevante y el índice de referencias; identificar qué reglas están vigentes y cuáles son propuestas.
4. Consultar solo la implementación afectada con ayuda del mapa y verificar dependencias compartidas.
5. Registrar nuevas decisiones y pruebas con fecha, versión y alcance; conservar el historial necesario por enlaces.
