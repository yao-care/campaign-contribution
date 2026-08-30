/**
 * 第 7 條第 1 項 11 款不得捐贈者。
 * 款次與對象文字對照 law.json 第 7 條原文；查證機關取自建站規格 §5.2。
 * 已於 2026-08-30 逐款核對原文。
 */
export interface Donor {
  clause: number;
  slug: string;
  /** 對象簡稱，用於標題與清單 */
  target: string;
  /** 條文對該款的完整描述（轉述，原文另行並列） */
  scope: string;
  verifyAgency: string[];
  /** 判斷要點 */
  tests: string[];
  /** 例外 */
  exception?: string;
  /** 違反時是否禁止返還、必須繳庫（第 15 條：第 7 至 9 款不得返還） */
  mustSurrender: boolean;
}

export const DONORS: Donor[] = [
  {
    clause: 1, slug: 'state-owned', target: '公營事業或政府持股達 20% 的民營企業',
    scope: '公營事業，或政府持有資本達百分之二十之民營企業。',
    verifyAgency: ['經濟部', '各該事業主管機關'],
    tests: ['是否為公營事業。', '政府（含各級政府及其基金）持有資本是否達 20%。'],
    mustSurrender: false,
  },
  {
    clause: 2, slug: 'gov-contractor', target: '與政府機關有巨額採購或重大公共建設投資契約且在履約期間的廠商',
    scope: '與政府機關（構）有巨額採購或重大公共建設投資契約，且在履約期間之廠商。',
    verifyAgency: ['行政院公共工程委員會', '財政部'],
    tests: ['是否與政府機關（構）訂有巨額採購或重大公共建設投資契約。', '該契約是否仍在履約期間。履約完畢後即不受本款限制。'],
    mustSurrender: false,
  },
  {
    clause: 3, slug: 'deficit', target: '有累積虧損尚未依規定彌補的營利事業',
    scope: '有累積虧損尚未依規定彌補之營利事業。',
    verifyAgency: ['經濟部'],
    tests: ['財務報表是否有累積虧損。', '該累積虧損是否已依規定彌補完畢。'],
    mustSurrender: false,
  },
  {
    clause: 4, slug: 'religious', target: '宗教團體',
    scope: '宗教團體。',
    verifyAgency: ['內政部'],
    tests: ['是否為依法立案或登記的宗教團體。'],
    mustSurrender: false,
  },
  {
    clause: 5, slug: 'other-party', target: '其他政黨或同一種選舉的擬參選人',
    scope: '其他政黨或同一種選舉擬參選人。',
    verifyAgency: ['內政部', '中央選舉委員會', '監察院'],
    tests: ['捐贈者是否為其他政黨。', '捐贈者是否為同一種選舉的擬參選人。'],
    exception: '依法共同推薦候選人的政黨，對於其所推薦同一組候選人的捐贈，不在此限。',
    mustSurrender: false,
  },
  {
    clause: 6, slug: 'no-suffrage', target: '未具有選舉權之人',
    scope: '未具有選舉權之人。',
    verifyAgency: ['內政部'],
    tests: ['是否具有選舉權。未滿法定年齡、或依法褫奪公權者，不具選舉權。'],
    mustSurrender: false,
  },
  {
    clause: 7, slug: 'foreign', target: '外國人民、法人、團體，或主要成員為外國人者',
    scope: '外國人民、法人、團體或其他機構，或主要成員為外國人民、法人、團體或其他機構之法人、團體或其他機構。',
    verifyAgency: ['經濟部', '內政部'],
    tests: ['捐贈者本身是否為外國人民、法人、團體或其他機構。', '若為本國法人團體，其「主要成員」是否為外國人民、法人、團體或其他機構。'],
    mustSurrender: true,
  },
  {
    clause: 8, slug: 'mainland', target: '大陸地區人民、法人、團體，或主要成員為大陸地區者',
    scope: '大陸地區人民、法人、團體或其他機構，或主要成員為大陸地區人民、法人、團體或其他機構之法人、團體或其他機構。',
    verifyAgency: ['經濟部', '內政部'],
    tests: ['捐贈者本身是否為大陸地區人民、法人、團體或其他機構。', '若為本國法人團體，其「主要成員」是否為大陸地區人民、法人、團體或其他機構。'],
    mustSurrender: true,
  },
  {
    clause: 9, slug: 'hk-macau', target: '香港、澳門居民、法人、團體，或主要成員為港澳者',
    scope: '香港、澳門居民、法人、團體或其他機構，或主要成員為香港、澳門居民、法人、團體或其他機構之法人、團體或其他機構。',
    verifyAgency: ['經濟部', '內政部'],
    tests: ['捐贈者本身是否為香港或澳門居民、法人、團體或其他機構。', '若為本國法人團體，其「主要成員」是否為港澳居民、法人、團體或其他機構。'],
    mustSurrender: true,
  },
  {
    clause: 10, slug: 'party-business', target: '政黨經營或投資之事業',
    scope: '政黨經營或投資之事業。',
    verifyAgency: ['經濟部'],
    tests: ['該事業是否為政黨經營。', '該事業是否有政黨投資。'],
    mustSurrender: false,
  },
  {
    clause: 11, slug: 'party-contractor', target: '與政黨經營或投資之事業有巨額採購契約且在履約期間的廠商',
    scope: '與政黨經營或投資之事業有巨額採購契約，且在履約期間之廠商。',
    verifyAgency: ['內政部'],
    tests: ['是否與政黨經營或投資之事業訂有巨額採購契約。', '該契約是否仍在履約期間。'],
    mustSurrender: false,
  },
];

/** 第 7 條第 3 項：主要成員的三種認定，符合任一即是 */
export const MAJOR_MEMBER_TESTS = [
  '擔任本國團體或法人之董事長。',
  '占董事、監察人、執行業務或代表公司之股東等職務總名額超過三分之一。',
  '占股份有限公司股東權 30% 以上，或無限公司、兩合公司、有限公司之股東及一般法人團體社員人數超過三分之一。',
];
