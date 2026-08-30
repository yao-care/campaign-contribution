/**
 * 12 個上限試算組合（建站規格 §5.4）。
 * 個人／營利事業／人民團體 × 政黨、政治團體／擬參選人 = 6
 * 政黨對其所推薦候選人 6 級（第 18 條第 2 項）= 6
 * 全部數字對照 law.json 第 17、18 條原文，已於 2026-08-30 核對。
 */
import { PARTY_CAPS, PARTY_CAPS_AGGREGATE, CANDIDATE_CAPS, CANDIDATE_CAPS_AGGREGATE } from './elections';

export interface Limit {
  slug: string;
  donor: string;
  recipient: string;
  /** 對同一對象每年上限（元） */
  same: number;
  /** 對不同對象每年合計上限（元）；null 表示法無合計規定 */
  aggregate: number | null;
  basis: string;
  /** 額外規則 */
  notes: string[];
}

const willNote = '以遺囑為政治獻金之捐贈者，捐贈總額依個人的規定辦理，並以一次為限，超過部分無效。';
const cashNote = '同一人以現金捐贈超過新臺幣 10 萬元者，應以支票或匯款方式為之（第 14 條第 3 項）。';
const anonNote = '匿名捐贈超過新臺幣 1 萬元者，不得收受（第 14 條第 2 項）。';
const nameNote = '不得以本人以外的名義捐贈（第 14 條第 1 項）。';

export const LIMITS: Limit[] = [
  {
    slug: 'individual-to-party', donor: '個人', recipient: '政黨、政治團體',
    same: PARTY_CAPS.individual, aggregate: PARTY_CAPS_AGGREGATE.individual,
    basis: '第 17 條第 1 項第 1 款、第 3 項第 1 款',
    notes: [willNote, cashNote, anonNote, nameNote],
  },
  {
    slug: 'business-to-party', donor: '營利事業', recipient: '政黨、政治團體',
    same: PARTY_CAPS.business, aggregate: PARTY_CAPS_AGGREGATE.business,
    basis: '第 17 條第 1 項第 2 款、第 3 項第 2 款',
    notes: ['有累積虧損尚未依規定彌補的營利事業不得捐贈（第 7 條第 1 項第 3 款）。', cashNote, anonNote, nameNote],
  },
  {
    slug: 'civicgroup-to-party', donor: '人民團體', recipient: '政黨、政治團體',
    same: PARTY_CAPS.civicGroup, aggregate: PARTY_CAPS_AGGREGATE.civicGroup,
    basis: '第 17 條第 1 項第 3 款、第 3 項第 3 款',
    notes: ['政黨對同一政治團體、對不同政治團體的每年捐贈總額，也適用人民團體的額度（第 17 條第 2 項、第 4 項）。', cashNote, anonNote, nameNote],
  },
  {
    slug: 'individual-to-candidate', donor: '個人', recipient: '擬參選人',
    same: CANDIDATE_CAPS.individual, aggregate: CANDIDATE_CAPS_AGGREGATE.individual,
    basis: '第 18 條第 1 項第 1 款、第 3 項第 1 款',
    notes: [
      '「對同一（組）擬參選人每年捐贈總額」指同一年度內對參與該次選舉的個別擬參選人捐贈合計；「對不同擬參選人每年捐贈總額」指同一年度內對各種選舉擬參選人捐贈合計。',
      willNote, cashNote, anonNote, nameNote,
    ],
  },
  {
    slug: 'business-to-candidate', donor: '營利事業', recipient: '擬參選人',
    same: CANDIDATE_CAPS.business, aggregate: CANDIDATE_CAPS_AGGREGATE.business,
    basis: '第 18 條第 1 項第 2 款、第 3 項第 2 款',
    notes: ['有累積虧損尚未依規定彌補的營利事業不得捐贈（第 7 條第 1 項第 3 款）。', cashNote, anonNote, nameNote],
  },
  {
    slug: 'civicgroup-to-candidate', donor: '人民團體', recipient: '擬參選人',
    same: CANDIDATE_CAPS.civicGroup, aggregate: CANDIDATE_CAPS_AGGREGATE.civicGroup,
    basis: '第 18 條第 1 項第 3 款、第 3 項第 3 款',
    notes: [cashNote, anonNote, nameNote],
  },
];

/** 第 18 條第 2 項：政黨對其所推薦同一（組）候選人的金錢捐贈上限 */
const PARTY_TO: { slug: string; positions: string; cap: number; clause: number }[] = [
  { slug: 'party-to-president',      positions: '總統、副總統',                                       cap: 25_000_000, clause: 1 },
  { slug: 'party-to-legislator',     positions: '立法委員',                                           cap:  2_000_000, clause: 2 },
  { slug: 'party-to-mayor',          positions: '直轄市長、縣（市）長',                                cap:  3_000_000, clause: 3 },
  { slug: 'party-to-councilor',      positions: '直轄市議員、縣（市）議員',                            cap:    500_000, clause: 4 },
  { slug: 'party-to-township-mayor', positions: '鄉（鎮、市）長、直轄市山地原住民區長',                  cap:    300_000, clause: 5 },
  { slug: 'party-to-local-rep',      positions: '鄉（鎮、市）民代表、直轄市山地原住民區民代表、村（里）長', cap:    100_000, clause: 6 },
];

for (const p of PARTY_TO) {
  LIMITS.push({
    slug: p.slug,
    donor: '政黨',
    recipient: `其所推薦的${p.positions}候選人`,
    same: p.cap,
    aggregate: null,
    basis: `第 18 條第 2 項第 ${p.clause} 款`,
    notes: [
      '本項限於金錢捐贈，且限於政黨對「其所推薦」的候選人。',
      '違反本項捐贈者，依第 29 條第 1 項按捐贈金額處 2 倍以下罰鍰。',
      '政黨對其推薦候選人的競選費用捐贈，應列入政黨會計報告書的「捐贈其推薦之公職候選人競選費用支出」項下（第 20 條第 2 項）。',
    ],
  });
}
