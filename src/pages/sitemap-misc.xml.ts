import type { APIRoute } from 'astro';
import { miscUrls, renderUrlset } from '../lib/sitemap.mjs';

export const GET: APIRoute = () => new Response(
  renderUrlset(miscUrls(), new Date().toISOString().slice(0, 10)),
  { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
