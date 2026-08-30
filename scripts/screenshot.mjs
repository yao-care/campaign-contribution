/** CDP 截圖：精確控制 viewport，含行動裝置模擬 */
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [url, out, w, h, dark] = process.argv.slice(2);
const port = 9222 + Math.floor(Math.random() * 500);

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`,
  '--no-first-run', '--user-data-dir=' + process.env.TMPDIR + 'cdp-' + port], { stdio: 'ignore' });

const targets = await (async () => {
  for (let i = 0; i < 60; i++) {
    try { return await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); }
    catch { await new Promise((r) => setTimeout(r, 200)); }
  }
  throw new Error('CDP 連不上');
})();

const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (pending.has(m.id)) pending.get(m.id)(m.result); };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });

await send('Emulation.setDeviceMetricsOverride', {
  width: +w, height: +h, deviceScaleFactor: 2, mobile: +w < 600 });
if (dark === 'dark') await send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
await send('Page.enable');
await send('Page.navigate', { url });
await new Promise((r) => setTimeout(r, 1800));
const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: process.env.VIEWPORT_ONLY ? false : true });
await writeFile(out, Buffer.from(data, 'base64'));
console.log(`${out} ${w}x${h}${dark === 'dark' ? ' dark' : ''}`);
ws.close(); chrome.kill();
