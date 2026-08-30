/**
 * 11 種選舉類別的制度事實。
 *
 * 全部欄位可對照 src/data/law.json 的第 12、17、18 條原文複核，
 * 已於 2026-08-30 逐條核對無誤。第 12 條**只有四款**，11 個頁面是為了
 * 接住職位名稱的搜尋，內容依四款歸類，不是十一套規則（建站規格 §5.3）。
 */

/**
 * 選舉屆別（cycle）。
 *
 * 站上所有日期都由這裡推算。刻意做成陣列而不是單一物件：下屆選舉來時
 * 只需要新增一筆並改 CURRENT_CYCLE_ID，2026 屆的頁面與網址原封不動保留。
 * 舊屆頁面是四年累積的外連與搜尋排名所在，改網址等於把它們洗掉一次。
 *
 * 起算日一律以監察院公告為準，不由任期屆滿日自行推算——建站規格 §5.3
 * 推算出的第 4 款組 8/25 與公告不符，公告載明為 8/20（依第 12 條第 1 項
 * 第 4 款「及第 3 項」，第 3 項會把起始日提前到選舉公告發布之日）。
 */
export interface Cycle {
  /** 路由片段，用西元投票年 */
  id: string;
  /** 民國年 */
  roc: number;
  name: string;
  voteDay: string;
  /** 第 12 條第 1 項第 3 款組起算日 */
  startClause3: string;
  /** 第 12 條第 1 項第 4 款組起算日 */
  startClause4: string;
  /** 專戶設立申請受理起日（第 4 款組） */
  accountOpenClause4: string;
  /** 收受期間截止日，投票日前一日 */
  endDate: string;
  source: string;
  sourceNote: string;
}

export const CYCLES: Cycle[] = [
  {
    id: '2026',
    roc: 115,
    name: '115 年地方公職人員選舉',
    voteDay: '2026-11-28',            // 115 年 11 月 28 日
    startClause3: '2026-04-25',       // 監察院公告：115 年 4 月 25 日
    startClause4: '2026-08-20',       // 監察院公告：115 年 8 月 20 日
    accountOpenClause4: '2026-08-17', // 公告載明自 115 年 8 月 17 日起受理
    endDate: '2026-11-27',            // 投票日前一日，兩份公告均載明
    source: 'https://sunshine.cy.gov.tw/News.aspx?n=8&sms=8855',
    sourceNote: '監察院 115/02/09「申請開立政治獻金專戶許可注意事項」',
  },
];

export const CURRENT_CYCLE_ID = '2026';
export const CURRENT_CYCLE = CYCLES.find((c) => c.id === CURRENT_CYCLE_ID)!;
if (!CURRENT_CYCLE) throw new Error(`CURRENT_CYCLE_ID ${CURRENT_CYCLE_ID} 不在 CYCLES 中`);

/** 本屆。舊名保留，站上二十餘處引用不必為了改名一起動。 */
export const LOCAL_CYCLE = CURRENT_CYCLE;

/** 直轄市山地原住民區共 6 區，名單取自監察院前揭公告 */
export const INDIGENOUS_DISTRICTS = [
  { county: '新北市', district: '烏來區' },
  { county: '桃園市', district: '復興區' },
  { county: '臺中市', district: '和平區' },
  { county: '高雄市', district: '茂林區' },
  { county: '高雄市', district: '桃源區' },
  { county: '高雄市', district: '那瑪夏區' },
] as const;

/** 辦理縣(市)長、縣(市)議員、鄉(鎮、市)長及鄉(鎮、市)民代表選舉的 13 縣，取自前揭公告 */
export const TOWNSHIP_COUNTIES = [
  '宜蘭縣', '新竹縣', '苗栗縣', '彰化縣', '南投縣', '雲林縣', '嘉義縣',
  '花蓮縣', '臺東縣', '屏東縣', '澎湖縣', '金門縣', '連江縣',
] as const;

/** 縣(市)長、縣(市)議員選舉區中，以「市」為名的 3 市 */
export const PROVINCIAL_CITIES = ['基隆市', '新竹市', '嘉義市'] as const;

export interface Election {
  slug: string;
  position: string;
  /** 第 12 條第幾款 */
  clause12: 1 | 2 | 3 | 4;
  /** 任期屆滿前幾個月起算 */
  startOffsetMonths: 12 | 10 | 8 | 4;
  /** 本屆起算日；null 表示不在本屆地方選舉、須待各該選舉公告 */
  startDate: string | null;
  /** 收受期間截止日（投票日前一日）；null 同上 */
  endDate: string | null;
  /** 第 18 條第 2 項：政黨對其所推薦同一（組）擬參選人的金錢捐贈上限（元） */
  partyDonationCap: number;
  /** 第 18 條第 2 項第幾款 */
  clause18: 1 | 2 | 3 | 4 | 5 | 6;
  /** 是否為本屆地方公職人員選舉改選職位 */
  inLocalCycle: boolean;
}

const LOCAL_END = CURRENT_CYCLE.endDate;   // 投票日前一日，兩份公告均載明

export const ELECTIONS: Election[] = [
  { slug: 'president', position: '總統、副總統',
    clause12: 1, startOffsetMonths: 12, startDate: null, endDate: null,
    partyDonationCap: 25_000_000, clause18: 1, inLocalCycle: false },

  { slug: 'legislator', position: '立法委員（區域及原住民）',
    clause12: 2, startOffsetMonths: 10, startDate: null, endDate: null,
    partyDonationCap: 2_000_000, clause18: 2, inLocalCycle: false },

  { slug: 'municipality-mayor', position: '直轄市長',
    clause12: 3, startOffsetMonths: 8, startDate: LOCAL_CYCLE.startClause3, endDate: LOCAL_END,
    partyDonationCap: 3_000_000, clause18: 3, inLocalCycle: true },

  { slug: 'county-mayor', position: '縣（市）長',
    clause12: 3, startOffsetMonths: 8, startDate: LOCAL_CYCLE.startClause3, endDate: LOCAL_END,
    partyDonationCap: 3_000_000, clause18: 3, inLocalCycle: true },

  { slug: 'municipality-councilor', position: '直轄市議員',
    clause12: 3, startOffsetMonths: 8, startDate: LOCAL_CYCLE.startClause3, endDate: LOCAL_END,
    partyDonationCap: 500_000, clause18: 4, inLocalCycle: true },

  { slug: 'county-councilor', position: '縣（市）議員',
    clause12: 3, startOffsetMonths: 8, startDate: LOCAL_CYCLE.startClause3, endDate: LOCAL_END,
    partyDonationCap: 500_000, clause18: 4, inLocalCycle: true },

  { slug: 'township-mayor', position: '鄉（鎮、市）長',
    clause12: 3, startOffsetMonths: 8, startDate: LOCAL_CYCLE.startClause3, endDate: LOCAL_END,
    partyDonationCap: 300_000, clause18: 5, inLocalCycle: true },

  { slug: 'indigenous-district-chief', position: '直轄市山地原住民區長',
    clause12: 3, startOffsetMonths: 8, startDate: LOCAL_CYCLE.startClause3, endDate: LOCAL_END,
    partyDonationCap: 300_000, clause18: 5, inLocalCycle: true },

  { slug: 'township-rep', position: '鄉（鎮、市）民代表',
    clause12: 4, startOffsetMonths: 4, startDate: LOCAL_CYCLE.startClause4, endDate: LOCAL_END,
    partyDonationCap: 100_000, clause18: 6, inLocalCycle: true },

  { slug: 'indigenous-district-rep', position: '直轄市山地原住民區民代表',
    clause12: 4, startOffsetMonths: 4, startDate: LOCAL_CYCLE.startClause4, endDate: LOCAL_END,
    partyDonationCap: 100_000, clause18: 6, inLocalCycle: true },

  { slug: 'village-chief', position: '村（里）長',
    clause12: 4, startOffsetMonths: 4, startDate: LOCAL_CYCLE.startClause4, endDate: LOCAL_END,
    partyDonationCap: 100_000, clause18: 6, inLocalCycle: true },
];

/** 第 18 條第 1 項：對同一（組）擬參選人每年捐贈總額上限（元） */
export const CANDIDATE_CAPS = {
  individual: 100_000,
  business: 1_000_000,
  civicGroup: 500_000,
} as const;

/** 第 18 條第 3 項：對不同擬參選人每年捐贈總額合計上限（元） */
export const CANDIDATE_CAPS_AGGREGATE = {
  individual: 300_000,
  business: 2_000_000,
  civicGroup: 1_000_000,
} as const;

/** 第 17 條第 1 項：對同一政黨、政治團體每年捐贈總額上限（元） */
export const PARTY_CAPS = {
  individual: 300_000,
  business: 3_000_000,
  civicGroup: 2_000_000,
} as const;

/** 第 17 條第 3 項：對不同政黨、政治團體每年捐贈總額合計上限（元） */
export const PARTY_CAPS_AGGREGATE = {
  individual: 600_000,
  business: 6_000_000,
  civicGroup: 4_000_000,
} as const;

export const DONOR_LABEL = {
  individual: '個人',
  business: '營利事業',
  civicGroup: '人民團體',
} as const;

export type DonorType = keyof typeof DONOR_LABEL;

/** 第 19 條：列舉扣除額 */
export const DEDUCTION = {
  individual: { ratio: 0.20, ratioBase: '綜合所得總額', cap: 200_000 },
  business:   { ratio: 0.10, ratioBase: '所得額',       cap: 500_000 },
} as const;

export const twd = (n: number) => `新臺幣 ${n.toLocaleString('zh-TW')} 元`;

/**
 * 民國日期格式化。輸入是純日期（YYYY-MM-DD），沒有時刻。
 *
 * ⚠ 這裡曾經是 `new Date(iso + 'T00:00:00+08:00')` 配 getFullYear/getMonth/getDate：
 * 解析成台北零時（等於 UTC 前一天 16:00），再用「建置機器的本地時區」讀回來。
 * 開發機在 +08 看起來正確，CI 跑在 UTC，於是線上全站每個日期都少一天——
 * 投票日 2026-11-28 印成「民國 115 年 11 月 27 日」。
 *
 * 純日期就該全程用 UTC 進、UTC 出，與任何機器的時區無關。
 * 由 scripts/check-dates.mjs 在 TZ=UTC 下把關，不再靠肉眼。
 */
export const rocDate = (iso: string) => {
  const d = new Date(iso + 'T00:00:00Z');
  return `民國 ${d.getUTCFullYear() - 1911} 年 ${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日`;
};
