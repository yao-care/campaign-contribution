/**
 * 由 regions.json 推導的行政區統計。
 * 只推導名稱本身能決定的事實（鄉／鎮／市／區的後綴），
 * 需要中選會公告才知道的（應選名額、山地原住民區清單）一律不猜。
 */
import regions from './regions.json';
import { INDIGENOUS_DISTRICTS, TOWNSHIP_COUNTIES, PROVINCIAL_CITIES } from './elections';

export const MUNICIPALITIES = ['新北市', '臺北市', '桃園市', '臺中市', '臺南市', '高雄市'];

export const counties = regions.counties;
export const countyCount = counties.length;
export const districtCount = counties.reduce((a, c) => a + c.districtCount, 0);
export const villageCount = counties.reduce((a, c) => a + c.villageCount, 0);

export const isMunicipality = (name: string) => MUNICIPALITIES.includes(name);

/**
 * 鄉（鎮、市）＝ 辦理鄉鎮市長選舉的 13 縣轄下、名稱以鄉／鎮／市結尾者。
 * 13 縣的名單取自監察院 115/02/09 公告，不是從縣市名稱猜的。
 */
export const townshipCount = counties
  .filter((c) => (TOWNSHIP_COUNTIES as readonly string[]).includes(c.name))
  .reduce((a, c) => a + c.districts.filter((d) => /[鄉鎮市]$/.test(d.name)).length, 0);

export const isIndigenousDistrict = (county: string, district: string) =>
  INDIGENOUS_DISTRICTS.some((x) => x.county === county && x.district === district);

/** 該縣市本屆改選的職位 slug */
export function positionsFor(county: string): string[] {
  const out: string[] = [];
  if (isMunicipality(county)) {
    out.push('municipality-mayor', 'municipality-councilor');
    if (INDIGENOUS_DISTRICTS.some((x) => x.county === county))
      out.push('indigenous-district-chief', 'indigenous-district-rep');
  } else {
    out.push('county-mayor', 'county-councilor');
    if ((TOWNSHIP_COUNTIES as readonly string[]).includes(county))
      out.push('township-mayor', 'township-rep');
  }
  out.push('village-chief');
  return out;
}

export const isProvincialCity = (name: string) => (PROVINCIAL_CITIES as readonly string[]).includes(name);

export const municipalityCount = MUNICIPALITIES.length;
export const countyOnlyCount = countyCount - municipalityCount;

/** 各職位的全國職位數；null 表示須待中選會選舉公告（建站規格 §14） */
export const POSITION_COUNTS: Record<string, number | null> = {
  'president': 1,
  'legislator': null,
  'municipality-mayor': municipalityCount,
  'county-mayor': countyOnlyCount,
  'municipality-councilor': null,
  'county-councilor': null,
  'township-mayor': townshipCount,
  'indigenous-district-chief': INDIGENOUS_DISTRICTS.length,
  'township-rep': null,
  'indigenous-district-rep': INDIGENOUS_DISTRICTS.length,
  'village-chief': villageCount,
};

export const dataPeriod = regions.period;
