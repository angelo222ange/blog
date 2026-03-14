import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authGuard } from "../lib/auth.js";
import {
  generateMotionSlides,
  MOTION_TEMPLATES,
  renderMotionVideo,
} from "@blogengine/motion";
import type { MotionVideoConfig, MotionSlide } from "@blogengine/motion";
import { join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";

const UPLOADS_DIR = join(process.cwd(), "public", "uploads", "motion");

// ─── Scene descriptors per service type (Nano Banana style) ───
const MOTION_SCENE_DESCRIPTORS: Record<string, {
  scene: string;
  materials: string;
  context: string;
  avoid: string;
}> = {
  rideau: {
    scene: "A commercial steel roller shutter on a French shop front, galvanized steel slats with visible horizontal ridges, mounted on a concrete or stone facade",
    materials: "galvanized steel, corrugated metal slats, steel guide rails, padlock mechanism, concrete lintel",
    context: "urban commercial street in France, shop facade, pavement, neighboring storefronts",
    avoid: "residential roller blinds, window shutters, wooden shutters, PVC blinds, interior blinds, curtains",
  },
  serrurier: {
    scene: "A professional locksmith working on a residential front door, using specialized lock installation tools",
    materials: "brass cylinder lock, steel deadbolt, door handle mechanism, locksmith tool set, key blanks",
    context: "apartment building entrance, residential neighborhood in France, wooden or metal door",
    avoid: "car keys, car lockout, padlock only, safe cracking, burglar imagery",
  },
  plomb: {
    scene: "A professional plumber working under a sink or on exposed copper piping, using a pipe wrench",
    materials: "copper pipes, brass fittings, PVC drainage, pipe wrench, solder joints",
    context: "residential bathroom or kitchen in France, tiled walls, exposed plumbing",
    avoid: "flooded room, sewage, dirty water, industrial plant",
  },
  electri: {
    scene: "An electrician working on a residential electrical panel, connecting wires with professional tools",
    materials: "circuit breakers, copper wiring, cable conduits, wire strippers, multimeter",
    context: "residential utility room in France, wall-mounted panel, proper PPE",
    avoid: "high voltage lines, power plant, electrocution, dangerous sparks",
  },
  demenag: {
    scene: "Professional movers carrying furniture or boxes from an apartment building to a moving truck",
    materials: "cardboard moving boxes, furniture blankets, hand truck dolly, moving truck ramp",
    context: "French residential street, apartment building entrance, moving day",
    avoid: "abandoned furniture, garbage, demolition, empty rooms",
  },
  nettoy: {
    scene: "A professional cleaning team working in a commercial office with industrial equipment",
    materials: "floor buffer machine, microfiber cloths, spray bottles, professional vacuum",
    context: "modern office building in France, glass surfaces, tiled floors",
    avoid: "domestic cleaning, messy house, garbage dump",
  },
  menuisi: {
    scene: "A carpenter crafting custom wood furniture in a professional workshop",
    materials: "hardwood planks, wood shavings, chisels, hand plane, workbench, clamps",
    context: "well-organized carpentry workshop, natural wood tones, sawdust",
    avoid: "factory mass production, IKEA furniture, cheap materials",
  },
  peintur: {
    scene: "A professional painter applying a fresh coat on an interior wall with a roller",
    materials: "paint roller, paint tray, masking tape, drop cloth, fresh paint",
    context: "bright residential interior being renovated, clean lines, fresh colors",
    avoid: "graffiti, street art, messy spills, exterior only",
  },
  toitur: {
    scene: "A roofer working on a residential rooftop, installing or repairing tiles",
    materials: "clay roof tiles, slate, flashing, roof battens, safety harness",
    context: "French residential house rooftop, clear sky, traditional architecture",
    avoid: "dangerous conditions, falling, flat commercial roof only",
  },
  climati: {
    scene: "An HVAC technician installing or servicing a split air conditioning unit on a wall",
    materials: "split AC indoor unit, copper refrigerant lines, remote control, tools",
    context: "modern French apartment interior, clean white wall, comfortable living space",
    avoid: "industrial HVAC, cooling towers, dirty filters close-up",
  },
  vitri: {
    scene: "A glazier installing a large glass pane in a window frame",
    materials: "tempered glass panel, suction cups, glazing putty, window frame",
    context: "residential or commercial building in France, natural light, clean work",
    avoid: "broken glass everywhere, shattered windows, vandalism",
  },
};

// ─── Theme-based image style directives ───
const MOTION_IMAGE_STYLES: Record<string, string> = {
  LOCAL_SERVICE: "Ultra-realistic editorial photograph showing the RESULT of professional work or a craftsman in action. Clean, well-lit, shot with natural daylight. The image must look like a real photograph from a trade magazine, NOT AI-generated.",
  SAAS: "Clean, modern photograph of a person working at a desk with a laptop or phone. Person seen from behind or from the side, screen NOT visible or showing only abstract blurred content. Shallow depth of field, modern minimalist office. NO dashboard screenshots, NO fake UI, NO readable text on screens.",
  ECOMMERCE: "Professional product photography in a lifestyle context. The product beautifully displayed with natural lighting, editorial style. Clean background, real-world setting. NO faces visible.",
  COACHING: "Inspiring workspace scene: clean desk with notebook, laptop, warm natural lighting. Person seen from behind working, or empty motivational workspace. Minimalist, professional lifestyle photography. NO faces.",
  DEFAULT: "Professional editorial photograph related to the business theme. Clean, well-lit, realistic. Shot on a full-frame camera with natural light. Must look like a real photo, NOT AI-generated.",
};

function getMotionImageStyle(theme: string): string {
  const t = theme.toUpperCase();
  if (t.includes("SERVICE") || t.includes("ARTISAN") || t.includes("LOCAL")) return MOTION_IMAGE_STYLES.LOCAL_SERVICE!;
  if (t.includes("SAAS") || t.includes("TECH") || t.includes("SOFTWARE")) return MOTION_IMAGE_STYLES.SAAS!;
  if (t.includes("COMMERCE") || t.includes("SHOP") || t.includes("BOUTIQUE")) return MOTION_IMAGE_STYLES.ECOMMERCE!;
  if (t.includes("COACH") || t.includes("CONSEIL") || t.includes("FORMATION")) return MOTION_IMAGE_STYLES.COACHING!;
  return MOTION_IMAGE_STYLES.DEFAULT!;
}

function getSceneDescriptor(siteName: string): typeof MOTION_SCENE_DESCRIPTORS[string] | null {
  const name = siteName.toLowerCase();
  for (const [key, descriptor] of Object.entries(MOTION_SCENE_DESCRIPTORS)) {
    if (name.includes(key)) return descriptor;
  }
  return null;
}

/**
 * Build an enhanced Gemini prompt for a motion slide image.
 * Combines the slide's AI-generated imagePrompt with site-specific context
 * and Nano Banana prompt engineering for photorealistic results.
 */
function buildMotionImagePrompt(
  slideImagePrompt: string,
  siteName: string,
  siteTheme: string,
  city?: string | null,
): string {
  const style = getMotionImageStyle(siteTheme);
  const descriptor = getSceneDescriptor(siteName);

  const parts: string[] = [
    `Ultra-photorealistic RAW photograph, professional editorial quality.`,
    style,
  ];

  if (descriptor) {
    parts.push(
      `Scene reference: ${descriptor.scene}.`,
      `Materials and textures: ${descriptor.materials}.`,
      `Environment: ${descriptor.context}.`,
    );
  }

  parts.push(`Slide subject: ${slideImagePrompt}.`);

  if (city) {
    parts.push(`Location: ${city}, France.`);
  }

  parts.push(
    `Camera: Full-frame DSLR, 35mm lens, f/2.8, ISO 200, natural daylight, golden hour warmth.`,
    `Quality: 8K, ultra-detailed, sharp focus, realistic textures, natural lighting, professional color grading.`,
    `Aspect ratio: square 1:1.`,
  );

  // Build negative prompt
  const negatives = [
    "cartoon", "CGI", "3D render", "watermark", "text overlay", "logo",
    "blurry", "oversaturated", "AI artifacts", "extra limbs", "distorted",
    "stock photo watermark", "low resolution", "pixelated",
  ];
  if (descriptor) negatives.push(descriptor.avoid);

  parts.push(`NEGATIVE: ${negatives.join(", ")}.`);

  return parts.join("\n");
}

/**
 * Generate an image for a motion slide using Gemini.
 * Returns a base64 data URL or null on failure.
 */
async function generateSlideImageGemini(
  prompt: string,
  apiKey: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
          },
        }),
        signal: AbortSignal.timeout(60000),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.log(`[motion] Gemini error ${res.status}: ${errText.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!parts || !Array.isArray(parts)) return null;

    const imagePart = parts.find(
      (p: any) => p.inlineData && p.inlineData.mimeType?.startsWith("image/"),
    );
    if (!imagePart?.inlineData?.data) return null;

    const mimeType = imagePart.inlineData.mimeType || "image/png";
    return `data:${mimeType};base64,${imagePart.inlineData.data}`;
  } catch (err: any) {
    console.log(`[motion] Gemini image error: ${err.message}`);
    return null;
  }
}

/**
 * Resolve imagePrompt fields on slides into actual imageUrl data URLs.
 * Uses Gemini AI for contextually perfect images matching the site's business.
 * Falls back to Pexels if Gemini is unavailable, then gracefully skips.
 */
async function resolveSlideImages(
  slides: MotionSlide[],
  siteName: string,
  siteTheme: string,
  city?: string | null,
): Promise<MotionSlide[]> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const pexelsKey = process.env.PEXELS_API_KEY;

  if (!geminiKey && !pexelsKey) {
    console.log("[motion] No GEMINI_API_KEY or PEXELS_API_KEY, skipping slide images");
    return slides;
  }

  const useGemini = Boolean(geminiKey);
  console.log(`[motion] Resolving images via ${useGemini ? "Gemini AI" : "Pexels"} for "${siteName}" (${siteTheme})`);

  // Generate images sequentially to avoid API rate limits (Gemini is slower but higher quality)
  const resolved: MotionSlide[] = [];
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]!;
    if (!slide.imagePrompt) {
      resolved.push(slide);
      continue;
    }

    try {
      let dataUrl: string | null = null;

      if (useGemini) {
        const prompt = buildMotionImagePrompt(slide.imagePrompt, siteName, siteTheme, city);
        console.log(`[motion] Slide ${i} generating (Gemini)...`);
        dataUrl = await generateSlideImageGemini(prompt, geminiKey!);
      }

      // Fallback to Pexels if Gemini fails or unavailable
      if (!dataUrl && pexelsKey) {
        console.log(`[motion] Slide ${i} fallback to Pexels...`);
        const query = encodeURIComponent(slide.imagePrompt.slice(0, 100));
        const res = await fetch(
          `https://api.pexels.com/v1/search?query=${query}&per_page=5&orientation=landscape&size=medium`,
          { headers: { Authorization: pexelsKey }, signal: AbortSignal.timeout(8000) },
        );
        if (res.ok) {
          const data = await res.json();
          const photo = data.photos?.[0];
          if (photo) {
            const imgRes = await fetch(photo.src.large || photo.src.medium, {
              signal: AbortSignal.timeout(15000),
            });
            if (imgRes.ok) {
              const buffer = Buffer.from(await imgRes.arrayBuffer());
              dataUrl = `data:image/jpeg;base64,${buffer.toString("base64")}`;
            }
          }
        }
      }

      if (dataUrl) {
        const sizeKo = Math.round(dataUrl.length * 0.75 / 1024);
        console.log(`[motion] Slide ${i} image: ${sizeKo} Ko`);
        resolved.push({ ...slide, imageUrl: dataUrl });
      } else {
        console.log(`[motion] Slide ${i} no image (skipped)`);
        resolved.push(slide);
      }
    } catch (err: any) {
      console.log(`[motion] Slide ${i} image failed: ${err.message}`);
      resolved.push(slide);
    }
  }

  const withImages = resolved.filter((s) => s.imageUrl).length;
  console.log(`[motion] Images resolved: ${withImages}/${slides.length} slides`);

  return resolved;
}

export async function motionRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  // ─── List templates ───
  app.get("/templates", async () => {
    return MOTION_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      previewColor: t.previewColor,
      slideCount: t.defaultSlides.length,
      estimatedDuration: `${((t.defaultSlides.reduce((s, sl) => s + sl.durationFrames, 0)) / 30).toFixed(0)}s`,
    }));
  });

  // ─── Generate motion slides (AI content) ───
  app.post<{
    Body: { siteId: string; topic?: string; templateId?: string };
  }>("/generate", async (request, reply) => {
    const { siteId, topic, templateId } = request.body || {};

    if (!siteId) {
      return reply.status(400).send({ error: "siteId requis" });
    }

    const site = await prisma.site.findUnique({ where: { id: siteId } });
    if (!site) {
      return reply.status(404).send({ error: "Site introuvable" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return reply.status(500).send({ error: "OPENAI_API_KEY non configure" });
    }

    // Fetch recent article keywords for context
    const recentArticles = await prisma.article.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { keywords: true },
    });
    const siteKeywords = recentArticles
      .flatMap((a) => {
        try { return JSON.parse(a.keywords || "[]"); } catch { return []; }
      })
      .filter((k: string) => k)
      .slice(0, 10);

    try {
      const config = await generateMotionSlides({
        topic: topic || `${site.name} - ${(site as any).theme || "business"}`,
        templateId,
        brandName: site.name,
        apiKey,
        siteTheme: (site as any).theme || "LOCAL_SERVICE",
        city: (site as any).city || null,
        siteName: site.name,
        keywords: siteKeywords,
      });

      // Resolve slide images via Gemini AI (contextual) with Pexels fallback
      config.slides = await resolveSlideImages(
        config.slides,
        site.name,
        (site as any).theme || "LOCAL_SERVICE",
        (site as any).city || null,
      );

      return {
        success: true,
        config,
        templateId: templateId || null,
        estimatedDuration: `${(config.slides.reduce((s, sl) => s + sl.durationFrames, 0) / config.fps).toFixed(1)}s`,
      };
    } catch (err: any) {
      console.error("[motion] Generate error:", err);
      return reply.status(500).send({
        error: err.message || "Erreur lors de la generation",
      });
    }
  });

  // ─── Render video from config ───
  app.post<{
    Body: { config: MotionVideoConfig };
  }>("/render", async (request, reply) => {
    const { config } = request.body || {};

    if (!config || !config.slides || config.slides.length === 0) {
      return reply.status(400).send({ error: "Configuration de video requise" });
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOADS_DIR)) {
      mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    try {
      const filename = `motion-${Date.now()}.${config.outputFormat || "mp4"}`;
      const result = await renderMotionVideo({
        config,
        outputDir: UPLOADS_DIR,
        filename,
      });

      return {
        success: true,
        videoUrl: `/uploads/motion/${filename}`,
        thumbnailUrl: result.thumbnailUrl,
        durationMs: result.durationMs,
        width: result.width,
        height: result.height,
        sizeBytes: result.sizeBytes,
      };
    } catch (err: any) {
      console.error("[motion] Render error:", err);
      return reply.status(500).send({
        error: err.message || "Erreur lors du rendu video",
      });
    }
  });

  // ─── Generate + Render in one step ───
  app.post<{
    Body: {
      siteId: string;
      topic?: string;
      templateId?: string;
      format?: "square" | "vertical" | "landscape";
    };
  }>("/generate-and-render", async (request, reply) => {
    const { siteId, topic, templateId, format } = request.body || {};

    if (!siteId) {
      return reply.status(400).send({ error: "siteId requis" });
    }

    const site = await prisma.site.findUnique({ where: { id: siteId } });
    if (!site) {
      return reply.status(404).send({ error: "Site introuvable" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return reply.status(500).send({ error: "OPENAI_API_KEY non configure" });
    }

    if (!existsSync(UPLOADS_DIR)) {
      mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    // Fetch recent article keywords for context
    const recentArticles2 = await prisma.article.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { keywords: true },
    });
    const siteKeywords2 = recentArticles2
      .flatMap((a) => {
        try { return JSON.parse(a.keywords || "[]"); } catch { return []; }
      })
      .filter((k: string) => k)
      .slice(0, 10);

    try {
      // Step 1: Generate slide content
      const config = await generateMotionSlides({
        topic: topic || `${site.name} - ${(site as any).theme || "business"}`,
        templateId,
        brandName: site.name,
        apiKey,
        siteTheme: (site as any).theme || "LOCAL_SERVICE",
        city: (site as any).city || null,
        siteName: site.name,
        keywords: siteKeywords2,
      });

      // Resolve slide images via Gemini AI (contextual) with Pexels fallback
      config.slides = await resolveSlideImages(
        config.slides,
        site.name,
        (site as any).theme || "LOCAL_SERVICE",
        (site as any).city || null,
      );

      // Adjust dimensions based on format
      if (format === "vertical") {
        config.width = 1080;
        config.height = 1920;
      } else if (format === "landscape") {
        config.width = 1920;
        config.height = 1080;
      }
      // default is square (1080x1080)

      const filename = `motion-${Date.now()}.${config.outputFormat}`;
      const result = await renderMotionVideo({
        config,
        outputDir: UPLOADS_DIR,
        filename,
      });

      return {
        success: true,
        videoUrl: `/uploads/motion/${filename}`,
        config,
        durationMs: result.durationMs,
        sizeBytes: result.sizeBytes,
      };
    } catch (err: any) {
      console.error("[motion] Generate+Render error:", err);
      return reply.status(500).send({
        error: err.message || "Erreur lors de la generation video",
      });
    }
  });
}
