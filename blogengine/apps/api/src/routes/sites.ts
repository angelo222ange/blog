import type { FastifyInstance } from "fastify";
import { createSiteSchema, updateSiteSchema } from "@blogengine/core";
import { prisma } from "../lib/prisma.js";
import { authGuard } from "../lib/auth.js";
import { scrapeAndStoreSiteImages } from "../lib/site-image-scraper.js";

export async function sitesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  // List all sites
  app.get("/", async () => {
    const sites = await prisma.site.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { articles: true } },
        articles: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true, publishedAt: true, title: true },
        },
        schedules: {
          where: { isActive: true },
          take: 1,
          select: { cronExpr: true, nextRunAt: true },
        },
      },
    });
    return sites;
  });

  // Get single site
  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const site = await prisma.site.findUnique({
      where: { id: request.params.id },
      include: {
        articles: { orderBy: { createdAt: "desc" } },
        schedules: true,
        crawlSnapshots: { orderBy: { crawledAt: "desc" }, take: 1 },
      },
    });
    if (!site) return reply.status(404).send({ error: "Site introuvable" });
    return site;
  });

  // Create site
  app.post("/", async (request, reply) => {
    const parsed = createSiteSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const site = await prisma.site.create({ data: parsed.data });

    // Auto-inherit VPS config from any existing configured site
    const donor = await prisma.site.findFirst({
      where: {
        sshHost: { not: null },
        sshPrivateKey: { not: null },
        githubToken: { not: null },
      },
      select: {
        githubToken: true,
        sshHost: true,
        sshUser: true,
        sshPort: true,
        sshPrivateKey: true,
        vpsPath: true,
        deployScript: true,
        notifyEmail: true,
      },
    });

    if (donor) {
      const repoName = site.repoName;
      const sourceDir = donor.vpsPath
        ? donor.vpsPath.substring(0, donor.vpsPath.lastIndexOf("/") + 1)
        : "/home/deploy/repos/";
      const sourceRepoName = donor.vpsPath?.split("/").filter(Boolean).pop() || "";

      await prisma.site.update({
        where: { id: site.id },
        data: {
          githubToken: donor.githubToken,
          sshHost: donor.sshHost,
          sshUser: donor.sshUser,
          sshPort: donor.sshPort,
          sshPrivateKey: donor.sshPrivateKey,
          vpsPath: sourceDir + repoName,
          deployScript: donor.deployScript && sourceRepoName
            ? donor.deployScript.replace(new RegExp(sourceRepoName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), repoName)
            : donor.deployScript,
          notifyEmail: donor.notifyEmail,
        },
      });
    }

    return reply.status(201).send(site);
  });

  // Update site
  app.patch<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const parsed = updateSiteSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const site = await prisma.site.update({
      where: { id: request.params.id },
      data: parsed.data,
    });
    return site;
  });

  // Delete site
  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    await prisma.site.delete({ where: { id: request.params.id } });
    return reply.status(204).send();
  });

  // Scrape images from site's website
  app.post<{ Params: { id: string } }>("/:id/scrape-images", async (request, reply) => {
    const site = await prisma.site.findUnique({ where: { id: request.params.id } });
    if (!site) return reply.status(404).send({ error: "Site introuvable" });
    if (!site.domain) return reply.status(400).send({ error: "Ce site n'a pas de domaine configure" });

    const count = await scrapeAndStoreSiteImages(site.id);
    const images = await prisma.siteImage.findMany({
      where: { siteId: site.id, isUsable: true },
      orderBy: { createdAt: "desc" },
    });
    return { scraped: count, images };
  });

  // Get scraped images for a site
  app.get<{ Params: { id: string } }>("/:id/images", async (request, reply) => {
    const images = await prisma.siteImage.findMany({
      where: { siteId: request.params.id, isUsable: true },
      orderBy: { createdAt: "desc" },
    });
    return images;
  });

  // Get schedule for a site
  app.get<{ Params: { id: string } }>("/:id/schedule", async (request, reply) => {
    const schedule = await prisma.schedule.findFirst({
      where: { siteId: request.params.id },
    });
    if (!schedule) {
      // Return defaults
      return {
        siteId: request.params.id,
        postTime: "08:00",
        activeDays: [1, 2, 3, 4, 5],
        evergreenPerDay: 1,
        newsPerWeek: 1,
        autoApprove: false,
        isActive: false,
        timezone: "Europe/Paris",
      };
    }
    return {
      ...schedule,
      activeDays: JSON.parse(schedule.activeDays),
      dayTimes: JSON.parse(schedule.dayTimes || "{}"),
    };
  });

  // Update schedule for a site
  app.put<{ Params: { id: string } }>("/:id/schedule", async (request, reply) => {
    const body = request.body as any;

    const data: any = {
      siteId: request.params.id,
      postTime: body.postTime || "08:00",
      activeDays: JSON.stringify(body.activeDays || [1, 2, 3, 4, 5]),
      evergreenPerDay: body.evergreenPerDay ?? 1,
      newsPerWeek: body.newsPerWeek ?? 1,
      autoApprove: body.autoApprove ?? false,
      isActive: body.isActive ?? true,
      timezone: body.timezone || "Europe/Paris",
      dayTimes: JSON.stringify(body.dayTimes || {}),
      cronExpr: `0 ${body.postTime?.split(":")[1] || "0"} ${body.postTime?.split(":")[0] || "8"} * * ${(body.activeDays || [1, 2, 3, 4, 5]).join(",")}`,
    };

    // Scheduler tracking fields (set by the scheduler daemon)
    if (body.lastRunAt) data.lastRunAt = new Date(body.lastRunAt);
    if (body.nextRunAt) data.nextRunAt = new Date(body.nextRunAt);
    if (body.articlesGeneratedToday !== undefined) data.articlesGeneratedToday = body.articlesGeneratedToday;

    const existing = await prisma.schedule.findFirst({
      where: { siteId: request.params.id },
    });

    if (existing) {
      const schedule = await prisma.schedule.update({
        where: { id: existing.id },
        data,
      });
      return { ...schedule, activeDays: JSON.parse(schedule.activeDays), dayTimes: JSON.parse(schedule.dayTimes || "{}") };
    }

    const schedule = await prisma.schedule.create({ data });
    return { ...schedule, activeDays: JSON.parse(schedule.activeDays), dayTimes: JSON.parse(schedule.dayTimes || "{}") };
  });
}
