/**
 * 內部連結檢查。8,445 頁的內鏈網若有斷鏈，爬蟲會卡在孤島上。
 *
 * 刻意不用 existsSync：macOS 的檔案系統在比對檔名時會做 Unicode 正規化，
 * 大小寫也不敏感，因此 existsSync 在 macOS 上會放過只在 Linux 才爆的路徑。
 * 這裡改成把實際的目錄項目讀進來逐段做嚴格字串比對，讓本機就能重現 Linux 的行為。
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';

/** 把 dist 底下的目錄結構讀成巢狀 Map，值為該層的實際名稱集合 */
const dirCache = new Map();
async function entries(dir) {
  if (dirCache.has(dir)) return dirCache.get(dir);
  let set;
  try {
    set = new Set((await readdir(dir, { withFileTypes: true })).map((e) => e.name));
  } catch {
    set = null;   // 目錄不存在
  }
  dirCache.set(dir, set);
  return set;
}

/** 逐段嚴格比對，任一段對不上就是斷鏈 */
async function resolves(loc) {
  const clean = decodeURIComponent(loc.split('#')[0].split('?')[0]);
  const segs = clean.split('/').filter(Boolean);
  let dir = DIST;
  for (const seg of segs) {
    const set = await entries(dir);
    if (!set || !set.has(seg)) return false;   // 嚴格比對，不做正規化
    dir = join(dir, seg);
  }
  const set = await entries(dir);
  if (set) return set.has('index.html');       // 目錄 → 需有 index.html
  return true;                                  // 檔案本身（例如 .csv、.json、.txt）
}

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith('.html')) yield p;
  }
}

const broken = new Map();
const seen = new Map();
let pages = 0, links = 0;

for await (const file of walk(DIST)) {
  pages++;
  const html = await readFile(file, 'utf-8');
  for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    const loc = m[1];
    if (loc.startsWith('//')) continue;
    links++;
    if (!seen.has(loc)) seen.set(loc, await resolves(loc));
    if (!seen.get(loc)) {
      if (!broken.has(loc)) broken.set(loc, new Set());
      if (broken.get(loc).size < 3) broken.get(loc).add(file.replace(DIST, ''));
    }
  }
}

console.log(`掃描 ${pages.toLocaleString()} 頁、${links.toLocaleString()} 條站內連結（嚴格比對，不做 Unicode 正規化）`);
if (broken.size === 0) { console.log('無斷鏈'); process.exit(0); }
console.log(`斷鏈 ${broken.size} 種目標：`);
for (const [loc, from] of [...broken].slice(0, 30)) {
  const cps = [...decodeURIComponent(loc)].filter((c) => c.codePointAt(0) > 0x7f)
    .map((c) => `U+${c.codePointAt(0).toString(16).toUpperCase()}`).join(' ');
  console.log(`  ${loc}`);
  if (cps) console.log(`    碼位 ${cps}`);
  console.log(`    ← ${[...from].join(', ')}`);
}
process.exit(1);
