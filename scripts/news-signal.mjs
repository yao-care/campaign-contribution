/**
 * 選題訊號蒐集。
 *
 * ⚠ 產出是**內部用**的選題清單，不對外發布，不進 src/pages。
 *
 * 理由寫在 /about/statement/ 的自我約束裡：本站不涉候選人立場、不評論不推薦不批評。
 * 自動抓來的媒體標題必然帶著該媒體的框架，掛上站就等於本站在轉述立場。
 * 所以新聞只當**內部訊號**用——決定這週該補哪一頁、哪個名詞該加解釋——
 * 不當對外版位。要對外的制度變動走 src/data/updates.ts，只收主管機關公告。
 *
 * 資料來源：Google News RSS。免費、免金鑰、免登入，不需要 websearch 額度。
 *
 * 兩種模式：
 *   主題模式（現在就能跑）：固定的政治獻金相關查詢。
 *   候選人模式：讀 src/data/candidates.json，逐名查詢並要求命中政治獻金關鍵字。
 *     ⚠ 該檔目前不存在。本屆候選人登記尚未截止，中選會名單還沒產生，
 *       來源端點待登記結束後查證再接，不在此處臆測網址。
 *
 * 用法：node scripts/news-signal.mjs [--days 14]
 * 產出：docs/選題訊號.md（累積式，同一則不重複計入）
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const DAYS = Number(process.argv[process.argv.indexOf('--days') + 1]) || 14;
const OUT = 'docs/選題訊號.md';

/** 主題查詢。刻意只問制度，不問人。 */
const TOPICS = [
  '政治獻金 專戶',
  '政治獻金 申報',
  '政治獻金 監察院 裁處',
  '政治獻金法 修法',
  '政治獻金 罰鍰',
  '政治獻金 抵稅',
];

/** 命中其中一個才算跟本站有關，用來擋掉泛選舉新聞 */
const RELEVANT = ['政治獻金', '專戶', '申報', '獻金'];

const rss = (q) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;

const strip = (s) => s
  .replace(/<!\[CDATA\[|\]\]>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .trim();

/** 極小的 RSS 解析。只取需要的四個欄位，不引入 XML 套件。 */
function parseItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const b = m[1];
    const get = (tag) => strip((new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(b)?.[1]) ?? '');
    return { title: get('title'), link: get('link'), date: get('pubDate'), source: get('source') };
  });
}

async function fetchQuery(q) {
  const r = await fetch(rss(q), { headers: { 'user-agent': 'campaign.yao.care news-signal' } });
  if (!r.ok) throw new Error(`${q}：HTTP ${r.status}`);
  return parseItems(await r.text()).map((it) => ({ ...it, q }));
}

const cutoff = Date.now() - DAYS * 86_400_000;
const hits = new Map();          // link → item，同一則被多個查詢命中只留一筆

for (const q of TOPICS) {
  let items;
  try {
    items = await fetchQuery(q);
  } catch (e) {
    console.error(`  查詢失敗（略過）：${e.message}`);
    continue;
  }
  for (const it of items) {
    const t = Date.parse(it.date);
    if (Number.isFinite(t) && t < cutoff) continue;
    if (!RELEVANT.some((k) => it.title.includes(k))) continue;
    if (!hits.has(it.link)) hits.set(it.link, { ...it, qs: new Set([q]) });
    else hits.get(it.link).qs.add(q);
  }
  console.log(`  ${q}　累計 ${hits.size} 則`);
}

// 候選人模式。名單就位後自動生效，不必改這支程式。
const CAND = 'src/data/candidates.json';
if (existsSync(CAND)) {
  const { candidates = [] } = JSON.parse(await readFile(CAND, 'utf-8'));
  console.log(`  候選人名單 ${candidates.length} 人，逐名查詢`);
  for (const c of candidates) {
    const q = `${c.name} 政治獻金`;
    let items;
    try { items = await fetchQuery(q); } catch { continue; }
    for (const it of items) {
      const t = Date.parse(it.date);
      if (Number.isFinite(t) && t < cutoff) continue;
      if (!RELEVANT.some((k) => it.title.includes(k))) continue;
      if (!hits.has(it.link)) hits.set(it.link, { ...it, qs: new Set([q]) });
      else hits.get(it.link).qs.add(q);
    }
  }
} else {
  console.log(`  ${CAND} 不存在，略過候選人模式（本屆登記尚未截止，中選會名單未產生）`);
}

const rows = [...hits.values()].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

// 累積：舊檔裡出現過的連結標記為已看過，讓每次只需要讀新增的部分
const seen = new Set();
if (existsSync(OUT)) {
  for (const m of (await readFile(OUT, 'utf-8')).matchAll(/\((https?:\/\/[^)\s]+)\)/g)) seen.add(m[1]);
}
const fresh = rows.filter((r) => !seen.has(r.link));

const today = new Date().toISOString().slice(0, 10);
const md = `# 選題訊號

> 內部文件，不對外發布。來源為 Google News RSS，僅用於決定站上該補哪些內容。
> 本站不轉載、不評論媒體報導，也不在頁面上呈現候選人相關新聞——見 /about/statement/。

最後執行：${today}　查詢區間：近 ${DAYS} 天　本次新增 ${fresh.length} 則／命中 ${rows.length} 則

## 本次新增

${fresh.length === 0 ? '（無新增）' : fresh.map((r) =>
  `- ${r.date.slice(5, 16)}　${r.title}\n  來源：${r.source}　命中查詢：${[...r.qs].join('、')}\n  (${r.link})`
).join('\n')}

## 怎麼用

1. 掃標題，找出**制度性的問題**（新的罰鍰態樣、常見誤解、書表變動），不看個案。
2. 對照站上有沒有對應頁面。沒有就開一頁，有但講不清楚就改寫。
3. 主管機關的公告與函釋另外走 \`src/data/updates.ts\`，那才是會出現在網站上的。
`;

await writeFile(OUT, md);
console.log(`\n${OUT}　新增 ${fresh.length} 則，命中 ${rows.length} 則`);
