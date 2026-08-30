# 政治獻金指南　維護手冊

`campaign.yao.care`。自費製作的民間網站，與內政部、監察院、中央選舉委員會均無委託或合作關係。

## 這份文件的規矩

**不寫會過期的數字。** 幾條法規、幾個村里、幾頁、幾張圖、品質分數多少——一律不寫在這裡，寫指令。
數字寫進文件的那一刻就開始腐爛，而讀的人沒有辦法知道它是什麼時候的。

要看現況，跑：

```sh
npm run stat            # 法條、村里、政黨、行政區、申報統計、屆別、圖檔、頁數、依賴版本
npm run stat -- --json  # 同上，機器可讀
```

要新增一項現況指標，改 `scripts/stat.mjs`，**不要抄進這份文件或 README**。
`npm run check:docs` 會拿 `stat` 當下算出來的每個值回頭掃文件，抄過去就會失敗。

---

## 一分鐘上手

```sh
npm install
npm run dev             # 開發伺服器
npm run build           # 抓外部資料 + 建置（慢，見下）
npm run build:only      # 只建置，用 repo 內已提交的資料
```

`npm run build` 會先跑 `npm run data` 重新抓取外部資料。日常開發用 `build:only`，
建置本身要數分鐘（頁數見 `npm run stat`）。

## 出手前一定要跑的五個檢查

```sh
npm run check           # 型別。0 errors 才算過
npm run check:dates     # 日期在四個時區下是否一致
npm run check:links     # 站內連結，嚴格比對不做 Unicode 正規化
npm run check:docs      # 文件裡有沒有被抄過去的現況數字
npm run audit           # 散文品質：重疊率、AI 味、具體詞比
```

五個都過才推。CI 會再跑一次，但**本機先跑**——CI 失敗會佔用部署佇列。

### 為什麼有 `check:dates` 這一關

日期算錯不會讓建置失敗，型別檢查也看不出來。而開發機在 `+08`、CI runner 在 UTC，
所以錯的那一版**只在線上出現，本機永遠看起來正確**。

2026-08-30 就是這樣讓線上全站每個日期都少一天（投票日印成 11 月 27 日），
從實機截圖與本地 `dist` 逐行比對才發現。規則因此定死：

- **純日期（`YYYY-MM-DD`）一律用 UTC 進、UTC 出**：`new Date(iso + 'T00:00:00Z')` 配 `getUTC*` / `setUTC*`。
- **真實時刻**（例如抓取時間）用 `Intl.DateTimeFormat` 明寫 `timeZone: 'Asia/Taipei'`。
- 絕不用 `new Date(iso + 'T00:00:00+08:00')` 再配本地時區 getter。
- `.github/workflows/deploy.yml` 設 `TZ: Asia/Taipei`，讓建置期的「今天」是台北的今天。

`scripts/check-dates.mjs` 除了比對輸出，也會掃描來源檔是否又用回本地時區 getter。

### 為什麼 `check:links` 不用 `existsSync`

村里名含 CJK 相容表意文字。macOS 檔案系統會自動正規化，Linux 不會，
所以 `existsSync` 在本機永遠是 true、在 CI 才斷。`scripts/check-links.mjs` 改成
逐段比對實際的目錄項目，本機即可重現 Linux 的行為。

抓取端在 `scripts/fetch-villages.mjs` 做 NFC 正規化，兩邊一起才成立。

---

## 資料從哪來

| 資料 | 來源 | 抓取程式 |
|---|---|---|
| 政治獻金法全文 | 全國法規資料庫 | `npm run fetch:law` |
| 村里清單 | 內政部戶政司 ODRP001 | `npm run fetch:villages` |
| 現存政黨 | 內政部政黨資訊網 | `npm run fetch:parties` |
| 申報收支統計 | 監察院政治獻金公開查閱平臺 | `npm run fetch:donations` |
| 行政區彙整 | 由村里清單推導 | `npm run build:regions` |
| 開放資料下載檔 | 由上列彙整 | `npm run build:datasets` |

筆數、期別、抓取時間、內容指紋一律看 `npm run stat`。

全部一次跑：`npm run data`。**不要為了看一個數字去跑它**——那會打外部網站，
而且 repo 內已經有提交好的資料檔。

### 抓取時的三個已知坑

1. **政黨資訊網的表格由瀏覽器端產生**，抓取程序必須渲染後解析，不能只拉 HTML。
2. **監察院的政黨下載是 ZIP**，內含兩個 CSV，欄名在不同年度之間不一致
   （`收入合計` 與 `收入小計`）。`fetch-donations.mjs` 兩種都收。
3. **ODRP001 較新的期別會回傳查無資料**，抓取程序自動退回最新可用期別。
   目前用的期別看 `npm run stat`。

### PUA 造字村里

戶政司資料有村里名使用私用區（PUA）碼位，在多數裝置上顯示為豆腐字。
正字必須人工對照戶政司或內政部的正式公告後替換——**抓取程序只列清單，不做推定**。

清單與數量：`npm run stat`（最後一段）。

---

## 部署

推到 `main` 就會自動建置並部署到 GitHub Pages。另有每日排程重建，
因為導覽列分期與倒數天數是建置期算出來的靜態值。

```sh
gh run list -L 3                          # CI 狀態
gh run view <id> --json jobs -q '.jobs[]|"\(.name) \(.conclusion)"'
```

**推完要驗線上，不要假設部署成功就等於內容正確**：

```sh
# 線上與本地 dist 逐行比對（挑一頁有日期、有數字的）
curl -s "https://campaign.yao.care/countdown/?x=$RANDOM" > /tmp/live.html
diff <(sed 's/></>\n</g' /tmp/live.html) <(sed 's/></>\n</g' dist/countdown/index.html)
```

`last-modified` 標頭可以確認拿到的是不是最新那次部署：

```sh
curl -sI https://campaign.yao.care/countdown/ | grep -i 'last-modified\|age'
```

手動觸發重新抓資料再部署：GitHub Actions 的 `workflow_dispatch`，勾 `refresh_data`。

---

## 架構的硬規則

改東西之前先讀這一節，這些不是偏好，是先前踩過的。

- **零執行期 JavaScript**，例外只有 `/tools/can-i-donate/` 與 `/search/` 兩頁的漸進增強。
- **不放 cookie、不做追蹤、不載入外部腳本**。這寫在 `/about/statement/` 上，
  加任何分析工具都要先改那段聲明——見下面〈還沒決定的事〉。
- **D3 只在建置期當數學函式庫用**（`d3-scale` / `d3-array` / `d3-shape`），輸出 inline SVG。
  永遠不要引入 `d3-selection`。
- **色彩以 OKLCH 為正典**，`@supports not (color: oklch())` 提供 hex fallback。
  暗色是另外挑的一組階，不是把亮色反過來。色票全在 `src/styles/tokens.css`。
- **最小字級 18px，無例外**（`--text-xs`）。
- **圓角 2px**，公文感。
- **配色避開藍／綠／白／橘等政黨識別色**，所以圖表用單色相序列色加強調，不用類別色盤。
  理由寫在 `src/styles/tokens.css` 與 `docs/圖表規格.md`。
- **表格 `min-width: max-content`**，窄螢幕橫捲而不是把欄位壓到逐字換行；
  ≥64rem 時跨出量測寬，因為表格不是連續文字。
- **`src/fetch.ts` 是 Astro 保留檔名**，不要拿來放抓取程式。
- **`getStaticPaths` 看不到同檔案的 `const`**，Astro 會把它拆進另一個 chunk。
  共用資料放 `src/data/`。
- **Astro 模板裡不要寫型別斷言**（`as Record<string, number>`），
  編譯器會把 `<string` 當成 JSX。把運算移進 frontmatter。

## 內容的硬規則

- **法條原文照抄，白話說明是本站詮釋**，兩者在頁面上分開標示，且標明未經機關審閱。
- **白話說明不可以只是把法條換句話說。** 這是 `npm run audit:paraphrase` 在量的東西：
  與原文的字串重疊率、具體詞與抽象詞的比例。重疊率高就是還沒寫成人話。
- **素材文案一律取自站上既有的法條資料與白話說明**，不得新編法律敘述。
- **圖片一律有描述性 `alt`**，全站符合無障礙 110.07 AA。
- **改動處要註明原因**，不要無聲改寫。

### 選舉期間的自我約束

寫在 `/about/statement/`，程式與內容都要守：

- 不涉任何候選人或政黨的立場，不評論、不推薦、不批評。
- 政黨頁只有制度事實欄位與該黨自行申報的數字，不做跨黨排行與比較。
- 不呈現政治獻金金額排行，不做「誰收最多」這類內容。
- 村里頁在中選會公告發布前，不呈現上屆當選人姓名與得票。
- 不轉載監察院的申報公開資料，只提供查閱管道導覽。

**這直接決定了新聞怎麼用**：`npm run signal` 會依主題查詢 Google News RSS
（名單就位後也可依候選人查），但產出是 `docs/選題訊號.md`，
**內部選題用，不進版控也不上站**——自動抓來的媒體標題必然帶著該媒體的框架。
對外只收主管機關的公告，寫進 `src/data/updates.ts`。

---

## 屆別：換屆時要改什麼

站上所有日期由 `src/data/elections.ts` 的 `CYCLES` 推算。目前收錄哪幾屆看 `npm run stat`。

換屆的正確做法：

1. 在 `CYCLES` **新增一筆**，不要改舊的那筆。
2. 把 `CURRENT_CYCLE_ID` 指到新的。
3. 起算日一律以主管機關公告為準，**不由任期屆滿日自行推算**
   （建站規格 §5.3 推算出的日期與監察院公告不符，公告優先）。
4. `npm run check:dates` 加上該屆的期望值。

舊屆的頁面與網址原封保留。**不要就地覆蓋**——四年累積的外部連結與搜尋排名都掛在網址上，
覆蓋一次就洗掉一次，「下屆成效更佳」就永遠不會發生。

---

## 素材與對外物件

```sh
npm run build:media     # 長輩圖三版型、懶人包長圖、A4 傳單、下載 ZIP
npm run banner          # appi.news 首頁 seasonal 版位橫幅
npm run shot <url> <out.png> <w> <h> [dark]   # CDP 截圖，可模擬行動裝置
```

素材的文案來源是 `src/data/media.ts`，版型在 `scripts/build-media.mjs`。

**長輩圖的字級守下限，不讓文案長度把字壓小**：塞不下就 build 直接報錯，
要求改短文案。這是刻意的——長輩圖是隔一公尺看手機的人在看。

橫幅版位的規格（尺寸、裁切安全區）寫在 `scripts/build-banner.mjs` 的檔頭，
是實測對方線上 CSS 得到的，不是照慣例猜的。對方版位改版時要重測。

---

## 還沒決定的事

**Search Console 與 Google Analytics 等承辦點頭才開通。**

- GSC 只需要 DNS TXT 驗證，不用在頁面放任何程式碼。
- GA4 要載 `gtag.js` 並寫 cookie，**會抵觸 `/about/statement/` 上「不放 cookie、
  不做追蹤、不載入外部腳本」那段**，也破壞零執行期 JavaScript 的架構。
  要上就必須同時改寫那段聲明。

開通之後才有辦法量「三種長輩圖版型哪一種有人看」——目前站上沒有後端也沒有 JS，
唯一的訊號是下載次數，而 GitHub Pages 不給 access log。頁面上因此**沒有假裝在投票**。

---

## 其他文件

| 文件 | 是什麼 |
|---|---|
| `README.md` | 對外說明：這站是什麼、資料從哪來、限制在哪 |
| `docs/建站規格.md` | **歷史文件**：原始需求規格與勘誤紀錄。現況以本檔與 `npm run stat` 為準 |
| `docs/圖表規格.md` | 各頁面適用的圖表型式與色彩規則 |
| `docs/選題訊號.md` | `npm run signal` 的產出，內部用，不進版控 |
