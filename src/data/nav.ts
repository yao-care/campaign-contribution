/**
 * 全站導覽。8,453 頁若只靠麵包屑，多數區塊從首頁點不到。
 * 頂欄放主要入口，頁尾放完整網站地圖。純 CSS、零 JS，不藏進漢堡選單。
 */
import { LOCAL_CYCLE } from './elections';

const ITEMS = {
  calendar: { label: '選舉行事曆', href: '/countdown/' },
  law: { label: '法條', href: '/law/' },
  tools: { label: '工具', href: '/tools/' },
  donors: { label: '誰能捐', href: '/donors/' },
  elections: { label: '選舉類別', href: '/elections/' },
  regions: { label: '行政區與村里', href: '/regions/' },
  forms: { label: '書表', href: '/forms/' },
  faq: { label: '問答', href: '/faq/' },
  glossary: { label: '名詞', href: '/glossary/' },
  media: { label: '素材庫', href: '/media/' },
  deadline: { label: '申報期限', href: '/tools/deadline/' },
};

/**
 * 導覽順序隨時程改變。
 *
 * 站上流量集中在四個日期前後，而這四天前後民眾要找的東西完全不同：
 * 收受期間內問「可以收了嗎、誰能捐」，投票日後問「什麼時候要申報」。
 * 順序在建置期依日期決定，每日重建一次即生效，不需要任何前端程式。
 */
// 用台北日期，不是 UTC 日期：CI 跑在 UTC，台北時間當日 08:00 前會算成前一天
const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
const phase: 'before' | 'receiving' | 'after' =
  today < LOCAL_CYCLE.startClause4 ? 'before'
  : today <= LOCAL_CYCLE.endDate ? 'receiving'
  : 'after';

const ORDER = {
  // 起算日前：先建立「什麼時候才能開始」的認知
  before: ['calendar', 'law', 'tools', 'elections', 'donors', 'regions', 'forms', 'faq', 'glossary', 'media'],
  // 收受期間：問的是能不能收、誰能捐、上限多少
  receiving: ['calendar', 'donors', 'tools', 'law', 'regions', 'elections', 'forms', 'faq', 'glossary', 'media'],
  // 投票日後：問的全是申報
  after: ['deadline', 'forms', 'calendar', 'law', 'tools', 'faq', 'donors', 'glossary', 'elections', 'media'],
} as const;

export const NAV_PHASE = phase;
export const NAV = ORDER[phase].map((k) => ITEMS[k as keyof typeof ITEMS]);

export const FOOTER = [
  {
    h: '查法規',
    items: [
      { label: '政治獻金法全文', href: '/law/' },
      { label: '名詞解釋', href: '/glossary/' },
      { label: '常見問答', href: '/faq/' },
      { label: '罰則對照', href: '/tools/penalty/' },
    ],
  },
  {
    h: '我要捐款',
    items: [
      { label: '誰不得捐贈', href: '/donors/' },
      { label: '資格逐題檢核', href: '/tools/can-i-donate/' },
      { label: '捐贈上限試算', href: '/tools/limit/' },
      { label: '抵稅試算', href: '/tools/deduction/' },
    ],
  },
  {
    h: '我要參選',
    items: [
      { label: '11 種選舉類別', href: '/elections/' },
      { label: '收受起算日', href: '/tools/timeline/' },
      { label: '書表與流程', href: '/forms/' },
      { label: '申報期限', href: '/tools/deadline/' },
      { label: '情境指南', href: '/guides/' },
    ],
  },
  {
    h: '查時程與地方',
    items: [
      { label: '選舉行事曆', href: '/countdown/' },
      { label: '歷屆日期', href: '/cycles/' },
      { label: '22 縣市', href: '/regions/' },
      { label: '村里查詢說明', href: '/villages/' },
      { label: '現存政黨', href: '/parties/' },
    ],
  },
  {
    h: '關於',
    items: [
      { label: '關於本站', href: '/about/' },
      { label: '站點聲明', href: '/about/statement/' },
      { label: '編輯與審閱原則', href: '/about/editorial/' },
      { label: '宣導素材庫', href: '/media/' },
      { label: '開放資料下載', href: '/downloads/' },
      { label: '申報資料查詢', href: '/reports/' },
      { label: '制度與資料異動', href: '/updates/' },
      { label: '異動訂閱（Atom）', href: '/updates.xml' },
      { label: '站內搜尋', href: '/search/' },
    ],
  },
];
