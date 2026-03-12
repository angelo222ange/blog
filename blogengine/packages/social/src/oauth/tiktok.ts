/**
 * TikTok OAuth 2.0 (Login Kit v2).
 * Scope: user.info.basic + video.publish (photo posts as drafts).
 */
import type { OAuthHandler, OAuthTokens } from "../types.js";
import { buildUrl } from "./base.js";

const AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const SCOPES = "user.info.basic,video.publish";

function getCredentials() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) throw new Error("TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET required");
  return { clientKey, clientSecret };
}

export const tiktokOAuth: OAuthHandler = {
  getAuthorizationUrl(state: string, redirectUri: string): string {
    const { clientKey } = getCredentials();
    return buildUrl(AUTH_URL, {
      client_key: clientKey,
      redirect_uri: redirectUri,
      scope: SCOPES,
      state,
      response_type: "code",
    });
  },

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const { clientKey, clientSecret } = getCredentials();

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    if (!res.ok) throw new Error(`TikTok token exchange failed: ${await res.text()}`);
    const data = await res.json();

    if (data.error) {
      throw new Error(`TikTok OAuth error: ${data.error_description || data.error}`);
    }

    // Get user info
    const userRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const userData = await userRes.json();
    const user = userData?.data?.user || {};

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in || 86400,
      scope: data.scope || SCOPES,
      platformUserId: data.open_id || user.open_id,
      accountName: user.display_name || "TikTok",
      metadata: { open_id: data.open_id || user.open_id },
    };
  },

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const { clientKey, clientSecret } = getCredentials();

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) throw new Error(`TikTok token refresh failed: ${await res.text()}`);
    const data = await res.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: data.scope,
    };
  },
};
