/**
 * Generate social media posts from an article using OpenAI.
 * One API call generates posts for all requested platforms.
 */
import OpenAI from "openai";
import type { SocialPlatform } from "@blogengine/core";
import type { ArticleForSocial, GeneratedPost } from "./types.js";
import { SOCIAL_SYSTEM_PROMPT, buildSocialUserPrompt } from "./prompts/social-prompts.js";
import { PLATFORM_CONSTRAINTS } from "./types.js";

export async function generateSocialPosts(
  article: ArticleForSocial,
  platforms: SocialPlatform[],
  apiKey: string,
  options?: { carousel?: boolean },
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
    const hashtags = Array.isArray(post.hashtags)
      ? post.hashtags.slice(0, constraints.maxHashtags).map((h: string) => h.replace(/^#/, ""))
      : [];

    // Truncate intelligently if over limit - cut at last complete sentence
    if (content.length > constraints.maxChars) {
      const limit = constraints.maxChars;
      const truncated = content.slice(0, limit - 1);
      // Find last sentence boundary (. ! ? or newline)
      const lastSentence = Math.max(
        truncated.lastIndexOf(". "),
        truncated.lastIndexOf(".\n"),
        truncated.lastIndexOf("! "),
        truncated.lastIndexOf("!\n"),
        truncated.lastIndexOf("? "),
        truncated.lastIndexOf("?\n"),
      );
      if (lastSentence > limit * 0.4) {
        // Cut at sentence end if we keep at least 40% of content
        content = truncated.slice(0, lastSentence + 1).trim();
      } else {
        // Fallback: cut at last space
        const lastSpace = truncated.lastIndexOf(" ");
        content = (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated).trim();
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

  console.log(`[social] Generated ${posts.length} posts for: ${posts.map((p) => p.platform).join(", ")}`);
  return posts;
}
