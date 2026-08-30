/**
 * 選舉場次 → 11 種職位的對應。
 *
 * 刻意與抓取腳本分離：對應規則改了不必重抓一次監察院的資料（一輪約 6 分鐘）。
 *
 * 大選（選舉編號第 4 碼為 1）可由編號直接對應。補選（第 4 碼為 3）只能靠名稱，
 * 而名稱有三個容易判錯的地方，都必須用行政區層級判斷、不能只看字面：
 *   「第3屆高雄市市長補選」    高雄市是直轄市 → 直轄市長，不是縣（市）長
 *   「第12屆苗栗縣苗栗市市長補選」苗栗市是縣轄市 → 鄉（鎮、市）長
 *   「第4屆臺中市議員補選」     臺中市是直轄市 → 直轄市議員，不是縣（市）議員
 */
import { MUNICIPALITIES } from './geo';
import { PROVINCIAL_CITIES, INDIGENOUS_DISTRICTS } from './elections';

/** 選舉編號第 4–6 碼（大選） */
const CODE_TO_SLUG: Record<string, string> = {
  '101': 'president', '102': 'legislator',
  '103': 'county-mayor', '104': 'municipality-mayor',
  '105': 'municipality-councilor', '106': 'county-councilor',
  '107': 'township-mayor', '108': 'township-rep',
  '109': 'village-chief',
  '115': 'indigenous-district-rep', '116': 'indigenous-district-chief',
};

const hasMunicipality = (s: string) => MUNICIPALITIES.some((m) => s.includes(m));
const hasProvincialCity = (s: string) => (PROVINCIAL_CITIES as readonly string[]).some((c) => s.includes(c));
const hasIndigenousDistrict = (s: string) =>
  INDIGENOUS_DISTRICTS.some((d) => s.includes(d.county) && s.includes(d.district));

export function positionOf(el: { code?: string; name: string }): string | null {
  const code = String(el.code ?? '');
  if (code.length === 6 && code[3] === '1') {
    const s = CODE_TO_SLUG[code.slice(3)];
    if (s) return s;
  }
  const n = el.name;

  if (/總統/.test(n)) return 'president';
  if (/立法委員/.test(n)) return 'legislator';

  // 山地原住民區：先比對權威名單，再退回字面
  if (/區民代表/.test(n)) return 'indigenous-district-rep';
  if (/區長/.test(n)) return hasIndigenousDistrict(n) ? 'indigenous-district-chief' : null;

  if (/[里村]長/.test(n)) return 'village-chief';
  if (/民代表/.test(n)) return 'township-rep';

  // 議員：直轄市議員與縣（市）議員的字面都是「○○市議員」，須看行政區層級
  if (/議員/.test(n)) return hasMunicipality(n) ? 'municipality-councilor' : 'county-councilor';

  if (/[鄉鎮]長/.test(n)) return 'township-mayor';
  if (/市長/.test(n)) {
    if (hasMunicipality(n)) return 'municipality-mayor';
    if (hasProvincialCity(n)) return 'county-mayor';
    // 「○○縣○○市市長」為縣轄市市長，屬第 12 條第 3 款的鄉（鎮、市）長
    if (/縣.*市市長/.test(n)) return 'township-mayor';
    return 'county-mayor';
  }
  if (/縣長/.test(n)) return 'county-mayor';
  return null;
}
