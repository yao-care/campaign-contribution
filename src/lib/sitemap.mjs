/**
 * sitemap 分片（建站規格 §8.3）。
 * 按目錄切，再由 sitemap-index.xml 收攏，Search Console 才能分別看各區索引率。
 * 參照站 folk.tw 的單檔 sitemap-0.xml 裝 14,056 筆，未超協定上限但無法診斷。
 */
import { SITE } from '../site.mjs';
import lawData from '../data/law.json';
import { FAQS } from '../data/faq';
import { GLOSSARY } from '../data/glossary';
import { DONORS } from '../data/donors';
import { FORMS } from '../data/forms';
import { GUIDES } from '../data/guides';
import { ELECTIONS } from '../data/elections';
import { PENALTIES } from '../data/penalties';
import { LIMITS } from '../data/limits';
import { DEADLINES } from '../data/deadlines';
import { DEDUCTION_ENTITIES } from '../data/deductions';
import partyData from '../data/parties.json';
import { MEDIA } from '../data/media';

export const SHARD_SIZE = 1000;   // 遠低於協定的 50,000，換取可診斷性

const optional = import.meta.glob('../data/*.json', { eager: true, import: 'default' });
const pick = (name) => optional[`../data/${name}.json`] ?? null;

/** 法條頁：目前尚無人工白話說明者為 noindex，但條號齊全，仍全數列出供發現 */
export function lawUrls() {
  return lawData.articles.map((a) => ({ loc: `/law/${a.article}/` }));
}

/** 工具頁與 36 個預渲染結果頁 */
export function toolUrls() {
  return [
    { loc: '/tools/' },
    { loc: '/tools/can-i-donate/' },
    { loc: '/tools/timeline/' },
    ...ELECTIONS.map((e) => ({ loc: `/tools/timeline/${e.slug}/` })),
    { loc: '/tools/limit/' },
    ...LIMITS.map((l) => ({ loc: `/tools/limit/${l.slug}/` })),
    { loc: '/tools/penalty/' },
    ...PENALTIES.map((p) => ({ loc: `/tools/penalty/${p.article}/` })),
    { loc: '/tools/deadline/' },
    ...DEADLINES.map((d) => ({ loc: `/tools/deadline/${d.slug}/` })),
    { loc: '/tools/deduction/' },
    ...DEDUCTION_ENTITIES.map((d) => ({ loc: `/tools/deduction/${d.slug}/` })),
  ];
}

/** 內容頁：問答、名詞、不得捐贈者、書表、情境、選舉類別、政黨 */
export function contentUrls() {
  return [
    { loc: '/law/' },
    { loc: '/faq/' }, ...FAQS.map((f) => ({ loc: `/faq/${f.slug}/` })),
    { loc: '/glossary/' }, ...GLOSSARY.map((g) => ({ loc: `/glossary/${g.slug}/` })),
    { loc: '/donors/' }, { loc: '/donors/verify/' },
    ...DONORS.map((d) => ({ loc: `/donors/${d.slug}/` })),
    { loc: '/forms/' }, ...FORMS.map((f) => ({ loc: `/forms/${f.slug}/` })),
    { loc: '/guides/' }, ...GUIDES.map((g) => ({ loc: `/guides/${g.slug}/` })),
    { loc: '/elections/' }, ...ELECTIONS.map((e) => ({ loc: `/elections/${e.slug}/` })),
    { loc: '/media/' }, ...MEDIA.map((m) => ({ loc: `/media/${m.slug}/` })),
    { loc: '/parties/' },
    ...partyData.parties.map((p) => ({ loc: `/parties/${encodeURIComponent(p.slug)}/` })),
  ];
}

export function regionUrls() {
  const d = pick('regions');
  const out = [{ loc: '/regions/' }];
  for (const c of d?.counties ?? []) {
    out.push({ loc: `/regions/${encodeURIComponent(c.slug)}/` });
    for (const dist of c.districts ?? [])
      out.push({ loc: `/regions/${encodeURIComponent(c.slug)}/${encodeURIComponent(dist.slug)}/` });
  }
  return out;
}

/**
 * 村里頁：§5.6 規定四個差異化欄位缺任一就不進索引。
 * 目前應選名額、上屆得票與戶籍人口三欄未備齊，故 complete 全為 false，
 * 這個函式回傳空陣列——這是預期行為，不是抓取失敗。
 */
export function villageUrls() {
  const d = pick('villages');
  return (d?.villages ?? [])
    .filter((v) => v.complete)
    .map((v) => ({
      loc: `/villages/${encodeURIComponent(v.county)}/${encodeURIComponent(v.district)}/${encodeURIComponent(v.village)}/`,
    }));
}

/** 靜態頁。刻意手動維護，避免薄頁自動外洩。/search/ 一律 noindex，不列（§8.2）。 */
export function miscUrls() {
  return [
    { loc: '/' },
    { loc: '/about/' },
    { loc: '/villages/' },
    { loc: '/about/editorial/' },
    { loc: '/about/statement/' },
    { loc: '/countdown/' },
    { loc: '/downloads/' },
    { loc: '/reports/' },
    { loc: '/updates/' },
  ];
}

export function abs(loc) { return new URL(loc, SITE.origin).href; }

export function renderUrlset(urls, lastmod) {
  const body = urls.map((u) =>
    `  <url><loc>${abs(u.loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function renderIndex(files, lastmod) {
  const body = files.map((f) =>
    `  <sitemap><loc>${abs(f)}</loc><lastmod>${lastmod}</lastmod></sitemap>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

export function shard(urls, size = SHARD_SIZE) {
  const out = [];
  for (let i = 0; i < urls.length; i += size) out.push(urls.slice(i, i + size));
  return out;
}
