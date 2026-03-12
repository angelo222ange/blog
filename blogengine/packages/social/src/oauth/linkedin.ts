/**
 * LinkedIn OAuth 2.0.
 */
import type { OAuthHandler, OAuthTokens } from "../types.js";
import { buildUrl } from "./base.js";

const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const SCOPES = "openid profile w_member_social w_organization_social r_organization_social rw_organization_admin";

function getCredentials() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET required");
  return { clientId, clientSecret };
}

export const linkedinOAuth: OAuthHandler = {
  getAuthorizationUrl(state: string, redirectUri: string): string {
    const { clientId } = getCredentials();
    return buildUrl(AUTH_URL, {
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      scope: SCOPES,
    });
  },

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const { clientId, clientSecret } = getCredentials();

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) throw new Error(`LinkedIn token exchange failed: ${await res.text()}`);
    const data = await res.json();

    // Get user info
    const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const me = await meRes.json();

    // Fetch organizations (company pages) the user can admin
    let organizations: Array<{ id: string; name: string; logoUrl?: string }> = [];
    try {
      const orgRes = await fetch(
        "https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~(localizedName,id,logoV2~(original))))",
        { headers: { Authorization: `Bearer ${data.access_token}` } }
      );
      if (orgRes.ok) {
        const orgData = await orgRes.json();
        organizations = (orgData.elements || [])
          .filter((el: any) => el["organization~"])
          .map((el: any) => {
            const org = el["organization~"];
            const logoUrl = org["logoV2~"]?.original || undefined;
            return {
              id: String(org.id),
              name: org.localizedName,
              logoUrl,
            };
          });
      }
    } catch {}

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: SCOPES,
      platformUserId: me.sub,
      accountName: me.name,
      metadata: {
        personId: me.sub,
        personName: me.name,
        personPicture: me.picture || undefined,
        organizations,
      },
    };
  },

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const { clientId, clientSecret } = getCredentials();

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) throw new Error(`LinkedIn refresh failed: ${await res.text()}`);
    const data = await res.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  },
};
