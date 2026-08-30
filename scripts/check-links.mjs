/**
 * 內部連結檢查。8,442 頁的內鏈網若有斷鏈，爬蟲會卡在孤島上。
 * 只檢查站內相對連結；外部連結不碰。
 */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, posix } from 'node:path';

const DIST = 'dist';
async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith('.html')) yield p;
  }
}

const broken = new Map();
let pages = 0, links = 0;
const exists = new Map();
const has = (loc) => {
  if (exists.has(loc)) return exists.get(loc);
  const clean = decodeURIComponent(loc.split('#')[0].split('?')[0]);
  const candidates = clean.endsWith('/')
    ? [join(DIST, clean, 'index.html')]
    : [join(DIST, clean), join(DIST, clean, 'index.html'), join(DIST, clean + '.html')];
  const ok = candidates.some((c) => existsSync(c));
  exists.set(loc, ok);
  return ok;
};

for await (const file of walk(DIST)) {
  pages++;
  const html = await readFile(file, 'utf-8');
  for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    const loc = m[1];
    if (loc.startsWith('//')) continue;
    links++;
    if (!has(loc)) {
      if (!broken.has(loc)) broken.set(loc, new Set());
      if (broken.get(loc).size < 3) broken.get(loc).add(file.replace(DIST, ''));
    }
  }
}

console.log(`掃描 ${pages.toLocaleString()} 頁、${links.toLocaleString()} 條站內連結`);
if (broken.size === 0) { console.log('無斷鏈'); process.exit(0); }
console.log(`斷鏈 ${broken.size} 種目標：`);
for (const [loc, from] of [...broken].slice(0, 30))
  console.log(`  ${loc}\n    ← ${[...from].join(', ')}`);
process.exit(1);
