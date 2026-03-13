import type { FastifyInstance } from "fastify";
import type { SocialPlatform } from "@blogengine/core";
import { generateSocialPostsSchema, updateSocialPostSchema } from "@blogengine/core";
import { generateSocialPosts, getPlatformClient, decrypt, fetchMetrics, crawlNicheTrends, getNicheTrendsForSite } from "@blogengine/social";
import type { ArticleForSocial, TopPerformerData, NicheTrendData } from "@blogengine/social";
import { prisma } from "../lib/prisma.js";
import { authGuard } from "../lib/auth.js";
import { sendSuccessNotification, sendErrorNotification, formatSocialPublishSuccess, formatSocialPublishError } from "../lib/notify.js";
import { getSiteImagesForSocial } from "../lib/site-image-scraper.js";
import path from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

// ─── Image Search for Social Posts ───

/** Get the og:image from a website (high-quality hero image only). */
async function getSiteOgImage(domain: string): Promise<string | null> {
  try {
    const url = domain.startsWith("http") ? domain : `https://${domain}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "BlogEngine/1.0" },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Only extract og:image (verified high-quality hero image)
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (ogMatch?.[1]) {
      const imgUrl = ogMatch[1];
      // Skip low quality indicators
      if (imgUrl.includes("favicon") || imgUrl.includes("logo") || imgUrl.includes("icon") ||
          imgUrl.includes(".svg") || imgUrl.includes("thumb") || imgUrl.includes("apple-")) {
        return null;
      }
      return imgUrl;
    }
    return null;
  } catch {
    return null;
  }
}

/** Theme-specific English search terms for better Pexels/Unsplash results. */
const THEME_SEARCH_TERMS: Record<string, string[]> = {
  "rideau": ["metal roller shutter shop front", "steel security shutter commercial", "roller shutter door closed", "metal shutter storefront night", "shop security door metal"],
  "drm": ["metal roller shutter shop front", "steel security shutter commercial", "roller shutter door closed", "metal shutter storefront"],
  "serrur": ["door lock mechanism closeup", "locksmith tools keys", "security lock installation", "key lock brass door", "safe lock security"],
  "plomb": ["plumbing pipe repair", "water pipe installation", "bathroom faucet modern", "plumber copper pipe", "water heater installation"],
  "electri": ["electrical panel wiring", "circuit breaker professional", "electrical installation house", "electrician switchboard"],
  "demenag": ["moving boxes stack", "moving truck loading", "furniture movers boxes", "apartment packing cardboard"],
  "nettoy": ["professional cleaning service", "clean office workspace", "pressure washing building", "window cleaning professional"],
  "saas": ["software dashboard screen", "tech startup workspace", "digital analytics dashboard", "modern app interface laptop"],
  "local_service": ["local business storefront", "professional service worker", "small business shop front"],
  "menuisi": ["wood workshop carpentry", "furniture making wood", "carpentry tools workbench", "wooden door handcrafted"],
  "peintur": ["house painting roller", "painter wall interior", "fresh paint room renovation", "painting supplies professional"],
  "toitur": ["roof repair tiles", "rooftop construction work", "roof shingles installation", "roofer working safety"],
  "vitri": ["glass window installation", "glazier working glass", "storefront glass door", "window repair replacement"],
  "climati": ["air conditioning unit", "HVAC system installation", "climate control thermostat", "air conditioning repair"],
};

function getSearchTermsForSite(siteName: string, siteTheme: string, topic?: string): string[] {
  const combined = `${siteName} ${siteTheme} ${topic || ""}`.toLowerCase();
  const terms: string[] = [];

  // Find ALL matching theme-specific terms (check name, theme, AND topic)
  for (const [key, searchTerms] of Object.entries(THEME_SEARCH_TERMS)) {
    if (combined.includes(key)) {
      terms.push(...searchTerms);
      break; // Use the first (most specific) match
    }
  }

  // If topic provided and no theme match found, use topic as direct search
  // but make it more specific by combining with site context
  if (terms.length === 0 && topic) {
    terms.push(topic);
    // Also add a more specific version
    if (siteName) {
      terms.push(`${topic} professional`);
    }
  }

  // Fallback
  if (terms.length === 0) {
    terms.push(...(THEME_SEARCH_TERMS["local_service"] || ["professional business"]));
  }

  // Shuffle to get variety across posts
  for (let i = terms.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [terms[i], terms[j]] = [terms[j]!, terms[i]!];
  }

  return terms;
}

/**
 * Search for a high-quality image using Pexels API.
 */
async function searchPexelsImage(query: string, exclude: Set<string>): Promise<string | null> {
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (!pexelsKey) return null;
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape&size=large`,
      { headers: { Authorization: pexelsKey }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    for (const photo of data.photos || []) {
      const url = photo.src.large2x || photo.src.large;
      if (!exclude.has(url)) return url;
    }
  } catch {}
  return null;
}

/**
 * Search for a high-quality image using Unsplash API.
 */
async function searchUnsplashImage(query: string, exclude: Set<string>): Promise<string | null> {
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!unsplashKey) return null;
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${unsplashKey}` }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    for (const photo of data.results || []) {
      const url = photo.urls.regular;
      if (!exclude.has(url)) return url;
    }
  } catch {}
  return null;
}

/**
 * AI Image Strategy by site theme:
 * - SERVICE/ARTISAN: Object/equipment photos WITHOUT people (uniforms are unknown)
 * - SAAS/TECH: Abstract illustrations, data viz, flat design
 * - ECOMMERCE: Product-focused, lifestyle without faces
 * - Default: Clean graphic/infographic style (never realistic people)
 */
const AI_IMAGE_STYLES: Record<string, string> = {
  LOCAL_SERVICE: "Professional photograph showing the END RESULT of the service or the object the business works on. For example: a perfectly installed metal shutter on a shop front, a clean repaired bathroom, a beautiful new lock on a door. Show the FINISHED WORK, not tools or equipment. Clean, well-lit, realistic editorial photography style. NO people visible.",
  SAAS: "Clean screenshot-style mockup showing a modern software interface on a laptop or phone screen, from a slight angle. The screen shows a clean dashboard with charts and data. Blurred modern office background. Professional tech photography. NO faces visible, person can be seen from behind or just hands on keyboard.",
  ECOMMERCE: "Professional product photography: the product beautifully displayed in a lifestyle context. Clean background, natural lighting, editorial style. Show the product being used in real life. NO faces visible.",
  COACHING: "Inspiring workspace scene: clean desk with notebook, coffee, laptop showing motivational content. Warm natural lighting, minimalist aesthetic. Professional lifestyle photography. NO faces visible, can show person from behind.",
  DEFAULT: "Professional editorial photograph related to the business theme. Clean, well-lit, modern aesthetic. Focus on the subject matter of the business. NO faces visible.",
};

function getAIImageStyle(theme: string): string {
  const t = theme.toUpperCase();
  if (t.includes("SERVICE") || t.includes("ARTISAN") || t.includes("LOCAL")) return AI_IMAGE_STYLES.LOCAL_SERVICE!;
  if (t.includes("SAAS") || t.includes("TECH") || t.includes("SOFTWARE")) return AI_IMAGE_STYLES.SAAS!;
  if (t.includes("COMMERCE") || t.includes("SHOP") || t.includes("BOUTIQUE")) return AI_IMAGE_STYLES.ECOMMERCE!;
  if (t.includes("COACH") || t.includes("CONSEIL") || t.includes("FORMATION")) return AI_IMAGE_STYLES.COACHING!;
  return AI_IMAGE_STYLES.DEFAULT!;
}

/**
 * Generate an image using Google Nano Banana 2 (Gemini 3.1 Flash Image).
 * NEVER generates realistic people - uses style appropriate to theme.
 * Returns image buffer or null on failure.
 */
async function generateAIImage(prompt: string, siteTheme: string = ""): Promise<Buffer | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const style = getAIImageStyle(siteTheme);
  const enhancedPrompt = `${style}\n\nSubject: ${prompt}.\n\nCRITICAL RULES:\n- ABSOLUTELY NO people, NO faces, NO hands, NO human figures\n- NO text overlay, NO watermark, NO logos\n- Aspect ratio: 16:9 landscape\n- High resolution, professional quality\n- Must look like a real professional photo or high-end design, NOT AI-generated`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: enhancedPrompt }],
          }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
            imageConfig: {
              imageSize: "1K",
            },
          },
        }),
        signal: AbortSignal.timeout(60000), // 60s - image generation is slow
      },
    );

    if (!res.ok) {
      console.error("[image-ai] Nano Banana 2 failed:", res.status, await res.text().catch(() => ""));
      return null;
    }

    const data = await res.json() as any;
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith("image/")) {
        return Buffer.from(part.inlineData.data, "base64");
      }
    }
    console.error("[image-ai] No image in response");
    return null;
  } catch (err) {
    console.error("[image-ai] Nano Banana 2 error:", err);
    return null;
  }
}

/**
 * Upload a generated image buffer to a temporary hosting service
 * so it can be used by social platform APIs.
 * Uses imgbb free API as temp host.
 */
async function uploadTempImage(imageBuffer: Buffer): Promise<string | null> {
  // Try imgbb (free, no key needed for small images)
  try {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/png" });
    formData.append("image", Buffer.from(imageBuffer).toString("base64"));

    // Use imgbb with free API key
    const imgbbKey = process.env.IMGBB_API_KEY;
    if (imgbbKey) {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ image: imageBuffer.toString("base64") }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.data?.url || data.data?.display_url || null;
      }
    }

    // Fallback: store locally and serve via API
    // Save to a temp file and serve from the API
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const crypto = await import("node:crypto");
    const filename = `social-${crypto.randomBytes(8).toString("hex")}.png`;
    const publicDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(publicDir, { recursive: true });
    await fs.writeFile(path.join(publicDir, filename), imageBuffer);

    // Return a URL that can be served by the API
    const baseUrl = process.env.SOCIAL_OAUTH_REDIRECT_BASE || "http://localhost:4000";
    return `${baseUrl}/uploads/${filename}`;
  } catch (err) {
    console.error("[image-upload] Failed to upload temp image:", err);
    return null;
  }
}

/**
 * Find a high-quality image for a social post.
 *
 * Priority cascade:
 * 1. SCRAPED SITE IMAGES (best: real photos from the client's own website)
 * 2. STOCK PHOTOS without people (Pexels/Unsplash - real pro photos)
 * 3. AI-GENERATED graphic (only if mode=ai, NEVER realistic people)
 * 4. Site og:image as last resort
 */
async function findPostImage(
  imagePrompt: string | undefined,
  siteName: string,
  siteTheme: string,
  siteId: string,
  domain?: string | null,
  topic?: string,
  existingUrls: string[] = [],
  imageMode: "ai" | "stock" = "stock",
): Promise<string | null> {
  const used = new Set(existingUrls);

  // === AI MODE: Generate image FIRST when user explicitly chose "IA Gen" ===
  if (imageMode === "ai" && imagePrompt) {
    console.log("[image] Mode AI: generating image via Gemini...");
    const imageBuffer = await generateAIImage(imagePrompt, siteTheme);
    if (imageBuffer) {
      const url = await uploadTempImage(imageBuffer);
      if (url) {
        console.log("[image] AI image generated:", url);
        return url;
      }
      // If upload failed, save locally as fallback
      try {
        const publicDir = path.join(process.cwd(), "public", "uploads", "social-images");
        if (!existsSync(publicDir)) {
          mkdirSync(publicDir, { recursive: true });
        }
        const filename = `ai-${Date.now()}.png`;
        const filepath = path.join(publicDir, filename);
        writeFileSync(filepath, imageBuffer);
        console.log(`[image] AI image saved locally: ${filepath}`);
        // Return absolute path (can be served by the API)
        return `/uploads/social-images/${filename}`;
      } catch (saveErr) {
        console.error("[image] Failed to save AI image locally:", saveErr);
      }
    }
    console.log("[image] AI generation failed, falling back to stock...");
    // Fall through to stock search as backup
  }

  // === STOCK MODE (or AI fallback): scraped images → stock → og:image ===

  // 1. SCRAPED SITE IMAGES (highest priority for stock - real client photos)
  try {
    const siteImages = await getSiteImagesForSocial(siteId, existingUrls);
    if (siteImages.length > 0) {
      const topCandidates = siteImages.slice(0, Math.min(5, siteImages.length));
      const picked = topCandidates[Math.floor(Math.random() * topCandidates.length)];
      if (picked && !used.has(picked.url)) {
        console.log(`[image] Using scraped site image: ${picked.url} (${picked.category})`);
        return picked.url;
      }
    }
  } catch (err) {
    console.error("[image] Error fetching site images:", err);
  }

  // 2. STOCK PHOTOS - use theme-specific terms FIRST
  const searchTerms = getSearchTermsForSite(siteName, siteTheme, topic);
  for (const term of searchTerms) {
    const pexelsResult = await searchPexelsImage(term, used);
    if (pexelsResult) return pexelsResult;
  }
  for (const term of searchTerms) {
    const unsplashResult = await searchUnsplashImage(term, used);
    if (unsplashResult) return unsplashResult;
  }

  // Fallback: use the LLM-generated imagePrompt for stock search
  if (imagePrompt) {
    const businessContext = searchTerms.length > 0 ? searchTerms[0] : "";
    const stockQuery = businessContext
      ? `${businessContext} ${imagePrompt.split(" ").slice(0, 4).join(" ")}`
      : imagePrompt;
    const pexelsResult = await searchPexelsImage(stockQuery, used);
    if (pexelsResult) return pexelsResult;

    const unsplashResult = await searchUnsplashImage(stockQuery, used);
    if (unsplashResult) return unsplashResult;
  }

  // 3. Site og:image as last resort
  if (domain) {
    const ogImage = await getSiteOgImage(domain);
    if (ogImage && !used.has(ogImage)) return ogImage;
  }

  return null;
}

/** Fetch top performing posts for a site to inject into AI prompt */
async function getTopPerformers(siteId: string, limit = 5): Promise<TopPerformerData[]> {
  const topMetrics = await prisma.socialPostMetrics.findMany({
    where: {
      socialPost: { siteId },
      engagementRate: { gt: 0 },
    },
    orderBy: { engagementRate: "desc" },
    take: limit,
    include: { socialPost: { select: { platform: true, content: true } } },
  });
  return topMetrics.map((m) => ({
    platform: m.socialPost.platform,
    content: m.socialPost.content,
    engagementRate: m.engagementRate,
    impressions: m.impressions,
    likes: m.likes,
    comments: m.comments,
    shares: m.shares,
  }));
}

export async function socialPostsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  // ─── Niche Trend Crawling ───

  // Crawl niche trends for a site
  app.post<{ Params: { siteId: string } }>(
    "/crawl-trends/:siteId",
    async (request, reply) => {
      const site = await prisma.site.findUnique({
        where: { id: request.params.siteId },
      });
      if (!site) return reply.status(404).send({ error: "Site introuvable" });

      const result = await crawlNicheTrends(prisma, site.id, site.name, site.theme, site.city);
      return result;
    },
  );

  // Get cached niche trends for a site
  app.get<{ Params: { siteId: string } }>(
    "/niche-trends/:siteId",
    async (request, reply) => {
      const trends = await getNicheTrendsForSite(prisma, request.params.siteId);
      return trends;
    },
  );

  // Generate social posts for an article (rate limited - costs money via AI APIs)
  app.post<{ Params: { articleId: string } }>(
    "/generate/:articleId",
    {
      config: {
        rateLimit: {
          max: 15,
          timeWindow: "15 minutes",
        },
      },
    },
    async (request, reply) => {
      const article = await prisma.article.findUnique({
        where: { id: request.params.articleId },
        include: { site: { include: { socialAccounts: true } } },
      });
      if (!article) return reply.status(404).send({ error: "Article introuvable" });

      // Get connected platforms for this site
      const accounts = article.site.socialAccounts.filter((a) => a.isActive);
      if (accounts.length === 0) {
        return reply.status(400).send({ error: "Aucun compte social connecte pour ce site" });
      }

      const body = generateSocialPostsSchema.safeParse(request.body || {});
      const requestedPlatforms = body.success && body.data.platforms
        ? body.data.platforms
        : undefined;

      // Filter platforms to only those with connected accounts
      const connectedPlatforms = [...new Set(accounts.map((a) => a.platform))] as SocialPlatform[];
      const platforms = requestedPlatforms
        ? connectedPlatforms.filter((p) => requestedPlatforms.includes(p))
        : connectedPlatforms;

      if (platforms.length === 0) {
        return reply.status(400).send({ error: "Aucune plateforme disponible" });
      }

      // Build article data for the LLM
      let contentData: any = {};
      try { contentData = JSON.parse(article.content); } catch {}

      const articleUrl = article.site.domain
        ? `https://${article.site.domain}/blog/${article.slug}`
        : `#`;

      const articleForSocial: ArticleForSocial = {
        title: article.title,
        metaDescription: article.metaDescription,
        keywords: JSON.parse(article.keywords || "[]"),
        category: article.category || undefined,
        sections: (contentData.sections || []).map((s: any) => ({ title: s.title })),
        url: articleUrl,
        heroImageUrl: article.heroImage || undefined,
        siteName: article.site.name,
        siteDescription: article.site.domain
          ? `${article.site.name} - ${article.site.theme}${article.site.city ? ` a ${article.site.city}` : ""}`
          : undefined,
      };

      // Fetch top performers for AI optimization
      const topPerformers = await getTopPerformers(article.siteId);

      // Fetch niche trends
      const nicheTrends = await getNicheTrendsForSite(prisma, article.siteId);

      // Generate posts via LLM
      const apiKey = process.env.OPENAI_API_KEY || "";
      const generatedPosts = await generateSocialPosts(articleForSocial, platforms, apiKey, { topPerformers: topPerformers.length > 0 ? topPerformers : undefined, nicheTrends: nicheTrends.length > 0 ? nicheTrends : undefined });

      // Get social config for auto-publish mode
      const socialConfig = await prisma.socialConfig.findUnique({
        where: { siteId: article.siteId },
      });
      const autoPublish = socialConfig?.autoPublish ?? false;

      // Save to DB
      const created = [];
      for (const post of generatedPosts) {
        // Find the account for this platform
        const account = accounts.find((a) => a.platform === post.platform);
        if (!account) continue;

        const socialPost = await prisma.socialPost.create({
          data: {
            articleId: article.id,
            socialAccountId: account.id,
            platform: post.platform,
            content: post.content,
            hashtags: JSON.stringify(post.hashtags),
            mediaUrls: article.heroImage ? JSON.stringify([article.heroImage]) : "[]",
            status: autoPublish ? "APPROVED" : "PENDING_REVIEW",
          },
        });
        created.push({
          ...socialPost,
          hashtags: post.hashtags,
        });
      }

      // If auto-publish, publish immediately
      if (autoPublish) {
        for (const post of created) {
          try {
            await publishSinglePost(post.id);
          } catch (err: any) {
            console.error(`[social] Auto-publish failed for ${post.platform}:`, err.message);
          }
        }
        // Refresh data
        const refreshed = await prisma.socialPost.findMany({
          where: { articleId: article.id },
        });
        return reply.status(201).send(refreshed);
      }

      return reply.status(201).send(created);
    },
  );

  // Generate standalone social post (rate limited)
  app.post<{ Params: { siteId: string } }>(
    "/generate-standalone/:siteId",
    {
      config: {
        rateLimit: {
          max: 15,
          timeWindow: "15 minutes",
        },
      },
    },
    async (request, reply) => {
      const site = await prisma.site.findUnique({
        where: { id: request.params.siteId },
        include: { socialAccounts: true },
      });
      if (!site) return reply.status(404).send({ error: "Site introuvable" });

      const accounts = site.socialAccounts.filter((a) => a.isActive);
      if (accounts.length === 0) {
        return reply.status(400).send({ error: "Aucun compte social connecte pour ce site" });
      }

      const body = request.body as any || {};
      const requestedPlatforms = body.platforms as SocialPlatform[] | undefined;
      const topic = body.topic as string | undefined;
      const imageMode = (body.imageMode === "ai" ? "ai" : "stock") as "ai" | "stock";
      const isCarousel = body.carousel === true;

      const connectedPlatforms = [...new Set(accounts.map((a) => a.platform))] as SocialPlatform[];
      const platforms = requestedPlatforms
        ? connectedPlatforms.filter((p) => requestedPlatforms.includes(p))
        : connectedPlatforms;

      if (platforms.length === 0) {
        return reply.status(400).send({ error: "Aucune plateforme disponible" });
      }

      // Build a pseudo-article from site info for the LLM
      const articleForSocial: ArticleForSocial = {
        title: topic || `Post pour ${site.name}`,
        metaDescription: topic
          ? `Post sur le theme: ${topic} - par ${site.name}`
          : `Post promotionnel pour ${site.name} - ${site.theme}`,
        keywords: site.city ? [site.name, site.city, site.theme] : [site.name, site.theme],
        category: site.theme,
        sections: topic ? [{ title: topic }] : [{ title: site.name }],
        url: site.domain ? `https://${site.domain}` : "#",
        siteName: site.name,
        siteDescription: `${site.name}${site.city ? ` base a ${site.city}` : ""} - secteur : ${site.theme}${site.domain ? ` - site : ${site.domain}` : ""}`,
      };

      // Fetch top performers for AI optimization
      const topPerformers = await getTopPerformers(site.id);

      // Fetch niche trends
      const nicheTrends = await getNicheTrendsForSite(prisma, site.id);

      const apiKey = process.env.OPENAI_API_KEY || "";
      const generatedPosts = await generateSocialPosts(articleForSocial, platforms, apiKey, { carousel: isCarousel, topPerformers: topPerformers.length > 0 ? topPerformers : undefined, nicheTrends: nicheTrends.length > 0 ? nicheTrends : undefined });

      // Get existing image URLs used on this site to avoid duplicates
      const existingPosts = await prisma.socialPost.findMany({
        where: { siteId: site.id },
        select: { mediaUrls: true },
      });
      const existingImageUrls = existingPosts
        .flatMap((p) => { try { return JSON.parse(p.mediaUrls); } catch { return []; } })
        .filter((u: string) => u && u !== "#");

      const socialConfig = await prisma.socialConfig.findUnique({
        where: { siteId: site.id },
      });
      const autoPublish = socialConfig?.autoPublish ?? false;

      // Find images for all posts in parallel for speed
      const postsWithAccounts = generatedPosts
        .map((post) => ({ post, account: accounts.find((a) => a.platform === post.platform) }))
        .filter((p) => p.account);

      const imageResults = await Promise.all(
        postsWithAccounts.map((p) =>
          findPostImage(p.post.imagePrompt, site.name, site.theme, site.id, site.domain, topic, existingImageUrls, imageMode)
        ),
      );

      const created = [];
      for (let i = 0; i < postsWithAccounts.length; i++) {
        const { post, account } = postsWithAccounts[i]!;
        const postImage = imageResults[i] || null;
        if (postImage) existingImageUrls.push(postImage);

        // For carousel posts, find images for each slide
        let carouselData: string | null = null;
        if (post.carouselSlides && post.carouselSlides.length > 0) {
          const slideImages = await Promise.all(
            post.carouselSlides.map((slide) =>
              findPostImage(slide.imagePrompt, site.name, site.theme, site.id, site.domain, topic, existingImageUrls, imageMode)
            ),
          );
          const slides = post.carouselSlides.map((slide, idx) => ({
            slideType: slide.slideType || undefined,
            title: slide.title,
            subtitle: slide.subtitle,
            highlight: slide.highlight || undefined,
            imagePrompt: slide.imagePrompt,
            imageUrl: slideImages[idx] || postImage || null,
          }));
          carouselData = JSON.stringify(slides);
          // Add all slide images to used list
          slideImages.forEach((url) => { if (url) existingImageUrls.push(url); });
        }

        const socialPost = await prisma.socialPost.create({
          data: {
            siteId: site.id,
            socialAccountId: account!.id,
            platform: post.platform,
            content: post.content,
            hashtags: JSON.stringify(post.hashtags),
            mediaUrls: postImage ? JSON.stringify([postImage]) : "[]",
            carouselData,
            status: autoPublish ? "APPROVED" : "PENDING_REVIEW",
          },
        });
        created.push({ ...socialPost, hashtags: post.hashtags });
      }

      if (autoPublish) {
        for (const post of created) {
          try { await publishSinglePost(post.id); } catch (err: any) {
            console.error(`[social] Auto-publish standalone failed for ${post.platform}:`, err.message);
          }
        }
        const refreshed = await prisma.socialPost.findMany({ where: { siteId: site.id, articleId: null } });
        return reply.status(201).send(refreshed);
      }

      return reply.status(201).send(created);
    },
  );

  // List standalone posts for a site
  app.get<{ Params: { siteId: string } }>(
    "/site/:siteId",
    async (request, reply) => {
      const posts = await prisma.socialPost.findMany({
        where: { siteId: request.params.siteId, articleId: null },
        include: { socialAccount: { select: { accountName: true, platform: true } } },
        orderBy: { createdAt: "desc" },
      });
      return posts.map((p) => ({
        ...p,
        hashtags: JSON.parse(p.hashtags),
        mediaUrls: JSON.parse(p.mediaUrls),
        carouselData: p.carouselData ? JSON.parse(p.carouselData) : null,
      }));
    },
  );

  // List posts for an article
  app.get<{ Params: { articleId: string } }>(
    "/article/:articleId",
    async (request, reply) => {
      const posts = await prisma.socialPost.findMany({
        where: { articleId: request.params.articleId },
        include: { socialAccount: { select: { accountName: true, platform: true } } },
        orderBy: { createdAt: "desc" },
      });
      return posts.map((p) => ({
        ...p,
        hashtags: JSON.parse(p.hashtags),
        mediaUrls: JSON.parse(p.mediaUrls),
        carouselData: p.carouselData ? JSON.parse(p.carouselData) : null,
      }));
    },
  );

  // Get single post
  app.get<{ Params: { postId: string } }>(
    "/:postId",
    async (request, reply) => {
      const post = await prisma.socialPost.findUnique({
        where: { id: request.params.postId },
        include: { socialAccount: { select: { accountName: true, platform: true } } },
      });
      if (!post) return reply.status(404).send({ error: "Post introuvable" });
      return {
        ...post,
        hashtags: JSON.parse(post.hashtags),
        mediaUrls: JSON.parse(post.mediaUrls),
        carouselData: post.carouselData ? JSON.parse(post.carouselData) : null,
      };
    },
  );

  // Edit a post (manual mode)
  app.patch<{ Params: { postId: string } }>(
    "/:postId",
    async (request, reply) => {
      const parsed = updateSocialPostSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const data: any = {};
      if (parsed.data.content) data.content = parsed.data.content;
      if (parsed.data.hashtags) data.hashtags = JSON.stringify(parsed.data.hashtags);

      const post = await prisma.socialPost.update({
        where: { id: request.params.postId },
        data,
      });
      return post;
    },
  );

  // Approve a post
  app.post<{ Params: { postId: string } }>(
    "/:postId/approve",
    async (request, reply) => {
      const post = await prisma.socialPost.update({
        where: { id: request.params.postId },
        data: { status: "APPROVED" },
      });
      return post;
    },
  );

  // Publish a single post
  app.post<{ Params: { postId: string } }>(
    "/:postId/publish",
    async (request, reply) => {
      try {
        const result = await publishSinglePost(request.params.postId);
        return result;
      } catch (error: any) {
        return reply.status(500).send({ error: error.message });
      }
    },
  );

  // Publish all approved posts for an article
  app.post<{ Params: { articleId: string } }>(
    "/publish-all/:articleId",
    async (request, reply) => {
      const posts = await prisma.socialPost.findMany({
        where: {
          articleId: request.params.articleId,
          status: "APPROVED",
        },
      });

      const results = [];
      for (const post of posts) {
        try {
          const result = await publishSinglePost(post.id);
          results.push({ id: post.id, platform: post.platform, status: "PUBLISHED" });
        } catch (error: any) {
          results.push({ id: post.id, platform: post.platform, status: "FAILED", error: error.message });
        }
      }
      return results;
    },
  );

  // Delete a post
  app.delete<{ Params: { postId: string } }>(
    "/:postId",
    async (request, reply) => {
      await prisma.socialPost.delete({ where: { id: request.params.postId } });
      return { ok: true };
    },
  );

  // ─── Metrics Endpoints ───

  // Fetch metrics for a single post
  app.post<{ Params: { postId: string } }>(
    "/:postId/fetch-metrics",
    async (request, reply) => {
      const post = await prisma.socialPost.findUnique({
        where: { id: request.params.postId },
        include: { socialAccount: true },
      });
      if (!post) return reply.status(404).send({ error: "Post introuvable" });
      if (post.status !== "PUBLISHED" || !post.platformPostId) {
        return reply.status(400).send({ error: "Le post doit etre publie avec un ID plateforme" });
      }

      const accessToken = decrypt(post.socialAccount.accessToken);
      const metadata = post.socialAccount.metadata ? JSON.parse(post.socialAccount.metadata) : {};
      const metrics = await fetchMetrics(post.platform, accessToken, post.platformPostId, metadata);

      if (!metrics) {
        return reply.status(400).send({ error: `Metriques non disponibles pour ${post.platform}` });
      }

      const saved = await prisma.socialPostMetrics.create({
        data: {
          socialPostId: post.id,
          impressions: metrics.impressions,
          reach: metrics.reach,
          engagement: metrics.engagement,
          likes: metrics.likes,
          comments: metrics.comments,
          shares: metrics.shares,
          saves: metrics.saves,
          clicks: metrics.clicks,
          engagementRate: metrics.engagementRate,
          rawData: JSON.stringify(metrics.rawData),
        },
      });

      return saved;
    },
  );

  // Fetch metrics for all published posts of a site
  app.post<{ Params: { siteId: string } }>(
    "/fetch-metrics-site/:siteId",
    async (request, reply) => {
      const posts = await prisma.socialPost.findMany({
        where: {
          siteId: request.params.siteId,
          status: "PUBLISHED",
          platformPostId: { not: null },
        },
        include: { socialAccount: true },
      });

      const results: Array<{ postId: string; platform: string; success: boolean; error?: string }> = [];

      for (const post of posts) {
        try {
          const accessToken = decrypt(post.socialAccount.accessToken);
          const metadata = post.socialAccount.metadata ? JSON.parse(post.socialAccount.metadata) : {};
          const metrics = await fetchMetrics(post.platform, accessToken, post.platformPostId!, metadata);

          if (metrics) {
            await prisma.socialPostMetrics.create({
              data: {
                socialPostId: post.id,
                impressions: metrics.impressions,
                reach: metrics.reach,
                engagement: metrics.engagement,
                likes: metrics.likes,
                comments: metrics.comments,
                shares: metrics.shares,
                saves: metrics.saves,
                clicks: metrics.clicks,
                engagementRate: metrics.engagementRate,
                rawData: JSON.stringify(metrics.rawData),
              },
            });
            results.push({ postId: post.id, platform: post.platform, success: true });
          } else {
            results.push({ postId: post.id, platform: post.platform, success: false, error: "Non supporte" });
          }
        } catch (err: any) {
          results.push({ postId: post.id, platform: post.platform, success: false, error: err.message });
        }
      }

      return { total: posts.length, results };
    },
  );

  // Get metrics summary for a site
  app.get<{ Params: { siteId: string } }>(
    "/metrics-summary/:siteId",
    async (request, reply) => {
      // Get latest metrics for each post (most recent fetchedAt)
      const posts = await prisma.socialPost.findMany({
        where: {
          siteId: request.params.siteId,
          status: "PUBLISHED",
        },
        include: {
          metrics: {
            orderBy: { fetchedAt: "desc" },
            take: 1,
          },
          socialAccount: { select: { accountName: true } },
        },
        orderBy: { publishedAt: "desc" },
      });

      const postsWithMetrics = posts
        .filter((p) => p.metrics.length > 0)
        .map((p) => ({
          id: p.id,
          platform: p.platform,
          content: p.content,
          publishedAt: p.publishedAt,
          platformUrl: p.platformUrl,
          accountName: p.socialAccount.accountName,
          metrics: p.metrics[0]!,
        }));

      // Aggregates
      let totalImpressions = 0;
      let totalEngagement = 0;
      let totalLikes = 0;
      let totalComments = 0;
      let totalShares = 0;
      const platformStats: Record<string, { impressions: number; engagement: number; count: number }> = {};

      for (const p of postsWithMetrics) {
        const m = p.metrics;
        totalImpressions += m.impressions;
        totalEngagement += m.engagement;
        totalLikes += m.likes;
        totalComments += m.comments;
        totalShares += m.shares;

        if (!platformStats[p.platform]) {
          platformStats[p.platform] = { impressions: 0, engagement: 0, count: 0 };
        }
        platformStats[p.platform]!.impressions += m.impressions;
        platformStats[p.platform]!.engagement += m.engagement;
        platformStats[p.platform]!.count += 1;
      }

      const avgEngagementRate = postsWithMetrics.length > 0
        ? Math.round((postsWithMetrics.reduce((sum, p) => sum + p.metrics.engagementRate, 0) / postsWithMetrics.length) * 100) / 100
        : 0;

      // Find best platform by avg engagement rate
      let bestPlatform = "-";
      let bestRate = 0;
      for (const [platform, stats] of Object.entries(platformStats)) {
        const rate = stats.count > 0 ? stats.engagement / Math.max(stats.impressions, 1) * 100 : 0;
        if (rate > bestRate) {
          bestRate = rate;
          bestPlatform = platform;
        }
      }

      return {
        totalImpressions,
        totalEngagement,
        totalLikes,
        totalComments,
        totalShares,
        avgEngagementRate,
        bestPlatform,
        bestPlatformRate: Math.round(bestRate * 100) / 100,
        postsTracked: postsWithMetrics.length,
        posts: postsWithMetrics,
      };
    },
  );
}

async function publishSinglePost(postId: string) {
  const post = await prisma.socialPost.findUnique({
    where: { id: postId },
    include: {
      socialAccount: true,
      article: { include: { site: true } },
      site: true,
    },
  });
  if (!post) throw new Error("Post introuvable");
  if (post.status !== "APPROVED") throw new Error("Post must be APPROVED before publishing");

  await prisma.socialPost.update({
    where: { id: postId },
    data: { status: "PUBLISHING" },
  });

  try {
    const client = getPlatformClient(post.platform as SocialPlatform);
    const accessToken = decrypt(post.socialAccount.accessToken);
    const metadata = post.socialAccount.metadata ? JSON.parse(post.socialAccount.metadata) : {};

    // Add username for Twitter URL
    if (post.platform === "twitter" && post.socialAccount.accountName) {
      metadata.username = post.socialAccount.accountName.replace("@", "");
    }

    // LinkedIn: ensure authorId is set from personId or platformUserId
    if (post.platform === "linkedin" && !metadata.authorId && !metadata.organizationId) {
      metadata.authorId = metadata.personId || post.socialAccount.platformUserId;
    }

    // Build full content with hashtags (only if not already present in content)
    const hashtags = JSON.parse(post.hashtags);
    let fullContent = post.content;
    if (hashtags.length > 0) {
      const firstTag = `#${hashtags[0]}`;
      const alreadyHasHashtags = fullContent.includes(firstTag);
      if (!alreadyHasHashtags) {
        const hashtagStr = hashtags.map((h: string) => `#${h}`).join(" ");
        if (post.platform === "instagram") {
          fullContent += `\n\n${hashtagStr}`;
        } else {
          fullContent += ` ${hashtagStr}`;
        }
      }
    }

    // Build URL and media - handle standalone posts (no article)
    let articleUrl: string | undefined;
    let mediaUrls: string[] | undefined;

    // Always try to get mediaUrls from the post itself first
    try {
      const postMedia = JSON.parse(post.mediaUrls);
      if (Array.isArray(postMedia) && postMedia.length > 0) {
        mediaUrls = postMedia;
      }
    } catch {}

    if (post.article) {
      const domain = post.article.site.domain;
      articleUrl = domain ? `https://${domain}/blog/${post.article.slug}` : undefined;
      if (!mediaUrls && post.article.heroImage) {
        mediaUrls = [post.article.heroImage];
      }
    } else if (post.site) {
      const domain = post.site.domain;
      articleUrl = domain ? `https://${domain}` : undefined;
    }

    const result = await client.publish({
      accessToken,
      text: fullContent,
      mediaUrls,
      link: articleUrl,
      metadata,
    });

    const updated = await prisma.socialPost.update({
      where: { id: postId },
      data: {
        status: "PUBLISHED",
        platformPostId: result.platformPostId,
        platformUrl: result.platformUrl,
        publishedAt: new Date(),
      },
    });

    console.log(`[social] Published to ${post.platform}: ${result.platformUrl}`);

    // Send email notification
    const notifyEmail = post.article?.site?.notifyEmail || post.site?.notifyEmail;
    const siteName = post.article?.site?.name || post.site?.name || "Site";
    if (notifyEmail) {
      const emailData = formatSocialPublishSuccess(
        siteName,
        post.platform,
        result.platformUrl || undefined,
        post.article?.title || undefined
      );
      sendSuccessNotification({ to: notifyEmail, ...emailData }).catch(() => {});
    }

    return updated;
  } catch (error: any) {
    await prisma.socialPost.update({
      where: { id: postId },
      data: {
        status: "FAILED",
        errorMessage: error.message,
      },
    });

    // Send error notification
    const notifyEmail = post.article?.site?.notifyEmail || post.site?.notifyEmail;
    const siteName = post.article?.site?.name || post.site?.name || "Site";
    if (notifyEmail) {
      const emailData = formatSocialPublishError(siteName, post.platform, error.message);
      sendErrorNotification({ to: notifyEmail, ...emailData }).catch(() => {});
    }

    throw error;
  }
}
