// @ts-check
import { defineConfig } from 'astro/config';
import { SITE } from './src/site.mjs';

export default defineConfig({
  site: SITE.origin,
  output: 'static',
  trailingSlash: 'always',   // 路由表全站以 / 結尾（建站規格 §4）
  build: {
    format: 'directory',
    inlineStylesheets: 'always',  // 零 JS 頁面省一次往返，助 TTFB < 500ms（§10.2）
  },
  // sitemap 依 §8.3 自行分片，不用 @astrojs/sitemap（它只產 sitemap-0/1，無法分區診斷）
});
