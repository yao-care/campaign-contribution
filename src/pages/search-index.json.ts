import type { APIRoute } from 'astro';
import lawData from '../data/law.json';
import { LAW_TOPICS } from '../data/law-topics';
import { FAQS } from '../data/faq';
import { GLOSSARY } from '../data/glossary';
import { DONORS } from '../data/donors';
import { FORMS } from '../data/forms';
import { GUIDES } from '../data/guides';
import { ELECTIONS } from '../data/elections';
import { PENALTIES } from '../data/penalties';
import { LIMITS } from '../data/limits';

/**
 * 站內搜尋索引。刻意不含 7,734 個村里頁——那些頁面靠行政區索引進入，
 * 全部塞進來只會把索引檔撐到數 MB 而幫助有限。
 */
export const GET: APIRoute = () => {
  const rows: { t: string; u: string; k: string; c: string }[] = [];
  const add = (t: string, u: string, k: string, c: string) => rows.push({ t, u, k, c });

  for (const a of lawData.articles)
    add(`政治獻金法第 ${a.article} 條`, `/law/${a.article}/`, '法條',
        (LAW_TOPICS[a.article]?.title ?? '') + ' ' + a.text.slice(0, 120));
  for (const f of FAQS) add(f.q, `/faq/${f.slug}/`, '問答', f.a + ' ' + f.variants.join(' '));
  for (const g of GLOSSARY) add(g.term, `/glossary/${g.slug}/`, '名詞', g.definition + ' ' + g.aliases.join(' '));
  for (const d of DONORS) add(d.target, `/donors/${d.slug}/`, '不得捐贈', d.scope);
  for (const f of FORMS) add(f.title, `/forms/${f.slug}/`, '書表', f.conclusion);
  for (const g of GUIDES) add(g.scenario, `/guides/${g.slug}/`, '情境', g.conclusion);
  for (const e of ELECTIONS) add(`${e.position}的政治獻金規則`, `/elections/${e.slug}/`, '選舉類別', `第 12 條第 ${e.clause12} 款`);
  for (const p of PENALTIES) add(`違反第 ${p.article} 條會怎樣`, `/tools/penalty/${p.article}/`, '罰則', p.trigger + ' ' + p.sanction);
  for (const l of LIMITS) add(`${l.donor}捐給${l.recipient}的上限`, `/tools/limit/${l.slug}/`, '上限', l.basis);

  return new Response(JSON.stringify(rows), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
