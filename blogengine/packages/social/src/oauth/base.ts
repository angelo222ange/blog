import type { OAuthHandler, OAuthTokens } from "../types.js";

export { OAuthHandler, OAuthTokens };

/**
 * Helper to build a URL with query parameters.
 */
export function buildUrl(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  return url.toString();
}
