/**
 * 全站散文稽核：覆述率與具體度。
 *
 * 法條頁比對該條原文；問答、名詞、書表等比對全法原文（它們沒有對應的單一條文）。
 * 只掃本站撰寫的散文，法條原文本身不掃。
 */
import { readFile, readdir } from 'node:fs/promises';
import lawData from '../src/data/law.json' with { type: 'json' };

const ALL_LAW = lawData.articles.map((a) => a.text).join('');
const bigrams = (s) => {
  const t = s.replace(/[^一-鿿]/g, '');
  const out = new Set();
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
  return out;
};
const LAW_G = bigrams(ALL_LAW);

const CONCRETE = /里長|村長|議員|候選人|館子|商號|鄰居|里民|支票|匯款|存摺|發票|收據|租金|廣告|看板|宣傳車|辦事處|廟|農會|水電行|早餐店|工廠|員工|老闆|會計師?|銀行|臨櫃|自然人憑證|讀卡機|郵寄|掛號|窗口|印刷廠|房東|文宣|礦泉水|茶水|便當|廂型車|市場|支持者|捐款人|太太|家裡|朝會|考績|包商|續約|掃街|路口|舉牌|處分書|地檢署|傳喚|退件|檔名|下載|訴願|股票|開店|房貸|信用卡|卡債|餐會|勸募信|名單|里辦公處|空店面|印刷|時價/g;
const ABSTRACT = /之?規定|所定|情形|事項|對象|義務|要件|範圍|前項|本條|該款|依法|辦理|適用|得為|不得|應予|相關/g;

/**
 * 從 TS 資料檔取出散文。
 * 只抓「鍵: '值'」形式——直接掃引號會跨越字串邊界，把 `', aliases: ['`
 * 這種相鄰引號之間的程式碼也當成內容。
 */
/**
 * 欄位分兩類，判準不同：
 *   定義型：法定定義、條文各款的轉述、法律效果。貼近原文是對的，重疊率高不是問題。
 *   解釋型：補充說明、實務提醒、情境。要提供原文以外的東西，重疊率高就是覆述。
 */
const DEF_KEYS = /(?:definition|scope|sanction|conclusion|rule|auditRule|title)\s*:\s*'([^']+)'/g;
const EXP_KEYS = /(?:detail|caveat|relief|trigger|who|note|body|penalty|a|q|h)\s*:\s*'([^']+)'/g;
/** steps、tests、pitfalls 是字串陣列，鍵名之後接 [ 而非引號 */
const ARRAY_KEYS = /(?:steps|tests|pitfalls|entries)\s*:\s*\[([\s\S]*?)\]/g;
const pick = (re) => (src) =>
  [...src.matchAll(re)].map((m) => m[1])
    .filter((s) => (s.match(/[一-鿿]/g) ?? []).length > 8).join('\n');
const arraysOf = (src) =>
  [...src.matchAll(ARRAY_KEYS)].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]))
    .filter((s) => (s.match(/[一-鿿]/g) ?? []).length > 8).join('\n');
const stringsOf = (src) => [pick(EXP_KEYS)(src), arraysOf(src)].filter(Boolean).join('\n');
const defsOf = pick(DEF_KEYS);

const FILES = [
  ['問答 faq.ts', 'src/data/faq.ts'],
  ['名詞 glossary.ts', 'src/data/glossary.ts'],
  ['不得捐贈 donors.ts', 'src/data/donors.ts'],
  ['書表 forms.ts', 'src/data/forms.ts'],
  ['情境 guides.ts', 'src/data/guides.ts'],
  ['罰則 penalties.ts', 'src/data/penalties.ts'],
];
const TARGETS = FILES.map(([n, p]) => [n, p, stringsOf]);

console.log('【解釋型欄位】應提供原文以外的內容，重疊率高即為覆述\n');
console.log('項目                 字數    與法條重疊  具體詞  抽象詞  比例');
console.log('─'.repeat(66));
for (const [name, path, extract] of TARGETS) {
  const raw = await readFile(path, 'utf-8');
  const t = extract(raw);
  const chars = (t.match(/[一-鿿]/g) ?? []).length;
  const B = bigrams(t);
  const overlap = B.size ? [...B].filter((g) => LAW_G.has(g)).length / B.size : 0;
  const c = (t.match(CONCRETE) ?? []).length;
  const a = (t.match(ABSTRACT) ?? []).length;
  console.log(
    `${name.padEnd(20)} ${String(chars).padStart(5)}  ${(overlap * 100).toFixed(1).padStart(8)}%  ${String(c).padStart(5)}  ${String(a).padStart(5)}  ${(c / Math.max(1, a)).toFixed(2).padStart(5)}`
  );
}

// 法條頁單獨算（比對各自的原文）
let lawChars = 0, lawOv = 0, n = 0, lc = 0, la = 0;
for (const f of await readdir('src/content/law')) {
  const art = f.replace('.md', '');
  const src = lawData.articles.find((x) => x.article === art)?.text;
  if (!src) continue;
  const body = (await readFile(`src/content/law/${f}`, 'utf-8')).replace(/^---[\s\S]*?\n---\n/, '');
  const chars = (body.match(/[一-鿿]/g) ?? []).length;
  if (chars < 100) continue;
  const B = bigrams(body), S = bigrams(src);
  lawOv += B.size ? [...B].filter((g) => S.has(g)).length / B.size : 0;
  lawChars += chars; n++;
  lc += (body.match(CONCRETE) ?? []).length;
  la += (body.match(ABSTRACT) ?? []).length;
}
console.log(`${'法條白話 36 條'.padEnd(20)} ${String(lawChars).padStart(5)}  ${((lawOv / n) * 100).toFixed(1).padStart(8)}%  ${String(lc).padStart(5)}  ${String(la).padStart(5)}  ${(lc / Math.max(1, la)).toFixed(2).padStart(5)}`);
console.log('\n判準：重疊率 < 30%、具體/抽象比 > 0.5');

console.log('\n【定義型欄位】法定定義與法律效果，貼近原文是對的，僅供對照');
console.log('項目                 字數    與法條重疊');
console.log('─'.repeat(42));
for (const [name, path] of FILES) {
  const t = defsOf(await readFile(path, 'utf-8'));
  const chars = (t.match(/[一-鿿]/g) ?? []).length;
  if (!chars) continue;
  const B = bigrams(t);
  const ov = B.size ? [...B].filter((g) => LAW_G.has(g)).length / B.size : 0;
  console.log(`${name.padEnd(20)} ${String(chars).padStart(5)}  ${(ov * 100).toFixed(1).padStart(8)}%`);
}
