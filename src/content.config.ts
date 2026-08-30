/**
 * Content collections — Astro 7 API。
 * 注意：Astro 7 已移除 `type: 'content'`，一律改用 loader；設定檔位置也從
 * src/content/config.ts 移到 src/content.config.ts（建站規格 §3.5 寫的是舊版寫法）。
 *
 * 法條原文「不」放在 frontmatter。原文由 scripts/fetch-law.mjs 從全國法規資料庫
 * 抓進 src/data/law.json，頁面在建置期讀取；md 只放人工撰寫的白話詮釋。
 * 這是為了讓建站規格 §12 第 1 條紅線（禁止模型改寫或憑記憶填寫法條）在架構上就成立，
 * 而不是靠寫作紀律。
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** 每頁共用：§9.3 規定的三區塊 + 可稽核的出處欄位 */
const shared = {
  /** H1 正下方三行事實句，每行須含具體數字或日期 */
  keypoints: z.array(z.string()).length(3),
  /** 40–60 字結論段，獨立成句，不以「這個」「上述」開頭 */
  conclusion: z.string(),
  /** 頁尾「接下來會問什麼」3–5 條 */
  nextQuestions: z.array(z.object({ q: z.string(), href: z.string() })).min(3).max(5),
  updated: z.coerce.date(),
  /** 審閱者署名。法規內容沒有署名與日期不會被引用（§9.1 第 5 條） */
  reviewer: z.string(),
  noindex: z.boolean().default(false),
};

const law = defineCollection({
  loader: glob({ base: './src/content/law', pattern: '**/*.md' }),
  schema: z.object({
    article: z.number().int().positive(),   // 條號，對應 law.json 的 key
    title: z.string(),                      // 一句話主題
    repealed: z.boolean().default(false),   // 第 16 條為（刪除）
    relatedTool: z.string().optional(),
    relatedArticles: z.array(z.number()).default([]),
    ...shared,
  }),
});

const donors = defineCollection({
  loader: glob({ base: './src/content/donors', pattern: '**/*.md' }),
  schema: z.object({
    clause: z.number().int().min(1).max(11), // 第 7 條第 1 項第幾款
    target: z.string(),
    verifyAgency: z.array(z.string()).min(1),
    ...shared,
  }),
});

const elections = defineCollection({
  loader: glob({ base: './src/content/elections', pattern: '**/*.md' }),
  schema: z.object({
    position: z.string(),
    /** 第 12 條只有四款；11 個頁面依這四款歸類，不是十一套規則（§5.3） */
    clause12: z.number().int().min(1).max(4),
    startOffsetMonths: z.union([z.literal(12), z.literal(10), z.literal(8), z.literal(4)]),
    partyDonationCap: z.number().int().positive(),  // 第 18 條第 2 項上限（元）
    ...shared,
  }),
});

const forms = defineCollection({
  loader: glob({ base: './src/content/forms', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    basis: z.array(z.number()).min(1),   // 依據條號
    /** 書表頁用 Article + 有序步驟，不用 HowTo（已停止顯示複合式結果，§9.4） */
    steps: z.array(z.string()).default([]),
    ...shared,
  }),
});

const glossary = defineCollection({
  loader: glob({ base: './src/content/glossary', pattern: '**/*.md' }),
  schema: z.object({
    term: z.string(),
    aliases: z.array(z.string()).default([]),
    basis: z.array(z.number()).default([]),
    ...shared,
  }),
});

const faq = defineCollection({
  loader: glob({ base: './src/content/faq', pattern: '**/*.md' }),
  schema: z.object({
    question: z.string(),   // H1 即完整問句（§9.1 第 1 條）
    basis: z.array(z.number()).default([]),
    ...shared,
  }),
});

const guides = defineCollection({
  loader: glob({ base: './src/content/guides', pattern: '**/*.md' }),
  schema: z.object({
    scenario: z.string(),
    audience: z.enum(['donor', 'candidate', 'public']),
    ...shared,
  }),
});

const updates = defineCollection({
  loader: glob({ base: './src/content/updates', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    ...shared,
  }),
});

export const collections = { law, donors, elections, forms, glossary, faq, guides, updates };
