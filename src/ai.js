/**
 * Capa de IA — corre SIEMPRE en el servidor.
 *
 * La clave de Groq nunca se manda al navegador: el cliente pega contra
 * /api/ai/*, el servidor agrega la clave y llama a Groq. Cuando el sitio
 * pase a un hosting, alcanza con poner GROQ_API_KEY en las variables de
 * entorno de ese servidor — el código del cliente no cambia.
 *
 * Regla de oro: la IA redacta, pero NO es la fuente de los datos.
 * Precios, stock y links salen siempre de products.json. Lo que devuelve
 * el modelo se valida antes de mostrarse y nunca se guarda solo.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { webPromo } from './templates.js';
// El asistente de stock usa el mismo motor del catálogo para encontrar de qué
// producto le están hablando: entiende sinónimos, alias y errores de tipeo.
import { buildIndex, getIndex, searchProducts } from './search-engine.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Groq dio de baja llama-3.3-70b-versatile el 16/8/2026 (retiro anunciado,
// no un corte de golpe) — cualquier pedido de texto (asistente de stock,
// fichas de producto, resumen de actividad) devolvía "Groq 404: The model
// `llama-3.3-70b-versatile` does not exist" desde esa fecha, mostrado en el
// panel como el código pelado "FALLO" en vez de explicar qué pasaba (ver
// también el fix de api()/aiErrorText() en admin.js, mismo hallazgo).
// openai/gpt-oss-120b es el reemplazo que recomienda Groq mismo para esto.
const MODEL_TEXT = process.env.GROQ_MODEL_TEXT || 'openai/gpt-oss-120b';
// Multimodal, para "Completar ficha desde la foto".
//
// Segunda vez que pasa lo mismo: Groq retira un modelo y la función deja de
// andar de un día para el otro, sin que nadie toque nada. El 23/9/2026
// `qwen/qwen3.6-27b` empezó a devolver "Groq 404: The model does not exist or
// you do not have access to it" (lo encontró Fran probando el panel); el
// reemplazo es `qwen/qwen3.8-27b`. Antes había pasado con
// llama-3.3-70b-versatile, ver la nota de MODEL_TEXT acá arriba.
//
// Si vuelve a pasar, NO hace falta un deploy: `GROQ_MODEL_VISION` en las
// variables de entorno de Netlify pisa este valor. El modelo vigente está en
// https://console.groq.com/docs/vision
const MODEL_VISION = process.env.GROQ_MODEL_VISION || 'qwen/qwen3.8-27b';

/** Lee .env sin dependencias. Se llama una vez al arrancar el servidor. */
export async function loadEnv(root) {
  try {
    const raw = await fs.readFile(path.join(root, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!m) continue;
      const value = m[2].trim().replace(/^["']|["']$/g, '');
      if (value && !process.env[m[1]]) process.env[m[1]] = value;
    }
  } catch {
    /* sin .env: la IA queda apagada y el resto de la app funciona igual */
  }
}

export const aiEnabled = () => Boolean(process.env.GROQ_API_KEY);

/* ==========================================================================
   Llamada base
   ========================================================================== */

async function groq({ messages, model = MODEL_TEXT, maxTokens = 1024, temperature = 0.3, json = false, reasoningEffort }) {
  if (!aiEnabled()) throw new Error('SIN_CLAVE');

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
      // openai/gpt-oss-* "piensa" antes de contestar, y esos tokens de
      // razonamiento salen del mismo max_tokens que el JSON final — sin
      // acotarlo (reportado en el foro de Groq y reproducido acá: "Groq
      // 400: Failed to validate JSON") puede comerse todo el presupuesto
      // y devolver un JSON cortado a la mitad. 'low' alcanza de sobra
      // para esto (interpretar una instrucción corta, no resolver un
      // problema difícil) y deja el presupuesto para la respuesta.
      ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.error?.message || '';
    if (res.status === 429) throw new Error(`LIMITE: alcanzaste el límite de consultas por minuto. ${msg}`);
    if (res.status === 401) throw new Error('CLAVE_INVALIDA: la GROQ_API_KEY no es válida.');
    throw new Error(`Groq ${res.status}: ${msg}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

/** Los modelos a veces envuelven el JSON en ```json … ```. */
function parseJson(text) {
  const clean = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '');
  try {
    return JSON.parse(clean);
  } catch {
    // Último intento: quedarse con el primer objeto/arreglo balanceado
    const m = /[{[][\s\S]*[}\]]/.exec(clean);
    if (m) return JSON.parse(m[0]);
    throw new Error('La IA devolvió algo que no es JSON válido.');
  }
}

/* ==========================================================================
   1. PREGUNTAS SOBRE EL CATÁLOGO
   Se le pasa sólo un puñado de productos ya filtrados por el buscador
   semántico. El modelo redacta la respuesta y elige cuáles mostrar; los
   datos que ve el cliente salen después de products.json, no del texto.
   ========================================================================== */

/** "Promo vigente: 10% de descuento en todo el catálogo comprando por la
    web, sobre el total del pedido. No acumulable." — el mismo dato que
    muestra la página (webPromo en templates.js), en una línea para el
    prompt. Devuelve '' si el admin apagó la promo. */
function promosLine(s) {
  const promo = webPromo(s);
  if (!promo) return '';
  const extra = promo.disclaimer ? ` ${promo.disclaimer}.` : '';
  return `Promo vigente: ${promo.percent}% de descuento en todo el catálogo comprando por la web, sobre el total del pedido armado y mandado desde la página.${extra}`;
}

const SYSTEM_TIENDA = (s, modo) =>
  `
Sos el asistente de ${s.storeName}, una librería, juguetería y bazar en La Rioja, Argentina.
Hablás en español rioplatense, de vos, con calidez y sin vueltas. Respuestas cortas: 2 o 3 oraciones.

REGLAS QUE NO PODÉS ROMPER:
- Sólo podés hablar de los productos de la lista que te paso. No inventes productos, precios ni características.
- Si algo no está en la lista, decí que no lo tenés en el catálogo y ofrecé consultarlo por WhatsApp.
- La lista ya viene filtrada por el buscador, que entiende nombres alternativos y en otro idioma
  ("kettle" o "hervidor" es una pava eléctrica, "moka pot" es una cafetera moka, "zapatero" es un
  organizador de calzado, "air fryer" una freidora de aire). Si en la lista está eso que te piden pero
  con otro nombre, ofrecelo llamándolo por su NOMBRE REAL, el de la lista. No digas que no lo tenés
  sólo porque la palabra exacta que usaron no aparece escrita.
- Nunca inventes un precio. Si no figura, no lo menciones.
- No prometas plazos de entrega, envíos ni descuentos que no estén en "Promo vigente" más abajo: eso lo confirma
  el local. La "Promo vigente" sí es real y la podés repetir tal cual cuando pregunten por descuentos, promociones
  o formas de pago — no es un precio de producto, es la política general de la tienda. No existen descuentos por
  medio de pago ni por monto de compra: si preguntan por eso, decí que el único descuento es el de comprar por la web.
- No repitas los precios de PRODUCTOS en tu texto, se muestran solos en las tarjetas. La promo web sí la podés
  mencionar en texto.
${
  modo === 'interno'
    ? '- Hablás con el equipo del local, podés ser más directo y técnico.'
    : '- Hablás con un cliente. Si duda entre opciones, ayudalo a elegir según para quién es y cuánto quiere gastar.'
}
${
  // "Modo Adolfo" (Ronda 6): estas tres reglas de comportamiento sólo
  // aplican con clientes reales — con el equipo (modo 'interno') no
  // tiene sentido "vender", sólo informar.
  modo === 'interno'
    ? ''
    : `
CÓMO VENDER:
- Si la consulta es ambigua (no dice para quién es, para qué ocasión, o cuánto quiere gastar) y hay
  más de 3 candidatos posibles, hacé UNA pregunta corta para desambiguar en vez de tirar productos al
  azar — no preguntes si ya tenés dato suficiente para recomendar bien.
- Si la persona dice que algo es caro o duda por el precio, no le insistas con el mismo producto: mirá
  la lista de candidatos y ofrecele el que tenga menor precio y cumpla algo parecido, si existe uno.
- Cuando ya recomendaste algo concreto (hay productos en tu respuesta), cerrá invitando a agregarlo al
  pedido o a escribir por WhatsApp si tiene dudas — no repitas ese cierre si ya lo dijiste en un turno
  anterior de esta misma conversación (mirá el historial).`
}
${promosLine(s) ? `\n${promosLine(s)}` : ''}

Respondé SIEMPRE en JSON con esta forma exacta:
{"respuesta": "tu texto", "productos": ["slug-1", "slug-2"]}
En "productos" van los slugs de la lista que corresponden a lo que pidió, como máximo 4, del más al menos relevante.
Si ninguno aplica, "productos" va vacío.
`.trim();

export async function askCatalog({ question, candidates, settings, history = [], modo = 'cliente' }) {
  // Ficha compacta: sin descripciones enteras para no gastar contexto al pedo
  const lista = candidates
    .map(
      (p) =>
        `- ${p.slug} | ${p.name} | ${p.category} | $${p.price} | ${p.inStock ? 'hay stock' : 'SIN STOCK'} | ${String(
          p.description || ''
        ).slice(0, 150)}`
    )
    .join('\n');

  const messages = [
    { role: 'system', content: SYSTEM_TIENDA(settings, modo) },
    ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    {
      role: 'user',
      content: `Productos disponibles para esta consulta:\n${lista || '(ninguno coincide)'}\n\nConsulta: ${question}`,
    },
  ];

  const raw = await groq({ messages, json: true, maxTokens: 600, reasoningEffort: 'low' });
  const out = parseJson(raw);

  // Nos quedamos sólo con slugs que existen de verdad: si el modelo se
  // inventa uno, se descarta en silencio.
  const validos = new Set(candidates.map((p) => p.slug));
  return {
    respuesta: String(out.respuesta || '').trim(),
    productos: (Array.isArray(out.productos) ? out.productos : []).filter((s) => validos.has(s)).slice(0, 4),
  };
}

/* ==========================================================================
   1b. COMANDOS DE STOCK EN LENGUAJE NATURAL
   "Sacá del stock el dinosaurio y la mochila", "estos tres volvieron a
   tener stock", "che agregá X que lo compré ayer" (esto último cae en
   NO_ENCONTRADO -> se sugiere ir a "Nuevo producto"/"Carga masiva").
   El modelo nunca aplica nada: sólo propone, y sólo sobre slugs que existen
   de verdad en el catálogo que se le pasó.
   ========================================================================== */

const SYSTEM_STOCK = () =>
  `
Interpretás mensajes en español rioplatense sobre el stock de un catálogo. Pueden ser dos cosas
distintas, y a veces las dos juntas:
1. Un pedido de cambio (ej: "sacá del stock el dinosaurio y la mochila") — proponés qué cambiar,
   nunca lo aplicás vos.
2. Una pregunta informativa (ej: "¿hay productos repetidos?", "¿qué no tiene stock hace rato?",
   "¿cuántos productos del rubro Juguetería están sin stock?") — la contestás con texto, usando
   sólo lo que ves en la lista.
Te paso la lista de productos, una línea por producto con su NOMBRE y algunos datos más (varía
según la pregunta, pero el nombre siempre está).

REGLAS:
- En "acciones" identificás cada producto por su "nombre", copiado EXACTO tal cual figura en la
  lista (mismas mayúsculas, tildes y todo) — nunca lo acortes, resumas ni inventes uno parecido.
- Para preguntas informativas: sólo podés mencionar productos que están LITERALMENTE en la lista
  que te paso, con su nombre real. Nunca inventes un producto ni un dato que no esté en la lista.
  Si no tenés forma de contestar con lo que ves, decilo en "respuesta" en vez de inventar.
- Para pedidos de cambio: sólo podés proponer cambios sobre productos que están en la lista. Si la
  persona nombra algo que no reconocés en la lista, ponelo en "no_encontrados" tal cual lo escribió,
  no inventes un nombre parecido.
- "cambio" es uno de: "sin_stock", "con_stock", "ocultar", "mostrar".
- Si la instrucción describe productos NUEVOS que hay que cargar (ej: "compré 5 productos nuevos"),
  no propongas nada: dejá "acciones" vacío y contestá en "aclaracion" que eso se carga desde
  "Nuevo producto" o "Carga masiva", no desde acá.
- Si la instrucción es ambigua o no reconocés a qué producto se refiere, no adivines: sumalo a
  "no_encontrados".
- "respuesta" es para el texto de una pregunta informativa. Dejala vacía si el mensaje era sólo un
  pedido de cambio y no hace falta explicar nada más allá de la propuesta.

Devolvé JSON: {"acciones":[{"nombre":"","cambio":"","motivo":""}],"no_encontrados":[""],"aclaracion":"","respuesta":""}
`.trim();

/* La lista completa (351 productos y creciendo) con TODOS los campos no
   entra ni de cerca en el presupuesto de tokens por minuto del plan
   gratis de Groq (~8K TPM: probado en producción, category+stock+
   visible+fecha para 351 productos pidió 14403 tokens de una) — el
   pedido devolvía siempre "413: Request too large", sin importar el
   modelo. En vez de mandar todo, se arma una lista corta con sólo el
   campo que hace falta para el tipo de pregunta — nombre siempre (es lo
   que el modelo usa para identificar el producto), más UN campo extra
   como mucho. Combinar dos ya no entra con margen cómodo para que el
   catálogo pueda seguir creciendo sin volver a romperse. */
const STALE_RE = /actualiz|hace tiempo|hace rato|hace mucho|viejo|antiguo|desde cuando|sin tocar/i;
const VISIBILITY_RE = /ocult|mostr|visible/i;
const DUP_RE = /repetid|duplicad|dos veces|misma? nombre/i;
const NOSTOCK_RE = /sin stock|no tienen? stock|falta.{0,12}stock|agotad|se acabaron?/i;
const SUMMARY_RE = /resumen|resumi|estado del cat|c[oó]mo (est[aá]|va) el cat|panorama/i;

/* Tope duro de la lista que se le manda al modelo. El plan gratis de Groq da
   ~8K tokens por minuto contando ida y vuelta; 12.000 caracteres son ~3.300
   tokens, que con el prompt del sistema y los 900 de respuesta deja aire de
   sobra para que el catálogo siga creciendo. */
const MAX_CHARS = 12000;

const recortar = (lineas) => {
  let total = 0;
  const out = [];
  for (const l of lineas) {
    if (total + l.length > MAX_CHARS) break;
    out.push(l);
    total += l.length + 1;
  }
  return { lista: out.join('\n'), recortados: lineas.length - out.length };
};

const fecha = (p) => (p.updatedAt || p.createdAt || '').slice(0, 10) || 'sin fecha';

/**
 * Arma el pedazo de catálogo que le toca ver al modelo.
 *
 * Antes se le mandaba el catálogo ENTERO, una línea por producto. Con 351
 * productos ya había que recortar los campos; con 581 dejó de entrar del todo
 * y el asistente de stock devolvía "413: Request too large" en el 100% de los
 * pedidos — o sea, estaba roto en producción aunque el botón se viera.
 *
 * El arreglo no es recortar más campos (el catálogo va a seguir creciendo):
 * es dejar de mandar lo que no hace falta. Cada tipo de pregunta necesita un
 * subconjunto chico, y lo que se puede contar exacto se cuenta acá, en código,
 * en vez de pedirle a un modelo que escanee 581 renglones — que además lo hace
 * mal. El modelo queda para lo que sí sabe hacer: entender el pedido en
 * criollo y redactar.
 *
 * Devuelve el bloque de texto ya armado, listo para el prompt.
 */
export function buildCatalogBlock(products, instruction) {
  const total = products.length;
  const cab = (t) => `(catálogo: ${total} productos en total) ${t}`;

  // ¿Es una ORDEN de cambiar algo, o una PREGUNTA?
  // No es un detalle: "ocultá el organizador de calzado" y "¿qué está oculto?"
  // comparten la palabra, y si gana la pregunta el modelo recibe la lista de
  // ocultos en vez del producto que le nombraron, y no puede proponer nada.
  // Por eso la orden se detecta por el VERBO en imperativo y gana primero.
  // Ojo con los límites de palabra: `\b` después de una vocal acentuada NO
  // funciona (para JS la "á" no es carácter de palabra, así que entre "á" y
  // el espacio no hay frontera). Por eso se delimita a mano con espacios y
  // puntuación — con `\b` final, "ocultá el organizador" no matcheaba y el
  // pedido terminaba tratado como la pregunta "¿qué está oculto?".
  const ACCION_RE =
    /(^|\s)(sac[aá]|saque|quit[aá]|ocult[aá]|ocultar|mostr[aá]|mostrar|pon[eé]|marc[aá]|activ[aá]|desactiv[aá]|habilit[aá]|deshabilit[aá]|repon[eé]|dar de baja|dale de baja)(\s|,|\.|$)/i;
  const esOrden = ACCION_RE.test(instruction) && !/^\s*¿/.test(instruction.trim());

  // 1. Resumen: no hace falta NINGÚN producto, sólo los números.
  if (!esOrden && SUMMARY_RE.test(instruction)) {
    const sinStock = products.filter((p) => !p.inStock).length;
    const ocultos = products.filter((p) => p.visible === false).length;
    const destacados = products.filter((p) => p.featured).length;
    const rubros = [...new Set(products.map((p) => p.category))];
    const porRubro = rubros
      .map((c) => `${c}: ${products.filter((p) => p.category === c).length}`)
      .join(', ');
    return cab(
      `Números exactos del catálogo, ya calculados: ${total} productos, ${sinStock} sin stock, ` +
        `${ocultos} ocultos, ${destacados} destacados. Por rubro: ${porRubro}. ` +
        `Contá esto en criollo, no inventes otros números.`
    );
  }

  // 2. Duplicados: se calculan acá y sólo viajan los grupos repetidos.
  if (!esOrden && DUP_RE.test(instruction)) {
    const byName = new Map();
    for (const p of products) {
      const k = p.name.trim().toLowerCase();
      byName.set(k, (byName.get(k) || 0) + 1);
    }
    const repes = [...byName.entries()].filter(([, n]) => n > 1);
    if (!repes.length) {
      return cab('No hay ningún nombre repetido en el catálogo. Decíselo así, sin listar nada.');
    }
    const { lista } = recortar(
      repes.map(([k, n]) => {
        const real = products.find((p) => p.name.trim().toLowerCase() === k).name;
        return `- ${real} | aparece ${n} veces`;
      })
    );
    return cab(`Nombres repetidos (calculado exacto):\n${lista}`);
  }

  // 3. Sin stock: sólo los que no tienen.
  if (!esOrden && NOSTOCK_RE.test(instruction)) {
    const sin = products.filter((p) => !p.inStock);
    if (!sin.length) return cab('Todos los productos tienen stock. Decíselo así.');
    const { lista, recortados } = recortar(sin.map((p) => `- ${p.name}`));
    return cab(
      `Productos SIN stock (${sin.length} en total):\n${lista}` +
        (recortados ? `\n(y ${recortados} más que no entran acá)` : '')
    );
  }

  // 4. Visibilidad: sólo los ocultos.
  if (!esOrden && VISIBILITY_RE.test(instruction)) {
    const ocultos = products.filter((p) => p.visible === false);
    if (!ocultos.length) {
      return cab('No hay ningún producto oculto: están todos publicados. Decíselo así.');
    }
    const { lista, recortados } = recortar(ocultos.map((p) => `- ${p.name} | oculto`));
    return cab(
      `Productos OCULTOS (${ocultos.length} en total):\n${lista}` +
        (recortados ? `\n(y ${recortados} más)` : '')
    );
  }

  // 5. Sin actualizar hace rato: los 40 más viejos, ya ordenados.
  if (!esOrden && STALE_RE.test(instruction)) {
    const viejos = [...products]
      .sort((a, b) => String(a.updatedAt || a.createdAt || '').localeCompare(String(b.updatedAt || b.createdAt || '')))
      .slice(0, 40);
    const { lista } = recortar(viejos.map((p) => `- ${p.name} | ${fecha(p)}`));
    return cab(`Los 40 que hace más tiempo no se tocan, del más viejo al menos viejo:\n${lista}`);
  }

  // 6. Pedido de cambio sobre productos concretos ("sacá del stock el
  //    dinosaurio y la mochila"): se buscan con el mismo motor del catálogo,
  //    que entiende sinónimos y errores de tipeo, y viajan sólo los candidatos.
  buildIndex(products);
  const encontrados = searchProducts(instruction, getIndex()).slice(0, 50);
  const elegidos = encontrados.length ? encontrados : products.slice(0, 50);
  const { lista } = recortar(
    elegidos.map((p) => `- ${p.name} | ${p.inStock ? 'con stock' : 'sin stock'} | ${p.visible === false ? 'oculto' : 'visible'}`)
  );
  return cab(
    `Productos del catálogo que coinciden con lo que pidió` +
      (encontrados.length ? '' : ' (no coincidió ninguno; va una muestra)') +
      `:\n${lista}\n` +
      `Si el producto que nombró NO está en esta lista, va a "no_encontrados": ` +
      `no propongas otro parecido.`
  );
}

export async function proposeStockActions({ instruction, products }) {
  const lista = buildCatalogBlock(products, instruction);

  const messages = [
    { role: 'system', content: SYSTEM_STOCK() },
    { role: 'user', content: `Catálogo:\n${lista}\n\nInstrucción: ${instruction}` },
  ];

  const out = parseJson(await groq({ messages, json: true, maxTokens: 900, reasoningEffort: 'low' }));

  // El modelo identifica por nombre, no por slug (ver comentario arriba) —
  // acá se resuelve contra el catálogo real. Hay un único par de nombres
  // idénticos en todo el catálogo hoy ("Plancha de Rizado SEIS PP24-A");
  // si el nombre no es único, se propone la acción para CADA producto que
  // lo tenga — la tabla de confirmación los muestra por separado y cada
  // fila se puede destildar antes de aplicar, no se pierde el control.
  const byName = new Map();
  for (const p of products) {
    const k = p.name.trim();
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(p);
  }

  const validCambios = new Set(['sin_stock', 'con_stock', 'ocultar', 'mostrar']);
  const acciones = [];
  for (const a of Array.isArray(out.acciones) ? out.acciones : []) {
    if (!validCambios.has(a?.cambio)) continue;
    const matches = byName.get(String(a?.nombre || '').trim());
    if (!matches) continue;
    for (const p of matches) acciones.push({ slug: p.slug, cambio: a.cambio, motivo: a.motivo });
  }

  return {
    acciones,
    no_encontrados: Array.isArray(out.no_encontrados) ? out.no_encontrados.map(String).slice(0, 20) : [],
    aclaracion: String(out.aclaracion || '').trim(),
    respuesta: String(out.respuesta || '').trim(),
  };
}

/* ==========================================================================
   2. FICHAS DE PRODUCTO A PARTIR DE TEXTO
   Para pegar la lista del proveedor o un mensaje de WhatsApp.
   ========================================================================== */

const SYSTEM_FICHAS = (cats) =>
  `
Convertís texto suelto en fichas de producto para el catálogo de una librería/juguetería argentina.

REGLAS:
- Extraé SOLO lo que está en el texto. Si un dato no está, dejalo vacío. Nunca lo inventes.
- El precio es un número entero en pesos, sin símbolos ni puntos. Si no hay precio, poné 0.
- En Argentina el punto separa miles: "32.000" son treinta y dos mil, no treinta y dos.
- "rubro" tiene que ser exactamente uno de: ${cats.join(', ')}. Si no podés deducirlo con seguridad, usá "".
- La descripción: una o dos oraciones, en español rioplatense, contando qué hace y para quién es.
  Sólo con datos del texto. Sin signos de exclamación de más y sin promesas de envío o garantía.
- No agregues productos que no estén en el texto.

Devolvé JSON: {"productos":[{"nombre":"","precio":0,"rubro":"","descripcion":""}]}
`.trim();

export async function draftFromText({ text, settings }) {
  const messages = [
    { role: 'system', content: SYSTEM_FICHAS(settings.categories) },
    { role: 'user', content: text.slice(0, 6000) },
  ];
  const out = parseJson(await groq({ messages, json: true, maxTokens: 2500, reasoningEffort: 'low' }));
  return normalizeDrafts(out.productos, settings);
}

/* ==========================================================================
   3. FICHA A PARTIR DE FOTOS
   ========================================================================== */

const SYSTEM_FOTO = (cats) =>
  `
Mirás fotos de un producto de una librería/juguetería argentina y armás su ficha.

REGLAS:
- Describí SOLO lo que se ve en la foto o lo que dice claramente el envase.
- Si en la caja se lee una marca o modelo, usalos en el nombre. Si no se leen, no los inventes.
- Nunca inventes un precio: "precio" va siempre en 0, lo pone la persona.
- "rubro" tiene que ser exactamente uno de: ${cats.join(', ')}.
- La descripción: una o dos oraciones en español rioplatense, contando qué hace y para quién es.
- En "seguridad" poné "alta" si reconocés el producto sin dudar, "media" si es un tipo de producto
  genérico, "baja" si la foto no alcanza. Sé honesto: es lo que decide si hay que revisarlo a mano.

Devolvé JSON: {"nombre":"","precio":0,"rubro":"","descripcion":"","seguridad":"alta|media|baja"}
`.trim();

export async function draftFromImages({ images, settings, hint = '' }) {
  const content = [
    {
      type: 'text',
      text: hint
        ? `Armá la ficha de este producto. Dato que aporta la persona: ${hint}`
        : 'Armá la ficha de este producto.',
    },
    // El modelo acepta hasta 5 imágenes por pedido
    ...images.slice(0, 5).map((dataUri) => ({ type: 'image_url', image_url: { url: dataUri } })),
  ];

  const messages = [
    { role: 'system', content: SYSTEM_FOTO(settings.categories) },
    { role: 'user', content },
  ];

  const out = parseJson(await groq({ messages, model: MODEL_VISION, json: true, maxTokens: 700 }));
  return normalizeDrafts([out], settings)[0];
}

/* ==========================================================================
   4. RESUMEN DE ACTIVIDAD DEL PANEL
   Convierte la lista cruda de cambios (una línea por acción, tal cual
   quedaron registrados) en un resumen tipo "fin de jornada" para mandar
   por WhatsApp al equipo — agrupa, no sólo reordena.
   ========================================================================== */

const SYSTEM_RESUMEN = () =>
  `
Redactás un resumen breve de la actividad de un panel de catálogo (librería/juguetería
argentina) para mandar por WhatsApp al equipo. Te paso una lista de líneas, cada una un
cambio que se hizo (agregar producto, editar, marcar sin stock, etc.).

REGLAS:
- Agrupá por tipo de cambio en vez de listar todo suelto (ej: "Se agregaron 3 productos:
  X, Y, Z" en vez de tres líneas separadas).
- Español rioplatense, tono directo y breve — es un mensaje de WhatsApp, no un informe.
- No inventes nada que no esté en la lista. Si la lista es corta, el resumen también.
- Máximo 6-8 líneas.

Devolvé JSON: {"resumen":"el texto, con saltos de línea si hace falta"}
`.trim();

export async function summarizeActivity({ entries }) {
  const lista = entries.map((e) => `- ${e}`).join('\n');
  const messages = [
    { role: 'system', content: SYSTEM_RESUMEN() },
    { role: 'user', content: lista },
  ];
  const out = parseJson(await groq({ messages, json: true, maxTokens: 600, reasoningEffort: 'low' }));
  return String(out.resumen || '').trim();
}

/* ==========================================================================
   Normalización
   Todo lo que sale de la IA pasa por acá antes de llegar a la interfaz.
   ========================================================================== */

function normalizeDrafts(list, settings) {
  const sinTilde = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  const catByNorm = new Map(settings.categories.map((c) => [sinTilde(c), c]));

  return (Array.isArray(list) ? list : [])
    .map((d) => ({
      name: String(d?.nombre || '').trim().slice(0, 90),
      // Defensa por si el modelo devuelve "32.000" en vez de 32000
      price: parseInt(String(d?.precio ?? 0).replace(/[^\d]/g, ''), 10) || 0,
      category: catByNorm.get(sinTilde(d?.rubro)) || '',
      description: String(d?.descripcion || '').trim().slice(0, 400),
      confidence: ['alta', 'media', 'baja'].includes(d?.seguridad) ? d.seguridad : null,
      images: [],
    }))
    .filter((d) => d.name);
}
