/**
 * IndexNow 提交（建站規格 §8.4）。選舉季的日期變動需要當天生效。
 *
 * 用法：
 *   node scripts/indexnow.mjs                  讀 dist/ 的 sitemap 分片
 *   node scripts/indexnow.mjs --live           改讀線上 sitemap（部署後用，不必重新建置）
 *   node scripts/indexnow.mjs <url> [url ...]  只提交指定的 URL
 */
import { readFile, readdir } from 'node:fs/promises';
import { SITE } from '../src/site.mjs';

const key = process.env.INDEXNOW_KEY;
if (!key) {
  console.log('未設定 INDEXNOW_KEY，略過提交。（見 .env.example）');
  process.exit(0);
}

const args = process.argv.slice(2);
const live = args.includes('--live');
let urls = args.filter((a) => a.startsWith('http'));

const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

if (urls.length === 0) {
  if (live) {
    const idx = await fetch(`${SITE.origin}/sitemap-index.xml`);
    if (!idx.ok) throw new Error(`讀不到線上 sitemap-index：HTTP ${idx.status}`);
    for (const shard of locs(await idx.text())) {
      const r = await fetch(shard);
      if (r.ok) urls.push(...locs(await r.text()));
    }
  } else {
    const files = (await readdir('dist')).filter((f) => /^sitemap-.*\.xml$/.test(f) && f !== 'sitemap-index.xml');
    for (const f of files) urls.push(...locs(await readFile(`dist/${f}`, 'utf-8')));
  }
}

if (urls.length === 0) { console.log('無 URL 可提交'); process.exit(0); }

const host = new URL(SITE.origin).host;
for (let i = 0; i < urls.length; i += 10000) {   // IndexNow 單次上限 10,000 筆
  const batch = urls.slice(i, i + 10000);
  const res = await fetch('https://api.indexnow.org/IndexNow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key, keyLocation: `${SITE.origin}/${key}.txt`, urlList: batch }),
  });
  console.log(`提交 ${batch.length} 筆 → HTTP ${res.status} ${res.statusText}`);
}
