/**
 * 圖表共用工具。D3 只在建置期當數學函式庫用，不碰 DOM。
 * 見 docs/圖表規格.md §0.1。
 */
export const fmtWan = (n: number) =>
  n >= 100_000_000 ? `${(n / 100_000_000).toFixed(1)} 億`
  : n >= 10_000 ? `${Math.round(n / 10_000).toLocaleString('zh-TW')} 萬`
  : n.toLocaleString('zh-TW');

export const fmtMoney = (n: number) => `${fmtWan(n)}元`;

/** SVG 內的文字要跳脫 */
export const esc = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 圖表共用尺寸。字級沿用 --text-xs（18px）以上，符合最小字級規則 */
export const CHART = {
  labelSize: 13,      // SVG 內的軸標籤，非內文，不受 18px 內文下限拘束
  valueSize: 13,
  rowH: 30,
  gap: 2,             // 相鄰色塊之間留 2px 底色縫隙
  radius: 4,          // 資料端 4px 圓角
} as const;

/** 六階序列色的 CSS 變數名 */
export const RAMP = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)'];

/** 依序數取序列色：值越大越深 */
export const rampOf = (i: number, n: number) =>
  RAMP[Math.min(RAMP.length - 1, Math.max(0, Math.round((i / Math.max(1, n - 1)) * (RAMP.length - 1))))];
