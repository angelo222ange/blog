/**
 * X/Twitter OAuth 2.0 with PKCE.
 */
import { createHash, randomBytes } from "node:crypto";
import type { OAuthHandler, OAuthTokens } from "../types.js";
import { buildUrl } from "./base.js";

const AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const SCOPES = "tweet.read tweet.write users.read offline.access";

function getCredentials() {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET required");
  return { clientId, clientSecret };
}

/**
 * Generate PKCE code verifier and challenge.
 * Store the verifier alongside the OAuth state for use in token exchange.
 */
export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
}

export const twitterOAuth: OAuthHandler = {
  getAuthorizationUrl(state: string, redirectUri: string): string {
    const { clientId } = getCredentials();
    // NOTE: codeChallenge must be generated externally and appended.
    // This returns the base URL; the caller must add code_challenge.
    return buildUrl(AUTH_URL, {
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: SCOPES,
      state,
      code_challenge_method: "S256",
      // code_challenge is added by the route handler
    });
  },

  async exchangeCode(code: string, redirectUri: string, codeVerifier?: string): Promise<OAuthTokens> {
    const { clientId, clientSecret } = getCredentials();
    if (!codeVerifier) throw new Error("PKCE code_verifier required for Twitter");

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
        code_verifier: codeVerifier,
      }),
    });
    if (!res.ok) throw new Error(`Twitter token exchange failed: ${await res.text()}`);
    const data = await res.json();

    // Get user info
    const meRes = await fetch("https://api.twitter.com/2/users/me", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const me = await meRes.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: SCOPES,
      platformUserId: me.data?.id,
      accountName: me.data?.username ? `@${me.data.username}` : me.data?.name,
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
    if (!res.ok) throw new Error(`Twitter refresh failed: ${await res.text()}`);
    const data = await res.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  },
};
