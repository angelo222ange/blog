/**
 * Internal notification endpoint.
 * Used by the scheduler to send error emails when API routes fail
 * or can't be reached (network errors, timeouts).
 *
 * Protected by SCHEDULER_SECRET header — not exposed to frontend users.
 */
import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import {
  sendErrorNotification,
  formatGenerateError,
  formatDeployError,
  formatSocialGenerateError,
} from "../lib/notify.js";

export async function notifyRoutes(app: FastifyInstance) {
  // Internal scheduler auth check
  app.addHook("preHandler", async (request, reply) => {
    const secret = request.headers["x-scheduler-secret"];
    const expected = process.env.SCHEDULER_SECRET;
    if (!expected || secret !== expected) {
      return reply.status(403).send({ error: "Forbidden" });
    }
  });

  /**
   * POST /error
   * Body: { siteId, pipeline: "generate"|"publish"|"deploy"|"social", error: string }
   */
  app.post<{
    Body: {
      siteId: string;
      pipeline: "generate" | "publish" | "deploy" | "social";
      error: string;
    };
  }>("/error", async (request, reply) => {
    const { siteId, pipeline, error } = request.body || {} as any;

    if (!siteId || !pipeline || !error) {
      return reply.status(400).send({ error: "siteId, pipeline, and error are required" });
    }

    const site = await prisma.site.findUnique({ where: { id: siteId } });
    if (!site) {
      return reply.status(404).send({ error: "Site not found" });
    }

    if (!site.notifyEmail) {
      return { sent: false, reason: "No notifyEmail configured for site" };
    }

    let emailData: { subject: string; body: string; html: string };

    switch (pipeline) {
      case "generate":
        emailData = formatGenerateError(site.name, error);
        break;
      case "deploy":
        emailData = formatDeployError(site.name, error);
        break;
      case "social":
        emailData = formatSocialGenerateError(site.name, error);
        break;
      default:
        // For publish and unknown pipelines, use generate error as fallback
        emailData = formatGenerateError(site.name, error);
        break;
    }

    await sendErrorNotification({ to: site.notifyEmail, ...emailData });

    return { sent: true };
  });
}
