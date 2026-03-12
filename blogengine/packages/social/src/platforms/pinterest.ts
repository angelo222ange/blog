/**
 * Pinterest publishing via API v5.
 */
import type { PlatformClient, PublishParams, PublishResult } from "../types.js";

const API_BASE = "https://api.pinterest.com/v5";

export const pinterestClient: PlatformClient = {
  platform: "pinterest",

  async publish(params: PublishParams): Promise<PublishResult> {
    const { accessToken, text, mediaUrls, link, metadata } = params;
    const boardId = metadata?.boardId;
    if (!boardId) throw new Error("Pinterest: boardId required in metadata");

    if (!mediaUrls || mediaUrls.length === 0) {
      throw new Error("Pinterest requires at least one image URL");
    }

    const body: any = {
      board_id: boardId,
      title: metadata?.pinTitle || text.slice(0, 100),
      description: text,
      media_source: {
        source_type: "image_url",
        url: mediaUrls[0],
      },
    };
    if (link) body.link = link;

    const res = await fetch(`${API_BASE}/pins`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Pinterest publish failed: ${await res.text()}`);
    const data = await res.json();

    return {
      platformPostId: data.id,
      platformUrl: `https://www.pinterest.com/pin/${data.id}/`,
    };
  },

  async delete(accessToken: string, platformPostId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/pins/${platformPostId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Pinterest delete failed: ${await res.text()}`);
  },

  async validateToken(accessToken: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/user_account`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok;
  },
};
