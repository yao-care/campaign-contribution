import type { APIRoute } from 'astro';
import {
  lawUrls, toolUrls, contentUrls, regionUrls, villageUrls, miscUrls,
  renderIndex, shard,
} from '../lib/sitemap.mjs';

/** 只收攏真的有內容的分片，避免 Search Console 出現一堆空 sitemap */
export const GET: APIRoute = () => {
  const files: string[] = [];
  if (miscUrls().length) files.push('/sitemap-misc.xml');
  if (lawUrls().length) files.push('/sitemap-law.xml');
  if (toolUrls().length) files.push('/sitemap-tools.xml');
  if (contentUrls().length) files.push('/sitemap-content.xml');
  if (regionUrls().length) files.push('/sitemap-regions.xml');
  shard(villageUrls()).forEach((_, i) =>
    files.push(`/sitemap-villages-${String(i + 1).padStart(2, '0')}.xml`));

  return new Response(renderIndex(files, new Date().toISOString().slice(0, 10)),
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
