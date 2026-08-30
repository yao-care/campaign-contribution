/**
 * 文案 AI 味稽核。
 *
 * 判準與門檻取自中文去 AI 味的通行標準：對比句式、排比三段式、反問設問、
 * 破折號各有每 600 字的上限，另加空泛詞與總結套語。
 * 只掃「本站撰寫」的散文，不掃法條原文（原文一字不動）。
 */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const RULES = [
  { key: '對比句式', per600: 1, re: /不是[^，。？！]{1,20}[，]?(?:而是|是)|不只是[^，。]{1,20}更是|不僅[^，。]{1,20}(?:而且|還)|與其說[^，。]{1,20}不如說/g },
  { key: '破折號',   per600: 2, re: /——/g },
  { key: '反問設問', per600: 1, re: /(?:難道|豈不|何嘗|不正是)[^。！？]{0,30}[？?]/g },
  { key: '排比三段', per600: 1, re: /第一[，、].{2,60}第二[，、].{2,60}第三[，、]|一方面.{2,60}另一方面/g },
];
const VAGUE = ['提升效率','創造價值','至關重要','不可或缺','值得注意的是','換句話說','總而言之',
  '綜上所述','在當今','隨著.{0,6}的發展','扮演著.{0,6}角色','發揮.{0,6}作用','具有重要意義',
  '這正是','恰恰','不啻','堪稱','無疑'];
const VAGUE_RE = new RegExp(VAGUE.join('|'), 'g');

/** 取出散文：md 去掉 frontmatter 與標題行；astro 只取中文句子 */
const prose = (text, isMd) => {
  let t = text;
  if (isMd) t = t.replace(/^---[\s\S]*?\n---\n/, '');
  t = t.replace(/^#{1,6} .*$/gm, '');           // 標題不算散文
  t = t.replace(/```[\s\S]*?```/g, '');
  t = t.replace(/<[^>]+>/g, '');
  return t;
};

async function* walk(d) {
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(md|astro|ts)$/.test(e.name)) yield p;
  }
}

const rows = [];
let totalChars = 0;
const totals = Object.fromEntries([...RULES.map((r) => [r.key, 0]), ['空泛詞', 0]]);

for await (const f of walk('src')) {
  if (f.includes('/charts/') || f.endsWith('.json')) continue;
  const raw = await readFile(f, 'utf-8');
  const t = prose(raw, f.endsWith('.md'));
  const chars = (t.match(/[一-鿿]/g) ?? []).length;
  if (chars < 120) continue;
  totalChars += chars;
  const hits = {};
  let over = 0;
  for (const r of RULES) {
    const n = (t.match(r.re) ?? []).length;
    hits[r.key] = n; totals[r.key] += n;
    const allow = Math.max(1, Math.round((chars / 600) * r.per600));
    if (n > allow) over += n - allow;
  }
  const v = (t.match(VAGUE_RE) ?? []).length;
  hits['空泛詞'] = v; totals['空泛詞'] += v;
  over += v;
  if (over > 0) rows.push({ f: f.replace('src/', ''), chars, over, hits });
}

rows.sort((a, b) => b.over - a.over);
console.log(`掃描散文 ${totalChars.toLocaleString()} 字（不含法條原文）\n`);
console.log('全站計數：');
for (const [k, v] of Object.entries(totals)) {
  const r = RULES.find((x) => x.key === k);
  const allow = r ? Math.round((totalChars / 600) * r.per600) : 0;
  console.log(`  ${k.padEnd(6)} ${String(v).padStart(4)} 次` + (r ? `（門檻 ${allow}）` : ''));
}
console.log(`\n超標檔案 ${rows.length} 個，前 15：`);
for (const r of rows.slice(0, 15)) {
  const h = Object.entries(r.hits).filter(([, n]) => n).map(([k, n]) => `${k}${n}`).join(' ');
  console.log(`  ${String(r.over).padStart(3)} 超標  ${r.f.padEnd(42)} ${r.chars}字  ${h}`);
}
