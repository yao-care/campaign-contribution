/**
 * 制度與資料異動紀錄。
 *
 * 兩種來源混在同一條時間軸上：本站的資料抓取，以及主管機關的公告與函釋。
 * 分開列會讓「這條規則什麼時候變的」變得難查——那正是下一屆回來時最需要的東西。
 *
 * 由 /updates/ 與 /updates.xml（Atom）共用，讓別的站可以訂閱制度異動，
 * 不必等本站主動通知。這是最省力的外部曝光管道。
 */
import lawData from './law.json';
import villagesData from './villages.json';
import partyData from './parties.json';

export interface UpdateEntry {
  /** ISO 日期 */
  d: string;
  t: string;
  b: string;
  /** data：本站抓取；rule：主管機關公告或函釋；site：站上結構變動 */
  kind: 'data' | 'rule' | 'site';
}

export const UPDATES: UpdateEntry[] = [
  {
    d: lawData.fetchedAt.slice(0, 10), kind: 'data',
    t: `政治獻金法全文抓取，共 ${lawData.count} 條`,
    b: `內容指紋 ${lawData.digest}。第 16 條為刪除條文，有效條文 ${lawData.count - 1} 條。條文一經修正即可由指紋偵測，並觸發白話說明重新審閱。`,
  },
  {
    d: partyData.fetchedAt.slice(0, 10), kind: 'data',
    t: `政黨清單更新，現存政黨 ${partyData.count} 個`,
    b: '取自內政部政黨資訊網。該站表格由瀏覽器端產生，抓取程序需渲染後解析。',
  },
  {
    d: villagesData.fetchedAt.slice(0, 10), kind: 'data',
    t: `村里清單更新，共 ${villagesData.count.toLocaleString('zh-TW')} 筆（期別 ${villagesData.period}）`,
    b: '取自內政部戶政司 ODRP001。較新的期別目前回傳查無資料，故採用最新可用期別。村里頁的戶籍人口欄位尚無資料來源。',
  },
  {
    d: '2026-02-09', kind: 'rule',
    t: '監察院公告本屆專戶申請注意事項與收受起算日',
    b: '第 12 條第 3 款組自 115 年 4 月 25 日起、第 4 款組自 115 年 8 月 20 日起，均至 115 年 11 月 27 日止。第 4 款組的專戶設立申請自 115 年 8 月 17 日起受理。',
  },
  {
    d: '2026-08-30', kind: 'site',
    t: '新增屆別維度，各屆日期各自成頁',
    b: '收受起算日、截止日與申報期限每屆不同，原本寫死在單一設定裡。改為屆別陣列後，新屆上線時舊屆頁面與網址原封保留，不會被覆蓋。本屆為 /cycles/2026/。',
  },
];

export const KIND_LABEL: Record<UpdateEntry['kind'], string> = {
  rule: '制度異動',
  data: '資料更新',
  site: '網站異動',
};

/** 新到舊。Atom 的 <updated> 取這裡的第一筆。 */
export const UPDATES_SORTED = [...UPDATES].sort((a, b) => b.d.localeCompare(a.d));
