/**
 * 申報期限（第 21 條、第 23 條）。日期由本屆投票日推算，推算規則寫在頁面上。
 */
import { LOCAL_CYCLE } from './elections';

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00+08:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const addMonths = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00+08:00');
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
};

export interface Deadline {
  slug: string;
  entity: string;
  /** 申報期限的文字規則 */
  rule: string;
  /** 本屆的具體日期；null 表示以年度為準、非選舉綁定 */
  thisCycle: string | null;
  auditRule: string;
  auditDate: string | null;
  basis: string;
  extras: { q: string; a: string }[];
}

export const DEADLINES: Deadline[] = [
  {
    slug: 'party',
    entity: '政黨',
    rule: '每年度結束後 5 個月內，向受理申報機關申報會計報告書。',
    thisCycle: null,
    auditRule: '應委託會計師查核簽證，無金額門檻。',
    auditDate: null,
    basis: '第 21 條第 1 項第 1 款',
    extras: [
      { q: '會計報告書要誰簽名？', a: '由政黨的負責人或代表人簽名或蓋章。' },
      { q: '不申報會怎樣？', a: '依第 30 條第 1 項第 3 款處新臺幣 6 萬元以上 120 萬元以下罰鍰，並得限期命其申報，屆期不申報得按次處罰。經依此處罰三次者，受理申報機關應廢止其專戶許可並公告。' },
    ],
  },
  {
    slug: 'civic-group',
    entity: '政治團體',
    rule: '每年度結束後 5 個月內，向受理申報機關申報會計報告書。',
    thisCycle: null,
    auditRule: '應委託會計師查核簽證，無金額門檻。',
    auditDate: null,
    basis: '第 21 條第 1 項第 1 款',
    extras: [
      { q: '政治團體與政黨的申報期限一樣嗎？', a: '一樣，都是每年度結束後 5 個月內。第 21 條第 1 項第 1 款將政黨與政治團體並列規定。' },
      { q: '專戶被廢止後還要申報嗎？', a: '要。專戶經受理申報機關廢止者，應即停止收受政治獻金，並於事實發生後一個月內申報會計報告書、繳交罰鍰，並將賸餘政治獻金繳庫。' },
    ],
  },
  {
    slug: 'candidate',
    entity: '擬參選人',
    rule: '選舉投票日後 3 個月內，向受理申報機關申報會計報告書。',
    thisCycle: addMonths(LOCAL_CYCLE.voteDay, 3),
    auditRule: '收受金額達新臺幣 1,000 萬元者，應於投票日後 70 日內委託會計師查核簽證。未達此金額者無此義務。',
    auditDate: addDays(LOCAL_CYCLE.voteDay, 70),
    basis: '第 21 條第 1 項第 2 款',
    extras: [
      { q: '賸餘的政治獻金要申報嗎？', a: '要。擬參選人收受的政治獻金如有賸餘，得留供第 23 條第 1 項四款用途使用，並應於每年度結束後 3 個月內向受理申報機關申報。自申報之日起 4 年內仍未支用完畢者，應繳交受理申報機關辦理繳庫。' },
      { q: '擬參選人死亡怎麼辦？', a: '其法定繼承人應自確定繼承人之日起 3 個月內申報會計報告書，賸餘的政治獻金應於申報時繳交受理申報機關辦理繳庫。' },
      { q: '沒有登記為候選人怎麼辦？', a: '未依法登記為候選人，或登記後候選人資格經撤銷者，應即停止收受政治獻金，並自事實發生之日起 3 個月內申報會計報告書，賸餘政治獻金於申報時繳庫。' },
    ],
  },
];
