// @ts-check
import { defineConfig } from 'astro/config';
import { SITE } from './src/site.mjs';

export default defineConfig({
  site: SITE.origin,
  output: 'static',
  trailingSlash: 'always',   // 路由表全站以 / 結尾（建站規格 §4）
  build: {
    format: 'directory',
    /**
     * 不用 'always'。全站共用樣式約 9 KB，內聯到 8,445 頁等於重複 75 MB，
     * 且跨頁瀏覽時每頁都要重新下載。改為外部樣式表後可被瀏覽器快取，
     * 第二頁之後反而更快；首頁多一次往返，仍遠低於 TTFB 500ms 的目標。
     */
    inlineStylesheets: 'auto',
  },
  // sitemap 依 §8.3 自行分片，不用 @astrojs/sitemap（它只產 sitemap-0/1，無法分區診斷）
});
