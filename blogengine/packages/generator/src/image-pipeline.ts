/**
 * Pipeline d'images pour les articles de blog.
 *
 * ZERO CONFIG : fonctionne sans cle API.
 *
 * Sources (par ordre de priorite) :
 * 1. Pexels API (si PEXELS_API_KEY configuree - meilleure qualite)
 * 2. Unsplash API (si UNSPLASH_ACCESS_KEY configuree)
 * 3. Wikimedia Commons (GRATUIT, pas de cle, pas de compte)
 *
 * REGLES D'OR :
 * - Format WebP obligatoire (conversion via sharp)
 * - Nom de fichier SEO (slug sans accents, avec mots-cles)
 * - Alt text SEO (descriptif, mot-cle + ville si local)
 * - Title SEO (different de l'alt, mot-cle + annee)
 * - URL sans accents
 */

import sharp from "sharp";
import { enhanceImagePrompt } from "./prompt-enhancer.js";

export interface ProcessedImage {
  hero: { buffer: Buffer; width: number; height: number; size: number };
  card: { buffer: Buffer; width: number; height: number; size: number };
  thumb: { buffer: Buffer; width: number; height: number; size: number };
  filename: string;
  filenameCard: string;
  filenameThumb: string;
  alt: string;
  title: string;
  credit: string;
  creditUrl: string;
  sourceUrl: string;
  previewUrl: string;     // URL directe de l'image pour la preview dans le dashboard
}

const HERO_WIDTH = 1200;
const HERO_HEIGHT = 630;
const CARD_WIDTH = 600;
const CARD_HEIGHT = 400;
const THUMB_WIDTH = 300;
const THUMB_HEIGHT = 200;

// Termes PRECIS en anglais — assez specifiques pour eviter les images hors-sujet
// IMPORTANT: "commercial" et "shop front" pour eviter les resultats residentiels
const SEARCH_KEYWORDS: Record<string, string[]> = {
  "rideau-metallique": [
    "commercial steel roller shutter shop front closed",
    "metal security shutter storefront commercial building",
    "industrial rolling steel door warehouse",
    "galvanized steel roller shutter commercial",
    "shop front metal grille security shutter",
  ],
  "drm": [
    "commercial steel roller shutter shop front closed",
    "metal security shutter storefront commercial building",
    "industrial rolling steel door warehouse",
    "galvanized steel roller shutter commercial",
  ],
  "serrurerie": [
    "locksmith installing deadbolt door lock",
    "professional locksmith working front door",
    "security cylinder lock mechanism close up",
    "commercial door lock hardware installation",
    "key cutting locksmith workshop",
  ],
  "serrurier": [
    "locksmith installing deadbolt door lock",
    "professional locksmith working front door",
    "security cylinder lock mechanism close up",
    "commercial door lock hardware installation",
  ],
  "saas": [
    "software dashboard analytics screen dark mode",
    "modern SaaS application interface laptop",
    "tech startup workspace multiple monitors",
    "data visualization dashboard modern UI",
  ],
  "plomberie": [
    "plumber repairing copper pipe wrench",
    "professional plumber bathroom installation",
    "water heater maintenance technician",
    "copper plumbing pipe fitting close up",
  ],
  "electricite": [
    "electrician working electrical panel residential",
    "commercial electrical wiring installation",
    "circuit breaker panel maintenance technician",
    "electrical conduit wiring professional",
  ],
  "demenagement": [
    "professional movers loading furniture truck",
    "moving boxes stacked new apartment",
    "moving company workers carrying sofa",
  ],
  "nettoyage": [
    "professional cleaning team commercial building",
    "industrial floor cleaning machine warehouse",
    "janitorial service office cleaning supplies",
  ],
};

function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function buildSeoFilename(slug: string): string {
  return removeAccents(slug)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildSeoAlt(
  articleTitle: string,
  siteName: string,
  city?: string | null,
): string {
  let alt = articleTitle
    .replace(/\b20\d{2}\b/g, "")
    .replace(/\s*:\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();

  if (city && !alt.toLowerCase().includes(city.toLowerCase())) {
    alt += ` a ${city}`;
  }

  return alt;
}

function buildSeoTitle(
  articleTitle: string,
  city?: string | null,
  keywords: string[] = []
): string {
  const mainKeyword = keywords[0] || articleTitle;
  let title = mainKeyword;
  if (city && !title.toLowerCase().includes(city.toLowerCase())) {
    title += ` ${city}`;
  }
  const year = new Date().getFullYear();
  if (!title.includes(String(year))) {
    title += ` ${year}`;
  }
  return title;
}

// Noms anglais des villes francaises pour les recherches d'images
const CITY_SEARCH_NAMES: Record<string, string> = {
  "bordeaux": "Bordeaux city France",
  "montpellier": "Montpellier city France",
  "nice": "Nice France coast",
  "toulouse": "Toulouse city France",
  "paris": "Paris France",
  "lyon": "Lyon city France",
  "marseille": "Marseille city France",
  "nantes": "Nantes city France",
  "strasbourg": "Strasbourg city France",
  "lille": "Lille city France",
  "rennes": "Rennes city France",
};

function getSearchTerms(siteName: string, siteTheme: string, articleTitle: string, keywords: string[], city?: string | null): string[] {
  const name = siteName.toLowerCase();

  // === SITES LOCAUX : SERVICE d'abord (pertinence), ville en dernier recours ===
  if (city && siteTheme !== "SAAS") {
    const cityLower = city.toLowerCase();
    const citySearch = CITY_SEARCH_NAMES[cityLower] || `${city} France city`;

    let serviceTerms: string[] = [];
    for (const [key, terms] of Object.entries(SEARCH_KEYWORDS)) {
      if (name.includes(key.split("-")[0]!) || name.includes(key)) {
        serviceTerms = terms;
        break;
      }
    }

    return [
      // 1. SERVICE seul (images pertinentes du metier)
      ...serviceTerms.slice(0, 3),
      // 2. Ville seule en fallback (si rien de pertinent sur le metier)
      citySearch,
      `${city} architecture`,
    ];
  }

  // === SITES NON-LOCAUX (SAAS, etc.) : images thematiques ===
  let baseTerms: string[] = [];
  for (const [key, terms] of Object.entries(SEARCH_KEYWORDS)) {
    if (name.includes(key.split("-")[0]!) || name.includes(key)) {
      baseTerms = terms;
      break;
    }
  }
  if (baseTerms.length === 0 && siteTheme === "SAAS") {
    baseTerms = SEARCH_KEYWORDS["saas"]!;
  }

  const stopWords = new Set(["le", "la", "les", "de", "du", "des", "un", "une", "en", "a", "au", "aux", "pour", "et", "ou", "qui", "que", "son", "sa", "ses", "ce", "cette", "ces", "dans", "sur", "par", "avec", "pas", "ne", "plus", "tout", "faire", "comment", "pourquoi", "quel", "quelle", "quels", "quelles", "votre", "vos", "notre", "nos"]);
  const titleTerms = removeAccents(articleTitle)
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w))
    .slice(0, 3);

  const keywordTerms = keywords.slice(0, 2).map((k) => removeAccents(k));

  return [...baseTerms.slice(0, 2), ...titleTerms, ...keywordTerms];
}

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { "User-Agent": "BlogEngine/1.0 (https://github.com; contact@blogengine.dev)" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function convertToWebP(
  inputBuffer: Buffer,
  width: number,
  height: number,
  quality: number = 82
): Promise<{ buffer: Buffer; width: number; height: number; size: number }> {
  const result = await sharp(inputBuffer)
    .resize(width, height, { fit: "cover", position: "center" })
    .webp({ quality, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: result.data,
    width: result.info.width,
    height: result.info.height,
    size: result.info.size,
  };
}

// ============================================================
// WIKIMEDIA COMMONS (gratuit, pas de cle, CC licenses)
// ============================================================

interface ImageResult {
  downloadUrl: string;
  sourceUrl: string;
  credit: string;
  creditUrl: string;
}

async function searchWikimediaCommons(query: string, usedUrls: Set<string> = new Set()): Promise<ImageResult | null> {
  try {
    // Search for images in File namespace (ns=6)
    const encoded = encodeURIComponent(query);
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&srnamespace=6&srlimit=20&format=json&origin=*`;

    const searchRes = await fetch(searchUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "BlogEngine/1.0" },
    });
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    const results = searchData?.query?.search;
    if (!results || results.length === 0) return null;

    // Filter for actual image files (jpg, png, webp) - skip svg, pdf, ogg, etc.
    const imageExtensions = /\.(jpg|jpeg|png|webp|tiff)$/i;
    const imageResults = results.filter((r: any) => imageExtensions.test(r.title));

    // Try each image until we find one not already used
    for (const imageResult of imageResults) {
      const title = encodeURIComponent(imageResult.title);
      const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${title}&prop=imageinfo&iiprop=url|extmetadata|size|mime&format=json&origin=*`;

      const infoRes = await fetch(infoUrl, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "BlogEngine/1.0" },
      });
      if (!infoRes.ok) continue;

      const infoData = await infoRes.json();
      const pages = infoData?.query?.pages;
      if (!pages) continue;

      const page = Object.values(pages)[0] as any;
      const imageinfo = page?.imageinfo?.[0];
      if (!imageinfo?.url) continue;

      // Skip tiny images (less than 800px wide)
      if (imageinfo.width && imageinfo.width < 800) continue;

      // Skip non-image MIME types
      if (imageinfo.mime && !imageinfo.mime.startsWith("image/")) continue;

      // Skip images already used on this site
      const sourceUrl = `https://commons.wikimedia.org/wiki/${imageResult.title.replace(/ /g, "_")}`;
      if (usedUrls.has(imageinfo.url) || usedUrls.has(sourceUrl)) {
        console.log(`[images] Wikimedia: image deja utilisee, skip (${imageResult.title})`);
        continue;
      }

      // Extract credit from metadata
      const meta = imageinfo.extmetadata || {};
      const artist = meta.Artist?.value?.replace(/<[^>]+>/g, "").trim() || "Wikimedia Commons";
      const license = meta.LicenseShortName?.value || "CC";

      return {
        downloadUrl: imageinfo.url,
        sourceUrl,
        credit: `${artist} (${license})`,
        creditUrl: sourceUrl,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================================
// PEXELS API (optionnel - meilleure qualite)
// ============================================================

async function searchPexels(query: string, apiKey: string, usedUrls: Set<string> = new Set()): Promise<ImageResult | null> {
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encoded}&per_page=15&orientation=landscape&size=large`,
      {
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.photos || data.photos.length === 0) return null;

    // Skip photos already used on this site
    for (const photo of data.photos) {
      const downloadUrl = photo.src.large2x || photo.src.large || photo.src.original;
      if (usedUrls.has(downloadUrl) || usedUrls.has(photo.src.large2x) || usedUrls.has(photo.src.large) || usedUrls.has(photo.src.original) || usedUrls.has(photo.url)) {
        console.log(`[images] Pexels: image deja utilisee, skip (${photo.id})`);
        continue;
      }
      return {
        downloadUrl,
        sourceUrl: photo.url,
        credit: photo.photographer ? `Photo by ${photo.photographer}` : "",
        creditUrl: photo.photographer_url || "",
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================================
// UNSPLASH API (optionnel - fallback)
// ============================================================

async function searchUnsplash(query: string, apiKey: string, usedUrls: Set<string> = new Set()): Promise<ImageResult | null> {
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encoded}&per_page=15&orientation=landscape&content_filter=high`,
      {
        headers: {
          Authorization: `Client-ID ${apiKey}`,
          "Accept-Version": "v1",
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;

    // Skip photos already used on this site
    for (const photo of data.results) {
      const downloadUrl = photo.urls.regular;
      if (usedUrls.has(downloadUrl) || usedUrls.has(photo.links.html) || usedUrls.has(photo.urls.full)) {
        console.log(`[images] Unsplash: image deja utilisee, skip (${photo.id})`);
        continue;
      }

      // Trigger download (Unsplash requirement)
      fetch(photo.links.download_location, {
        headers: { Authorization: `Client-ID ${apiKey}` },
        signal: AbortSignal.timeout(3000),
      }).catch(() => {});

      return {
        downloadUrl,
        sourceUrl: photo.links.html,
        credit: `Photo by ${photo.user.name} on Unsplash`,
        creditUrl: `${photo.user.links.html}?utm_source=blogengine&utm_medium=referral`,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================================
// GEMINI AI IMAGE GENERATION (Nano Banana 2)
// ============================================================

export type ImageSource = "auto" | "ai" | "pexels" | "wikimedia";

// Scene descriptors par type de service — descriptions physiques precises
// pour que l'IA genere des images pertinentes et non generiques
const SERVICE_SCENE_DESCRIPTORS: Record<string, {
  scene: string;
  materials: string;
  context: string;
  avoid: string;
}> = {
  "rideau-metallique": {
    scene: "A commercial steel roller shutter on a French shop front, galvanized steel slats with visible horizontal ridges, mounted on a concrete or stone facade",
    materials: "galvanized steel, corrugated metal slats, steel guide rails, padlock mechanism, concrete lintel",
    context: "urban commercial street in France, shop facade, pavement, neighboring storefronts",
    avoid: "residential roller blinds, window shutters, wooden shutters, PVC blinds, interior blinds, curtains",
  },
  "drm": {
    scene: "A commercial steel roller shutter on a French shop front, galvanized steel slats with visible horizontal ridges",
    materials: "galvanized steel, corrugated metal slats, steel guide rails, padlock mechanism",
    context: "urban commercial street in France, shop facade, pavement",
    avoid: "residential roller blinds, window shutters, wooden shutters, PVC blinds, interior blinds",
  },
  "serrurerie": {
    scene: "A professional locksmith working on a residential front door, using specialized lock-picking or installation tools",
    materials: "brass cylinder lock, steel deadbolt, door handle mechanism, locksmith tool set, key blanks",
    context: "apartment building entrance, residential neighborhood in France, wooden or metal door",
    avoid: "car keys, car lockout, padlock only, safe cracking, burglar",
  },
  "serrurier": {
    scene: "A professional locksmith working on a residential front door, close-up on lock mechanism and tools",
    materials: "brass cylinder lock, steel deadbolt, door handle mechanism, locksmith tool set",
    context: "apartment building entrance in France, residential door",
    avoid: "car keys, car lockout, padlock only, safe cracking, burglar",
  },
  "plomberie": {
    scene: "A professional plumber working under a sink or on exposed copper piping, using a pipe wrench",
    materials: "copper pipes, brass fittings, PVC drainage, pipe wrench, Teflon tape, solder joints",
    context: "residential bathroom or kitchen in France, tiled walls, exposed plumbing access",
    avoid: "flooded room, sewage, dirty water, industrial plant",
  },
  "electricite": {
    scene: "An electrician working on an open residential electrical panel, connecting wires with professional tools",
    materials: "circuit breakers, copper wiring, cable conduits, wire strippers, multimeter, junction box",
    context: "residential utility room in France, wall-mounted panel, proper PPE",
    avoid: "high voltage lines, power plant, electrocution, sparks flying dangerously",
  },
  "demenagement": {
    scene: "Professional movers carrying furniture or boxes from an apartment building to a moving truck",
    materials: "cardboard moving boxes, furniture blankets, hand truck dolly, moving truck ramp",
    context: "French residential street, apartment building entrance, moving day",
    avoid: "abandoned furniture, garbage, demolition, empty room only",
  },
  "nettoyage": {
    scene: "A professional cleaning team working in a commercial office or building lobby with industrial equipment",
    materials: "floor buffer machine, microfiber cloths, spray bottles, professional vacuum, safety vest",
    context: "modern office building or commercial space in France, glass surfaces, tiled floors",
    avoid: "domestic cleaning, messy house, garbage dump, hazmat",
  },
};

function getServiceType(siteName: string): string | null {
  const name = siteName.toLowerCase();
  for (const key of Object.keys(SERVICE_SCENE_DESCRIPTORS)) {
    if (name.includes(key.split("-")[0]!) || name.includes(key)) {
      return key;
    }
  }
  return null;
}

function buildAIImagePrompt(
  siteName: string,
  siteTheme: string,
  articleTitle: string,
  keywords: string[],
  city?: string | null,
): string {
  const keywordStr = keywords.slice(0, 3).join(", ");

  if (city && siteTheme !== "SAAS") {
    const serviceType = getServiceType(siteName);
    const descriptor = serviceType ? SERVICE_SCENE_DESCRIPTORS[serviceType] : null;

    if (descriptor) {
      // Nano Banana style: precise scene + materials + context + negative prompt
      return [
        `Ultra-photorealistic RAW photograph, professional editorial quality.`,
        `Scene: ${descriptor.scene}. Location: ${city}, France.`,
        `Article context: "${articleTitle}".`,
        `Materials and textures: ${descriptor.materials}.`,
        `Environment: ${descriptor.context}.`,
        `Keywords: ${keywordStr}.`,
        `Camera: Full-frame DSLR, 35mm lens, f/2.8, ISO 200, natural daylight.`,
        `Quality: 8K, ultra-detailed, sharp focus, realistic textures, natural lighting, professional color grading.`,
        `NEGATIVE: ${descriptor.avoid}, cartoon, CGI, 3D render, watermark, text, logo, blurry, oversaturated, AI artifacts, extra limbs, distorted.`,
      ].join("\n");
    }

    // Generic local service (no specific descriptor)
    return [
      `Ultra-photorealistic RAW photograph, professional editorial quality.`,
      `Scene: Professional service related to "${articleTitle}" in ${city}, France.`,
      `Context: local service business "${siteName}".`,
      `Keywords: ${keywordStr}.`,
      `Camera: Full-frame DSLR, 50mm lens, f/2.8, ISO 200, natural daylight.`,
      `Quality: 8K, ultra-detailed, sharp focus, realistic textures, natural lighting.`,
      `NEGATIVE: cartoon, CGI, 3D render, watermark, text, logo, blurry, oversaturated, AI artifacts, stock photo feel.`,
    ].join("\n");
  }

  // SAAS / non-local sites: modern tech illustration
  return [
    `Modern, professional tech illustration suitable as a blog hero image.`,
    `Concept: ${articleTitle}.`,
    `Context: SaaS/tech platform "${siteName}".`,
    `Keywords: ${keywordStr}.`,
    `Style: clean modern illustration, gradient colors (blue-purple-teal), abstract tech elements, isometric or flat design.`,
    `Quality: 8K resolution, crisp vectors, modern UI aesthetic, professional polish.`,
    `NEGATIVE: cartoon characters, clip art, pixelated, watermark, text, logo, blurry, childish.`,
  ].join("\n");
}

async function callGeminiImageGeneration(prompt: string, apiKey: string): Promise<Buffer | null> {
  try {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent";

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown error");
      console.log(`[images] Gemini API error ${res.status}: ${errText.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!parts || !Array.isArray(parts)) {
      console.log("[images] Gemini: no parts in response");
      return null;
    }

    // Find the part with inline image data
    const imagePart = parts.find(
      (p: any) => p.inlineData && p.inlineData.mimeType?.startsWith("image/")
    );

    if (!imagePart) {
      console.log("[images] Gemini: no image part in response");
      return null;
    }

    const base64Data = imagePart.inlineData.data;
    if (!base64Data) {
      console.log("[images] Gemini: empty image data");
      return null;
    }

    return Buffer.from(base64Data, "base64");
  } catch (err: any) {
    console.log(`[images] Gemini error: ${err.message}`);
    return null;
  }
}

export async function generateHeroImageAI(
  siteName: string,
  siteTheme: string,
  articleTitle: string,
  keywords: string[],
  articleSlug?: string,
  city?: string | null,
): Promise<ProcessedImage | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.log("[images] GEMINI_API_KEY non configuree, generation AI impossible");
    return null;
  }

  const basePrompt = buildAIImagePrompt(siteName, siteTheme, articleTitle, keywords, city);
  const hasCity = Boolean(city && siteTheme !== "SAAS");
  const prompt = enhanceImagePrompt(basePrompt, undefined, siteTheme, hasCity);
  console.log(`[images] Generation AI (Gemini Nano Banana 2)...`);
  console.log(`[images] Prompt (enhanced): ${prompt.slice(0, 200)}...`);

  const rawBuffer = await callGeminiImageGeneration(prompt, geminiKey);
  if (!rawBuffer) {
    console.log("[images] Generation AI echouee");
    return null;
  }

  console.log(`[images] Image generee: ${(rawBuffer.length / 1024).toFixed(0)} Ko`);

  // Convert to WebP (3 sizes) using existing pipeline
  console.log("[images] Conversion WebP...");
  try {
    const [hero, card, thumb] = await Promise.all([
      convertToWebP(rawBuffer, HERO_WIDTH, HERO_HEIGHT, 82),
      convertToWebP(rawBuffer, CARD_WIDTH, CARD_HEIGHT, 80),
      convertToWebP(rawBuffer, THUMB_WIDTH, THUMB_HEIGHT, 75),
    ]);

    const baseName = buildSeoFilename(articleSlug || articleTitle);
    const filename = `${baseName}.webp`;
    const filenameCard = `${baseName}-card.webp`;
    const filenameThumb = `${baseName}-thumb.webp`;

    const alt = buildSeoAlt(articleTitle, siteName, city);
    const title = buildSeoTitle(articleTitle, city, keywords);

    console.log(`[images] WebP (AI generated):`);
    console.log(`  hero:  ${hero.width}x${hero.height} ${(hero.size / 1024).toFixed(0)}Ko -> ${filename}`);
    console.log(`  card:  ${card.width}x${card.height} ${(card.size / 1024).toFixed(0)}Ko -> ${filenameCard}`);
    console.log(`  thumb: ${thumb.width}x${thumb.height} ${(thumb.size / 1024).toFixed(0)}Ko -> ${filenameThumb}`);
    console.log(`  alt:   "${alt}"`);
    console.log(`  title: "${title}"`);

    return {
      hero,
      card,
      thumb,
      filename,
      filenameCard,
      filenameThumb,
      alt,
      title,
      credit: "Generated by AI (Gemini)",
      creditUrl: "",
      sourceUrl: "",
      previewUrl: "",
    };
  } catch (err: any) {
    console.log(`[images] Erreur conversion WebP (AI): ${err.message}`);
    return null;
  }
}

// ============================================================
// PIPELINE PRINCIPAL
// ============================================================

export async function findHeroImage(
  siteName: string,
  siteTheme: string,
  articleTitle: string,
  keywords: string[],
  articleSlug?: string,
  city?: string | null,
  imageSource: ImageSource = "auto",
  usedImageUrls: string[] = [],
): Promise<ProcessedImage | null> {
  const usedUrls = new Set(usedImageUrls);
  if (usedUrls.size > 0) {
    console.log(`[images] Deduplication: ${usedUrls.size} images deja utilisees sur ce site`);
  }

  // === AI generation mode ===
  if (imageSource === "ai") {
    console.log("[images] Mode: generation AI (Gemini Nano Banana 2)");
    return generateHeroImageAI(siteName, siteTheme, articleTitle, keywords, articleSlug, city);
  }

  const pexelsKey = process.env.PEXELS_API_KEY;
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

  const searchTerms = getSearchTerms(siteName, siteTheme, articleTitle, keywords, city);
  console.log(`[images] Recherche image (mode: ${imageSource}): ${searchTerms.slice(0, 4).join(", ")}`);

  let found: ImageResult | null = null;
  let sourceLabel = "";

  for (const term of searchTerms) {
    // 1. Pexels (si cle dispo et mode auto ou pexels)
    if (pexelsKey && !found && (imageSource === "auto" || imageSource === "pexels")) {
      found = await searchPexels(term, pexelsKey, usedUrls);
      if (found) { sourceLabel = "Pexels"; break; }
    }

    // 2. Unsplash (si cle dispo et mode auto)
    if (unsplashKey && !found && imageSource === "auto") {
      found = await searchUnsplash(term, unsplashKey, usedUrls);
      if (found) { sourceLabel = "Unsplash"; break; }
    }

    // 3. Wikimedia Commons (mode auto ou wikimedia)
    if (!found && (imageSource === "auto" || imageSource === "wikimedia")) {
      found = await searchWikimediaCommons(term, usedUrls);
      if (found) { sourceLabel = "Wikimedia Commons"; break; }
    }
  }

  if (!found) {
    console.log("[images] Aucune image trouvee");
    return null;
  }

  console.log(`[images] ${sourceLabel}: image trouvee`);
  console.log(`[images] Source: ${found.sourceUrl}`);

  // Download
  console.log("[images] Telechargement...");
  let rawBuffer: Buffer;
  try {
    rawBuffer = await downloadImage(found.downloadUrl);
    console.log(`[images] Telecharge: ${(rawBuffer.length / 1024).toFixed(0)} Ko`);
  } catch (err: any) {
    console.log(`[images] Erreur telechargement: ${err.message}`);
    return null;
  }

  // Convert to WebP (3 sizes)
  console.log("[images] Conversion WebP...");
  try {
    const [hero, card, thumb] = await Promise.all([
      convertToWebP(rawBuffer, HERO_WIDTH, HERO_HEIGHT, 82),
      convertToWebP(rawBuffer, CARD_WIDTH, CARD_HEIGHT, 80),
      convertToWebP(rawBuffer, THUMB_WIDTH, THUMB_HEIGHT, 75),
    ]);

    const baseName = buildSeoFilename(articleSlug || articleTitle);
    const filename = `${baseName}.webp`;
    const filenameCard = `${baseName}-card.webp`;
    const filenameThumb = `${baseName}-thumb.webp`;

    const alt = buildSeoAlt(articleTitle, siteName, city);
    const title = buildSeoTitle(articleTitle, city, keywords);

    console.log(`[images] WebP:`);
    console.log(`  hero:  ${hero.width}x${hero.height} ${(hero.size / 1024).toFixed(0)}Ko -> ${filename}`);
    console.log(`  card:  ${card.width}x${card.height} ${(card.size / 1024).toFixed(0)}Ko -> ${filenameCard}`);
    console.log(`  thumb: ${thumb.width}x${thumb.height} ${(thumb.size / 1024).toFixed(0)}Ko -> ${filenameThumb}`);
    console.log(`  alt:   "${alt}"`);
    console.log(`  title: "${title}"`);
    console.log(`  credit: ${found.credit}`);

    return {
      hero,
      card,
      thumb,
      filename,
      filenameCard,
      filenameThumb,
      alt,
      title,
      credit: found.credit,
      creditUrl: found.creditUrl,
      sourceUrl: found.sourceUrl,
      previewUrl: found.downloadUrl,
    };
  } catch (err: any) {
    console.log(`[images] Erreur conversion WebP: ${err.message}`);
    return null;
  }
}
