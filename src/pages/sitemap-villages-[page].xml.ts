import type { APIRoute, GetStaticPaths } from 'astro';
import { villageUrls, renderUrlset, shard } from '../lib/sitemap.mjs';

/** 7,851 個村里頁分片，每檔 1,000 筆 → sitemap-villages-01..08.xml（§8.3） */
export const getStaticPaths: GetStaticPaths = () =>
  shard(villageUrls()).map((urls, i) => ({
    params: { page: String(i + 1).padStart(2, '0') },
    props: { urls },
  }));

export const GET: APIRoute = ({ props }) => new Response(
  renderUrlset((props as { urls: { loc: string }[] }).urls, new Date().toISOString().slice(0, 10)),
  { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
