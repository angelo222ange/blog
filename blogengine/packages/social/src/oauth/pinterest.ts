/**
 * Pinterest OAuth 2.0.
 */
import type { OAuthHandler, OAuthTokens } from "../types.js";
import { buildUrl } from "./base.js";

const AUTH_URL = "https://www.pinterest.com/oauth/";
const TOKEN_URL = "https://api.pinterest.com/v5/oauth/token";
const SCOPES = "boards:read,pins:read,pins:write";

function getCredentials() {
  const clientId = process.env.PINTEREST_APP_ID;
  const clientSecret = process.env.PINTEREST_APP_SECRET;
  if (!clientId || !clientSecret) throw new Error("PINTEREST_APP_ID and PINTEREST_APP_SECRET required");
  return { clientId, clientSecret };
}

export const pinterestOAuth: OAuthHandler = {
  getAuthorizationUrl(state: string, redirectUri: string): string {
    const { clientId } = getCredentials();
    return buildUrl(AUTH_URL, {
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: SCOPES,
      state,
    });
  },

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const { clientId, clientSecret } = getCredentials();

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!res.ok) throw new Error(`Pinterest token exchange failed: ${await res.text()}`);
    const data = await res.json();

    // Get user info
    const meRes = await fetch("https://api.pinterest.com/v5/user_account", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const me = await meRes.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: SCOPES,
      platformUserId: me.username,
      accountName: me.username,
    };
  },

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const { clientId, clientSecret } = getCredentials();

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) throw new Error(`Pinterest refresh failed: ${await res.text()}`);
    const data = await res.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  },
};
