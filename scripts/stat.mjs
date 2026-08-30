/**
 * 現況清單。
 *
 * 這支存在的理由：所有「幾條、幾筆、幾個、幾頁」都會過期，
 * 寫進文件裡就是製造下一個錯誤來源。文件只寫「跑這個指令」，數字由這裡即時算。
 * 要新增一項現況，加在這裡，不要抄進 CLAUDE.md 或 README.md。
 *
 * 用法：npm run stat
 *      npm run stat -- --json     機器可讀
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const json = async (p) => JSON.parse(await readFile(p, 'utf-8'));
const asJson = process.argv.includes('--json');

const law = await json('src/data/law.json');
const villages = await json('src/data/villages.json');
const parties = await json('src/data/parties.json');
const pkg = await json('package.json');
const regions = existsSync('src/data/regions.json') ? await json('src/data/regions.json') : null;
const donations = existsSync('src/data/donations.json') ? await json('src/data/donations.json') : null;

/** 遞迴數檔案，不依賴 find 的平台差異 */
function countFiles(dir, ext) {
  if (!existsSync(dir)) return null;
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) n += countFiles(p, ext) ?? 0;
    else if (e.name.endsWith(ext)) n++;
  }
  return n;
}

/** 私用區（PUA）造字：這些字在多數裝置顯示為豆腐，正字須人工對照公告 */
const PUA = /[-]|[\uDB80-\uDBBF][\uDC00-\uDFFF]/;
const puaNames = (villages.villages ?? [])
  .filter((v) => PUA.test(v.village) || PUA.test(v.district))
  .map((v) => `${v.county}${v.district}${v.village}`);

/** §5.6：四個差異化欄位未備齊者不進索引 */
const indexed = (villages.villages ?? []).filter((v) => v.complete).length;

const cycles = (await readFile('src/data/elections.ts', 'utf-8'))
  .match(/^\s*id: '(\d{4})'/gm)?.map((s) => s.match(/'(\d{4})'/)[1]) ?? [];

const out = {
  法條: { 條數: law.count, 內容指紋: law.digest, 抓取時間: law.fetchedAt, 來源: law.source },
  村里: {
    筆數: villages.count, 期別: villages.period, 抓取時間: villages.fetchedAt,
    進索引頁數: indexed, PUA造字村里: puaNames.length, PUA清單: puaNames,
  },
  政黨: { 個數: parties.count, 抓取時間: parties.fetchedAt },
  行政區: regions && {
    縣市: regions.counties.length,
    鄉鎮市區: regions.counties.reduce((a, c) => a + (c.districts?.length ?? 0), 0),
  },
  申報統計: donations && {
    申報筆數: donations.reportCount, 選舉場次: donations.elections.length,
    政黨數: Object.keys(donations.parties ?? {}).length, 抓取時間: donations.fetchedAt,
  },
  選舉屆別: cycles,
  素材圖檔: countFiles('public/media', '.png'),
  合作橫幅: countFiles('public/partners', '.webp'),
  已建置頁數: countFiles('dist', '.html'),
  依賴: { astro: pkg.dependencies.astro, typescript: pkg.devDependencies.typescript },
};

if (asJson) { console.log(JSON.stringify(out, null, 2)); process.exit(0); }

/** 中文字佔兩格，padEnd 用字數會對不齊 */
const vw = (s) => [...s].reduce((w, c) => w + (/[\u3000-\u9fff\uff00-\uffef]/.test(c) ? 2 : 1), 0);
const line = (k, v) => console.log(`  ${k}${' '.repeat(Math.max(1, 14 - vw(k)))}${v}`);
console.log('\n現況清單　' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC\n');
line('法條', `${out.法條.條數} 條　指紋 ${out.法條.內容指紋}`);
line('村里', `${out.村里.筆數} 筆　期別 ${out.村里.期別}　進索引 ${out.村里.進索引頁數} 頁`);
line('PUA 造字', `${out.村里.PUA造字村里} 個村里，正字待人工對照公告`);
line('政黨', `${out.政黨.個數} 個`);
if (out.行政區) line('行政區', `${out.行政區.縣市} 縣市　${out.行政區.鄉鎮市區} 鄉鎮市區`);
if (out.申報統計) line('申報統計', `${out.申報統計.申報筆數} 筆　${out.申報統計.選舉場次} 場選舉　${out.申報統計.政黨數} 個政黨`);
line('選舉屆別', out.選舉屆別.join('、'));
line('素材圖檔', `${out.素材圖檔} 張`);
line('合作橫幅', `${out.合作橫幅} 張`);
line('已建置頁數', out.已建置頁數 === null ? 'dist 不存在，先跑 npm run build' : `${out.已建置頁數} 頁`);
line('Astro', out.依賴.astro);
console.log(`\n  最後抓取：法條 ${out.法條.抓取時間.slice(0, 10)}　村里 ${out.村里.抓取時間.slice(0, 10)}　政黨 ${out.政黨.抓取時間.slice(0, 10)}`);
if (puaNames.length) console.log(`\n  PUA 造字村里：\n    ${puaNames.join('\n    ')}`);
console.log();
