/**
 * 監察院政治獻金公開查閱平臺 → src/data/donations.json
 *
 * 資料為政治獻金法第 21 條第 4 項的法定公開資訊，平臺選單將其歸類為「政府開放資料」。
 * 監察院已於釋出前完成個資處理：個人捐贈者的身分證欄位為空、地址遮蔽至鄉鎮市區
 * 層級、聯絡電話為空；有值的統一編號為營利事業公開資訊。
 *
 * 本腳本只保留聚合統計，不落地任何逐筆交易或個別捐贈者、申報人姓名。
 *
 * 取用的是「選舉層級」與「政黨層級」的收支結算表：每列即一份報告書、科目已加總。
 * 不用逐筆交易匯出端點（/search/export/）——那個端點每頁要 14–23 秒且頁碼越大越慢，
 * 跑完一輪約 70 分鐘；改用結算表後全部約 2 分鐘。
 *
 * 職位對應刻意不在此處做，見 src/data/election-positions.ts，於建置期套用。
 */
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { inflateRawSync } from 'node:zlib';

const B = 'https://ardata.cy.gov.tw';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0 Safari/537.36';
const get = (u) => fetch(u, { headers: { 'User-Agent': UA, Referer: B + '/' } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 平臺回傳的下載連結未編碼中文，需重新組裝 */
const encUrl = (u) => {
  const [path, qs] = u.split('?');
  const sp = new URLSearchParams();
  for (const kv of qs.split('&')) { const i = kv.indexOf('='); sp.set(kv.slice(0, i), kv.slice(i + 1)); }
  return `${B}${path}?${sp.toString()}`;
};

/**
 * 極簡 ZIP 讀取。政黨的下載是 ZIP（內含 balance 與 incomes and expenditures 兩個 CSV），
 * 選舉的下載則是純 CSV。用 node:zlib 自行解，避免依賴系統的 unzip 指令。
 */
function unzip(buf) {
  const out = {};
  // 由中央目錄尾端往前找 EOCD 簽章
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return out;
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const cmtLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    // 由本地檔頭取得實際資料位置
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const dataOff = localOff + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(dataOff, dataOff + compSize);
    out[name] = method === 0 ? raw : inflateRawSync(raw);
    p += 46 + nameLen + extraLen + cmtLen;
  }
  return out;
}

function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const num = (s) => { const n = Number(String(s ?? '').replace(/[,\s]/g, '')); return Number.isFinite(n) ? n : 0; };
const median = (xs) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
const sortDesc = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]));

/** 結算表中屬於收入、支出的欄位；其餘為小計或結存，不計入科目 */
const INCOME_COLS = ['個人捐贈收入', '營利事業捐贈收入', '政黨捐贈收入', '人民團體捐贈收入', '匿名捐贈收入', '其他收入'];
const EXPENSE_COLS = ['人事費用支出', '宣傳支出', '租用宣傳車輛支出', '租用競選辦事處支出', '集會支出',
  '交通旅運支出', '雜支支出', '返還捐贈支出', '繳庫支出', '公共關係費用支出',
  '業務費用支出', '選務費用支出',
  // 監察院原始資料此欄為「侯選人」，非錯字修正對象——照抓，顯示時再正名
  '捐贈其推薦之公職侯選人競選費用支出', '捐贈其推薦之公職候選人競選費用支出'];

/** 選舉版用「小計」，政黨版用「合計」 */
const totalOf = (r, idx, ...names) => {
  for (const n of names) if (idx[n] !== undefined) return num(r[idx[n]]);
  return 0;
};

async function fetchAll(endpoint) {
  const out = [];
  for (let page = 1; page <= 60; page++) {
    const j = await (await get(`${B}/api/v1/search/${endpoint}?page=${page}&pageSize=200`)).json();
    out.push(...j.data);
    if (out.length >= j.paging.recordCount) break;
  }
  return out;
}

// ── 1. 查詢維度 ────────────────────────────────────────────
const meta = await (await get(`${B}/api/v1/search/data`)).json();
const elections = meta.elections;
console.log(`選舉場次 ${elections.length}`);

/** --parties-only：沿用既有的選舉統計，只重抓政黨，避免重複打對方伺服器 */
const partiesOnly = process.argv.includes('--parties-only');
let byElection = {};
if (partiesOnly) {
  const prev = JSON.parse(await readFile('src/data/donations.json', 'utf-8'));
  byElection = prev.byElection ?? {};
  console.log(`沿用既有選舉統計 ${Object.keys(byElection).length} 場`);
}

// ── 2. 選舉層級結算表 ──────────────────────────────────────
const elRecords = partiesOnly ? [] : await fetchAll('elections');
if (!partiesOnly) console.log(`選舉層級報告書 ${elRecords.length} 份`);

let done = 0;
for (const rec of elRecords) {
  const txt = await (await get(encUrl(rec.downloadCsv))).text();
  const rows = parseCsv(txt.replace(/^﻿/, ''));
  const H = rows[0] ?? [];
  const idx = Object.fromEntries(H.map((h, i) => [h.trim(), i]));
  const body = rows.slice(1).filter((r) => r.length > 5 && r[0]);

  const e = (byElection[rec.electionName] ??= {
    reportCount: 0, incomeTotal: 0, expenseTotal: 0,
    reportIncomes: [], reportExpenses: [],
    overAuditThreshold: 0, income: {}, expense: {}, areas: [],
  });
  if (rec.electionArea && !e.areas.includes(rec.electionArea)) e.areas.push(rec.electionArea);

  for (const r of body) {
    e.reportCount++;
    const inc = totalOf(r, idx, '收入小計', '收入合計'), exp = totalOf(r, idx, '支出小計', '支出合計');
    e.incomeTotal += inc; e.expenseTotal += exp;
    if (inc > 0) e.reportIncomes.push(inc);
    if (exp > 0) e.reportExpenses.push(exp);
    if (inc >= 10_000_000) e.overAuditThreshold++;
    for (const c of INCOME_COLS) if (idx[c] !== undefined) e.income[c] = (e.income[c] ?? 0) + num(r[idx[c]]);
    for (const c of EXPENSE_COLS) if (idx[c] !== undefined) e.expense[c] = (e.expense[c] ?? 0) + num(r[idx[c]]);
  }
  if (++done % 25 === 0) process.stdout.write(`\r選舉 ${done}/${elRecords.length}`);
  await sleep(60);
}
process.stdout.write('\n');

if (!partiesOnly) for (const e of Object.values(byElection)) {
  e.incomeMedian = median(e.reportIncomes);
  e.expenseMedian = median(e.reportExpenses);
  e.incomeMax = e.reportIncomes.length ? Math.max(...e.reportIncomes) : 0;
  e.reportIncomes.sort((a, b) => a - b);
  e.reportExpenses.sort((a, b) => a - b);
  e.income = sortDesc(e.income); e.expense = sortDesc(e.expense);
}

// ── 3. 政黨層級結算表 ──────────────────────────────────────
const partyRecords = await fetchAll('parties');
console.log(`政黨層級報告書 ${partyRecords.length} 份`);

const parties = {};
done = 0;
for (const rec of partyRecords) {
  const res = await get(encUrl(rec.downloadCsv));
  const buf = Buffer.from(await res.arrayBuffer());
  let txt;
  if (buf.length > 4 && buf.readUInt32LE(0) === 0x04034b50) {
    const files = unzip(buf);
    const key = Object.keys(files).find((k) => /incomes and expenditures\.csv$/i.test(k));
    if (!key) { console.warn(`\n略過 ${rec.name} ${rec.yearOrSerial}：ZIP 內找不到收支表`); continue; }
    txt = files[key].toString('utf8');
  } else {
    txt = buf.toString('utf8');
  }
  const rows = parseCsv(txt.replace(/^﻿/, ''));
  const H = rows[0] ?? [];
  const idx = Object.fromEntries(H.map((h, i) => [h.trim(), i]));
  const body = rows.slice(1).filter((r) => r.length > 5 && r[0]);
  const year = String(rec.yearOrSerial ?? '').replace(/\.0$/, '');
  for (const r of body) {
    const p = ((parties[rec.name] ??= {})[year] ??= { incomeTotal: 0, expenseTotal: 0, income: {}, expense: {} });
    p.incomeTotal += totalOf(r, idx, '收入合計', '收入小計');
    p.expenseTotal += totalOf(r, idx, '支出合計', '支出小計');
    for (const c of INCOME_COLS) if (idx[c] !== undefined) p.income[c] = (p.income[c] ?? 0) + num(r[idx[c]]);
    for (const c of EXPENSE_COLS) if (idx[c] !== undefined) p.expense[c] = (p.expense[c] ?? 0) + num(r[idx[c]]);
  }
  if (++done % 25 === 0) process.stdout.write(`\r政黨 ${done}/${partyRecords.length}`);
  await sleep(60);
}
process.stdout.write('\n');
for (const y of Object.values(parties)) for (const v of Object.values(y)) { v.income = sortDesc(v.income); v.expense = sortDesc(v.expense); }

// ── 4. 輸出 ────────────────────────────────────────────────
const reportCount = Object.values(byElection).reduce((a, e) => a + e.reportCount, 0);
await mkdir('src/data', { recursive: true });
await writeFile('src/data/donations.json', JSON.stringify({
  source: B,
  sourceName: '監察院政治獻金公開查閱平臺',
  legalBasis: '政治獻金法第 21 條第 4 項',
  note: '本檔只保留聚合統計，不含逐筆交易、捐贈者或申報人姓名。金額單位為新臺幣元。',
  fetchedAt: new Date().toISOString(),
  reportCount,
  elections: elections.map(({ code, name, year }) => ({ code, name, year })),
  byElection, parties,
}, null, 2) + '\n');

console.log(`擬參選人報告書 ${reportCount} 份、選舉 ${Object.keys(byElection).length} 場、政黨 ${Object.keys(parties).length} 個`);
