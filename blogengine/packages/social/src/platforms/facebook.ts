/**
 * Facebook Page publishing via Meta Graph API v21.
 * Requires a Page Access Token (obtained via Meta OAuth).
 */
import type { PlatformClient, PublishParams, PublishResult } from "../types.js";

const API_BASE = "https://graph.facebook.com/v21.0";

export const facebookClient: PlatformClient = {
  platform: "facebook",

  async publish(params: PublishParams): Promise<PublishResult> {
    const { accessToken, text, mediaUrls, link, metadata } = params;
    const pageId = metadata?.pageId;
    if (!pageId) throw new Error("Facebook: pageId required in metadata");

    let postId: string;

    if (mediaUrls && mediaUrls.length > 0) {
      // Photo post
      const res = await fetch(`${API_BASE}/${pageId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: mediaUrls[0],
          message: text,
          access_token: accessToken,
        }),
      });
      if (!res.ok) throw new Error(`Facebook publish failed: ${await res.text()}`);
      const data = await res.json();
      postId = data.post_id || data.id;
    } else {
      // Text/link post
      const body: any = { message: text, access_token: accessToken };
      if (link) body.link = link;

      const res = await fetch(`${API_BASE}/${pageId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Facebook publish failed: ${await res.text()}`);
      const data = await res.json();
      postId = data.id;
    }

    return {
      platformPostId: postId,
      platformUrl: `https://www.facebook.com/${postId.replace("_", "/posts/")}`,
    };
  },

  async delete(accessToken: string, platformPostId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/${platformPostId}?access_token=${accessToken}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`Facebook delete failed: ${await res.text()}`);
  },

  async validateToken(accessToken: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/me?access_token=${accessToken}`);
    return res.ok;
  },
};
