/**
 * Twitter/X Trend Crawler
 *
 * Uses app-only bearer token (client_credentials) to search recent tweets
 * via GET /2/tweets/search/recent with public_metrics.
 * Returns top 10 by engagement.
 */

export interface TwitterTrendResult {
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

/** Cache the bearer token for the process lifetime */
let cachedBearerToken: string | null = null;

/**
 * Obtain an app-only bearer token via OAuth 2.0 client_credentials.
 * Requires TWITTER_CLIENT_ID + TWITTER_CLIENT_SECRET in env.
 */
async function getAppBearerToken(): Promise<string> {
  if (cachedBearerToken) return cachedBearerToken;

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET required for trend crawling");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://api.twitter.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Twitter auth failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("No access_token in Twitter response");

  cachedBearerToken = data.access_token;
  return cachedBearerToken;
}

/**
 * Search recent tweets for a query and return top results sorted by engagement.
 */
export async function searchTwitterTrends(
  query: string,
  lang: string = "fr",
  maxResults: number = 10,
): Promise<TwitterTrendResult[]> {
  const bearerToken = await getAppBearerToken();

  // Build search query: filter out retweets, require some engagement
  const searchQuery = `${query} -is:retweet lang:${lang} has:media OR has:links`;

  const params = new URLSearchParams({
    query: searchQuery,
    max_results: String(Math.min(maxResults * 5, 100)), // fetch more, then sort
    "tweet.fields": "public_metrics,created_at,author_id",
    "user.fields": "name,username",
    expansions: "author_id",
  });

  const res = await fetch(
    `https://api.twitter.com/2/tweets/search/recent?${params}`,
    {
      headers: { Authorization: `Bearer ${bearerToken}` },
      signal: AbortSignal.timeout(15000),
    },
  );

  if (!res.ok) {
    if (res.status === 429) {
      console.warn("[twitter-crawler] Rate limited, skipping");
      return [];
    }
    const text = await res.text().catch(() => "");
    console.error(`[twitter-crawler] Search failed (${res.status}): ${text.slice(0, 200)}`);
    return [];
  }

  const data = (await res.json()) as {
    data?: Array<{
      id: string;
      text: string;
      author_id: string;
      created_at?: string;
      public_metrics?: {
        retweet_count: number;
        reply_count: number;
        like_count: number;
        quote_count: number;
        impression_count?: number;
      };
    }>;
    includes?: {
      users?: Array<{ id: string; name: string; username: string }>;
    };
  };

  if (!data.data || data.data.length === 0) return [];

  // Build user lookup
  const userMap = new Map<string, string>();
  for (const user of data.includes?.users || []) {
    userMap.set(user.id, `@${user.username}`);
  }

  // Map to results with engagement calculation
  const results: TwitterTrendResult[] = data.data.map((tweet) => {
    const metrics = tweet.public_metrics || {
      retweet_count: 0,
      reply_count: 0,
      like_count: 0,
      quote_count: 0,
    };
    const impressions = (metrics as any).impression_count || 0;
    const totalEngagement =
      metrics.like_count + metrics.retweet_count + metrics.reply_count + metrics.quote_count;
    const engagementRate = impressions > 0 ? (totalEngagement / impressions) * 100 : 0;

    return {
      externalPostId: tweet.id,
      authorName: userMap.get(tweet.author_id) || "unknown",
      content: tweet.text,
      likes: metrics.like_count,
      comments: metrics.reply_count,
      shares: metrics.retweet_count + metrics.quote_count,
      impressions,
      engagementRate: Math.round(engagementRate * 100) / 100,
      postedAt: tweet.created_at ? new Date(tweet.created_at) : new Date(),
    };
  });

  // Sort by total engagement (likes + shares + comments) descending
  results.sort(
    (a, b) =>
      b.likes + b.shares + b.comments - (a.likes + a.shares + a.comments),
  );

  return results.slice(0, maxResults);
}
