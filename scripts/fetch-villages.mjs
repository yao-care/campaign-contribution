/**
 * 內政部戶政司 ODRP001 → src/data/villages.json
 *
 * 建站規格 §3.2：頁數不要寫死 7,851，以當期資料筆數為準；
 * 新期別可能尚未開放，逐月往前試出最新可用期別。
 * 實測（2026-08-30）：11507 起往前多數期別回「查無資料」，最新可用為 11001。
 * 資料期別必須顯示在頁面上（§3.3）。
 */
import { writeFile, mkdir } from 'node:fs/promises';

const API = (ym, page) =>
  `https://www.ris.gov.tw/rs-opendata/api/v1/datastore/ODRP001/${ym}?page=${page}`;

/** 由今天往前逐月產生候選期別 */
function candidates(months = 130) {
  const out = [];
  const now = new Date();
  let y = now.getFullYear() - 1911;
  let m = now.getMonth() + 1;
  for (let i = 0; i < months; i++) {
    out.push(`${y}${String(m).padStart(2, '0')}`);
    if (--m === 0) { m = 12; y--; }
  }
  return out;
}

async function tryPeriod(ym) {
  const r = await fetch(API(ym, 1));
  if (!r.ok) return null;
  const j = await r.json();
  return j.responseCode === 'OD-0101-S' ? j : null;
}

let period = null, first = null;
for (const ym of candidates()) {
  process.stdout.write(`\r探測 ${ym}…`);
  const j = await tryPeriod(ym);
  if (j) { period = ym; first = j; break; }
}
process.stdout.write('\r');
if (!period) throw new Error('130 個月內找不到可用期別，API 可能已變更');

const totalPage = Number(first.totalPage);
const totalSize = Number(first.totalDataSize);
console.log(`期別 ${period}｜${totalSize} 筆｜${totalPage} 頁`);

const rows = [...first.responseData];
for (let p = 2; p <= totalPage; p++) {
  const r = await fetch(API(period, p));
  const j = await r.json();
  rows.push(...j.responseData);
  process.stdout.write(`\r抓取 ${rows.length}/${totalSize}`);
}
process.stdout.write('\n');

/** site_id 形如「新北市板橋區」，切成縣市與鄉鎮市區 */
const COUNTY_RE = /^(.+?[市縣])(.+)$/;

/**
 * 一律正規化為 NFC。
 *
 * ODRP001 的資料含 CJK 相容表意文字（例如臺中市大安區「龜売里」的第二字為
 * U+2F85A，臺南市西港區「檨林里」的第一字為 U+2F8EB），它們在 NFC 下會
 * 對應到統一表意文字。macOS 的檔案系統會自動正規化，Linux 不會——不做這一步
 * 的話，網址與實際產出的檔案路徑會在 Linux 上對不起來，本機測不出、CI 才爆。
 */
const slug = (s) => s.normalize('NFC').replace(/\s/g, '');

const villages = rows.map((r) => {
  const m = COUNTY_RE.exec(r.site_id) ?? [];
  return {
    period,
    county: slug(m[1] ?? r.site_id),
    district: slug(m[2] ?? ''),
    village: slug(r.village),
    /** ODRP001 提供的是出生死亡結婚離婚數，不是戶籍人口 */
    vitals: {
      birth: Number(r.birth_total ?? 0),
      death: Number(r.death_total ?? 0),
    },
    /**
     * §5.6 四個差異化欄位（人口、應選名額、上屆得票、起算日）必須備齊才可索引。
     * 應選名額與上屆得票須待中選會 115 年選舉公告（§14），故此處一律 false。
     */
    complete: false,
  };
});

const counties = [...new Set(villages.map((v) => v.county))];

/**
 * 私用區（PUA）造字偵測。
 * 臺灣的地名資料常以 PUA 碼位承載 CNS 11643 造字，這些字在多數裝置上顯示為
 * 豆腐字。NFC 不會處理它們，也無法自動推定正字——需要人工對照後才能替換，
 * 因此此處只列出、不猜。
 */
const isPUA = (cp) => (cp >= 0xE000 && cp <= 0xF8FF)
  || (cp >= 0xF0000 && cp <= 0xFFFFD) || (cp >= 0x100000 && cp <= 0x10FFFD);
const puaHits = villages.filter((v) => [...v.village].some((ch) => isPUA(ch.codePointAt(0))));
if (puaHits.length) {
  console.warn(`\n警告：${puaHits.length} 個村里名含私用區造字，在多數裝置上會顯示為豆腐字：`);
  for (const v of puaHits) {
    const cps = [...v.village].map((ch) => `U+${ch.codePointAt(0).toString(16).toUpperCase()}`).join(' ');
    console.warn(`  ${v.county}${v.district}${v.village}  ${cps}`);
  }
  console.warn('正字須人工對照內政部或戶政司的正式公告後替換，本腳本不做推定。\n');
}
await mkdir('src/data', { recursive: true });
await writeFile('src/data/villages.json', JSON.stringify({
  source: 'https://www.ris.gov.tw/rs-opendata/api/v1/datastore/ODRP001',
  dataset: 'ODRP001 鄉鎮市區出生死亡結婚離婚數',
  period,
  fetchedAt: new Date().toISOString(),
  count: villages.length,
  note: '本資料集提供出生死亡結婚離婚數，不含戶籍人口數；村里頁人口欄位另需資料來源。',
  counties,
  villages,
}, null, 2) + '\n');

console.log(`村里 ${villages.length} 筆｜縣市 ${counties.length} 個`);
console.log(counties.join('、'));
