import type { APIRoute } from "astro";
import { sitePages, siteUrl } from "../lib/site-pages";

const newestLastmod = sitePages
  .map((page) => page.lastmod)
  .sort()
  .at(-1);

export const GET: APIRoute = ({ site }) =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${siteUrl("/sitemap.xml", site?.href)}</loc>
    <lastmod>${newestLastmod}</lastmod>
  </sitemap>
</sitemapindex>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600"
      }
    }
  );
