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
};

/**
 * 審閱署名。法規內容要留署名，讀者才知道是誰寫的、可不可信。
 * 本站是自費製作的民間網站，沒有機關背書，也沒有律師或會計師掛名，
 * 署名就照實寫。法條原文另外標示來源，那部分不是本站的詮釋。
 */
export const REVIEWER = '本站編輯（民間自製，未經主管機關審閱）';
