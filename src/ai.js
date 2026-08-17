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

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const MODEL_TEXT = process.env.GROQ_MODEL_TEXT || 'llama-3.3-70b-versatile';
// Multimodal: hasta 5 imágenes por pedido, 20 MB en total
const MODEL_VISION = process.env.GROQ_MODEL_VISION || 'qwen/qwen3.6-27b';

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

async function groq({ messages, model = MODEL_TEXT, maxTokens = 1024, temperature = 0.3, json = false }) {
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

const SYSTEM_TIENDA = (s, modo) =>
  `
Sos el asistente de ${s.storeName}, una librería, juguetería y bazar en La Rioja, Argentina.
Hablás en español rioplatense, de vos, con calidez y sin vueltas. Respuestas cortas: 2 o 3 oraciones.

REGLAS QUE NO PODÉS ROMPER:
- Sólo podés hablar de los productos de la lista que te paso. No inventes productos, precios ni características.
- Si algo no está en la lista, decí que no lo tenés en el catálogo y ofrecé consultarlo por WhatsApp.
- Nunca inventes un precio. Si no figura, no lo menciones.
- No prometas plazos de entrega, envíos ni descuentos: eso lo confirma el local.
- No repitas los precios en tu texto, se muestran solos en las tarjetas.
${
  modo === 'interno'
    ? '- Hablás con el equipo del local, podés ser más directo y técnico.'
    : '- Hablás con un cliente. Si duda entre opciones, ayudalo a elegir según para quién es y cuánto quiere gastar.'
}

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

  const raw = await groq({ messages, json: true, maxTokens: 600 });
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
Interpretás instrucciones en español rioplatense sobre el stock de un catálogo y proponés qué cambiar.
Te paso la lista completa de productos (slug | nombre | rubro | stock actual | visible actual).

REGLAS:
- Sólo podés proponer cambios sobre productos que están en la lista. Si la persona nombra algo que no
  reconocés en la lista, ponelo en "no_encontrados" tal cual lo escribió, no inventes un slug parecido.
- "cambio" es uno de: "sin_stock", "con_stock", "ocultar", "mostrar".
- Si la instrucción describe productos NUEVOS que hay que cargar (ej: "compré 5 productos nuevos"),
  no propongas nada: dejá "acciones" vacío y contestá en "aclaracion" que eso se carga desde
  "Nuevo producto" o "Carga masiva", no desde acá.
- Si la instrucción es ambigua o no reconocés a qué producto se refiere, no adivines: sumalo a
  "no_encontrados".

Devolvé JSON: {"acciones":[{"slug":"","cambio":"","motivo":""}],"no_encontrados":[""],"aclaracion":""}
`.trim();

export async function proposeStockActions({ instruction, products }) {
  const lista = products
    .map((p) => `- ${p.slug} | ${p.name} | ${p.category} | ${p.inStock ? 'con stock' : 'sin stock'} | ${p.visible === false ? 'oculto' : 'visible'}`)
    .join('\n');

  const messages = [
    { role: 'system', content: SYSTEM_STOCK() },
    { role: 'user', content: `Catálogo:\n${lista}\n\nInstrucción: ${instruction}` },
  ];

  const out = parseJson(await groq({ messages, json: true, maxTokens: 1400 }));

  const validSlugs = new Set(products.map((p) => p.slug));
  const validCambios = new Set(['sin_stock', 'con_stock', 'ocultar', 'mostrar']);
  const acciones = (Array.isArray(out.acciones) ? out.acciones : []).filter(
    (a) => validSlugs.has(a?.slug) && validCambios.has(a?.cambio)
  );

  return {
    acciones,
    no_encontrados: Array.isArray(out.no_encontrados) ? out.no_encontrados.map(String).slice(0, 20) : [],
    aclaracion: String(out.aclaracion || '').trim(),
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
  const out = parseJson(await groq({ messages, json: true, maxTokens: 2500 }));
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
  const out = parseJson(await groq({ messages, json: true, maxTokens: 600 }));
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
