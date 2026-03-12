/**
 * Instagram OAuth 2.0 with Instagram Login (direct).
 * Users log in with their Instagram credentials directly,
 * no Facebook required.
 *
 * Uses the Instagram API with Instagram Login (2024+).
 * Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
 */
import type { OAuthHandler, OAuthTokens } from "../types.js";
import { buildUrl } from "./base.js";

const AUTH_URL = "https://www.instagram.com/oauth/authorize";
const TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const GRAPH_URL = "https://graph.instagram.com";
const SCOPES = "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages,instagram_business_manage_comments";

function getCredentials() {
  const clientId = process.env.INSTAGRAM_APP_ID;
  const clientSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!clientId || !clientSecret) throw new Error("INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET required");
  return { clientId, clientSecret };
}

export const instagramOAuth: OAuthHandler = {
  getAuthorizationUrl(state: string, redirectUri: string): string {
    const { clientId } = getCredentials();
    return buildUrl(AUTH_URL, {
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: SCOPES,
      state,
      response_type: "code",
      enable_fb_login: "0",
      force_authentication: "1",
    });
  },

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const { clientId, clientSecret } = getCredentials();

    // Exchange code for short-lived token (POST with form data)
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });
    if (!res.ok) throw new Error(`Instagram token exchange failed: ${await res.text()}`);
    const data = await res.json();

    const shortToken = data.access_token;
    const userId = String(data.user_id);

    // Exchange for long-lived token (60 days)
    const longRes = await fetch(buildUrl(`${GRAPH_URL}/access_token`, {
      grant_type: "ig_exchange_token",
      client_secret: clientSecret,
      access_token: shortToken,
    }));
    if (!longRes.ok) throw new Error(`Instagram long-lived token failed: ${await longRes.text()}`);
    const longData = await longRes.json();

    // Get user profile info
    const meRes = await fetch(
      `${GRAPH_URL}/v21.0/me?fields=user_id,username,name,profile_picture_url&access_token=${longData.access_token}`
    );
    const me = meRes.ok ? await meRes.json() : { username: userId };

    return {
      accessToken: longData.access_token,
      expiresIn: longData.expires_in || 5184000, // 60 days
      scope: SCOPES,
      platformUserId: userId,
      accountName: me.username || me.name || `Instagram ${userId}`,
    };
  },

  async refreshToken(token: string): Promise<OAuthTokens> {
    const res = await fetch(buildUrl(`${GRAPH_URL}/refresh_access_token`, {
      grant_type: "ig_refresh_token",
      access_token: token,
    }));
    if (!res.ok) throw new Error(`Instagram refresh failed: ${await res.text()}`);
    const data = await res.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 5184000,
      scope: SCOPES,
      platformUserId: "",
      accountName: "",
    };
  },
};
