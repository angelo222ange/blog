import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authGuard } from "../lib/auth.js";
import { GitPublisher } from "@blogengine/publisher";
import type { PublishSiteInfo, DeploySiteInfo } from "@blogengine/publisher";
import { createAdapter } from "@blogengine/adapters";
import { encrypt, decrypt } from "@blogengine/social";
import { sendErrorNotification, sendSuccessNotification, formatPublishError, formatPublishSuccess, formatDeploySuccess } from "../lib/notify.js";

const publisher = new GitPublisher();

export async function publishRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  // ─── Publish an article to its site's GitHub repo ───
  app.post<{ Params: { articleId: string } }>(
    "/:articleId",
    async (request, reply) => {
      const { articleId } = request.params;

      // Load article with site
      const article = await prisma.article.findUnique({
        where: { id: articleId },
        include: { site: true },
      });

      if (!article) {
        return reply.status(404).send({ error: "Article introuvable" });
      }

      if (!["APPROVED", "REVIEW"].includes(article.status)) {
        return reply
          .status(400)
          .send({ error: `L'article doit etre approuve (status actuel: ${article.status})` });
      }

      const site = article.site;

      if (!site.githubToken) {
        return reply
          .status(400)
          .send({ error: "Token GitHub non configure pour ce site. Allez dans les parametres du site." });
      }

      // Decrypt GitHub token
      let githubToken: string;
      try {
        githubToken = decrypt(site.githubToken);
      } catch {
        return reply
          .status(500)
          .send({ error: "Impossible de dechiffrer le token GitHub. Reconfigurez-le." });
      }

      // Build adapter
      const adapter = createAdapter({
        repoOwner: site.repoOwner,
        repoName: site.repoName,
        blogPattern: site.blogPattern,
        blogBasePath: site.blogBasePath,
        contentDir: site.contentDir,
        imageDir: site.imageDir,
        city: site.city,
        name: site.name,
      });

      // Parse article content
      let articleContent: any;
      try {
        articleContent = JSON.parse(article.content);
      } catch {
        return reply.status(500).send({ error: "Contenu article invalide" });
      }

      // Build generated article structure from DB content
      const generatedArticle = {
        slug: article.slug,
        title: article.title,
        metaTitle: article.metaTitle,
        metaDescription: article.metaDescription,
        date: article.createdAt.toISOString().split("T")[0]!,
        author: site.name,
        category: article.category || "general",
        readTime: article.readTime || "5 min",
        excerpt: articleContent.intro?.slice(0, 160) || article.metaDescription,
        keywords: JSON.parse(article.keywords || "[]"),
        intro: articleContent.intro || "",
        tldr: articleContent.tldr || "",
        sections: articleContent.sections || [],
        faq: articleContent.faq || [],
        conclusion: articleContent.conclusion || "",
        internalLinks: articleContent.internalLinks || [],
        externalLinks: articleContent.externalLinks || [],
        images: (articleContent.images || []).map((img: any) => ({
          filename: img.filename || "",
          alt: img.alt || "",
          url: img.url,
          // Decode base64 buffer back to Buffer for the publisher to write as files
          buffer: img.bufferBase64 ? Buffer.from(img.bufferBase64, "base64") : undefined,
        })),
      };

      // Format using adapter
      const siteConfig = {
        name: site.name,
        domain: site.domain || "",
        city: site.city || undefined,
        theme: site.theme as "LOCAL_SERVICE" | "SAAS",
      };

      const output = adapter.formatArticle(generatedArticle, siteConfig);

      // Set article status to PUBLISHING
      await prisma.article.update({
        where: { id: articleId },
        data: { status: "PUBLISHING" },
      });

      // Log job start
      const job = await prisma.jobLog.create({
        data: {
          jobType: "publish",
          siteId: site.id,
          articleId,
          status: "running",
          message: `Publishing "${article.slug}" to ${site.repoOwner}/${site.repoName}`,
        },
      });

      try {
        // Publish to GitHub
        const publishInfo: PublishSiteInfo = {
          id: site.id,
          name: site.name,
          repoOwner: site.repoOwner,
          repoName: site.repoName,
          contentDir: site.contentDir,
          imageDir: site.imageDir,
          githubToken,
          branch: "main",
        };

        const result = await publisher.publish(publishInfo, output, article.slug);

        // Update article status
        await prisma.article.update({
          where: { id: articleId },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
            publishedBy: (request as any).userId,
            gitCommitSha: result.commitSha,
          },
        });

        // Update job log
        await prisma.jobLog.update({
          where: { id: job.id },
          data: {
            status: "completed",
            completedAt: new Date(),
            message: `Published: ${result.commitSha} (${result.filesWritten.length} files)`,
          },
        });

        // Send success notification
        if (site.notifyEmail) {
          const emailData = formatPublishSuccess(site.name, article.title, result.commitSha);
          sendSuccessNotification({ to: site.notifyEmail, ...emailData }).catch(() => {});
        }

        return {
          success: true,
          commitSha: result.commitSha,
          filesWritten: result.filesWritten,
          message: result.message,
        };
      } catch (error: any) {
        // Rollback status
        await prisma.article.update({
          where: { id: articleId },
          data: { status: "APPROVED" },
        });

        // Log failure
        await prisma.jobLog.update({
          where: { id: job.id },
          data: {
            status: "failed",
            completedAt: new Date(),
            message: error.message,
          },
        });

        // Send error email if configured
        if (site.notifyEmail) {
          const auditLog = publisher.getAuditLog();
          const lastEntry = auditLog[auditLog.length - 1];
          const emailData = formatPublishError(
            site.name,
            article.slug,
            error.message,
            lastEntry?.blockedFiles || []
          );
          sendErrorNotification({
            to: site.notifyEmail,
            ...emailData,
          }).catch(() => {}); // Fire and forget
        }

        console.error(`[publish] FAILED for ${site.name}/${article.slug}:`, error.message);
        const isSecurity = error.message.includes("SECURITY");
        return reply.status(500).send({
          error: isSecurity ? "Publication bloquee pour raisons de securite" : "Erreur lors de la publication. Consultez les logs serveur.",
          type: isSecurity ? "security_block" : "publish_error",
        });
      }
    }
  );

  // ─── Deploy site (trigger VPS build) ───
  app.post<{ Params: { siteId: string } }>(
    "/deploy/:siteId",
    async (request, reply) => {
      const { siteId } = request.params;

      const site = await prisma.site.findUnique({ where: { id: siteId } });
      if (!site) {
        return reply.status(404).send({ error: "Site introuvable" });
      }

      if (!site.sshHost || !site.sshPrivateKey || !site.vpsPath) {
        return reply.status(400).send({
          error: "Configuration SSH non complete. Configurez host, cle SSH et chemin VPS.",
        });
      }

      let sshKey: string;
      try {
        sshKey = decrypt(site.sshPrivateKey);
      } catch {
        return reply
          .status(500)
          .send({ error: "Impossible de dechiffrer la cle SSH. Reconfigurez-la." });
      }

      const job = await prisma.jobLog.create({
        data: {
          jobType: "deploy",
          siteId,
          status: "running",
          message: `Deploying ${site.name} to ${site.sshHost}`,
        },
      });

      try {
        const deployInfo: DeploySiteInfo = {
          id: site.id,
          name: site.name,
          sshHost: site.sshHost,
          sshUser: site.sshUser || "deploy",
          sshPort: site.sshPort || 22,
          sshPrivateKey: sshKey,
          vpsPath: site.vpsPath,
          deployScript: site.deployScript || undefined,
        };

        const result = await publisher.deploy(deployInfo);

        await prisma.jobLog.update({
          where: { id: job.id },
          data: {
            status: "completed",
            completedAt: new Date(),
            message: result.message,
          },
        });

        // Send deploy success notification
        if (site.notifyEmail) {
          const emailData = formatDeploySuccess(site.name);
          sendSuccessNotification({ to: site.notifyEmail, ...emailData }).catch(() => {});
        }

        return {
          success: true,
          message: result.message,
          output: result.output,
        };
      } catch (error: any) {
        await prisma.jobLog.update({
          where: { id: job.id },
          data: {
            status: "failed",
            completedAt: new Date(),
            message: error.message,
          },
        });

        if (site.notifyEmail) {
          sendErrorNotification({
            to: site.notifyEmail,
            subject: `[BlogEngine] Erreur deploiement - ${site.name}`,
            body: `Le deploiement de "${site.name}" a echoue.\n\nErreur: ${error.message}\n\n-- BlogEngine`,
          }).catch(() => {});
        }

        console.error(`[publish] Error: ${error.message}`);
        return reply.status(500).send({ error: "Erreur lors du deploiement. Consultez les logs serveur." });
      }
    }
  );

  // ─── Update site publishing credentials ───
  app.patch<{
    Params: { siteId: string };
    Body: {
      githubToken?: string;
      sshHost?: string;
      sshUser?: string;
      sshPort?: number;
      sshPrivateKey?: string;
      vpsPath?: string;
      deployScript?: string;
      notifyEmail?: string;
    };
  }>("/config/:siteId", async (request, reply) => {
    const { siteId } = request.params;
    const body = request.body || {};

    const site = await prisma.site.findUnique({ where: { id: siteId } });
    if (!site) {
      return reply.status(404).send({ error: "Site introuvable" });
    }

    const update: any = {};

    if (body.githubToken !== undefined) {
      update.githubToken = body.githubToken ? encrypt(body.githubToken) : null;
    }
    if (body.sshHost !== undefined) update.sshHost = body.sshHost || null;
    if (body.sshUser !== undefined) update.sshUser = body.sshUser || null;
    if (body.sshPort !== undefined) update.sshPort = body.sshPort || 22;
    if (body.sshPrivateKey !== undefined) {
      update.sshPrivateKey = body.sshPrivateKey ? encrypt(body.sshPrivateKey) : null;
    }
    if (body.vpsPath !== undefined) {
      // Validate path: only alphanumeric, slashes, hyphens, underscores, dots
      if (body.vpsPath && !/^[a-zA-Z0-9\/_\-\.]+$/.test(body.vpsPath)) {
        return reply.status(400).send({ error: "vpsPath contient des caracteres non autorises" });
      }
      update.vpsPath = body.vpsPath || null;
    }
    if (body.deployScript !== undefined) {
      // Whitelist of allowed deploy scripts
      const ALLOWED_SCRIPTS = [
        "", null,
        "git pull origin main && npm run build",
        "git pull origin main && npm install && npm run build",
        "git pull origin main && yarn && yarn build",
        "git pull && npm run build",
        "./deploy.sh",
      ];
      if (body.deployScript && !ALLOWED_SCRIPTS.includes(body.deployScript)) {
        return reply.status(400).send({ error: "Script de deploiement non autorise" });
      }
      update.deployScript = body.deployScript || null;
    }
    if (body.notifyEmail !== undefined) update.notifyEmail = body.notifyEmail || null;

    await prisma.site.update({
      where: { id: siteId },
      data: update,
    });

    return { success: true, message: "Configuration mise a jour" };
  });

  // ─── Get publishing config for a site ───
  app.get<{ Params: { siteId: string } }>(
    "/config/:siteId",
    async (request, reply) => {
      const { siteId } = request.params;

      const site = await prisma.site.findUnique({ where: { id: siteId } });
      if (!site) {
        return reply.status(404).send({ error: "Site introuvable" });
      }

      return {
        repoOwner: site.repoOwner,
        repoName: site.repoName,
        hasGithubToken: !!site.githubToken,
        sshHost: site.sshHost,
        sshUser: site.sshUser,
        sshPort: site.sshPort,
        hasSshKey: !!site.sshPrivateKey,
        vpsPath: site.vpsPath,
        deployScript: site.deployScript,
        notifyEmail: site.notifyEmail,
      };
    }
  );

  // ─── Get audit log ───
  app.get("/audit", async () => {
    return publisher.getAuditLog();
  });
}
