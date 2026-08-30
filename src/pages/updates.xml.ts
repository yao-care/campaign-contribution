/**
 * 制度與資料異動的 Atom feed。
 *
 * 用 Atom 而不是 RSS：RSS 2.0 沒有規定日期格式與唯一 id，閱讀器各自解讀。
 * 每則 entry 有穩定的 tag: URI，內容修訂時 id 不變、updated 才變。
 */
import type { APIRoute } from 'astro';
import { SITE } from '../site.mjs';
import { UPDATES_SORTED, KIND_LABEL } from '../data/updates';

const esc = (s: string) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const abs = (p: string) => new URL(p, SITE.origin).href;
/** tag: URI 用日期＋序號組成，內容改寫也不會換 id */
const tagId = (d: string, i: number) =>
  `tag:${SITE.origin.replace('https://', '')},${d}:update-${i}`;

export const GET: APIRoute = () => {
  const latest = UPDATES_SORTED[0].d;
  const entries = UPDATES_SORTED.map((e, i) => `  <entry>
    <title>${esc(`［${KIND_LABEL[e.kind]}］${e.t}`)}</title>
    <id>${tagId(e.d, i)}</id>
    <updated>${e.d}T00:00:00+08:00</updated>
    <link rel="alternate" href="${abs('/updates/')}"/>
    <category term="${e.kind}" label="${esc(KIND_LABEL[e.kind])}"/>
    <summary type="text">${esc(e.b)}</summary>
  </entry>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="zh-Hant-TW">
  <title>政治獻金指南：制度與資料異動</title>
  <subtitle>政治獻金法的規則變動、主管機關公告，以及本站資料的更新紀錄。</subtitle>
  <id>${abs('/updates/')}</id>
  <link rel="alternate" href="${abs('/updates/')}"/>
  <link rel="self" href="${abs('/updates.xml')}"/>
  <updated>${latest}T00:00:00+08:00</updated>
  <rights>CC BY 4.0</rights>
  <author><name>政治獻金指南</name><uri>${SITE.origin}</uri></author>
${entries}
</feed>
`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
  });
};
