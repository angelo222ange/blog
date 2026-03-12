import type { SocialPlatform } from "@blogengine/core";
import type { PlatformClient } from "../types.js";
import { facebookClient } from "./facebook.js";
import { instagramClient } from "./instagram.js";
import { linkedinClient } from "./linkedin.js";
import { twitterClient } from "./twitter.js";
import { pinterestClient } from "./pinterest.js";
import { tiktokClient } from "./tiktok.js";

const clients: Record<string, PlatformClient> = {
  facebook: facebookClient,
  instagram: instagramClient,
  linkedin: linkedinClient,
  twitter: twitterClient,
  pinterest: pinterestClient,
  tiktok: tiktokClient,
};

export function getPlatformClient(platform: SocialPlatform): PlatformClient {
  const client = clients[platform];
  if (!client) throw new Error(`No client for platform: ${platform}`);
  return client;
}

export { facebookClient, instagramClient, linkedinClient, twitterClient, pinterestClient, tiktokClient };
