import { z } from "zod";

export const blogPatternSchema = z.enum([
  "JSON_INDIVIDUAL",
  "JSON_ARRAY",
  "TS_MODULE",
  "MONOREPO",
  "CUSTOM_ROUTE",
  "NO_BLOG",
]);

export const siteThemeSchema = z.enum(["LOCAL_SERVICE", "SAAS"]);

export const articleStatusSchema = z.enum([
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "PUBLISHING",
  "PUBLISHED",
  "FAILED",
  "REJECTED",
]);

export const createSiteSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  repoName: z.string().min(1).max(100),
  repoOwner: z.string().default("angelo222ange"),
  domain: z.string().optional(),
  theme: siteThemeSchema,
  city: z.string().optional(),
  department: z.string().optional(),
  blogPattern: blogPatternSchema,
  blogBasePath: z.string().default("/blog"),
  contentDir: z.string().default("content/blog"),
  imageDir: z.string().default("public/images/blog"),
  deployScript: z.string().optional(),
  vpsPath: z.string().optional(),
});

export const updateSiteSchema = createSiteSchema.partial();

export const createArticleSchema = z.object({
  siteId: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(200),
  metaTitle: z.string().min(1).max(70),
  metaDescription: z.string().min(1).max(160),
  content: z.record(z.unknown()),
  keywords: z.array(z.string()),
  category: z.string().optional(),
  readTime: z.string().optional(),
  imageUrls: z.array(z.string()).default([]),
});

export const updateArticleStatusSchema = z.object({
  status: articleStatusSchema,
});

export const createScheduleSchema = z.object({
  siteId: z.string().min(1),
  cronExpr: z.string().min(1),
  timezone: z.string().default("Europe/Paris"),
  isActive: z.boolean().default(true),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const generateArticleSchema = z.object({
  siteId: z.string().min(1),
  topicHint: z.string().optional(),
  imageSource: z.enum(["auto", "ai", "pexels", "wikimedia"]).optional(),
});

// ─── Social Media Schemas ───

export const socialPlatformSchema = z.enum([
  "facebook",
  "instagram",
  "linkedin",
  "twitter",
  "pinterest",
  "tiktok",
]);

export const socialPostStatusSchema = z.enum([
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "PUBLISHING",
  "PUBLISHED",
  "FAILED",
]);

export const updateSocialConfigSchema = z.object({
  autoPublish: z.boolean(),
  defaultHashtags: z.array(z.string()).default([]),
});

export const updateSocialPostSchema = z.object({
  content: z.string().min(1).optional(),
  hashtags: z.array(z.string()).optional(),
});

export const generateSocialPostsSchema = z.object({
  platforms: z.array(socialPlatformSchema).optional(),
});
