/**
 * LinkedIn publishing via Marketing API.
 * Supports image upload for rich posts.
 */
import type { PlatformClient, PublishParams, PublishResult } from "../types.js";

const API_BASE = "https://api.linkedin.com/v2";

async function uploadImageToLinkedIn(
  accessToken: string,
  authorUrn: string,
  imageUrl: string,
): Promise<string | null> {
  try {
    // 1. Register upload
    const registerRes = await fetch(`${API_BASE}/assets?action=registerUpload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: authorUrn,
          serviceRelationships: [{
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent",
          }],
        },
      }),
    });
    if (!registerRes.ok) {
      console.error("[linkedin] Register upload failed:", await registerRes.text());
      return null;
    }
    const registerData = await registerRes.json();
    const uploadUrl = registerData.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
    const asset = registerData.value?.asset;
    if (!uploadUrl || !asset) return null;

    // 2. Download image
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const imgBuffer = await imgRes.arrayBuffer();

    // 3. Upload to LinkedIn
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "image/jpeg",
      },
      body: imgBuffer,
    });
    if (!uploadRes.ok) {
      console.error("[linkedin] Image upload failed:", uploadRes.status);
      return null;
    }

    return asset as string;
  } catch (err) {
    console.error("[linkedin] Image upload error:", err);
    return null;
  }
}

export const linkedinClient: PlatformClient = {
  platform: "linkedin",

  async publish(params: PublishParams): Promise<PublishResult> {
    const { accessToken, text, link, mediaUrls, metadata } = params;
    const authorId = metadata?.authorId;
    const orgId = metadata?.organizationId;
    if (!authorId && !orgId) throw new Error("LinkedIn: authorId or organizationId required in metadata");

    const authorUrn = orgId
      ? `urn:li:organization:${orgId}`
      : `urn:li:person:${authorId}`;

    // Try to upload image if we have one
    let imageAsset: string | null = null;
    if (mediaUrls?.[0]) {
      imageAsset = await uploadImageToLinkedIn(accessToken, authorUrn, mediaUrls[0]);
    }

    // Determine media category
    let shareMediaCategory = "NONE";
    const media: any[] = [];

    if (imageAsset) {
      // Image post (with optional link in text)
      shareMediaCategory = "IMAGE";
      media.push({
        status: "READY",
        media: imageAsset,
        ...(link ? { originalUrl: link } : {}),
      });
    } else if (link) {
      // Link preview post (no image)
      shareMediaCategory = "ARTICLE";
      media.push({
        status: "READY",
        originalUrl: link,
      });
    }

    const body: any = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory,
          ...(media.length > 0 ? { media } : {}),
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    const res = await fetch(`${API_BASE}/ugcPosts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`LinkedIn publish failed: ${await res.text()}`);

    const postId = res.headers.get("x-restli-id") || "";

    return {
      platformPostId: postId,
      platformUrl: `https://www.linkedin.com/feed/update/${postId}`,
    };
  },

  async delete(accessToken: string, platformPostId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/ugcPosts/${encodeURIComponent(platformPostId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`LinkedIn delete failed: ${await res.text()}`);
  },

  async validateToken(accessToken: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok;
  },
};
