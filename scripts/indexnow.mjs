/**
 * IndexNow 提交（§8.4）。建置後執行，把有變動的 URL 一次送出。
 * 用法：node scripts/indexnow.mjs [url ...]
 * 不給參數時讀 dist/sitemap-index.xml 底下所有分片的全部 URL。
 */
import { readFile, readdir } from 'node:fs/promises';
import { SITE } from '../src/site.mjs';

const key = process.env.INDEXNOW_KEY;
if (!key) throw new Error('缺 INDEXNOW_KEY，見 .env.example');

let urls = process.argv.slice(2);
if (urls.length === 0) {
  const files = (await readdir('dist')).filter((f) => /^sitemap-.*\.xml$/.test(f) && f !== 'sitemap-index.xml');
  for (const f of files) {
    const xml = await readFile(`dist/${f}`, 'utf-8');
    urls.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  }
}
if (urls.length === 0) { console.log('無 URL 可提交'); process.exit(0); }

const host = new URL(SITE.origin).host;
// IndexNow 單次上限 10,000 筆
for (let i = 0; i < urls.length; i += 10000) {
  const batch = urls.slice(i, i + 10000);
  const res = await fetch('https://api.indexnow.org/IndexNow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key, keyLocation: `${SITE.origin}/${key}.txt`, urlList: batch }),
  });
  console.log(`提交 ${batch.length} 筆 → HTTP ${res.status} ${res.statusText}`);
}
