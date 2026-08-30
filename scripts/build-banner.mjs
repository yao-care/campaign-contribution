/**
 * appi.news 首頁 seasonal banner 圖檔產生器。
 *
 * 對接的版位（2026-08-30 由 https://appi.news/ 線上 HTML 與 CSS 實測）：
 *   #main > section.home-seasonal.home-seasonal--with-image
 *     .seasonal-topic-media > img.seasonal-topic-image  width=1280 height=720
 *   img 為 object-fit:cover，容器 min-height:236px
 *   桌機格線 minmax(280px,.9fr) / minmax(0,1.1fr)，--maxw:1440、container padding 20
 *     → 圖片欄約 630×236，比 16:9 更扁，會上下各裁掉約 17%
 *   ≤520px 時 .seasonal-topic-media 變 aspect-ratio:16/9 滿版，不裁切
 *
 * 因此版面規則：橫向滿版可用，縱向所有內容must留在中央安全區（y 140–580）。
 * 標題／描述由對方元件的文字負責，圖上只放最低限度的字。
 *
 * 用法：node scripts/build-banner.mjs
 * 產出：public/partners/appi-news-<variant>.png / .webp
 *       public/partners/appi-news-<variant>-crop-proof.png（模擬桌機裁切，供對稿）
 */
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find((p) => existsSync(p));
if (!CHROME) throw new Error('找不到 Chrome，banner 渲染需要瀏覽器');

const tokens = await readFile('src/styles/tokens.css', 'utf-8');
const HEX = tokens.slice(tokens.indexOf('@supports not (color: oklch'));
const tok = (n, f) => new RegExp(`--${n}:\\s*(#[0-9a-fA-F]{3,8})`).exec(HEX)?.[1] ?? f;
const C = {
  ground: tok('ground', '#fffdf8'), alt: tok('alt', '#f4f2ec'),
  ink: tok('ink', '#15171a'), ink2: tok('ink-2', '#4b5057'),
  muted: tok('muted', '#6a6f76'), rule: tok('rule', '#e2ded5'),
  stamp: tok('stamp', '#b5372b'),
};
/** appi.news 自己的品牌色，取自其線上 CSS 變數，用來讓 banner 不像外來廣告 */
const A = { brand: '#1f3a5f', accent: '#a87515', accentSoft: '#f7efdd', ink: '#1e2030' };

const W = 1280, H = 720;
const SAFE_TOP = 140, SAFE_BOTTOM = 140;   // 桌機裁切後看不到的上下範圍
const FONT = `"Noto Sans TC","PingFang TC","Microsoft JhengHei",-apple-system,sans-serif`;
const SITE = 'campaign.yao.care';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const MARK = (c) => `<span style="display:inline-block;width:.9em;height:.9em;border:3px solid ${c};position:relative;vertical-align:-.05em">
  <span style="position:absolute;left:.15em;right:.15em;top:calc(50% - 1.5px);border-top:3px solid ${c}"></span></span>`;

const shell = (bg, ink, inner) => `<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${W}px;height:${H}px}
  body{background:${bg};color:${ink};font-family:${FONT};-webkit-font-smoothing:antialiased;
       display:flex;flex-direction:column;justify-content:center;
       padding:${SAFE_TOP}px 84px ${SAFE_BOTTOM}px}
</style></head><body>${inner}</body></html>`;

/**
 * 兩個候選版型。文案全部取自站上既有資料，未新編法律敘述：
 *   起訖日期 → src/data/media.ts village-chief-start
 *   投票日   → src/data/elections.ts voteDay
 */
const VARIANTS = {
  /** A 日期軸：把「什麼時候可以收」畫成一條線，裁切後仍完整 */
  timeline: () => shell(C.alt, C.ink, `
    <div style="display:flex;align-items:center;gap:14px;font-size:30px;font-weight:700;color:${C.stamp}">
      ${MARK(C.stamp)}<span style="color:${C.ink}">政治獻金指南</span>
      <span style="font-size:24px;font-weight:600;color:${C.muted}">campaign.yao.care</span>
    </div>
    <div style="font-size:78px;font-weight:900;line-height:1.15;margin-top:26px;letter-spacing:-.02em">
      2026 地方選舉<br><span style="color:${C.stamp}">政治獻金什麼時候可以收</span>
    </div>
    <div style="display:flex;align-items:flex-start;margin-top:40px">
      ${[
        ['8/20', '可以開始收', C.stamp],
        ['11/27', '收受期間最後一天', C.ink2],
        ['11/28', '投票日', A.brand],
      ].map(([d, t, c], i) => `
        <div style="flex:1;position:relative;padding-right:24px">
          <div style="height:10px;background:${i === 2 ? A.brand : C.stamp};opacity:${i === 2 ? 1 : 0.85 - i * 0.25}"></div>
          <div style="font-size:52px;font-weight:900;color:${c};margin-top:18px;line-height:1">${d}</div>
          <div style="font-size:26px;color:${C.ink2};margin-top:8px">${t}</div>
        </div>`).join('')}
    </div>`),

  /** B 公告章：一個日期打到底，遠看只讀一件事 */
  stamp: () => shell(C.stamp, '#fff', `
    <div style="display:flex;align-items:center;gap:14px;font-size:30px;font-weight:700;color:#ffd9d2">
      ${MARK('#ffd9d2')}<span>政治獻金指南</span>
      <span style="font-size:24px;font-weight:600;opacity:.8">campaign.yao.care</span>
    </div>
    <div style="display:flex;align-items:center;gap:52px;margin-top:28px">
      <div style="flex:0 0 auto;border:8px solid #fff;padding:22px 30px;text-align:center;line-height:1">
        <div style="font-size:34px;font-weight:700;letter-spacing:.1em">115</div>
        <div style="font-size:104px;font-weight:900;margin-top:10px">8<span style="font-size:52px">月</span>20<span style="font-size:52px">日</span></div>
      </div>
      <div>
        <div style="font-size:72px;font-weight:900;line-height:1.2;letter-spacing:-.02em">
          才能開始<br>收政治獻金
        </div>
        <div style="font-size:30px;line-height:1.6;margin-top:20px;color:#ffe2db">
          早一天收，罰兩倍，錢還會被沒入。<br>可以捐多少、誰不能捐，站上都查得到。
        </div>
      </div>
    </div>`),

  /** C 問句：走 appi.news 自己的深藍＋金，最不像外站廣告 */
  question: () => shell(C.ground, A.ink, `
    <div style="display:flex;align-items:center;gap:14px;font-size:30px;font-weight:700">
      ${MARK(C.stamp)}<span>政治獻金指南</span>
      <span style="font-size:24px;font-weight:600;color:${C.muted}">campaign.yao.care</span>
    </div>
    <div style="font-size:70px;font-weight:900;line-height:1.24;margin-top:30px;letter-spacing:-.02em">
      <span style="background:${A.accentSoft};color:${A.accent};padding:0 12px;border-radius:6px">里長</span>
      要選了，<br>可以開始收政治獻金了嗎？
    </div>
    <div style="display:flex;gap:16px;margin-top:34px">
      ${['8/20 才能開始收', '一年最多捐 10 萬', '11 款人不能捐', '最多抵 20 萬的稅'].map((t) => `
        <div style="border:2px solid ${C.rule};border-left:5px solid ${C.stamp};padding:16px 20px;
             font-size:27px;font-weight:700;color:${C.ink}">${esc(t)}</div>`).join('')}
    </div>`),
};

/** 桌機實際只看得到 630×236 那一塊，產一張對稿圖避免上線才發現被切掉 */
const cropProof = (src) => `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:700px;height:320px;background:#fff;font-family:${FONT}}
  body{padding:34px 35px}
  .label{position:absolute;top:10px;left:35px;font-size:16px;color:#6a6f76}
  .box{width:630px;height:236px;overflow:hidden;border:1px solid ${C.rule};border-left:5px solid ${A.brand}}
  .box img{width:100%;height:100%;object-fit:cover;display:block}
</style></head><body>
  <div class="label">桌機實際可見範圍模擬：630×236，object-fit:cover</div>
  <div class="box"><img src="${src}"></div>
</body></html>`;

async function shot(html, w, h, out) {
  const tmp = `/tmp/banner-${Math.random().toString(36).slice(2)}.html`;
  await writeFile(tmp, html);
  await new Promise((res, rej) => {
    const p = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
      '--allow-file-access-from-files',
      `--window-size=${w},${h}`, '--force-device-scale-factor=1',
      `--screenshot=${out}`, '--virtual-time-budget=3000', `file://${tmp}`], { stdio: 'ignore' });
    p.on('exit', (c) => (c === 0 ? res() : rej(new Error(`Chrome exit ${c}`))));
  });
}

const run = (cmd, args) => new Promise((res, rej) => {
  const p = spawn(cmd, args, { stdio: 'ignore' });
  p.on('exit', (c) => (c === 0 ? res() : rej(new Error(`${cmd} exit ${c}`))));
});

await mkdir('public/partners', { recursive: true });
for (const [name, tpl] of Object.entries(VARIANTS)) {
  const png = `public/partners/appi-news-${name}.png`;
  await shot(tpl(), W, H, png);
  // 對方版位吃 webp，品質 88 在這種平面色塊上看不出差異，檔案小一個量級
  await run('cwebp', ['-quiet', '-q', '88', png, '-o', png.replace('.png', '.webp')]);
  const proof = `public/partners/appi-news-${name}-crop-proof.png`;
  await shot(cropProof(`file://${process.cwd()}/${png}`), 700, 320, proof);
  console.log(`  ${png}  ${W}×${H}`);
}
console.log('\n共 3 個版型，各含 png / webp / 裁切對稿圖');
