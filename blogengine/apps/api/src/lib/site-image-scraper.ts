/**
 * Scrape images from a client's website.
 * Extracts usable images (not icons, not decorative) and stores them in SiteImage.
 * These images are then used as the BEST source for social media posts.
 */
import { prisma } from "./prisma.js";

interface ScrapedImage {
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  category: string;
}

const MIN_WIDTH = 300;
const MIN_HEIGHT = 200;

// Patterns that indicate non-usable images (icons, decorative)
const SKIP_PATTERNS = [
  /favicon/i, /sprite/i, /pixel/i,
  /tracking/i, /analytics/i, /badge/i, /button/i, /arrow/i,
  /\.svg$/i, /\.gif$/i, /1x1/i, /spacer/i, /blank/i,
  /emoji/i, /placeholder/i,
];

// Patterns to categorize images
const CATEGORY_PATTERNS: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /hero|banner|header|slider|carousel/i, category: "hero" },
  { pattern: /team|equipe|staff|employee|technicien/i, category: "team" },
  { pattern: /product|produit|service|prestation/i, category: "service" },
  { pattern: /logo/i, category: "logo" },
  { pattern: /gallery|galerie|portfolio|realisation/i, category: "service" },
  { pattern: /before|after|avant|apres|resultat/i, category: "service" },
];

function categorizeImage(url: string, alt: string | null): string {
  const text = `${url} ${alt || ""}`.toLowerCase();
  for (const { pattern, category } of CATEGORY_PATTERNS) {
    if (pattern.test(text)) return category;
  }
  return "general";
}

function shouldSkipImage(url: string): boolean {
  return SKIP_PATTERNS.some((p) => p.test(url));
}

function resolveUrl(imgUrl: string, baseUrl: string): string | null {
  try {
    if (imgUrl.startsWith("data:")) return null;
    if (imgUrl.startsWith("//")) return `https:${imgUrl}`;
    if (imgUrl.startsWith("http")) return imgUrl;
    return new URL(imgUrl, baseUrl).href;
  } catch {
    return null;
  }
}

/**
 * Scrape a website and extract usable images.
 */
export async function scrapeWebsiteImages(domain: string): Promise<ScrapedImage[]> {
  const baseUrl = domain.startsWith("http") ? domain : `https://${domain}`;
  const images: ScrapedImage[] = [];
  const seenUrls = new Set<string>();

  // Pages to scrape (homepage + common pages)
  const pagePaths = [
    "/",
    "/about", "/a-propos", "/qui-sommes-nous",
    "/services", "/prestations", "/nos-services",
    "/gallery", "/galerie", "/realisations", "/portfolio",
    "/contact",
  ];

  for (const path of pagePaths) {
    try {
      const url = `${baseUrl}${path}`;
      console.log(`[scraper] Fetching ${url}...`);
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; BlogEngine/1.0)",
          "Accept": "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(15000),
        redirect: "follow",
      });
      if (!res.ok) {
        console.log(`[scraper] ${url} returned ${res.status}`);
        continue;
      }

      const html = await res.text();
      console.log(`[scraper] Got ${html.length} chars from ${url}`);

      // Extract images from HTML using regex (no DOM parser needed on server)
      const imgRegex = /<img[^>]+>/gi;
      let match;
      while ((match = imgRegex.exec(html)) !== null) {
        const tag = match[0];
        const srcMatch = tag.match(/src=["']([^"']+)["']/);
        const altMatch = tag.match(/alt=["']([^"']*?)["']/);
        const widthMatch = tag.match(/width=["']?(\d+)/);
        const heightMatch = tag.match(/height=["']?(\d+)/);

        if (!srcMatch) continue;
        const resolvedUrl = resolveUrl(srcMatch[1]!, baseUrl);
        if (!resolvedUrl || seenUrls.has(resolvedUrl)) continue;
        if (shouldSkipImage(resolvedUrl)) continue;

        const w = widthMatch ? parseInt(widthMatch[1]!) : null;
        const h = heightMatch ? parseInt(heightMatch[1]!) : null;

        // Skip known-small images
        if (w && w < MIN_WIDTH) continue;
        if (h && h < MIN_HEIGHT) continue;

        seenUrls.add(resolvedUrl);
        const alt = altMatch?.[1] || null;
        images.push({
          url: resolvedUrl,
          alt,
          width: w,
          height: h,
          category: categorizeImage(resolvedUrl, alt),
        });
      }

      // Also extract CSS background images from style attributes and inline styles
      const bgRegex = /background(?:-image)?:\s*url\(["']?([^"')]+)["']?\)/gi;
      while ((match = bgRegex.exec(html)) !== null) {
        const resolvedUrl = resolveUrl(match[1]!, baseUrl);
        if (!resolvedUrl || seenUrls.has(resolvedUrl)) continue;
        if (shouldSkipImage(resolvedUrl)) continue;

        seenUrls.add(resolvedUrl);
        images.push({
          url: resolvedUrl,
          alt: null,
          width: null,
          height: null,
          category: "hero", // bg images are usually hero/banner
        });
      }

      // Extract og:image and twitter:image meta tags
      const ogRegex = /(?:og:image|twitter:image)[^>]*content=["']([^"']+)["']/gi;
      while ((match = ogRegex.exec(html)) !== null) {
        const resolvedUrl = resolveUrl(match[1]!, baseUrl);
        if (!resolvedUrl || seenUrls.has(resolvedUrl)) continue;
        seenUrls.add(resolvedUrl);
        images.push({
          url: resolvedUrl,
          alt: null,
          width: null,
          height: null,
          category: "hero",
        });
      }
    } catch {
      // Page unreachable, skip
    }
  }

  console.log(`[scraper] Found ${images.length} usable images from ${baseUrl}`);
  return images;
}

/**
 * Scrape and store images for a site.
 * Returns the number of new images stored.
 */
export async function scrapeAndStoreSiteImages(siteId: string): Promise<number> {
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site?.domain) {
    console.log(`[scraper] No domain for site ${siteId}, skipping`);
    return 0;
  }

  const images = await scrapeWebsiteImages(site.domain);
  let stored = 0;

  for (const img of images) {
    try {
      await prisma.siteImage.upsert({
        where: { siteId_url: { siteId, url: img.url } },
        create: {
          siteId,
          url: img.url,
          alt: img.alt,
          category: img.category,
          width: img.width,
          height: img.height,
        },
        update: {
          alt: img.alt,
          category: img.category,
        },
      });
      stored++;
    } catch {
      // duplicate or other error
    }
  }

  console.log(`[scraper] Stored ${stored} images for ${site.name}`);
  return stored;
}

/**
 * Get usable images for a site, prioritized for social posts.
 * Returns service/product images first, then hero, then general.
 */
export async function getSiteImagesForSocial(
  siteId: string,
  excludeUrls: string[] = [],
): Promise<Array<{ url: string; alt: string | null; category: string }>> {
  const images = await prisma.siteImage.findMany({
    where: {
      siteId,
      isUsable: true,
      url: { notIn: excludeUrls },
    },
    orderBy: { createdAt: "desc" },
  });

  // Prioritize: service > hero > general > team > logo
  const priority: Record<string, number> = {
    service: 0, hero: 1, general: 2, product: 3, team: 4, logo: 5,
  };
  images.sort((a, b) => (priority[a.category] ?? 99) - (priority[b.category] ?? 99));

  return images.map((img) => ({
    url: img.url,
    alt: img.alt,
    category: img.category,
  }));
}
