export type BlogPattern =
  | "JSON_INDIVIDUAL"
  | "JSON_ARRAY"
  | "TS_MODULE"
  | "MONOREPO"
  | "CUSTOM_ROUTE"
  | "NO_BLOG";

export type SiteTheme = "LOCAL_SERVICE" | "SAAS";

export type ArticleStatus =
  | "DRAFT"
  | "REVIEW"
  | "APPROVED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED"
  | "REJECTED";

export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "twitter"
  | "pinterest"
  | "tiktok";

export type SocialPostStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED";

export interface SiteConfig {
  name: string;
  domain: string;
  city?: string;
  department?: string;
  phone?: string;
  phoneLink?: string;
  theme: SiteTheme;
  colors?: Record<string, string>;
  services?: Array<{ name: string; slug: string }>;
  zones?: Array<{ name: string; slug: string }>;
}

export interface ExistingArticle {
  slug: string;
  title: string;
  date: string;
  category?: string;
  keywords?: string[];
  excerpt?: string;
}

export interface GeneratedArticle {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  date: string;
  author: string;
  category: string;
  readTime: string;
  excerpt: string;
  keywords: string[];
  intro: string;
  tldr: string;
  sections: ArticleSection[];
  faq: Array<{ question: string; answer: string }>;
  conclusion: string;
  internalLinks: Array<{ text: string; href: string }>;
  externalLinks: Array<{ text: string; href: string; source: string }>;
  images: ArticleImage[];
}

export interface ArticleSection {
  id: string;
  title: string;
  content: string;
  list?: Array<{ title: string; description: string }>;
  table?: {
    headers: string[];
    rows: string[][];
  };
}

export interface ArticleImage {
  filename: string;
  alt: string;
  buffer?: Buffer;
  url?: string;
  sizes?: {
    sm: string;
    md: string;
    lg: string;
  };
}

export interface FileWrite {
  path: string;
  content: string | Buffer;
  encoding: "utf-8" | "binary";
}

export interface FileModification {
  path: string;
  type: "json-merge" | "json-array-push" | "tsx-add-import" | "ts-add-export";
  apply: (existingContent: string) => string;
}

export interface AdapterOutput {
  articleFile: FileWrite;
  indexUpdate: FileModification;
  pageUpdate?: FileModification;
  imageFiles: FileWrite[];
  sitemapUpdate?: FileModification;
}

export interface SiteAdapter {
  readonly pattern: BlogPattern;
  crawlExistingArticles(repoDir: string): Promise<ExistingArticle[]>;
  parseSiteConfig(repoDir: string): Promise<SiteConfig>;
  formatArticle(
    article: GeneratedArticle,
    siteConfig: SiteConfig
  ): AdapterOutput;
}
