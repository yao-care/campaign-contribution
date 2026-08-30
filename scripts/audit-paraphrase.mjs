/**
 * 覆述率稽核。
 *
 * 真正的 AI 味不在句型，在於白話段落只是把法條原文換句話說，讀者讀完得不到
 * 原文以外的任何東西。這裡量兩件事：
 *   1. 與該條原文的字元重疊率——越高越像覆述
 *   2. 具體詞密度——有沒有出現真實的人、物、場景
 */
import { readFile, readdir } from 'node:fs/promises';
import lawData from '../src/data/law.json' with { type: 'json' };

/** 二字詞切分後取交集，粗略但足以分辨覆述與解釋 */
const bigrams = (s) => {
  const t = s.replace(/[^一-鿿]/g, '');
  const out = new Set();
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
  return out;
};

/** 具體詞：真實世界的人、物、場景、動作。抽象法律語彙不算 */
const CONCRETE = /里長|村長|議員|候選人|館子|商號|鄰居|里民|支票|匯款|存摺|發票|收據|租金|廣告|看板|宣傳車|辦事處|廟|農會|水電行|早餐店|工廠|員工|老闆|會計師?|銀行|臨櫃|自然人憑證|讀卡機|郵寄|掛號|窗口|印刷廠|房東|文宣|礦泉水|茶水|便當|廂型車|市場|支持者|捐款人|太太|家裡|朝會|考績|包商|續約|掃街|路口|舉牌|處分書|地檢署|傳喚|退件|檔名|下載|訴願|股票|開店|房貸|信用卡|卡債/g;
/** 抽象法律語彙：多為原文詞彙的搬運 */
const ABSTRACT = /之?規定|所定|情形|事項|對象|義務|要件|範圍|前項|本條|該款|依法|辦理|適用|得為|不得/g;

const files = (await readdir('src/content/law')).filter((f) => f.endsWith('.md'));
const rows = [];
for (const f of files) {
  const raw = await readFile(`src/content/law/${f}`, 'utf-8');
  const art = f.replace('.md', '');
  const src = lawData.articles.find((a) => a.article === art)?.text ?? '';
  const body = raw.replace(/^---[\s\S]*?\n---\n/, '').replace(/^#{1,6} .*$/gm, '');
  const chars = (body.match(/[一-鿿]/g) ?? []).length;
  if (chars < 100 || !src) continue;
  const B = bigrams(body), S = bigrams(src);
  const shared = [...B].filter((g) => S.has(g)).length;
  const overlap = B.size ? shared / B.size : 0;
  const conc = (body.match(CONCRETE) ?? []).length;
  const abst = (body.match(ABSTRACT) ?? []).length;
  rows.push({ art, chars, overlap, conc, abst, ratio: conc / Math.max(1, abst) });
}
rows.sort((a, b) => b.overlap - a.overlap);
const avg = (k) => (rows.reduce((s, r) => s + r[k], 0) / rows.length);
console.log(`36 條白話，共 ${rows.reduce((s, r) => s + r.chars, 0).toLocaleString()} 字\n`);
console.log(`  與原文平均重疊率  ${(avg('overlap') * 100).toFixed(1)}%`);
console.log(`  具體詞總數        ${rows.reduce((s, r) => s + r.conc, 0)}`);
console.log(`  抽象法律語彙總數  ${rows.reduce((s, r) => s + r.abst, 0)}`);
console.log(`  完全沒有具體詞的條文  ${rows.filter((r) => r.conc === 0).length} / ${rows.length} 條\n`);
console.log('重疊率最高的 10 條（最像覆述）：');
for (const r of rows.slice(0, 10))
  console.log(`  第 ${r.art.padStart(2)} 條  重疊 ${(r.overlap * 100).toFixed(0).padStart(2)}%  具體詞 ${String(r.conc).padStart(2)}  抽象詞 ${String(r.abst).padStart(2)}  ${r.chars} 字`);
