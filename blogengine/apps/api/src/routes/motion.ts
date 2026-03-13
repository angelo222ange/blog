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

/**
 * Resolve imagePrompt fields on slides into actual imageUrl paths.
 * Uses Pexels search (fast) for each slide's imagePrompt.
 * Falls back gracefully — slides without images still render fine.
 */
async function resolveSlideImages(slides: MotionSlide[]): Promise<MotionSlide[]> {
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (!pexelsKey) {
    console.log("[motion] No PEXELS_API_KEY, skipping slide images");
    return slides;
  }

  const usedUrls = new Set<string>();

  const resolved = await Promise.all(
    slides.map(async (slide, i) => {
      if (!slide.imagePrompt) return slide;

      try {
        // Search Pexels with the AI-generated image prompt
        const query = encodeURIComponent(slide.imagePrompt.slice(0, 100));
        const res = await fetch(
          `https://api.pexels.com/v1/search?query=${query}&per_page=10&orientation=landscape&size=medium`,
          {
            headers: { Authorization: pexelsKey },
            signal: AbortSignal.timeout(8000),
          }
        );
        if (!res.ok) return slide;

        const data = await res.json();
        if (!data.photos || data.photos.length === 0) return slide;

        // Pick first unused photo
        let photoUrl = "";
        for (const photo of data.photos) {
          const url = photo.src.large || photo.src.medium;
          if (!usedUrls.has(url)) {
            photoUrl = url;
            usedUrls.add(url);
            break;
          }
        }
        if (!photoUrl) return slide;

        // Download and convert to data URL (works everywhere: Remotion, browser, no file path issues)
        const imgRes = await fetch(photoUrl, { signal: AbortSignal.timeout(15000) });
        if (!imgRes.ok) return slide;

        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const dataUrl = `data:image/jpeg;base64,${buffer.toString("base64")}`;

        console.log(`[motion] Slide ${i} image: ${(buffer.length / 1024).toFixed(0)} Ko (data URL)`);

        return {
          ...slide,
          imageUrl: dataUrl,
        };
      } catch (err: any) {
        console.log(`[motion] Slide ${i} image failed: ${err.message}`);
        return slide;
      }
    })
  );

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

      // Resolve slide images from Pexels
      config.slides = await resolveSlideImages(config.slides);

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

      // Resolve slide images from Pexels
      config.slides = await resolveSlideImages(config.slides);

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
