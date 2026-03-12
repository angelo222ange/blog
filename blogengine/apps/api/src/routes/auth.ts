import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { timingSafeEqual } from "node:crypto";
import { loginSchema } from "@blogengine/core";
import { prisma } from "../lib/prisma.js";
import { createToken, authGuard } from "../lib/auth.js";

export async function authRoutes(app: FastifyInstance) {
  // Rate limit login
  app.post(
    "/login",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "15 minutes",
        },
      },
    },
    async (request, reply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Email et mot de passe requis" });
      }

      const { email, password } = parsed.data;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return reply.status(401).send({ error: "Identifiants incorrects" });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return reply.status(401).send({ error: "Identifiants incorrects" });
      }

      const token = await createToken(user.id);

      reply.setCookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 86400,
        path: "/",
      });

      return { user: { id: user.id, email: user.email, name: user.name, role: user.role } };
    }
  );

  // Dev-only: auto-login route (disabled in production)
  if (process.env.NODE_ENV !== "production") {
    app.get("/auto-login", async (_request, reply) => {
      const user = await prisma.user.findFirst({ where: { role: "ADMIN" } });
      if (!user) return reply.status(500).send({ error: "No admin user" });

      const token = await createToken(user.id);
      reply.setCookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 86400,
        path: "/",
      });

      return reply.redirect("http://localhost:3000/");
    });
  }

  // Internal: scheduler token endpoint (no user credentials, uses shared secret)
  app.post("/internal-token", async (request, reply) => {
    const schedulerSecret = process.env.SCHEDULER_SECRET;
    if (!schedulerSecret) {
      return reply.status(503).send({ error: "Scheduler not configured" });
    }

    const provided = request.headers["x-scheduler-secret"];
    if (!provided || typeof provided !== "string") {
      return reply.status(403).send({ error: "Invalid scheduler secret" });
    }
    // Timing-safe comparison to prevent side-channel attacks
    const a = Buffer.from(provided);
    const b = Buffer.from(schedulerSecret);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return reply.status(403).send({ error: "Invalid scheduler secret" });
    }

    const user = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!user) return reply.status(500).send({ error: "No admin user" });

    const token = await createToken(user.id);
    return { token };
  });

  app.post("/logout", async (_request, reply) => {
    reply.clearCookie("token", { path: "/" });
    return { ok: true };
  });

  app.get("/me", { preHandler: authGuard }, async (request) => {
    const user = (request as any).user;
    return { id: user.id, email: user.email, name: user.name, role: user.role, onboardedAt: user.onboardedAt };
  });

  // Mark onboarding as complete (called once after first tour)
  app.post("/onboarded", { preHandler: authGuard }, async (request) => {
    const user = (request as any).user;
    await prisma.user.update({
      where: { id: user.id },
      data: { onboardedAt: new Date() },
    });
    return { ok: true };
  });
}
