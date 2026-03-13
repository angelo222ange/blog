/**
 * Facebook Trend Crawler
 *
 * Uses app access token (APP_ID|APP_SECRET) to search pages by niche
 * and fetch their recent public posts. Uses share count as engagement proxy.
 */

export interface FacebookTrendResult {
  externalPostId: string;
  authorName: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  engagementRate: number;
  postedAt: Date;
}

/**
 * Build a Facebook app access token from META_APP_ID and META_APP_SECRET.
 */
function getAppToken(): string {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("META_APP_ID and META_APP_SECRET required for Facebook trend crawling");
  }
  return `${appId}|${appSecret}`;
}

/**
 * Search Facebook pages matching the niche query and fetch their recent posts.
 */
export async function searchFacebookTrends(
  query: string,
  maxResults: number = 10,
): Promise<FacebookTrendResult[]> {
  const accessToken = getAppToken();
  const results: FacebookTrendResult[] = [];

  try {
    // Step 1: Search for pages in this niche
    const searchParams = new URLSearchParams({
      q: query,
      type: "page",
      fields: "id,name,fan_count",
      limit: "10",
      access_token: accessToken,
    });

    const searchRes = await fetch(
      `https://graph.facebook.com/v19.0/pages/search?${searchParams}`,
      { signal: AbortSignal.timeout(15000) },
    );

    if (!searchRes.ok) {
      if (searchRes.status === 400 || searchRes.status === 403) {
        // Pages search requires special permissions — silently skip
        console.warn("[facebook-crawler] Pages search not available (missing permissions), skipping");
        return [];
      }
      console.error(`[facebook-crawler] Search failed: ${searchRes.status}`);
      return [];
    }

    const searchData = (await searchRes.json()) as {
      data?: Array<{ id: string; name: string; fan_count?: number }>;
    };

    if (!searchData.data || searchData.data.length === 0) return [];

    // Step 2: For each page, fetch recent posts
    for (const page of searchData.data.slice(0, 5)) {
      try {
        const feedParams = new URLSearchParams({
          fields: "id,message,created_time,shares,likes.summary(true).limit(0),comments.summary(true).limit(0)",
          limit: "10",
          access_token: accessToken,
        });

        const feedRes = await fetch(
          `https://graph.facebook.com/v19.0/${page.id}/feed?${feedParams}`,
          { signal: AbortSignal.timeout(10000) },
        );

        if (!feedRes.ok) continue;

        const feedData = (await feedRes.json()) as {
          data?: Array<{
            id: string;
            message?: string;
            created_time?: string;
            shares?: { count: number };
            likes?: { summary?: { total_count?: number } };
            comments?: { summary?: { total_count?: number } };
          }>;
        };

        if (!feedData.data) continue;

        for (const post of feedData.data) {
          if (!post.message || post.message.length < 20) continue;

          const likes = post.likes?.summary?.total_count || 0;
          const comments = post.comments?.summary?.total_count || 0;
          const shares = post.shares?.count || 0;
          const totalEngagement = likes + comments + shares;
          // Use fan_count as impressions proxy
          const impressions = page.fan_count || 0;
          const engagementRate = impressions > 0 ? (totalEngagement / impressions) * 100 : 0;

          results.push({
            externalPostId: post.id,
            authorName: page.name,
            content: post.message,
            likes,
            comments,
            shares,
            impressions,
            engagementRate: Math.round(engagementRate * 100) / 100,
            postedAt: post.created_time ? new Date(post.created_time) : new Date(),
          });
        }
      } catch {
        // Skip individual page errors
      }
    }
  } catch (err: any) {
    console.error(`[facebook-crawler] Error: ${err.message}`);
    return [];
  }

  // Sort by total engagement descending
  results.sort(
    (a, b) =>
      b.likes + b.shares + b.comments - (a.likes + a.shares + a.comments),
  );

  return results.slice(0, maxResults);
}
