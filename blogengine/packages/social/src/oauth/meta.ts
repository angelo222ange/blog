/**
 * Meta OAuth 2.0 (Facebook + Instagram).
 * Single OAuth flow yields both Facebook Page and Instagram Business Account.
 */
import type { OAuthHandler, OAuthTokens } from "../types.js";
import { buildUrl } from "./base.js";

const AUTH_URL = "https://www.facebook.com/v21.0/dialog/oauth";
const TOKEN_URL = "https://graph.facebook.com/v21.0/oauth/access_token";
const SCOPES = "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish";

function getCredentials() {
  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;
  if (!clientId || !clientSecret) throw new Error("META_APP_ID and META_APP_SECRET required");
  return { clientId, clientSecret };
}

export const metaOAuth: OAuthHandler = {
  getAuthorizationUrl(state: string, redirectUri: string): string {
    const { clientId } = getCredentials();
    return buildUrl(AUTH_URL, {
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: SCOPES,
      state,
      response_type: "code",
      auth_type: "reauthenticate",
    });
  },

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const { clientId, clientSecret } = getCredentials();

    // Exchange code for short-lived token
    const res = await fetch(buildUrl(TOKEN_URL, {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }));
    if (!res.ok) throw new Error(`Meta token exchange failed: ${await res.text()}`);
    const data = await res.json();

    // Exchange for long-lived token (60 days)
    const longRes = await fetch(buildUrl(TOKEN_URL, {
      grant_type: "fb_exchange_token",
      client_id: clientId,
      client_secret: clientSecret,
      fb_exchange_token: data.access_token,
    }));
    if (!longRes.ok) throw new Error(`Meta long-lived token exchange failed: ${await longRes.text()}`);
    const longData = await longRes.json();

    // Get user info
    const meRes = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${longData.access_token}`);
    const me = await meRes.json();

    return {
      accessToken: longData.access_token,
      expiresIn: longData.expires_in || 5184000,
      scope: SCOPES,
      platformUserId: me.id,
      accountName: me.name,
    };
  },

  async refreshToken(): Promise<OAuthTokens> {
    throw new Error("Meta uses long-lived tokens. Re-authorize when expired.");
  },
};

/**
 * After OAuth, call this to discover Facebook Pages and Instagram accounts.
 */
export async function discoverMetaAccounts(userAccessToken: string): Promise<{
  pages: Array<{ id: string; name: string; accessToken: string; instagramId?: string }>;
}> {
  // Get pages with their tokens
  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userAccessToken}`
  );
  if (!pagesRes.ok) throw new Error(`Failed to fetch pages: ${await pagesRes.text()}`);
  const pagesData = await pagesRes.json();

  const pages = (pagesData.data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    accessToken: p.access_token,
    instagramId: p.instagram_business_account?.id,
  }));

  return { pages };
}
