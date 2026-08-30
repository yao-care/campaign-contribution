/**
 * 素材圖檔產生器。
 *
 * 用 HTML 模板 + headless Chrome 於建置前渲染成 PNG，沿用站上的 OKLCH token
 * 與 18px 起跳字級。產出進版控，網站本身不需要執行期繪圖。
 *
 * 用法：node scripts/build-media.mjs [--only <slug>]
 */
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find((p) => existsSync(p));
if (!CHROME) throw new Error('找不到 Chrome，素材渲染需要瀏覽器');

/** 從 tokens.css 取出色值，避免素材與網站脫鉤 */
const tokens = await readFile('src/styles/tokens.css', 'utf-8');
/** 取 tokens.css 的 hex fallback 區塊，qrcode 與部分繪圖只吃 hex */
const HEX_BLOCK = tokens.slice(tokens.indexOf('@supports not (color: oklch'));
const tok = (name, fallback) => {
  const hex = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`).exec(HEX_BLOCK)?.[1];
  if (hex) return hex;
  return (new RegExp(`--${name}:\\s*([^;]+);`).exec(tokens)?.[1] ?? fallback).trim();
};
const C = {
  ground: tok('ground', '#fff'), alt: tok('alt', '#f4f2ec'),
  ink: tok('ink', '#15171a'), ink2: tok('ink-2', '#4b5057'),
  muted: tok('muted', '#6a6f76'), rule: tok('rule', '#e2ded5'),
  stamp: tok('stamp', '#b5372b'), slate: tok('slate', '#33555c'),
};

const SITE = 'campaign.yao.care';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 公文用印的方框加一橫，與站上識別一致 */
const MARK = `<span style="display:inline-block;width:.9em;height:.9em;border:2px solid ${C.stamp};position:relative;vertical-align:-.05em">
  <span style="position:absolute;left:.15em;right:.15em;top:calc(50% - 1px);border-top:2px solid ${C.stamp}"></span></span>`;

const FONT = `"Noto Sans TC","PingFang TC","Microsoft JhengHei",-apple-system,sans-serif`;

const shell = (w, h, inner, pad = 72) => `<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${w}px;height:${h}px}
  body{background:${C.ground};color:${C.ink};font-family:${FONT};
       padding:${pad}px;display:flex;flex-direction:column;
       -webkit-font-smoothing:antialiased}
  .brand{display:flex;align-items:center;gap:.5em;font-size:26px;font-weight:700;color:${C.ink}}
  .headline{font-weight:900;line-height:.95;color:${C.stamp};letter-spacing:-.02em}
  .sub{color:${C.ink};font-weight:700;line-height:1.45}
  .rule{height:3px;background:${C.ink};margin:28px 0}
  .foot{margin-top:auto;color:${C.muted};font-size:20px;line-height:1.6;border-top:1px solid ${C.rule};padding-top:20px}
  .foot b{color:${C.ink2};font-weight:600}
</style></head><body>${inner}</body></html>`;

const foot = (item, extra = '') => `<div class="foot">
  ${extra}依政治獻金法${esc(item.lawRefs[0].label.replace('政治獻金法', ''))}。法條原文取自全國法規資料庫。<br>
  <b>${SITE}</b>　本站為民間自製，與各機關無委託關係　CC BY 4.0
</div>`;

/** 大字依字數自動調級，避免長標題換行擠壓 */
const fit = (text, max, min = 0.42) => {
  const n = [...text].length;
  const scale = n <= 2 ? 1 : n <= 3 ? 0.82 : n <= 4 ? 0.62 : n <= 5 ? 0.5 : min;
  return Math.round(max * scale);
};

const TEMPLATES = {
  /** 長輩圖：一張一個知識點，超大字、單一重點 */
  square: (item) => ({ w: 1080, h: 1080, html: shell(1080, 1080, `
    <div class="brand">${MARK}<span>政治獻金指南</span></div>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center">
      <div class="headline" style="font-size:${fit(item.headline, 320)}px">${esc(item.headline)}</div>
      <div class="rule"></div>
      <div class="sub" style="font-size:52px">${esc(item.sub)}</div>
    </div>
    ${foot(item)}`) }),

  /** 懶人包長圖：標題 + 條列重點 */
  tall: (item) => ({ w: 1080, h: 1350, html: shell(1080, 1350, `
    <div class="brand">${MARK}<span>政治獻金指南</span></div>
    <div style="margin-top:48px">
      <div class="headline" style="font-size:${fit(item.headline, 190)}px">${esc(item.headline)}</div>
      <div class="sub" style="font-size:46px;margin-top:16px">${esc(item.sub)}</div>
    </div>
    <div class="rule"></div>
    <ol style="list-style:none;font-size:34px;line-height:1.6;color:${C.ink2}">
      ${item.body.slice(0, 3).map((b, i) => `
        <li style="display:flex;gap:20px;margin-bottom:30px">
          <span style="flex:0 0 44px;height:44px;border:2px solid ${C.stamp};color:${C.stamp};
                font-weight:700;font-size:26px;display:flex;align-items:center;justify-content:center">${i + 1}</span>
          <span>${esc(b.length > 78 ? b.slice(0, 78) + '…' : b)}</span>
        </li>`).join('')}
    </ol>
    ${foot(item)}`) }),

  /** A4 傳單：210×297mm，96dpi 下為 794×1123 */
  a4: (item, qr) => ({ w: 794, h: 1123, html: shell(794, 1123, `
    <div class="brand" style="font-size:20px">${MARK}<span>政治獻金指南</span></div>
    <div style="margin-top:34px">
      <div class="headline" style="font-size:${fit(item.headline, 132)}px">${esc(item.headline)}</div>
      <div class="sub" style="font-size:32px;margin-top:10px">${esc(item.sub)}</div>
    </div>
    <div class="rule" style="margin:22px 0"></div>
    <div style="font-size:19px;line-height:1.75;color:${C.ink2};display:flex;flex-direction:column;gap:14px">
      ${item.body.map((b) => `<p>${esc(b)}</p>`).join('')}
    </div>
    <div style="margin-top:auto;display:flex;gap:24px;align-items:flex-end;
                border-top:1px solid ${C.rule};padding-top:20px">
      <div style="flex:0 0 132px">${qr}</div>
      <div style="font-size:17px;line-height:1.6;color:${C.muted}">
        <b style="color:${C.ink};font-size:19px">掃描查看完整說明與法條原文</b><br>
        ${SITE}${esc(item.lawRefs.at(-1).href)}<br>
        本站為民間自製，與內政部、監察院、中央選舉委員會均無委託關係。<br>
        內容依 CC BY 4.0 釋出，歡迎印製與轉發。
      </div>
    </div>`, 56) }),
};

/** QR code。qrcode 只在建置期用，不進瀏覽器。 */
import QRCode from 'qrcode';
const qrSvg = async (text, size = 132) => {
  const svg = await QRCode.toString(text, {
    type: 'svg', margin: 1, width: size,
    color: { dark: C.ink.startsWith('#') ? C.ink : '#15171a', light: '#ffffff' },
  });
  return svg.replace('<svg', '<svg role="img" aria-label="QR code"');
};

async function shot(html, w, h, out) {
  const tmp = `/tmp/media-${Math.random().toString(36).slice(2)}.html`;
  await writeFile(tmp, html);
  await new Promise((res, rej) => {
    const p = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
      `--window-size=${w},${h}`, '--force-device-scale-factor=1',
      `--screenshot=${out}`, '--virtual-time-budget=3000', `file://${tmp}`], { stdio: 'ignore' });
    p.on('exit', (c) => (c === 0 ? res() : rej(new Error(`Chrome exit ${c}`))));
  });
}

// media.ts 直接匯入。Node 22 需要 --experimental-strip-types，見 package.json 的 scripts
const { MEDIA } = await import('../src/data/media.ts');

await mkdir('public/media', { recursive: true });
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
let n = 0;
for (const item of MEDIA) {
  if (only && item.slug !== only) continue;
  const url = `https://${SITE}${item.lawRefs.at(-1).href}`;
  const qr = await qrSvg(url);
  for (const fmt of item.formats) {
    const t = TEMPLATES[fmt];
    if (!t) continue;
    const { w, h, html } = t(item, qr);
    const out = `public/media/${item.slug}-${fmt}.png`;
    await shot(html, w, h, out);
    console.log(`  ${out}  ${w}×${h}`);
    n++;
  }
}
console.log(`\n共產出 ${n} 張圖`);
