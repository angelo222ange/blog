/**
 * TikTok Content Posting API - Photo posts (slideshows) as drafts.
 * Uses the Photo Post endpoint to create carousel-style content.
 * Posts are created with privacy_level SELF_ONLY (draft/private).
 */
import type { PlatformClient, PublishParams, PublishResult } from "../types.js";

const API_BASE = "https://open.tiktokapis.com/v2";

export const tiktokClient: PlatformClient = {
  platform: "tiktok",

  async publish(params: PublishParams): Promise<PublishResult> {
    const { accessToken, text, mediaUrls } = params;

    if (!mediaUrls || mediaUrls.length === 0) {
      throw new Error("TikTok: au moins une image est requise pour un post photo");
    }

    // Step 1: Initialize photo post with image URLs
    const postBody: any = {
      post_info: {
        title: text.slice(0, 150), // TikTok title max ~150 chars
        description: text,
        privacy_level: "SELF_ONLY", // Draft mode - only visible to the account owner
        disable_comment: false,
      },
      source_info: {
        source: "PULL_FROM_URL",
        photo_images: mediaUrls.slice(0, 35), // TikTok allows up to 35 images per carousel
      },
      media_type: "PHOTO",
    };

    const res = await fetch(`${API_BASE}/post/publish/content/init/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify(postBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`TikTok publish failed (${res.status}): ${errText}`);
    }

    const data = await res.json();

    if (data.error?.code && data.error.code !== "ok") {
      throw new Error(`TikTok API error: ${data.error.message || data.error.code}`);
    }

    const publishId = data.data?.publish_id || "";

    return {
      platformPostId: publishId,
      platformUrl: `https://www.tiktok.com`, // TikTok doesn't return direct URL at publish time
    };
  },

  async delete(accessToken: string, platformPostId: string): Promise<void> {
    // TikTok doesn't have a simple delete endpoint for photo posts via this API
    console.log(`[tiktok] Delete not supported via API for post ${platformPostId}`);
  },

  async validateToken(accessToken: string): Promise<boolean> {
    const res = await fetch(
      `${API_BASE}/user/info/?fields=open_id,display_name`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return res.ok;
  },
};
