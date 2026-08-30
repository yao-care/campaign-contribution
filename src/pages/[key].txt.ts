import type { APIRoute, GetStaticPaths } from 'astro';

/**
 * IndexNow 金鑰驗證檔（§8.4）。必須以金鑰為檔名、內容為同一金鑰。
 * 選舉季的日期變動需要當天生效，這是 sitemap 之外的即時通報管道。
 */
const KEY = process.env.INDEXNOW_KEY;

export const getStaticPaths: GetStaticPaths = () =>
  KEY ? [{ params: { key: KEY } }] : [];

export const GET: APIRoute = ({ params }) =>
  new Response(params.key, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
