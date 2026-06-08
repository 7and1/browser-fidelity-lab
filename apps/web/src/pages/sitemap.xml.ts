import type { APIRoute } from "astro";
import { sitePages, siteUrl } from "../lib/site-pages";

export const GET: APIRoute = ({ site }) => {
  const origin = site?.href;
  const urls = sitePages
    .map(
      (page) => `  <url>
    <loc>${siteUrl(page.path, origin)}</loc>
    <lastmod>2026-06-03</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    )
    .join("\n");

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
};
