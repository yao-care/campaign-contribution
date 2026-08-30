/**
 * 全國法規資料庫 → src/data/law.json
 *
 * 建站規格 §12 第 1 條紅線：法條原文一律以抓取結果為準，禁止由模型改寫或憑記憶填寫。
 * 這支腳本是那條紅線的唯一入口——頁面上的原文只能來自這裡的輸出。
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const PCODE = 'D0020049';   // 政治獻金法
const URL_ = `https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=${PCODE}`;

const res = await fetch(URL_, { headers: { 'User-Agent': 'Mozilla/5.0' } });
if (!res.ok) throw new Error(`抓取失敗 HTTP ${res.status}`);
const html = await res.text();

const unescape = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
  .replace(/&amp;/g, '&');

const blocks = html.split(/<a[^>]*>第\s*(\d+(?:-\d+)?)\s*條<\/a>/);
const articles = [];
for (let i = 1; i < blocks.length; i += 2) {
  const no = blocks[i];
  const body = blocks[i + 1].split('<a ')[0];
  const text = unescape(body.replace(/<[^>]+>/g, '\n'))
    .split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
  articles.push({
    article: no,
    number: Number(no.split('-')[0]),
    text,
    repealed: /^（刪除）|^\(刪除\)/.test(text),
  });
}

if (articles.length === 0) throw new Error('解析出 0 條，網站結構可能已變更');

const out = {
  source: URL_,
  law: '政治獻金法',
  fetchedAt: new Date().toISOString(),
  /** 內容指紋。變了就代表法條修正，要重新人工審閱所有白話說明 */
  digest: createHash('sha256').update(articles.map((a) => a.article + a.text).join('\n')).digest('hex').slice(0, 16),
  count: articles.length,
  articles,
};

await mkdir('src/data', { recursive: true });
await writeFile('src/data/law.json', JSON.stringify(out, null, 2) + '\n');

const repealed = articles.filter((a) => a.repealed).map((a) => a.article);
console.log(`條數 ${articles.length}（有效 ${articles.length - repealed.length}，刪除 ${repealed.join('、') || '無'}）`);
console.log(`digest ${out.digest}`);
console.log(`首條 ${articles[0].article}：${articles[0].text.slice(0, 40)}…`);
console.log(`末條 ${articles.at(-1).article}：${articles.at(-1).text.slice(0, 40)}…`);
