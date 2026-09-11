// ============================================================
// BLOQUE PARA INCORPORAR EN:
// base44/functions/catalogo-metricas/entry.ts
//
// Debe ir dentro del try principal, después de calcular `action`
// y antes de las acciones de métricas.
// Reutiliza `admin`, `json(origin, ...)` y el CORS YA existentes.
// ============================================================

if (action === "configuracion_pagina") {
  const now = Date.now();

  const configs = await admin.entities.ConfiguracionPagina.filter(
    { clave: "principal" },
    "-updated_date",
    1
  );

  const source = configs[0] || {};

  const allBlocks = await admin.entities.BloquePagina.list(
    "prioridad",
    500,
    0,
    [
      "id",
      "clave",
      "tipo",
      "ubicacion",
      "activo",
      "titulo",
      "texto",
      "imagen_url",
      "cta_texto",
      "cta_url",
      "fecha_inicio",
      "fecha_fin",
      "prioridad",
      "dispositivo",
      "product_ids",
      "categoria"
    ]
  );

  const isInWindow = (item: any) => {
    if (item.activo === false) return false;

    const start = item.fecha_inicio ? Date.parse(item.fecha_inicio) : NaN;
    const end = item.fecha_fin ? Date.parse(item.fecha_fin) : NaN;

    if (Number.isFinite(start) && now < start) return false;
    if (Number.isFinite(end) && now > end) return false;

    return true;
  };

  const safePublicUrl = (value: unknown) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";

    if (raw.startsWith("/")) return raw;

    try {
      const parsed = new URL(raw);
      if (["https:", "http:"].includes(parsed.protocol)) {
        return parsed.toString().slice(0, 1000);
      }
    } catch {}

    return "";
  };

  const safeText = (value: unknown, max = 500) =>
    String(value ?? "").trim().slice(0, max);

  const safeArray = (value: unknown, max = 100) =>
    Array.isArray(value)
      ? value.map((item) => safeText(item, 160)).filter(Boolean).slice(0, max)
      : [];

  const blocks = allBlocks
    .filter(isInWindow)
    .sort((a: any, b: any) => Number(a.prioridad || 100) - Number(b.prioridad || 100))
    .map((item: any) => ({
      id: safeText(item.id, 100),
      clave: safeText(item.clave, 100),
      tipo: safeText(item.tipo, 40),
      ubicacion: safeText(item.ubicacion, 60),
      titulo: safeText(item.titulo, 180),
      texto: safeText(item.texto, 700),
      imagen_url: safePublicUrl(item.imagen_url),
      cta_texto: safeText(item.cta_texto, 80),
      cta_url: safePublicUrl(item.cta_url),
      prioridad: Number(item.prioridad || 100),
      dispositivo: safeText(item.dispositivo || "Todos", 30),
      product_ids: safeArray(item.product_ids, 100),
      categoria: safeText(item.categoria, 100),
    }));

  return json(origin, {
    success: true,
    version: 1,
    generated_at: new Date().toISOString(),

    config: {
      sitio_activo: source.sitio_activo !== false,
      mensaje_mantenimiento: safeText(
        source.mensaje_mantenimiento ||
          "Estamos actualizando el catálogo. Volvé a intentarlo en unos minutos.",
        400
      ),

      whatsapp: safeText(source.whatsapp, 40),

      barra_aviso: {
        activa: source.barra_aviso_activa === true,
        texto: safeText(source.barra_aviso_texto, 220),
        link: safePublicUrl(source.barra_aviso_link),
      },

      hero: {
        activo: source.hero_activo !== false,
        titulo: safeText(source.hero_titulo, 180),
        subtitulo: safeText(source.hero_subtitulo, 400),
        imagen_url: safePublicUrl(source.hero_imagen_url),
        cta_texto: safeText(source.hero_cta_texto, 80),
        cta_url: safePublicUrl(source.hero_cta_url),
      },

      secciones_visibles: safeArray(source.secciones_visibles, 50),
      orden_secciones: safeArray(source.orden_secciones, 50),
      productos_destacados: safeArray(source.productos_destacados, 100),

      stock: {
        etiqueta_activa: source.etiqueta_stock_bajo_activa !== false,
        umbral_bajo: Math.max(0, Number(source.umbral_stock_bajo ?? 1)),
        texto_bajo: safeText(source.texto_stock_bajo || "Última unidad", 80),
        mostrar_sin_stock: source.mostrar_sin_stock === true,
      },
    },

    bloques: blocks,
  });
}
