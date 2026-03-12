import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authGuard } from "../lib/auth.js";

export async function statsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  app.get("/dashboard", async () => {
    const now = new Date();

    // Articles per month (last 6 months)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const articles = await prisma.article.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, status: true, siteId: true },
    });

    const monthLabels: string[] = [];
    const articlesByMonth: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("fr-FR", { month: "short" });
      monthLabels.push(label.charAt(0).toUpperCase() + label.slice(1));
      const count = articles.filter(
        (a) =>
          a.createdAt.getMonth() === d.getMonth() &&
          a.createdAt.getFullYear() === d.getFullYear()
      ).length;
      articlesByMonth.push(count);
    }

    // Articles by status
    const allArticles = await prisma.article.groupBy({
      by: ["status"],
      _count: true,
    });
    const articlesByStatus: Record<string, number> = {};
    for (const g of allArticles) {
      articlesByStatus[g.status] = g._count;
    }

    // Social posts stats
    const socialPosts = await prisma.socialPost.findMany({
      select: { status: true, platform: true, createdAt: true, publishedAt: true },
    });

    const postsByPlatform: Record<string, number> = {};
    const postsByStatus: Record<string, number> = {};
    for (const p of socialPosts) {
      postsByPlatform[p.platform] = (postsByPlatform[p.platform] || 0) + 1;
      postsByStatus[p.status] = (postsByStatus[p.status] || 0) + 1;
    }

    // Articles by site
    const sites = await prisma.site.findMany({
      select: { id: true, name: true, theme: true, _count: { select: { articles: true } } },
    });
    const articlesBySite = sites.map((s) => ({
      name: s.name,
      count: s._count.articles,
      theme: s.theme,
    }));

    // Social accounts count
    const socialAccountsCount = await prisma.socialAccount.count({ where: { isActive: true } });

    // Recent articles with preview data
    const recentArticles = await prisma.article.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        heroImage: true,
        heroImageAlt: true,
        metaDescription: true,
        keywords: true,
        category: true,
        readTime: true,
        status: true,
        createdAt: true,
        slug: true,
        site: { select: { name: true, domain: true } },
        _count: { select: { socialPosts: true } },
      },
    });

    return {
      months: monthLabels,
      articlesByMonth,
      articlesByStatus,
      postsByPlatform,
      postsByStatus,
      articlesBySite,
      totalArticles: articles.length,
      totalSocialPosts: socialPosts.length,
      publishedPosts: socialPosts.filter((p) => p.status === "PUBLISHED").length,
      socialAccountsCount,
      recentArticles: recentArticles.map((a) => {
        let keywords: string[] = [];
        try { keywords = JSON.parse(a.keywords || "[]"); } catch {}
        return {
          id: a.id,
          title: a.title,
          heroImage: a.heroImage,
          heroImageAlt: a.heroImageAlt,
          excerpt: a.metaDescription,
          keywords: keywords.slice(0, 5),
          category: a.category,
          readTime: a.readTime,
          status: a.status,
          createdAt: a.createdAt,
          siteName: a.site.name,
          siteDomain: a.site.domain,
          socialPostsCount: a._count.socialPosts,
        };
      }),
    };
  });
}
