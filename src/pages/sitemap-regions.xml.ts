import type { APIRoute } from 'astro';
import { regionUrls, renderUrlset } from '../lib/sitemap.mjs';

export const GET: APIRoute = () => new Response(
  renderUrlset(regionUrls(), new Date().toISOString().slice(0, 10)),
  { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
