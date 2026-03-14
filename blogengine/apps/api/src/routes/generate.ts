import type { FastifyInstance } from "fastify";
import { generateArticleSchema } from "@blogengine/core";
import { prisma } from "../lib/prisma.js";
import { authGuard } from "../lib/auth.js";
import { generateArticleForSite } from "@blogengine/generator";
import { createAdapter } from "@blogengine/adapters";
import { sendErrorNotification, formatGenerateError } from "../lib/notify.js";

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

      // Fetch existing hero image source URLs for this site to avoid duplicates
      // We need the actual source URLs (pexels/wikimedia/unsplash), not filenames
      const existingArticles = await prisma.article.findMany({
        where: { siteId: site.id },
        select: { heroImage: true, content: true },
      });
      const usedImageUrls: string[] = [];
      for (const a of existingArticles) {
        if (a.heroImage) usedImageUrls.push(a.heroImage);
        if (a.content) {
          try {
            const parsed = JSON.parse(a.content);
            if (parsed.heroImageSourceUrl) usedImageUrls.push(parsed.heroImageSourceUrl);
            if (parsed.heroImagePreviewUrl) usedImageUrls.push(parsed.heroImagePreviewUrl);
            if (parsed.heroImageCreditUrl) usedImageUrls.push(parsed.heroImageCreditUrl);
          } catch {}
        }
      }

      const result = await generateArticleForSite({
        site: site as any,
        adapter,
        topicHint: parsed.data.topicHint,
        apiKey: process.env.OPENAI_API_KEY || "",
        usedImageUrls,
        imageSource: parsed.data.imageSource,
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

      // Auto-approve if schedule says so
      const schedule = await prisma.schedule.findFirst({
        where: { siteId: site.id, isActive: true },
      });
      if (schedule?.autoApprove) {
        await prisma.article.update({
          where: { id: article.id },
          data: { status: "APPROVED" },
        });
      }

      // Update job log
      await prisma.jobLog.update({
        where: { id: job.id },
        data: {
          status: "completed",
          articleId: article.id,
          completedAt: new Date(),
        },
      });

      // Email notification removed: only publish success and errors are sent

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

      // Send error email if configured
      if (site.notifyEmail) {
        const emailData = formatGenerateError(site.name, error.message);
        sendErrorNotification({ to: site.notifyEmail, ...emailData }).catch(() => {});
      }

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
