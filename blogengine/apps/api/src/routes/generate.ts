import type { FastifyInstance } from "fastify";
import { generateArticleSchema } from "@blogengine/core";
import { prisma } from "../lib/prisma.js";
import { authGuard } from "../lib/auth.js";
import { generateArticleForSite } from "@blogengine/generator";
import { createAdapter } from "@blogengine/adapters";
import { sendSuccessNotification, sendErrorNotification, formatGenerateSuccess } from "../lib/notify.js";

export async function generateRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  // Generate an article for a site (rate limited - costs money via AI APIs)
  app.post("/article", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "15 minutes",
      },
    },
  }, async (request, reply) => {
    const parsed = generateArticleSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const site = await prisma.site.findUnique({
      where: { id: parsed.data.siteId },
    });

    if (!site) {
      return reply.status(404).send({ error: "Site introuvable" });
    }

    // Log job start
    const job = await prisma.jobLog.create({
      data: {
        jobType: "generate",
        siteId: site.id,
        status: "started",
        message: `Generation d'article pour ${site.name}`,
      },
    });

    try {
      const adapter = createAdapter(site as any);

      // Fetch existing hero image URLs for this site to avoid duplicates
      const existingArticles = await prisma.article.findMany({
        where: { siteId: site.id, heroImage: { not: null } },
        select: { heroImage: true },
      });
      const usedImageUrls = existingArticles
        .map((a) => a.heroImage)
        .filter((url): url is string => !!url);

      const result = await generateArticleForSite({
        site: site as any,
        adapter,
        topicHint: parsed.data.topicHint,
        apiKey: process.env.OPENAI_API_KEY || "",
        usedImageUrls,
      });

      // Store image buffers as base64 in DB so the publisher can write them later
      const contentForDb = { ...result };
      if (contentForDb.images) {
        contentForDb.images = contentForDb.images.map((img: any) => ({
          filename: img.filename,
          alt: img.alt,
          sizes: img.sizes,
          // Store buffer as base64 string for the publisher to decode
          bufferBase64: img.buffer ? Buffer.from(img.buffer).toString("base64") : undefined,
        }));
      }

      // Save article in DB
      const article = await prisma.article.create({
        data: {
          siteId: site.id,
          slug: result.slug,
          title: result.title,
          metaTitle: result.metaTitle,
          metaDescription: result.metaDescription,
          content: JSON.stringify(contentForDb),
          status: "REVIEW",
          generatedBy: "gpt-4o",
          keywords: JSON.stringify(result.keywords),
          category: result.category,
          readTime: result.readTime,
          heroImage: (result as any).heroImagePreviewUrl || (result as any).heroImage || null,
          heroImageAlt: (result as any).heroImageAlt || null,
          imageUrls: JSON.stringify(result.images?.map((i: any) => i.filename) || []),
        },
      });

      // Update job log
      await prisma.jobLog.update({
        where: { id: job.id },
        data: {
          status: "completed",
          articleId: article.id,
          completedAt: new Date(),
        },
      });

      // Send email notification
      if (site.notifyEmail) {
        const wordCount = (result.sections || []).reduce(
          (sum: number, s: any) => sum + (s.content || "").split(/\s+/).length,
          0
        );
        const emailData = formatGenerateSuccess(site.name, result.title, result.slug, wordCount);
        sendSuccessNotification({ to: site.notifyEmail, ...emailData }).catch(() => {});
      }

      return reply.status(201).send(article);
    } catch (error: any) {
      await prisma.jobLog.update({
        where: { id: job.id },
        data: {
          status: "failed",
          message: error.message,
          completedAt: new Date(),
        },
      });

      return reply.status(500).send({ error: "Erreur de generation", details: error.message });
    }
  });

  // Crawl a site to discover existing articles
  app.post<{ Params: { siteId: string } }>(
    "/crawl/:siteId",
    async (request, reply) => {
      const site = await prisma.site.findUnique({
        where: { id: request.params.siteId },
      });

      if (!site) {
        return reply.status(404).send({ error: "Site introuvable" });
      }

      try {
        const adapter = createAdapter(site as any);
        // For now, crawl via GitHub API (adapter will handle this)
        const articles = await adapter.crawlExistingArticles(site.repoName);

        const snapshot = await prisma.crawlSnapshot.create({
          data: {
            siteId: site.id,
            existingArticles: JSON.stringify(articles),
            topicsCovered: JSON.stringify(articles.map((a) => a.title)),
            crawledAt: new Date(),
          },
        });

        return { snapshot, articlesFound: articles.length };
      } catch (error: any) {
        return reply.status(500).send({ error: "Erreur de crawl", details: error.message });
      }
    }
  );
}
