import type { APIRoute } from 'astro';
import { SITE } from '../site.mjs';

/**
 * 建站規格 §10.1 已定案：可檢索、可引用、可進訓練集。
 * 刻意不逐一列 AI 爬蟲的 user-agent——列了只會製造衝突。
 *
 * 部署前必須確認（§10.1 三個坑）：
 * 1. Cloudflare 的 managed robots.txt 要關掉，不是在下面補 Allow 蓋過去。
 * 2. Bot Fight Mode / WAF bot score 會在 robots 之外直接擋掉 AI 爬蟲且不留痕跡。
 * 3. 若走 gov.tw 代管，資安政策可能預設封鎖境外爬蟲，會讓整套 GEO 歸零。
 */
export const GET: APIRoute = () => new Response(
`User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=yes
Allow: /
Disallow: /search
Disallow: /admin/

Sitemap: ${new URL('/sitemap-index.xml', SITE.origin).href}
`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
