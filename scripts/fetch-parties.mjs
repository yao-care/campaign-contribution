/**
 * 內政部政黨資訊網 → src/data/parties.json
 *
 * 該站的政黨表格由 Scripts/JAutoGenerateTableTH.js 在瀏覽器端產生，
 * 直接抓 HTML 只會拿到表頭（實測 tr=1）。因此改用 headless Chrome 渲染後再解析。
 * 清單支援 GET 參數 page 與 PageSize，不需要 ASP.NET postback。
 * gs=P01 為現存政黨。
 */
import { execFileSync } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
].find((p) => existsSync(p));
if (!CHROME) throw new Error('找不到 Chrome，本腳本需要瀏覽器渲染');

const URL_ = 'https://party.moi.gov.tw/PartyMain.aspx?n=16100&sms=13073&gs=P01&page=1&PageSize=200';

const dom = execFileSync(CHROME, [
  '--headless=new', '--disable-gpu', '--virtual-time-budget=8000', '--dump-dom', URL_,
], { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });

const unescape_ = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)).replace(/&amp;/g, '&');
const strip = (s) => unescape_(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

const parties = [];
for (const m of dom.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
  const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => c[1]);
  if (cells.length < 3) continue;
  const no = strip(cells[0]);
  const name = strip(cells[1]);
  if (!name || name === '政黨名稱' || !/^\d+$/.test(no)) continue;
  const id = /PartyMainContent\.aspx\?[^"']*?s=(\d+)/.exec(m[1])?.[1] ?? null;
  parties.push({
    no: Number(no),
    name,
    leader: strip(cells[2]) || null,
    id,
    slug: name,
    detailUrl: id ? `https://party.moi.gov.tw/PartyMainContent.aspx?n=16100&sms=13073&s=${id}` : null,
  });
}

if (parties.length === 0) throw new Error('解析出 0 個政黨，站台結構可能已變更');

await mkdir('src/data', { recursive: true });
await writeFile('src/data/parties.json', JSON.stringify({
  source: 'https://party.moi.gov.tw/',
  listUrl: URL_,
  status: '現存政黨（gs=P01）',
  fetchedAt: new Date().toISOString(),
  count: parties.length,
  parties: parties.sort((a, b) => a.no - b.no),
}, null, 2) + '\n');

console.log(`現存政黨 ${parties.length} 個`);
console.log(`編號範圍 ${parties[0].no}–${parties.at(-1).no}`);
console.log(`有明細頁連結 ${parties.filter((p) => p.id).length} 個`);
