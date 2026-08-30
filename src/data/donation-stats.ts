/**
 * 把 donations.json 的「逐場選舉」統計，依職位合併成頁面要用的數字。
 *
 * 合併在建置期做，不在抓取期做——這樣調整職位對應規則不必重抓監察院的資料。
 */
import donations from './donations.json';
import { positionOf } from './election-positions';

export interface PositionStats {
  reportCount: number;
  incomeTotal: number;
  expenseTotal: number;
  incomeMedian: number;
  expenseMedian: number;
  incomeMax: number;
  overAuditThreshold: number;
  income: Record<string, number>;
  expense: Record<string, number>;
  elections: { name: string; year: number }[];
  years: number[];
  /** 逐份報告書的收入（已排序、無姓名），供直方圖用 */
  reportIncomes: number[];
}

type Raw = {
  reportCount: number; incomeTotal: number; expenseTotal: number;
  incomeMedian: number; expenseMedian: number; incomeMax: number; overAuditThreshold: number;
  reportIncomes: number[]; reportExpenses?: number[];
  income: Record<string, number>; expense: Record<string, number>;
};

const byElection = (donations as any).byElection as Record<string, Raw> | undefined;
const elections = (donations as any).elections as { code: string; name: string; year: number }[];

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

function build(): Record<string, PositionStats> {
  const out: Record<string, PositionStats> = {};
  if (!byElection) return out;
  for (const el of elections ?? []) {
    const raw = byElection[el.name];
    if (!raw) continue;
    const slug = positionOf(el);
    if (!slug) continue;
    const p = (out[slug] ??= {
      reportCount: 0, incomeTotal: 0, expenseTotal: 0,
      incomeMedian: 0, expenseMedian: 0, incomeMax: 0, overAuditThreshold: 0,
      income: {}, expense: {}, elections: [], years: [], reportIncomes: [],
    });
    p.reportCount += raw.reportCount;
    p.incomeTotal += raw.incomeTotal;
    p.expenseTotal += raw.expenseTotal;
    p.incomeMax = Math.max(p.incomeMax, raw.incomeMax);
    p.overAuditThreshold += raw.overAuditThreshold;
    for (const [k, v] of Object.entries(raw.income)) p.income[k] = (p.income[k] ?? 0) + v;
    for (const [k, v] of Object.entries(raw.expense)) p.expense[k] = (p.expense[k] ?? 0) + v;
    p.elections.push({ name: el.name, year: el.year });
    if (!p.years.includes(el.year)) p.years.push(el.year);
  }
  // 中位數必須用合併後的完整分布重算，不能拿各場中位數再平均
  for (const [slug, p] of Object.entries(out)) {
    const inc: number[] = [], exp: number[] = [];
    for (const el of p.elections) {
      inc.push(...(byElection[el.name]?.reportIncomes ?? []));
      exp.push(...(byElection[el.name]?.reportExpenses ?? []));
    }
    p.incomeMedian = median(inc);
    p.expenseMedian = median(exp);
    p.reportIncomes = inc.sort((a, b) => a - b);
    p.years.sort((a, b) => b - a);
    const sortDesc = (o: Record<string, number>) =>
      Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]));
    p.income = sortDesc(p.income);
    p.expense = sortDesc(p.expense);
    out[slug] = p;
  }
  return out;
}

export const POSITION_STATS = build();
export const DONATION_META = {
  source: (donations as any).source as string,
  sourceName: (donations as any).sourceName as string,
  fetchedAt: (donations as any).fetchedAt as string,
  reportCount: (donations as any).reportCount as number,
};
export const PARTY_STATS = (donations as any).parties as Record<string, Record<string, any>>;
