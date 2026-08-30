import type { APIRoute } from 'astro';
import { POSITION_STATS } from '../../data/donation-stats';
import { ELECTIONS } from '../../data/elections';

/** 各職位申報收支統計。聚合資料，不含逐筆交易與個別對象。 */
export const rows = () => {
  const name = new Map(ELECTIONS.map((e) => [e.slug, e.position]));
  const out: (string | number)[][] = [];
  for (const [slug, p] of Object.entries(POSITION_STATS)) {
    for (const [acct, amt] of Object.entries(p.income))
      out.push([slug, name.get(slug) ?? slug, '收入', acct, amt, p.reportCount]);
    for (const [acct, amt] of Object.entries(p.expense))
      out.push([slug, name.get(slug) ?? slug, '支出', acct, amt, p.reportCount]);
  }
  return out;
};

export const HEADER = ['職位代碼', '職位', '收支別', '會計科目', '金額_元', '該職位申報份數'];

const csv = (rs: (string | number)[][]) => rs.map((r) =>
  r.map((c) => { const s = String(c ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')
).join('\n') + '\n';

export const GET: APIRoute = () => new Response('﻿' + csv([HEADER, ...rows()]), {
  headers: { 'Content-Type': 'text/csv; charset=utf-8' },
});
