/**
 * Fetch engagement metrics from social platform APIs.
 * Returns normalized metrics or null if the platform doesn't support metric fetching.
 */

export interface PlatformMetrics {
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  engagementRate: number;
  rawData: Record<string, any>;
}

export async function fetchMetrics(
  platform: string,
  accessToken: string,
  platformPostId: string,
  metadata?: Record<string, any>,
): Promise<PlatformMetrics | null> {
  switch (platform) {
    case "facebook":
      return fetchFacebookMetrics(accessToken, platformPostId);
    case "instagram":
      return fetchInstagramMetrics(accessToken, platformPostId);
    case "twitter":
      return fetchTwitterMetrics(accessToken, platformPostId);
    case "pinterest":
      return fetchPinterestMetrics(accessToken, platformPostId);
    default:
      // LinkedIn and TikTok: insufficient scopes for metrics
      return null;
  }
}

async function fetchFacebookMetrics(accessToken: string, postId: string): Promise<PlatformMetrics | null> {
  try {
    // Fetch post insights + engagement counts
    const [insightsRes, postRes] = await Promise.all([
      fetch(
        `https://graph.facebook.com/v21.0/${postId}/insights?metric=post_impressions,post_engaged_users&access_token=${accessToken}`,
        { signal: AbortSignal.timeout(10000) },
      ),
      fetch(
        `https://graph.facebook.com/v21.0/${postId}?fields=likes.summary(true),comments.summary(true),shares&access_token=${accessToken}`,
        { signal: AbortSignal.timeout(10000) },
      ),
    ]);

    let impressions = 0;
    let engaged = 0;
    if (insightsRes.ok) {
      const insights = await insightsRes.json();
      for (const item of insights.data || []) {
        if (item.name === "post_impressions") impressions = item.values?.[0]?.value || 0;
        if (item.name === "post_engaged_users") engaged = item.values?.[0]?.value || 0;
      }
    }

    let likes = 0, comments = 0, shares = 0;
    let rawData: any = {};
    if (postRes.ok) {
      const post = await postRes.json();
      likes = post.likes?.summary?.total_count || 0;
      comments = post.comments?.summary?.total_count || 0;
      shares = post.shares?.count || 0;
      rawData = post;
    }

    const engagement = likes + comments + shares;
    const engagementRate = impressions > 0 ? (engagement / impressions) * 100 : 0;

    return {
      impressions,
      reach: engaged,
      engagement,
      likes,
      comments,
      shares,
      saves: 0,
      clicks: 0,
      engagementRate: Math.round(engagementRate * 100) / 100,
      rawData,
    };
  } catch (err) {
    console.error("[metrics] Facebook fetch error:", err);
    return null;
  }
}

async function fetchInstagramMetrics(accessToken: string, mediaId: string): Promise<PlatformMetrics | null> {
  try {
    const [insightsRes, mediaRes] = await Promise.all([
      fetch(
        `https://graph.facebook.com/v21.0/${mediaId}/insights?metric=impressions,reach,engagement,saved&access_token=${accessToken}`,
        { signal: AbortSignal.timeout(10000) },
      ),
      fetch(
        `https://graph.facebook.com/v21.0/${mediaId}?fields=like_count,comments_count&access_token=${accessToken}`,
        { signal: AbortSignal.timeout(10000) },
      ),
    ]);

    let impressions = 0, reach = 0, engagement = 0, saves = 0;
    if (insightsRes.ok) {
      const insights = await insightsRes.json();
      for (const item of insights.data || []) {
        if (item.name === "impressions") impressions = item.values?.[0]?.value || 0;
        if (item.name === "reach") reach = item.values?.[0]?.value || 0;
        if (item.name === "engagement") engagement = item.values?.[0]?.value || 0;
        if (item.name === "saved") saves = item.values?.[0]?.value || 0;
      }
    }

    let likes = 0, comments = 0;
    let rawData: any = {};
    if (mediaRes.ok) {
      const media = await mediaRes.json();
      likes = media.like_count || 0;
      comments = media.comments_count || 0;
      rawData = media;
    }

    const engagementRate = impressions > 0 ? (engagement / impressions) * 100 : 0;

    return {
      impressions,
      reach,
      engagement,
      likes,
      comments,
      shares: 0,
      saves,
      clicks: 0,
      engagementRate: Math.round(engagementRate * 100) / 100,
      rawData,
    };
  } catch (err) {
    console.error("[metrics] Instagram fetch error:", err);
    return null;
  }
}

async function fetchTwitterMetrics(accessToken: string, tweetId: string): Promise<PlatformMetrics | null> {
  try {
    const res = await fetch(
      `https://api.x.com/2/tweets/${tweetId}?tweet.fields=public_metrics`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!res.ok) return null;
    const data = await res.json();
    const m = data.data?.public_metrics;
    if (!m) return null;

    const impressions = m.impression_count || 0;
    const likes = m.like_count || 0;
    const comments = m.reply_count || 0;
    const shares = m.retweet_count || 0;
    const engagement = likes + comments + shares;
    const engagementRate = impressions > 0 ? (engagement / impressions) * 100 : 0;

    return {
      impressions,
      reach: 0,
      engagement,
      likes,
      comments,
      shares,
      saves: m.bookmark_count || 0,
      clicks: 0,
      engagementRate: Math.round(engagementRate * 100) / 100,
      rawData: m,
    };
  } catch (err) {
    console.error("[metrics] Twitter fetch error:", err);
    return null;
  }
}

async function fetchPinterestMetrics(accessToken: string, pinId: string): Promise<PlatformMetrics | null> {
  try {
    const res = await fetch(
      `https://api.pinterest.com/v5/pins/${pinId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!res.ok) return null;
    const pin = await res.json();

    const saves = pin.pin_metrics?.save_count || 0;
    const clicks = pin.pin_metrics?.click_count || 0;
    const impressions = pin.pin_metrics?.impression_count || 0;
    const engagement = saves + clicks;
    const engagementRate = impressions > 0 ? (engagement / impressions) * 100 : 0;

    return {
      impressions,
      reach: 0,
      engagement,
      likes: 0,
      comments: 0,
      shares: 0,
      saves,
      clicks,
      engagementRate: Math.round(engagementRate * 100) / 100,
      rawData: pin.pin_metrics || {},
    };
  } catch (err) {
    console.error("[metrics] Pinterest fetch error:", err);
    return null;
  }
}
