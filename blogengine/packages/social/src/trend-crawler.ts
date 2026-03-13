/**
 * Niche Trend Crawler — Orchestrator
 *
 * Builds niche queries → crawls Twitter + Facebook → dedup → upsert DB.
 * Skips if already crawled within 24h. Purges expired trends (>7 days).
 */
import { buildNicheQueries } from "./trend-queries.js";
import { searchTwitterTrends } from "./crawlers/twitter-crawler.js";
import { searchFacebookTrends } from "./crawlers/facebook-crawler.js";
import type { NicheTrendData } from "./types.js";

export interface CrawlResult {
  siteId: string;
  trendsFound: number;
  skipped: boolean;
  errors: string[];
}

interface TrendRecord {
  platform: string;
  externalPostId: string;
  authorName: string;
  content: string;
  engagementRate: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  searchQuery: string;
  postedAt: Date;
}

/**
 * Crawl niche trends for a single site.
 * Requires a Prisma client instance to be passed in (avoids circular dep).
 */
export async function crawlNicheTrends(
  prisma: any,
  siteId: string,
  siteName: string,
  theme: string,
  city?: string | null,
): Promise<CrawlResult> {
  const errors: string[] = [];

  // Check if already crawled in the last 24h
  const recentCrawl = await prisma.nicheTrend.findFirst({
    where: {
      siteId,
      crawledAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  if (recentCrawl) {
    console.log(`[trend-crawler] Skipping ${siteName} — already crawled within 24h`);
    return { siteId, trendsFound: 0, skipped: true, errors: [] };
  }

  console.log(`[trend-crawler] Crawling trends for ${siteName} (${theme})...`);

  const queries = buildNicheQueries(siteName, theme, city);
  const allTrends: TrendRecord[] = [];
  const seenIds = new Set<string>();

  // Crawl Twitter
  const twitterQueries = queries.filter((q) => q.platform === "twitter");
  for (const q of twitterQueries.slice(0, 4)) {
    try {
      const results = await searchTwitterTrends(q.query, q.lang, 10);
      for (const r of results) {
        const dedupKey = `twitter:${r.externalPostId}`;
        if (seenIds.has(dedupKey)) continue;
        seenIds.add(dedupKey);
        allTrends.push({
          platform: "twitter",
          externalPostId: r.externalPostId,
          authorName: r.authorName,
          content: r.content,
          engagementRate: r.engagementRate,
          impressions: r.impressions,
          likes: r.likes,
          comments: r.comments,
          shares: r.shares,
          searchQuery: q.query,
          postedAt: r.postedAt,
        });
      }
    } catch (err: any) {
      errors.push(`Twitter "${q.query}": ${err.message}`);
    }
  }

  // Crawl Facebook
  const fbQueries = queries.filter((q) => q.platform === "facebook");
  for (const q of fbQueries.slice(0, 4)) {
    try {
      const results = await searchFacebookTrends(q.query, 10);
      for (const r of results) {
        const dedupKey = `facebook:${r.externalPostId}`;
        if (seenIds.has(dedupKey)) continue;
        seenIds.add(dedupKey);
        allTrends.push({
          platform: "facebook",
          externalPostId: r.externalPostId,
          authorName: r.authorName,
          content: r.content,
          engagementRate: r.engagementRate,
          impressions: r.impressions,
          likes: r.likes,
          comments: r.comments,
          shares: r.shares,
          searchQuery: q.query,
          postedAt: r.postedAt,
        });
      }
    } catch (err: any) {
      errors.push(`Facebook "${q.query}": ${err.message}`);
    }
  }

  // Sort by engagement and keep top 20
  allTrends.sort(
    (a, b) =>
      b.likes + b.shares + b.comments - (a.likes + a.shares + a.comments),
  );
  const topTrends = allTrends.slice(0, 20);

  // Upsert into DB
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 days
  let upserted = 0;

  for (const trend of topTrends) {
    try {
      await prisma.nicheTrend.upsert({
        where: {
          siteId_platform_externalPostId: {
            siteId,
            platform: trend.platform,
            externalPostId: trend.externalPostId,
          },
        },
        create: {
          siteId,
          platform: trend.platform,
          externalPostId: trend.externalPostId,
          authorName: trend.authorName,
          content: trend.content,
          engagementRate: trend.engagementRate,
          impressions: trend.impressions,
          likes: trend.likes,
          comments: trend.comments,
          shares: trend.shares,
          searchQuery: trend.searchQuery,
          postedAt: trend.postedAt,
          crawledAt: new Date(),
          expiresAt,
        },
        update: {
          engagementRate: trend.engagementRate,
          impressions: trend.impressions,
          likes: trend.likes,
          comments: trend.comments,
          shares: trend.shares,
          crawledAt: new Date(),
          expiresAt,
        },
      });
      upserted++;
    } catch (err: any) {
      errors.push(`Upsert ${trend.platform}:${trend.externalPostId}: ${err.message}`);
    }
  }

  // Purge expired trends
  try {
    const deleted = await prisma.nicheTrend.deleteMany({
      where: {
        siteId,
        expiresAt: { lt: new Date() },
      },
    });
    if (deleted.count > 0) {
      console.log(`[trend-crawler] Purged ${deleted.count} expired trends for ${siteName}`);
    }
  } catch {}

  console.log(
    `[trend-crawler] Done for ${siteName}: ${upserted} trends saved, ${errors.length} errors`,
  );

  return { siteId, trendsFound: upserted, skipped: false, errors };
}

/**
 * Get current niche trends for a site from DB.
 * Returns the most relevant trends sorted by engagement.
 */
export async function getNicheTrendsForSite(
  prisma: any,
  siteId: string,
  limit: number = 10,
): Promise<NicheTrendData[]> {
  const trends = await prisma.nicheTrend.findMany({
    where: {
      siteId,
      expiresAt: { gt: new Date() },
    },
    orderBy: [
      { engagementRate: "desc" },
    ],
    take: limit,
  });

  return trends.map((t: any) => ({
    platform: t.platform,
    content: t.content,
    engagementRate: t.engagementRate,
    likes: t.likes,
    shares: t.shares,
    authorName: t.authorName,
  }));
}
