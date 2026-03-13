// Types
export type {
  OAuthHandler,
  OAuthTokens,
  PlatformClient,
  PublishParams,
  PublishResult,
  PlatformConstraints,
  GeneratedPost,
  CarouselSlide,
  CarouselSlideType,
  ArticleForSocial,
  TopPerformerData,
  NicheTrendData,
} from "./types.js";
export { PLATFORM_CONSTRAINTS } from "./types.js";

// Encryption
export { encrypt, decrypt } from "./encryption.js";

// OAuth
export { getOAuthHandler, generatePKCE, discoverMetaAccounts } from "./oauth/index.js";

// Platform clients
export { getPlatformClient } from "./platforms/index.js";

// Post generation
export { generateSocialPosts } from "./post-generator.js";

// Metrics
export { fetchMetrics } from "./metrics.js";
export type { PlatformMetrics } from "./metrics.js";

// Trend crawler
export { crawlNicheTrends, getNicheTrendsForSite } from "./trend-crawler.js";
export type { CrawlResult } from "./trend-crawler.js";
