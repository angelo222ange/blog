/**
 * Generate social media posts from an article using OpenAI.
 * One API call generates posts for all requested platforms.
 * If any post exceeds its platform limit, a targeted re-generation
 * is done for that specific platform to produce proper short content.
 */
import OpenAI from "openai";
import type { SocialPlatform } from "@blogengine/core";
import type { ArticleForSocial, GeneratedPost, TopPerformerData, NicheTrendData } from "./types.js";
import { SOCIAL_SYSTEM_PROMPT, buildSocialUserPrompt } from "./prompts/social-prompts.js";
import { PLATFORM_CONSTRAINTS } from "./types.js";

/**
 * Re-generate a single post for a platform that exceeded its character limit.
 * Uses a focused prompt that asks the AI to condense the content properly.
 */
async function regenForPlatform(
  openai: OpenAI,
  article: ArticleForSocial,
  platform: SocialPlatform,
  originalContent: string,
): Promise<{ content: string; hashtags: string[] } | null> {
  const constraints = PLATFORM_CONSTRAINTS[platform];

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Tu es un copywriter social media expert. Tu dois CONDENSER un post pour ${platform.toUpperCase()}.
LIMITE ABSOLUE : ${constraints.maxChars} caracteres MAX pour le champ "content".
${platform === "twitter" ? "Twitter = 1 phrase percutante + lien. MAX 250 chars. Sois ULTRA concis." : ""}
Ecris en francais. ZERO emoji. Les hashtags vont UNIQUEMENT dans "hashtags", PAS dans "content".
${article.siteName ? `Le post est publie par ${article.siteName}. Mentionne le nom 1 fois.` : ""}`,
        },
        {
          role: "user",
          content: `Ce post fait ${originalContent.length} chars mais la limite ${platform} est ${constraints.maxChars}.
REECRIS-LE en ${constraints.maxChars} chars MAX. Ne tronque pas, REFORMULE en plus court.

Post original :
"${originalContent}"

Sujet : ${article.title}
URL : ${article.url}

Retourne : { "content": "le texte reformule COURT", "hashtags": ["tag1", "tag2"] }`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const raw = res.choices[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const content = String(parsed.content || "").trim();
    const hashtags = Array.isArray(parsed.hashtags)
      ? parsed.hashtags.slice(0, constraints.maxHashtags).map((h: string) => h.replace(/^#/, ""))
      : [];

    // Final safety: hard truncate if still over
    if (content.length > constraints.maxChars) {
      const truncated = content.slice(0, constraints.maxChars - 1);
      const lastSpace = truncated.lastIndexOf(" ");
      return {
        content: (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated).trim(),
        hashtags,
      };
    }

    console.log(`[social] Re-generated ${platform}: ${originalContent.length} -> ${content.length} chars`);
    return { content, hashtags };
  } catch (err: any) {
    console.error(`[social] Regen failed for ${platform}: ${err.message}`);
    return null;
  }
}

export async function generateSocialPosts(
  article: ArticleForSocial,
  platforms: SocialPlatform[],
  apiKey: string,
  options?: { carousel?: boolean; topPerformers?: TopPerformerData[]; nicheTrends?: NicheTrendData[] },
): Promise<GeneratedPost[]> {
  if (platforms.length === 0) return [];

  const openai = new OpenAI({ apiKey });

  const userPrompt = buildSocialUserPrompt(article, platforms, options);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SOCIAL_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: options?.carousel ? 5000 : 3000,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response from OpenAI");

  const parsed = JSON.parse(raw);
  if (!parsed.posts || !Array.isArray(parsed.posts)) {
    throw new Error("Invalid response format: missing posts array");
  }

  // Validate and enforce constraints
  const posts: GeneratedPost[] = [];
  for (const post of parsed.posts) {
    const platform = post.platform as SocialPlatform;
    if (!platforms.includes(platform)) continue;

    const constraints = PLATFORM_CONSTRAINTS[platform];
    let content = String(post.content || "").trim();
    let hashtags = Array.isArray(post.hashtags)
      ? post.hashtags.slice(0, constraints.maxHashtags).map((h: string) => h.replace(/^#/, ""))
      : [];

    // If content exceeds platform limit, re-generate with a focused prompt
    if (content.length > constraints.maxChars) {
      console.log(`[social] ${platform} over limit: ${content.length}/${constraints.maxChars} chars, re-generating...`);

      const regen = await regenForPlatform(openai, article, platform, content);
      if (regen) {
        content = regen.content;
        hashtags = regen.hashtags;
      } else {
        // Fallback: truncate at last sentence boundary
        const limit = constraints.maxChars;
        const truncated = content.slice(0, limit - 1);
        const lastSentence = Math.max(
          truncated.lastIndexOf(". "),
          truncated.lastIndexOf(".\n"),
          truncated.lastIndexOf("! "),
          truncated.lastIndexOf("!\n"),
          truncated.lastIndexOf("? "),
          truncated.lastIndexOf("?\n"),
        );
        if (lastSentence > limit * 0.4) {
          content = truncated.slice(0, lastSentence + 1).trim();
        } else {
          const lastSpace = truncated.lastIndexOf(" ");
          content = (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated).trim();
        }
      }
    }

    // Parse carousel slides if present
    const carouselSlides = Array.isArray(post.carouselSlides)
      ? post.carouselSlides.map((s: any) => ({
          slideType: s.slideType || undefined,
          title: String(s.title || "").trim(),
          subtitle: String(s.subtitle || "").trim(),
          highlight: s.highlight ? String(s.highlight).trim() : undefined,
          imagePrompt: String(s.imagePrompt || "").trim(),
        })).filter((s: any) => s.title && s.subtitle)
      : undefined;

    posts.push({
      platform,
      content,
      hashtags,
      pinTitle: platform === "pinterest" ? post.pinTitle : undefined,
      imagePrompt: post.imagePrompt || undefined,
      carouselSlides: carouselSlides && carouselSlides.length > 0 ? carouselSlides : undefined,
    });
  }

  console.log(`[social] Generated ${posts.length} posts: ${posts.map((p) => `${p.platform}(${p.content.length}c)`).join(", ")}`);
  return posts;
}
