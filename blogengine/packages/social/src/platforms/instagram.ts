/**
 * Instagram Business Account publishing via Meta Graph API v21.
 * Uses container-based media publishing (requires a PUBLIC image URL).
 */
import type { PlatformClient, PublishParams, PublishResult } from "../types.js";

const API_BASE = "https://graph.facebook.com/v21.0";

export const instagramClient: PlatformClient = {
  platform: "instagram",

  async publish(params: PublishParams): Promise<PublishResult> {
    const { accessToken, text, mediaUrls, metadata } = params;
    const igUserId = metadata?.instagramId;
    if (!igUserId) throw new Error("Instagram: instagramId required in metadata");

    if (!mediaUrls || mediaUrls.length === 0) {
      throw new Error("Instagram requires at least one image URL");
    }

    // Step 1: Create media container
    const containerRes = await fetch(`${API_BASE}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: mediaUrls[0],
        caption: text,
        access_token: accessToken,
      }),
    });
    if (!containerRes.ok) throw new Error(`Instagram container failed: ${await containerRes.text()}`);
    const container = await containerRes.json();

    // Step 2: Wait for container to be ready (poll)
    let ready = false;
    for (let i = 0; i < 10; i++) {
      const statusRes = await fetch(
        `${API_BASE}/${container.id}?fields=status_code&access_token=${accessToken}`
      );
      const status = await statusRes.json();
      if (status.status_code === "FINISHED") { ready = true; break; }
      if (status.status_code === "ERROR") throw new Error("Instagram container processing failed");
      await new Promise((r) => setTimeout(r, 2000));
    }
    if (!ready) throw new Error("Instagram container timed out");

    // Step 3: Publish the container
    const publishRes = await fetch(`${API_BASE}/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: accessToken,
      }),
    });
    if (!publishRes.ok) throw new Error(`Instagram publish failed: ${await publishRes.text()}`);
    const published = await publishRes.json();

    // Get permalink
    const permaRes = await fetch(
      `${API_BASE}/${published.id}?fields=permalink&access_token=${accessToken}`
    );
    const perma = await permaRes.json();

    return {
      platformPostId: published.id,
      platformUrl: perma.permalink || `https://www.instagram.com/`,
    };
  },

  async delete(accessToken: string, platformPostId: string): Promise<void> {
    // Instagram doesn't support deletion via API for most post types
    throw new Error("Instagram post deletion is not supported via API");
  },

  async validateToken(accessToken: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/me?access_token=${accessToken}`);
    return res.ok;
  },
};
