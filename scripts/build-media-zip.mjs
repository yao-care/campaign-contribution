/**
 * 素材整包 ZIP。用系統 zip 指令，不引入相依套件。
 * 內含所有 PNG、純文字版與授權說明。
 */
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { MEDIA, FORMAT_LABEL, LICENSE } from '../src/data/media.ts';
import { SITE } from '../src/site.mjs';

const STAGE = '/tmp/campaign-media';
await rm(STAGE, { recursive: true, force: true });
/** 資料夾與檔名一律 ASCII：zip 沒有統一的檔名編碼，中文在 Windows 解壓常變亂碼 */
await mkdir(`${STAGE}/images`, { recursive: true });
await mkdir(`${STAGE}/text`, { recursive: true });

for (const m of MEDIA) {
  for (const f of m.formats) {
    if (f === 'text' || f === 'video-script') continue;
    execFileSync('cp', [`public/media/${m.slug}-${f}.png`, `${STAGE}/images/${m.slug}-${f}.png`]);
  }
  await writeFile(`${STAGE}/text/${m.slug}.txt`,
    `${m.sub}\n${'─'.repeat(24)}\n\n${m.body.join('\n\n')}\n\n` +
    `── 可直接複製轉發 ──\n\n${m.lineText}\n\n` +
    `── 圖片替代文字 ──\n\n${m.alt}\n\n` +
    `法條依據：${m.lawRefs.map((r) => r.label).join('、')}\n` +
    `完整說明：${SITE.origin}/media/${m.slug}/\n`);
}

await writeFile(`${STAGE}/README-license-and-sources.txt`,
`政治獻金指南　宣導素材
${SITE.origin}

授權
────
本素材以 ${LICENSE.name}（姓名標示 4.0 國際）釋出。
${LICENSE.url}

可以自由轉發、印製、剪裁、改作，包括商業用途，
只要標示來源為「政治獻金指南 ${SITE.origin.replace('https://', '')}」即可。
不需要事先告知或取得同意。

法條原文屬公文，依著作權法第 9 條不得為著作權標的，不受本授權拘束。

關於本站
────────
自費製作的民間網站，與內政部、監察院、中央選舉委員會均無委託或合作關係，
未使用任何機關的識別標誌。

素材文案取自站上既有的法條資料與白話說明。法條原文取自全國法規資料庫，
收受起算日與書表依監察院公告。白話說明未經機關審閱，有疑義時以原文為準。

站點聲明：${SITE.origin}/about/statement/

內容
────
images/  ${MEDIA.reduce((a, m) => a + m.formats.filter((f) => f !== 'text' && f !== 'video-script').length, 0)} 張 PNG
text/    ${MEDIA.length} 個知識點的完整文字與轉發文案

尺寸說明
────────
${Object.entries(FORMAT_LABEL).map(([k, v]) => `${k.padEnd(14)} ${v}`).join('\n')}
`);

const OUT = resolve('public/media/campaign-yao-care-media.zip');
await rm(OUT, { force: true });
execFileSync('zip', ['-rq', OUT, '.'], { cwd: STAGE });
const size = execFileSync('du', ['-h', 'public/media/campaign-yao-care-media.zip']).toString().split('\t')[0];
console.log(`  public/media/campaign-yao-care-media.zip  ${size}`);
