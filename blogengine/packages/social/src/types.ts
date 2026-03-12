import type { SocialPlatform } from "@blogengine/core";

// ─── OAuth ───

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
  platformUserId?: string;
  accountName?: string;
  metadata?: Record<string, any>;
}

export interface OAuthHandler {
  getAuthorizationUrl(state: string, redirectUri: string): string;
  exchangeCode(code: string, redirectUri: string, codeVerifier?: string): Promise<OAuthTokens>;
  refreshToken(refreshToken: string): Promise<OAuthTokens>;
}

// ─── Platform Publishing ───

export interface PublishParams {
  accessToken: string;
  text: string;
  mediaUrls?: string[];
  link?: string;
  metadata?: Record<string, any>;
}

export interface PublishResult {
  platformPostId: string;
  platformUrl: string;
}

export interface PlatformClient {
  readonly platform: SocialPlatform;
  publish(params: PublishParams): Promise<PublishResult>;
  delete(accessToken: string, platformPostId: string): Promise<void>;
  validateToken(accessToken: string): Promise<boolean>;
}

// ─── Post Generation ───

export interface PlatformConstraints {
  maxChars: number;
  maxHashtags: number;
  supportsLinks: boolean;
  supportsImages: boolean;
  tone: string;
  format: string;
}

export const PLATFORM_CONSTRAINTS: Record<SocialPlatform, PlatformConstraints> = {
  facebook: {
    maxChars: 500,
    maxHashtags: 5,
    supportsLinks: true,
    supportsImages: true,
    tone: "Conversationnel, informatif, accessible",
    format: "Question ou hook + insight cle + CTA avec lien",
  },
  instagram: {
    maxChars: 2200,
    maxHashtags: 20,
    supportsLinks: false,
    supportsImages: true,
    tone: "Engageant, visuel, storytelling",
    format: "Hook percutant + contenu value + CTA (lien en bio) + bloc hashtags",
  },
  linkedin: {
    maxChars: 3000,
    maxHashtags: 5,
    supportsLinks: true,
    supportsImages: true,
    tone: "Professionnel, thought-leadership, expertise",
    format: "Accroche forte (1 ligne) + saut de ligne + analyse pro + CTA",
  },
  twitter: {
    maxChars: 280,
    maxHashtags: 3,
    supportsLinks: true,
    supportsImages: true,
    tone: "Percutant, direct, incisif",
    format: "Statement impactant + lien + hashtags",
  },
  pinterest: {
    maxChars: 500,
    maxHashtags: 10,
    supportsLinks: true,
    supportsImages: true,
    tone: "Inspirant, actionnable, pratique",
    format: "Titre pin (max 100 chars) + description riche avec mots-cles",
  },
  tiktok: {
    maxChars: 2200,
    maxHashtags: 8,
    supportsLinks: false,
    supportsImages: true,
    tone: "Dynamique, educatif, tendance, authentique",
    format: "Hook (1 ligne) + contenu value en bullet points + CTA + hashtags tendance",
  },
};

export type CarouselSlideType = "hook" | "problem" | "value" | "proof" | "rehook" | "cta";

export interface CarouselSlide {
  slideType?: CarouselSlideType;
  title: string;
  subtitle: string;
  highlight?: string;
  imagePrompt: string;
}

export interface GeneratedPost {
  platform: SocialPlatform;
  content: string;
  hashtags: string[];
  pinTitle?: string;
  imagePrompt?: string;
  carouselSlides?: CarouselSlide[];
}

export interface ArticleForSocial {
  title: string;
  metaDescription: string;
  keywords: string[];
  category?: string;
  sections: Array<{ title: string }>;
  url: string;
  heroImageUrl?: string;
  /** Name of the site/product/brand being promoted */
  siteName?: string;
  /** Short description of what the site/product does */
  siteDescription?: string;
}
