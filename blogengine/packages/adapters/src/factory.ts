import type { SiteAdapter, BlogPattern } from "@blogengine/core";
import { JsonIndividualAdapter } from "./json-individual.adapter.js";

interface SiteInfo {
  repoOwner: string;
  repoName: string;
  blogPattern: string;
  blogBasePath: string;
  contentDir: string;
  imageDir: string;
  city?: string | null;
  name: string;
}

export function createAdapter(site: SiteInfo): SiteAdapter {
  const pattern = site.blogPattern as BlogPattern;

  switch (pattern) {
    case "JSON_INDIVIDUAL":
    case "CUSTOM_ROUTE":
      return new JsonIndividualAdapter(site);
    case "JSON_ARRAY":
      // TODO: Phase 4
      return new JsonIndividualAdapter(site);
    case "TS_MODULE":
      // TODO: Phase 4
      return new JsonIndividualAdapter(site);
    case "MONOREPO":
      // TODO: Phase 4
      return new JsonIndividualAdapter(site);
    case "NO_BLOG":
      // TODO: Phase 4
      return new JsonIndividualAdapter(site);
    default:
      throw new Error(`Pattern de blog non supporte: ${pattern}`);
  }
}
