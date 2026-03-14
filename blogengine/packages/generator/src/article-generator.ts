import OpenAI from "openai";
import type { GeneratedArticle, SiteAdapter, ExistingArticle } from "@blogengine/core";
import { MASTER_SYSTEM_PROMPT } from "./prompts/master-prompt.js";
import { buildUserPrompt } from "./prompts/seo-article.js";
import { scrapeNewsForSite } from "./news-scraper.js";
import { findHeroImage } from "./image-pipeline.js";

interface SiteInfo {
  id: string;
  name: string;
  repoOwner: string;
  repoName: string;
  blogPattern: string;
  blogBasePath: string;
  contentDir: string;
  imageDir: string;
  city?: string | null;
  department?: string | null;
  domain?: string | null;
  theme: string;
  phone?: string | null;
}

interface GenerateOptions {
  site: SiteInfo;
  adapter: SiteAdapter;
  topicHint?: string;
  apiKey: string;
  existingArticles?: ExistingArticle[];
  usedImageUrls?: string[];
  imageSource?: "auto" | "ai" | "pexels" | "wikimedia";
}

export async function generateArticleForSite(
  options: GenerateOptions
): Promise<GeneratedArticle> {
  const { site, adapter, topicHint, apiKey } = options;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY non definie. Ajoute-la dans le fichier .env");
  }

  const client = new OpenAI({ apiKey });

  // Get existing articles from GitHub
  let existingArticles = options.existingArticles;
  if (!existingArticles) {
    try {
      existingArticles = await crawlViaGitHubApi(site);
      console.log(`[crawl] ${existingArticles.length} articles existants trouves pour ${site.name}`);
    } catch {
      existingArticles = [];
    }
  }

  // Get site pages for internal linking
  let sitePages: string[] = [];
  try {
    sitePages = await crawlSitePages(site);
    console.log(`[crawl] ${sitePages.length} pages trouvees pour le maillage interne`);
  } catch {
    sitePages = [];
  }

  // Get site config (phone, etc.) from the repo
  let phone = site.phone;
  if (!phone) {
    try {
      phone = await crawlSitePhone(site);
    } catch {
      phone = null;
    }
  }

  // Scrape recent news for the site's sector
  let newsPrompt = "";
  try {
    const news = await scrapeNewsForSite(site.name, site.theme, site.city);
    if (news.items.length > 0) {
      console.log(`[crawl] ${news.items.length} actualites recentes trouvees`);
      newsPrompt = news.prompt;
    }
  } catch {
    newsPrompt = "";
  }

  // Build user prompt with full site context
  const userPrompt = buildUserPrompt({
    site: {
      name: site.name,
      domain: site.domain || "",
      city: site.city || undefined,
      department: site.department || undefined,
      phone: phone || undefined,
      theme: site.theme === "SAAS" ? "SAAS" : "LOCAL_SERVICE",
    },
    existingArticles,
    sitePages,
    topicHint,
    newsContext: newsPrompt || undefined,
    currentYear: new Date().getFullYear(),
  });

  console.log(`[generate] Pass 1: Generation structure avec gpt-4o pour ${site.name}...`);

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 16384,
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: MASTER_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Pas de reponse du modele OpenAI");
  }

  // Log usage
  const usage = response.usage;
  if (usage) {
    console.log(`[generate] Pass 1 Tokens: ${usage.prompt_tokens} in / ${usage.completion_tokens} out / ${usage.total_tokens} total`);
  }

  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let article: GeneratedArticle;
  try {
    article = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`JSON invalide recu du modele: ${(e as Error).message}\n\nReponse brute:\n${jsonStr.substring(0, 500)}`);
  }

  // Validation structure
  const errors: string[] = [];
  if (!article.slug) errors.push("slug manquant");
  if (!article.title) errors.push("title manquant");
  if (!article.sections?.length) errors.push("sections manquantes");
  if (article.sections?.length < 5) errors.push(`seulement ${article.sections?.length} sections (minimum 5)`);
  if (!article.faq?.length) errors.push("FAQ manquante");
  if (article.faq && article.faq.length < 5) errors.push(`seulement ${article.faq.length} FAQ (minimum 5)`);
  // Validate FAQ quality: each answer should have substance
  if (article.faq) {
    for (const f of article.faq) {
      const answerWords = countWords(f.answer || "");
      if (answerWords < 20) {
        console.log(`[generate] WARN: FAQ "${f.question.substring(0, 40)}..." reponse trop courte (${answerWords} mots)`);
      }
    }
  }
  if (!article.tldr) errors.push("TLDR manquant");
  if (!article.keywords?.length) errors.push("keywords manquants");
  if (article.keywords && article.keywords.length < 10) errors.push(`seulement ${article.keywords.length} keywords (minimum 10)`);

  // Validation tableaux et listes
  if (article.sections) {
    const hasTable = article.sections.some((s: any) => s.table && s.table.headers?.length > 0);
    const hasList = article.sections.some((s: any) => s.list && s.list.length > 0);
    if (!hasTable) {
      console.log("[generate] WARN: pas de tableau - ajout en post-traitement");
    }
    if (!hasList) {
      console.log("[generate] WARN: pas de liste - ajout en post-traitement");
    }
  }

  if (errors.length > 0) {
    throw new Error(`Article invalide:\n${errors.join("\n")}`);
  }

  // Pass 2: Expand short sections individually
  const MIN_WORDS_PER_SECTION = 280;
  const sectionsToExpand: number[] = [];
  for (let i = 0; i < article.sections.length; i++) {
    const words = countWords(article.sections[i]?.content || "");
    if (words < MIN_WORDS_PER_SECTION) {
      sectionsToExpand.push(i);
    }
  }

  if (sectionsToExpand.length > 0) {
    console.log(`[generate] Pass 2: ${sectionsToExpand.length} sections a developper (< ${MIN_WORDS_PER_SECTION} mots)...`);

    const expandPromises = sectionsToExpand.map(async (idx) => {
      const section = article.sections[idx]!;
      const currentWords = countWords(section.content || "");
      console.log(`[generate]   Section ${idx + 1} "${section.title}": ${currentWords} mots -> expansion...`);

      const expandPrompt = `Tu es un redacteur web SEO expert. Tu dois DEVELOPPER et ENRICHIR cette section d'article de blog.

## CONTEXTE
- Site : ${site.name}${site.city ? ` a ${site.city}` : ""}
- Theme : ${site.theme === "SAAS" ? "SaaS" : "Service local"}
- Titre article : ${article.title}
${site.city ? `- Ville : ${site.city}` : ""}
${site.department ? `- Departement : ${site.department}` : ""}
${phone ? `- Telephone : ${phone}` : ""}

## SECTION A DEVELOPPER
Titre H2 : ${section.title}
Contenu actuel (${currentWords} mots) :
${section.content}

## INSTRUCTIONS
- DEVELOPPE cette section pour atteindre MINIMUM 350 mots (actuellement ${currentWords} mots)
- Ajoute des exemples CONCRETS, des chiffres REELS, des cas pratiques
- Ecris 5-6 paragraphes de 3-4 phrases chacun
- SEPARE chaque paragraphe par UNE LIGNE VIDE (double saut de ligne)
- Utilise <strong>gras</strong> sur 3-4 mots-cles importants
- Garde le meme ton professionnel et informatif
- NE CHANGE PAS le sujet ni le titre
${site.city ? `- Mentionne ${site.city} au moins 1 fois naturellement` : ""}
- Ne repete pas les memes phrases, ajoute du NOUVEAU contenu pertinent

Reponds UNIQUEMENT avec le nouveau contenu de la section (texte brut avec <strong> pour le gras, paragraphes separes par des lignes vides). PAS de JSON, PAS de titre, JUSTE le contenu developpe.`;

      const expandResponse = await client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 4096,
        temperature: 0.7,
        messages: [
          { role: "user", content: expandPrompt },
        ],
      });

      const expandedContent = expandResponse.choices[0]?.message?.content?.trim();
      if (expandedContent && countWords(expandedContent) > currentWords) {
        const newWords = countWords(expandedContent);
        console.log(`[generate]   Section ${idx + 1}: ${currentWords} -> ${newWords} mots`);
        article.sections[idx]!.content = expandedContent;
      }

      // Log pass 2 token usage
      const u2 = expandResponse.usage;
      if (u2) {
        console.log(`[generate]   Pass 2 tokens section ${idx + 1}: ${u2.prompt_tokens} in / ${u2.completion_tokens} out`);
      }
    });

    await Promise.all(expandPromises);
  }

  // Clean markdown artifacts from all text fields
  article.intro = cleanMarkdown(article.intro || "");
  article.tldr = cleanMarkdown(article.tldr || "");
  article.conclusion = cleanMarkdown(article.conclusion || "");
  for (const s of article.sections) {
    s.content = cleanMarkdown(s.content || "");
    s.title = cleanMarkdown(s.title || "");
    if (s.list) {
      for (const item of s.list) {
        item.title = cleanMarkdown(item.title || "");
        item.description = cleanMarkdown(item.description || "");
      }
    }
  }
  for (const f of article.faq) {
    f.question = cleanMarkdown(f.question || "");
    f.answer = cleanMarkdown(f.answer || "");
  }

  // Add defaults
  if (!article.images) article.images = [];
  if (!article.date) article.date = new Date().toISOString().split("T")[0]!;
  if (!article.internalLinks) article.internalLinks = [];
  if (!article.externalLinks) article.externalLinks = [];

  // Find hero image (Pexels/Unsplash -> download -> WebP conversion)
  try {
    const heroImage = await findHeroImage(
      site.name,
      site.theme,
      article.title,
      article.keywords || [],
      article.slug,
      site.city,
      options.imageSource || "ai",
      options.usedImageUrls || [],
    );
    if (heroImage) {
      // Store image buffers in article.images for the publisher to write
      article.images = [
        {
          filename: heroImage.filename,
          alt: heroImage.alt,
          buffer: heroImage.hero.buffer,
          sizes: {
            sm: heroImage.filenameThumb,
            md: heroImage.filenameCard,
            lg: heroImage.filename,
          },
        },
        {
          filename: heroImage.filenameCard,
          alt: heroImage.alt,
          buffer: heroImage.card.buffer,
        },
        {
          filename: heroImage.filenameThumb,
          alt: heroImage.alt,
          buffer: heroImage.thumb.buffer,
        },
      ];
      // Store SEO metadata on the article for DB + frontend preview
      (article as any).heroImage = heroImage.filename;
      (article as any).heroImageCard = heroImage.filenameCard;
      (article as any).heroImageThumb = heroImage.filenameThumb;
      (article as any).heroImageAlt = heroImage.alt;
      (article as any).heroImageTitle = heroImage.title;
      (article as any).heroImageCredit = heroImage.credit;
      (article as any).heroImageCreditUrl = heroImage.creditUrl;
      (article as any).heroImageSourceUrl = heroImage.sourceUrl;
      // Keep direct image URL for the preview (before publication, images aren't on disk yet)
      (article as any).heroImagePreviewUrl = heroImage.previewUrl;

      console.log(`[generate] Image hero: ${heroImage.filename} (${heroImage.credit})`);
      console.log(`[generate]   alt: "${heroImage.alt}"`);
      console.log(`[generate]   title: "${heroImage.title}"`);
    }
  } catch (err: any) {
    console.log(`[generate] Erreur recherche image: ${err.message}`);
  }

  // Count words for logging
  let totalWords = 0;
  totalWords += countWords(article.intro || "");
  for (const s of article.sections) {
    totalWords += countWords(s.content || "");
  }
  totalWords += countWords(article.conclusion || "");
  console.log(`[generate] Article final: "${article.title}" (${totalWords} mots, ${article.sections.length} sections, ${article.faq.length} FAQ)`);

  return article;
}

function countWords(text: string): number {
  return text.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length;
}

function cleanMarkdown(text: string): string {
  // Convert **text** to <strong>text</strong>
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Remove remaining single * (italic markdown)
  text = text.replace(/\*([^*]+)\*/g, "$1");
  // Remove __ bold
  text = text.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  // Remove markdown headers (## Title)
  text = text.replace(/^#{1,6}\s+/gm, "");
  // Remove markdown links [text](url) -> text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Remove triple backticks
  text = text.replace(/```[^`]*```/g, "");
  return text;
}

async function githubFetch(url: string): Promise<any> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  return res.json();
}

async function crawlViaGitHubApi(site: SiteInfo): Promise<ExistingArticle[]> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return [];

  try {
    const url = `https://api.github.com/repos/${site.repoOwner}/${site.repoName}/contents/${site.contentDir}/articles.json`;
    const data = await githubFetch(url);
    if (!data) return [];

    const decoded = Buffer.from(data.content, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    const articles = Array.isArray(parsed) ? parsed : parsed.articles || [];

    return articles.map((a: any) => ({
      slug: a.slug,
      title: a.title,
      date: a.date || a.dateISO || "",
      category: a.category || "",
      keywords: a.keywords || [],
      excerpt: a.excerpt || "",
    }));
  } catch {
    return [];
  }
}

async function crawlSitePages(site: SiteInfo): Promise<string[]> {
  try {
    const url = `https://api.github.com/repos/${site.repoOwner}/${site.repoName}/git/trees/main?recursive=1`;
    const data = await githubFetch(url);
    if (!data?.tree) return [];

    const pages: string[] = [];
    for (const file of data.tree) {
      if (file.type !== "blob") continue;
      // Match Next.js page files
      const match = file.path.match(/^(?:app|src\/app)\/(.+?)\/page\.tsx$/);
      if (match) {
        let route = "/" + match[1];
        // Skip dynamic routes and blog pages
        if (route.includes("[") || route.includes("blog")) continue;
        pages.push(route);
      }
    }
    return pages;
  } catch {
    return [];
  }
}

async function crawlSitePhone(site: SiteInfo): Promise<string | null> {
  try {
    // Try config/site.ts
    const url = `https://api.github.com/repos/${site.repoOwner}/${site.repoName}/contents/config/site.ts`;
    const data = await githubFetch(url);
    if (!data) return null;

    const content = Buffer.from(data.content, "base64").toString("utf-8");
    const phoneMatch = content.match(/phone:\s*["']([^"']+)["']/);
    return phoneMatch?.[1] || null;
  } catch {
    return null;
  }
}
