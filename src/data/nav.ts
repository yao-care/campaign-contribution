/**
 * 全站導覽。8,444 頁若只靠麵包屑，多數區塊從首頁點不到。
 * 頂欄放八個主要入口，頁尾放完整網站地圖。純 CSS、零 JS，不藏進漢堡選單。
 */
export const NAV = [
  { label: '法條', href: '/law/' },
  { label: '工具', href: '/tools/' },
  { label: '誰能捐', href: '/donors/' },
  { label: '選舉類別', href: '/elections/' },
  { label: '行政區與村里', href: '/regions/' },
  { label: '書表', href: '/forms/' },
  { label: '問答', href: '/faq/' },
  { label: '名詞', href: '/glossary/' },
];

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
    h: '查我的地方',
    items: [
      { label: '22 縣市', href: '/regions/' },
      { label: '村里查詢說明', href: '/villages/' },
      { label: '現存政黨', href: '/parties/' },
      { label: '重要日期', href: '/countdown/' },
    ],
  },
  {
    h: '關於',
    items: [
      { label: '關於本站', href: '/about/' },
      { label: '編輯與審閱原則', href: '/about/editorial/' },
      { label: '開放資料下載', href: '/downloads/' },
      { label: '申報資料查詢', href: '/reports/' },
      { label: '資料更新紀錄', href: '/updates/' },
      { label: '站內搜尋', href: '/search/' },
    ],
  },
];
