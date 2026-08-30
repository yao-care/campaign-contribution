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
  .headline{font-weight:900;line-height:1.06;color:${C.stamp};letter-spacing:-.02em}
  .sub{color:${C.ink};font-weight:700;line-height:1.45}
  .rule{height:3px;background:${C.ink};margin:28px 0}
  .foot{margin-top:auto;color:${C.muted};font-size:20px;line-height:1.6;border-top:1px solid ${C.rule};padding-top:20px}
  .foot b{color:${C.ink2};font-weight:600}
</style></head><body>${inner}</body></html>`;

const foot = (item, extra = '') => `<div class="foot">
  ${extra}依政治獻金法${esc(item.lawRefs[0].label.replace('政治獻金法', ''))}。法條原文取自全國法規資料庫。<br>
  <b>${SITE}</b>　本站為民間自製，與各機關無委託關係　CC BY 4.0
</div>`;

const nl = (t) => esc(t).replace(/\\n|\n/g, '<br>');

/**
 * 大字依視覺寬度自動調級。
 * 中日韓字元算 1，其餘（數字、空白、拉丁字母）算 0.55——
 * 用字數會把「一年 10 萬」誤判成 7 個全形字，字級被壓得太小。
 */
const visualWidth = (s) =>
  [...s].reduce((w, ch) => w + (/[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 1 : 0.55), 0);
/**
 * 長輩圖是隔一公尺看手機的人在看，字級守下限、不讓文案長度把字壓小：
 * 依可用寬度回推最大可放字級，再夾在 max 與 max*0.72 之間。
 * 夾到下限還是塞不下 → 是文案要改短，不是字要變小，所以直接擋掉。
 */
const fit = (lines, max, boxWidth = 900, boxHeight = 0) => {
  const n = Math.max(...lines.map(visualWidth));
  let size = Math.min(max, Math.max(Math.round(max * 0.72), Math.floor(boxWidth / n)));
  // 直式版的大字要跟下面的內文共用高度，給了高度預算就以它為準，不套字級下限
  if (boxHeight) return Math.min(size, Math.floor(boxHeight / (lines.length * 1.06)));
  if (n * size > boxWidth * 1.02) {
    throw new Error(`文案太長塞不下：「${lines.join('／')}」約 ${n.toFixed(1)} 字寬，` +
      `${boxWidth}px 內要維持 ${Math.round(max * 0.72)}px 字級最多 ` +
      `${(boxWidth / (max * 0.72)).toFixed(1)} 字，請改短文案。`);
  }
  return size;
};

const MARK_C = (c) => `<span style="display:inline-block;width:.85em;height:.85em;border:2px solid ${c};position:relative;vertical-align:-.03em"><span style="position:absolute;left:.15em;right:.15em;top:calc(50% - 1px);border-top:2px solid ${c}"></span></span>`;

const srcLine = (item) =>
  `依政治獻金法${esc(item.lawRefs[0].label.replace('政治獻金法', ''))}．監察院與全國法規資料庫`;

const TEMPLATES = {
  /** A 警示：深底高對比，訊息最強 */
  'square-a': (item) => {
    const h = item.hook;
    return { w: 1080, h: 1080, html: `<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><style>
      *{box-sizing:border-box;margin:0;padding:0}html,body{width:1080px;height:1080px}
      body{font-family:${FONT};background:#1a1210;color:#fff;padding:72px;display:flex;flex-direction:column;-webkit-font-smoothing:antialiased}
      </style></head><body>
      <div style="display:flex;align-items:center;gap:.5em;font-size:26px;font-weight:700;color:#f0a598">
        ${MARK_C('#f0a598')}<span>政治獻金指南</span></div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:34px">
        <div style="display:inline-flex;align-items:center;gap:18px;align-self:flex-start;background:#c1352a;padding:14px 30px;border-radius:6px">
          <span style="font-size:44px">⚠</span>
          <span style="font-size:38px;font-weight:800;letter-spacing:.05em">${esc(h.who)}</span></div>
        <div style="font-size:${fit(h.warn, 118, 900)}px;font-weight:900;line-height:1.18">
          ${esc(h.warn[0])}<br>${esc(h.warn[1])}<br><span style="color:#ff8f7d">${esc(h.warn[2])}</span></div>
        <div style="font-size:36px;line-height:1.6;color:#e8ded9">${nl(h.warnSub)}</div>
      </div>
      <div style="border-top:1px solid #4a3a36;padding-top:22px;font-size:21px;color:#b3a49f;line-height:1.6">
        ${srcLine(item)}<br><b style="color:#fff">${SITE}</b>　民間自製，與各機關無委託關係　CC BY 4.0</div>
      </body></html>` };
  },

  /** B 溫馨：暖色漸層加圓角白卡，最接近實際會被轉發的長輩圖 */
  'square-b': (item) => {
    const h = item.hook;
    return { w: 1080, h: 1080, html: `<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><style>
      *{box-sizing:border-box;margin:0;padding:0}html,body{width:1080px;height:1080px}
      body{font-family:${FONT};background:linear-gradient(160deg,#f7ede4 0%,#f0dcd0 55%,#e8cdbd 100%);
           color:#2a1f1b;padding:56px;display:flex;flex-direction:column;-webkit-font-smoothing:antialiased}
      </style></head><body>
      <div style="text-align:center;font-size:38px;font-weight:800;color:#a8442f;letter-spacing:.08em">早安 ☀</div>
      <div style="background:#fff;border-radius:28px;padding:52px 50px;margin-top:30px;flex:1;
           display:flex;flex-direction:column;box-shadow:0 10px 32px rgba(120,70,50,.16)">
        <div style="font-size:42px;font-weight:800;line-height:1.45">${nl(h.lead)}</div>
        <div style="height:4px;background:#c1352a;width:96px;margin:28px 0"></div>
        <div style="font-size:${fit(h.big, 92, 760)}px;font-weight:900;color:#c1352a;line-height:1.22">
          ${h.big.map(esc).join('<br>')}</div>
        <div style="margin-top:auto;font-size:32px;line-height:1.65;color:#5a4a44">${nl(h.care)}<br>
          <span style="color:#a8442f;font-weight:700">請幫忙轉給需要的朋友 🙏</span></div>
      </div>
      <div style="text-align:center;margin-top:24px;font-size:20px;color:#7a655c;line-height:1.55">
        ${srcLine(item)}<br><b style="color:#3d2e28">${SITE}</b>　民間自製，與各機關無委託關係　CC BY 4.0</div>
      </body></html>` };
  },

  /** C 對話：模擬 LINE 問答，問句開頭比宣告有效 */
  'square-c': (item) => {
    const h = item.hook;
    return { w: 1080, h: 1080, html: `<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><style>
      *{box-sizing:border-box;margin:0;padding:0}html,body{width:1080px;height:1080px}
      body{font-family:${FONT};background:#e6ded3;color:#241c18;padding:64px;display:flex;flex-direction:column;-webkit-font-smoothing:antialiased}
      </style></head><body>
      <div style="display:flex;align-items:center;gap:.5em;font-size:26px;font-weight:700;color:#8a4032">
        ${MARK_C('#8a4032')}<span>政治獻金指南</span></div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:26px">
        <div style="align-self:flex-start;max-width:80%;background:#fff;border-radius:22px 22px 22px 6px;
             padding:30px 34px;font-size:38px;font-weight:600;line-height:1.5;box-shadow:0 3px 10px rgba(80,50,40,.12)">
          ${nl(h.ask)}</div>
        <div style="align-self:flex-end;max-width:88%;background:#c1352a;color:#fff;border-radius:22px 22px 6px 22px;
             padding:34px 38px;box-shadow:0 3px 12px rgba(140,50,35,.28)">
          <div style="font-size:${fit(h.answer.split(/\\n|\n/), 84, 520)}px;font-weight:900;line-height:1.25">${nl(h.answer)}</div>
          <div style="font-size:30px;line-height:1.6;margin-top:18px;color:#ffe2db">${nl(h.answerSub)}</div>
        </div>
      </div>
      <div style="border-top:1px solid #c9bcaf;padding-top:22px;font-size:21px;color:#6d5c53;line-height:1.6">
        ${srcLine(item)}<br><b style="color:#241c18">${SITE}</b>　民間自製，與各機關無委託關係　CC BY 4.0</div>
      </body></html>` };
  },

  /** 懶人包長圖：標題 + 條列重點 */
  tall: (item) => ({ w: 1080, h: 1350, html: shell(1080, 1350, `
    <div class="brand">${MARK}<span>政治獻金指南</span></div>
    <div style="margin-top:48px">
      <div class="headline" style="font-size:${fit(item.hook.big, 150, 900, 420)}px">${item.hook.big.map(esc).join('<br>')}</div>
      <div class="sub" style="font-size:42px;margin-top:20px">${esc(item.sub)}</div>
    </div>
    <div class="rule"></div>
    <ol style="list-style:none;font-size:33px;line-height:1.6;color:${C.ink2}">
      ${item.body.slice(0, 3).map((b, i) => `
        <li style="display:flex;gap:20px;margin-bottom:28px">
          <span style="flex:0 0 44px;height:44px;border:2px solid ${C.stamp};color:${C.stamp};
                font-weight:700;font-size:26px;display:flex;align-items:center;justify-content:center">${i + 1}</span>
          <span>${esc(b.length > 76 ? b.slice(0, 76) + '…' : b)}</span>
        </li>`).join('')}
    </ol>
    ${foot(item)}`) }),

  /** A4 傳單：210×297mm，96dpi 下為 794×1123 */
  a4: (item, qr) => ({ w: 794, h: 1123, html: shell(794, 1123, `
    <div class="brand" style="font-size:20px">${MARK}<span>政治獻金指南</span></div>
    <div style="margin-top:32px">
      <div class="headline" style="font-size:${fit(item.hook.big, 104, 620, 260)}px">${item.hook.big.map(esc).join('<br>')}</div>
      <div class="sub" style="font-size:30px;margin-top:14px">${esc(item.sub)}</div>
    </div>
    <div class="rule" style="margin:22px 0"></div>
    <div style="font-size:19px;line-height:1.75;color:${C.ink2};display:flex;flex-direction:column;gap:14px">
      ${item.body.map((b) => `<p>${esc(b)}</p>`).join('')}
    </div>
    <div style="margin-top:auto;display:flex;gap:24px;align-items:flex-end;border-top:1px solid ${C.rule};padding-top:20px">
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
