/** sitemap.xml a partir del catálogo visible. */
import { esc } from './templates.js';

export function buildSitemap(products, s) {
  const today = new Date().toISOString().slice(0, 10);

  const entry = (loc, priority, lastmod = today) =>
    `  <url>\n    <loc>${esc(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${priority}</priority>\n  </url>`;

  const urls = [
    entry(`${s.siteUrl}/`, '1.0'),
    ...products.map((p) =>
      entry(`${s.siteUrl}/p/${p.slug}/`, '0.8', (p.updatedAt || p.createdAt || '').slice(0, 10) || today)
    ),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}
