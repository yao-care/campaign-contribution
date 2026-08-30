/**
 * 全站常數。網域尚未確定（建站規格 §14），先集中在此一處，
 * 定案後只改這個檔案。robots 策略是否可控取決於此。
 */
/**
 * 正式網域。改這一個字串即可換網域，其餘全站（canonical、sitemap、robots、
 * JSON-LD、開放資料集的 contentUrl）都由此推導。
 * 換網域時記得同步改 public/CNAME，兩者必須一致，否則 GitHub Pages 會擋。
 */
export const DOMAIN = 'campaign.yao.care';

export const SITE = {
  origin: process.env.SITE_ORIGIN ?? `https://${DOMAIN}`,
  name: '政治獻金指南',
  /** 預算法第 62 條之 1：頁尾必須標示委辦機關全稱與計畫名稱（§12 第 5 點） */
  agency: '內政部',
  program: '115 年度政治獻金法制網路宣導',
};

/**
 * 審閱署名。建站規格 §12 第 1 條要求法規內容留審閱署名，且不得由模型代替人工核對。
 * 本站目前的白話說明為建置階段撰寫的初稿，尚未經委辦機關法制單位審閱，
 * 因此署名如實標示為初稿狀態。法制單位審閱後改為實際審閱者姓名或單位。
 */
export const REVIEWER = '本站編輯初稿（未經法制單位審閱）';
