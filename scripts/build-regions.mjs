/**
 * 由 villages.json 推導 regions.json（22 縣市 / 368 鄉鎮市區）。
 * 中選會的應選名額與選舉區劃分須待 115 年選舉公告（建站規格 §14），
 * 此處只建立行政區骨架，名額欄位留空並標記 pending。
 */
import { readFile, writeFile } from 'node:fs/promises';

const v = JSON.parse(await readFile('src/data/villages.json', 'utf-8'));

/** 以羅馬拼音無關的可讀 slug：直接用中文，Astro 會處理 URL 編碼 */
const counties = new Map();
for (const row of v.villages) {
  if (!counties.has(row.county)) counties.set(row.county, new Map());
  const d = counties.get(row.county);
  if (!d.has(row.district)) d.set(row.district, []);
  d.get(row.district).push(row.village);
}

const out = {
  period: v.period,
  source: v.source,
  fetchedAt: new Date().toISOString(),
  note: '應選名額與選舉區劃分待中選會 115 年選舉公告發布，seatsPending 為 true 時頁面不呈現名額。',
  counties: [...counties].map(([name, districts]) => ({
    slug: name,
    name,
    districtCount: districts.size,
    villageCount: [...districts.values()].reduce((a, b) => a + b.length, 0),
    seatsPending: true,
    districts: [...districts].map(([dname, villages]) => ({
      slug: dname,
      name: dname,
      villageCount: villages.length,
      seatsPending: true,
      villages: villages.map((n) => ({ slug: n, name: n })),
    })),
  })),
};

await writeFile('src/data/regions.json', JSON.stringify(out, null, 2) + '\n');
const dc = out.counties.reduce((a, c) => a + c.districtCount, 0);
console.log(`縣市 ${out.counties.length}｜鄉鎮市區 ${dc}｜村里 ${out.counties.reduce((a,c)=>a+c.villageCount,0)}`);
