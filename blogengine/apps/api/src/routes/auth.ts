import type { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { timingSafeEqual, randomUUID } from "node:crypto";
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

  // OAuth login: create or find user from OAuth provider, then issue JWT
  app.post("/oauth-login", async (request, reply) => {
    const { email, name, provider, providerId } = request.body as {
      email: string; name?: string; provider: string; providerId: string;
    };

    if (!email || !provider || !providerId) {
      return reply.status(400).send({ error: "Email, provider et providerId requis" });
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Block external sign-ups: only existing users can log in via OAuth
      return reply.status(403).send({ error: "Compte non autorise. Contactez l'administrateur." });
    }

    if (!user.provider) {
      // Existing local user — link OAuth provider
      await prisma.user.update({
        where: { id: user.id },
        data: { provider, providerId },
      });
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
  });

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

  // Update current user's name
  app.patch("/me", { preHandler: authGuard }, async (request) => {
    const user = (request as any).user;
    const { name } = request.body as { name?: string };
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return { ok: false, error: "Nom requis" };
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { name: name.trim() },
    });
    return { ok: true };
  });

  // Change password
  app.post("/change-password", { preHandler: authGuard }, async (request) => {
    const user = (request as any).user;
    const { currentPassword, newPassword } = request.body as { currentPassword: string; newPassword: string };

    if (!currentPassword || !newPassword) {
      return { ok: false, error: "Mot de passe actuel et nouveau requis" };
    }
    if (newPassword.length < 6) {
      return { ok: false, error: "Le mot de passe doit faire au moins 6 caracteres" };
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return { ok: false, error: "Utilisateur introuvable" };
    }

    const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!valid) {
      return { ok: false, error: "Mot de passe actuel incorrect" };
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash },
    });
    return { ok: true };
  });

  // List all users (admin only)
  app.get("/users", { preHandler: authGuard }, async (request, reply) => {
    const user = (request as any).user;
    if (user.role !== "ADMIN") {
      return reply.status(403).send({ error: "Acces refuse" });
    }
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return users;
  });

  // Create user (admin only)
  app.post("/users", { preHandler: authGuard }, async (request, reply) => {
    const user = (request as any).user;
    if (user.role !== "ADMIN") {
      return reply.status(403).send({ error: "Acces refuse" });
    }
    const { email, name, role, password } = request.body as {
      email: string; name?: string; role?: string; password: string;
    };
    if (!email || !password) {
      return reply.status(400).send({ error: "Email et mot de passe requis" });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: "Cet email est deja utilise" });
    }
    const hash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || null,
        role: role === "ADMIN" ? "ADMIN" : "USER",
        passwordHash: hash,
      },
      select: { id: true, email: true, name: true, role: true },
    });
    return newUser;
  });

  // Delete user (admin only, prevent self-delete)
  app.delete("/users/:id", { preHandler: authGuard }, async (request, reply) => {
    const user = (request as any).user;
    if (user.role !== "ADMIN") {
      return reply.status(403).send({ error: "Acces refuse" });
    }
    const { id } = request.params as { id: string };
    if (id === user.id) {
      return reply.status(400).send({ error: "Impossible de supprimer votre propre compte" });
    }
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return reply.status(404).send({ error: "Utilisateur introuvable" });
    }
    await prisma.user.delete({ where: { id } });
    return { ok: true };
  });
}
