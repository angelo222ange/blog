import type { FastifyInstance } from "fastify";
import { updateArticleStatusSchema } from "@blogengine/core";
import { prisma } from "../lib/prisma.js";
import { authGuard } from "../lib/auth.js";

export async function articlesRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  // List articles (optionally filtered by site)
  app.get<{ Querystring: { siteId?: string; status?: string } }>(
    "/",
    async (request) => {
      const { siteId, status } = request.query;
      const where: any = {};
      if (siteId) where.siteId = siteId;
      if (status) where.status = status;

      return prisma.article.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { site: { select: { name: true, slug: true } } },
      });
    }
  );

  // Get single article
  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const article = await prisma.article.findUnique({
      where: { id: request.params.id },
      include: { site: true },
    });
    if (!article) return reply.status(404).send({ error: "Article introuvable" });
    return article;
  });

  // Update article status (approve/reject)
  app.patch<{ Params: { id: string } }>(
    "/:id/status",
    async (request, reply) => {
      const parsed = updateArticleStatusSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      const article = await prisma.article.update({
        where: { id: request.params.id },
        data: {
          status: parsed.data.status,
          ...(parsed.data.status === "PUBLISHED"
            ? { publishedAt: new Date(), publishedBy: (request as any).user.id }
            : {}),
        },
      });

      return article;
    }
  );

  // Delete article
  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    await prisma.article.delete({ where: { id: request.params.id } });
    return reply.status(204).send();
  });
}
