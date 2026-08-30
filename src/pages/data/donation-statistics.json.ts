import type { APIRoute } from 'astro';
import { POSITION_STATS, DONATION_META } from '../../data/donation-stats';
import { rows, HEADER } from './donation-statistics.csv';

export const GET: APIRoute = () => new Response(JSON.stringify({
  title: '各職位政治獻金申報收支統計',
  basis: '政治獻金法第 20 條、第 21 條第 4 項',
  note: '聚合統計，不含逐筆交易與個別捐贈者資料。原始資料由監察院完成個資處理後公開。',
  source: DONATION_META.source,
  sourceName: DONATION_META.sourceName,
  fetchedAt: DONATION_META.fetchedAt,
  fields: HEADER,
  positions: POSITION_STATS,
  records: rows().map((r) => Object.fromEntries(HEADER.map((h, i) => [h, r[i]]))),
}, null, 2) + '\n', { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
