/**
 * 文件把關：不准把「現況數字」寫死在文件裡。
 *
 * 規矩見 CLAUDE.md 開頭。數字寫進文件的那一刻就開始腐爛，
 * 而讀的人沒有辦法知道它是什麼時候的。文件只寫指令，數字由 npm run stat 即時算。
 *
 * 做法：拿 stat 現在算出來的每一個值，回頭在文件裡找。找得到就是被抄過去了。
 * 只比對「數值＋單位」的組合（例如「7,734 筆」），避免誤判法條號與年份。
 *
 * 用法：npm run check:docs
 */
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const DOCS = ['CLAUDE.md', 'README.md', 'docs/建站規格.md', 'docs/圖表規格.md'];

const r = spawnSync(process.execPath, ['scripts/stat.mjs', '--json'], { encoding: 'utf-8' });
if (r.status !== 0) { console.error('無法取得現況：\n' + r.stderr); process.exit(1); }
const s = JSON.parse(r.stdout);

/** [值, 單位, 這個數字該去哪裡拿] */
const WATCH = [
  [s.法條.條數, '條', 'npm run stat'],
  [s.村里.筆數, '筆', 'npm run stat'],
  [s.村里.進索引頁數, '頁', 'npm run stat'],
  [s.村里.PUA造字村里, '個村里', 'npm run stat'],
  [s.政黨.個數, '個', 'npm run stat'],
  [s.行政區?.縣市, '縣市', 'npm run stat'],
  [s.行政區?.鄉鎮市區, '個鄉鎮市區', 'npm run stat'],
  [s.申報統計?.申報筆數, '筆', 'npm run stat'],
  [s.申報統計?.選舉場次, '場選舉', 'npm run stat'],
  [s.素材圖檔, '張', 'npm run stat'],
  [s.已建置頁數, '頁', 'npm run stat'],
].filter(([v]) => typeof v === 'number' && v > 0);

/** 7734 與 7,734 都要抓 */
const variants = (n) => [...new Set([String(n), n.toLocaleString('en-US')])];

/**
 * 建站規格是歷史文件，其中被勘誤標註的舊數字要留著當紀錄。
 * 只有「現在仍然成立」的數字才算違規，所以放行明確標為勘誤／原規格的行。
 */
const HISTORICAL = /勘誤|原規格|規格原|期別的數字|§\d/;

let bad = 0;
for (const f of DOCS) {
  let text;
  try { text = await readFile(f, 'utf-8'); } catch { continue; }
  const lines = text.split('\n');
  for (const [v, unit, how] of WATCH) {
    for (const num of variants(v)) {
      const re = new RegExp(`${num.replace(',', ',')}\\s*${unit}`);
      lines.forEach((ln, i) => {
        if (!re.test(ln) || HISTORICAL.test(ln)) return;
        console.error(`  ✗ ${f}:${i + 1} 寫死了現況數字「${num} ${unit}」，改寫成「${how}」`);
        console.error(`    ${ln.trim().slice(0, 90)}`);
        bad++;
      });
    }
  }
}

if (bad) {
  console.error(`\n文件把關失敗，共 ${bad} 處。現況數字一律用指令取得，不要抄進文件。`);
  process.exit(1);
}
console.log(`文件把關通過：${DOCS.length} 份文件內無寫死的現況數字`);
