import type { APIRoute } from 'astro';
import { toolUrls, renderUrlset } from '../lib/sitemap.mjs';
import lawData from '../data/law.json';

export const GET: APIRoute = () => new Response(
  renderUrlset(toolUrls(), lawData.fetchedAt.slice(0, 10)),
  { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
