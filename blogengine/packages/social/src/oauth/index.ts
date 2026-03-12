import type { SocialPlatform } from "@blogengine/core";
import type { OAuthHandler } from "../types.js";
import { metaOAuth } from "./meta.js";
import { instagramOAuth } from "./instagram.js";
import { linkedinOAuth } from "./linkedin.js";
import { twitterOAuth } from "./twitter.js";
import { pinterestOAuth } from "./pinterest.js";
import { tiktokOAuth } from "./tiktok.js";

const handlers: Record<string, OAuthHandler> = {
  facebook: metaOAuth,
  instagram: instagramOAuth,  // Direct Instagram Login (not via Facebook)
  linkedin: linkedinOAuth,
  twitter: twitterOAuth,
  pinterest: pinterestOAuth,
  tiktok: tiktokOAuth,
};

export function getOAuthHandler(platform: SocialPlatform): OAuthHandler {
  const handler = handlers[platform];
  if (!handler) throw new Error(`No OAuth handler for platform: ${platform}`);
  return handler;
}

export { metaOAuth, instagramOAuth, linkedinOAuth, twitterOAuth, pinterestOAuth, tiktokOAuth };
export { generatePKCE } from "./twitter.js";
export { discoverMetaAccounts } from "./meta.js";
