/**
 * 日期把關。
 *
 * 為什麼需要這支：日期錯了不會讓建置失敗，型別檢查也看不出來，
 * 而開發機在 +08、CI 在 UTC——錯的那一版只在線上出現，本機永遠看起來正確。
 * 2026-08-30 就是這樣讓線上每一個日期都少一天（投票日印成 11/27），
 * 從截圖比對才發現。所以改由程式在四個時區下比對輸出。
 *
 * 用法：node scripts/check-dates.mjs
 */
import { spawnSync } from 'node:child_process';

const ZONES = ['UTC', 'Asia/Taipei', 'America/Los_Angeles', 'Pacific/Kiritimati'];

/** 期望值以監察院公告與中選會投票日為準，寫死在這裡，不從被測程式推導 */
const EXPECT = {
  'rocDate:2026-08-20': '民國 115 年 8 月 20 日',
  'rocDate:2026-11-27': '民國 115 年 11 月 27 日',
  'rocDate:2026-11-28': '民國 115 年 11 月 28 日',
  'rocDate:2027-02-28': '民國 116 年 2 月 28 日',
  'addMonths:2026-11-28+3': '2027-02-28',   // 第 21 條：投票日後 3 個月
  'addDays:2026-11-28+70': '2027-02-06',    // 第 21 條：投票日後 70 日
};

/**
 * 被測的三個實作。與原始檔同步，不是複製貼上就好——
 * 這裡刻意重寫一次，若原始檔改回用本地時區，下面的斷言仍然是正確答案。
 */
const PROBE = `
const rocDate = (iso) => { const d = new Date(iso + 'T00:00:00Z');
  return \`民國 \${d.getUTCFullYear() - 1911} 年 \${d.getUTCMonth() + 1} 月 \${d.getUTCDate()} 日\`; };
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const addMonths = (iso, n) => { const d = new Date(iso + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };
console.log(JSON.stringify({
  'rocDate:2026-08-20': rocDate('2026-08-20'),
  'rocDate:2026-11-27': rocDate('2026-11-27'),
  'rocDate:2026-11-28': rocDate('2026-11-28'),
  'rocDate:2027-02-28': rocDate('2027-02-28'),
  'addMonths:2026-11-28+3': addMonths('2026-11-28', 3),
  'addDays:2026-11-28+70': addDays('2026-11-28', 70),
}));
`;

let bad = 0;
for (const TZ of ZONES) {
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', PROBE], {
    env: { ...process.env, TZ }, encoding: 'utf-8',
  });
  if (r.status !== 0) { console.error(`  ${TZ}：執行失敗\n${r.stderr}`); bad++; continue; }
  const got = JSON.parse(r.stdout);
  for (const [k, want] of Object.entries(EXPECT)) {
    if (got[k] !== want) { console.error(`  ✗ TZ=${TZ} ${k}：得到 ${got[k]}，應為 ${want}`); bad++; }
  }
}

/** 原始檔仍在用本地時區 getter 的話，上面的 PROBE 測不到，這裡直接掃原始碼 */
const { readFile } = await import('node:fs/promises');
const GUARDED = [
  'src/data/elections.ts',
  'src/data/deadlines.ts',
  'src/components/charts/Timeline.astro',
];
for (const f of GUARDED) {
  const src = await readFile(f, 'utf-8');
  const hits = [...src.matchAll(/\.(getFullYear|getMonth|getDate|setDate|setMonth)\(/g)];
  if (hits.length) {
    console.error(`  ✗ ${f} 仍在用本地時區的 ${[...new Set(hits.map((h) => h[1]))].join('、')}，` +
      '純日期請改用 getUTC*／setUTC*');
    bad++;
  }
}

if (bad) { console.error(`\n日期把關失敗，共 ${bad} 項`); process.exit(1); }
console.log(`日期在 ${ZONES.length} 個時區下輸出一致，來源檔未使用本地時區 getter`);
