/**
 * X/Twitter publishing via API v2.
 */
import type { PlatformClient, PublishParams, PublishResult } from "../types.js";

const API_BASE = "https://api.twitter.com/2";

export const twitterClient: PlatformClient = {
  platform: "twitter",

  async publish(params: PublishParams): Promise<PublishResult> {
    const { accessToken, text, metadata } = params;

    const body: any = { text };

    const res = await fetch(`${API_BASE}/tweets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Twitter publish failed: ${await res.text()}`);
    const data = await res.json();

    const tweetId = data.data?.id;
    const username = metadata?.username || "";

    return {
      platformPostId: tweetId,
      platformUrl: username
        ? `https://x.com/${username}/status/${tweetId}`
        : `https://x.com/i/status/${tweetId}`,
    };
  },

  async delete(accessToken: string, platformPostId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/tweets/${platformPostId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Twitter delete failed: ${await res.text()}`);
  },

  async validateToken(accessToken: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok;
  },
};
