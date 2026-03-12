import { config } from "dotenv";
import { resolve } from "node:path";

// Load .env from monorepo root
const envPath = resolve(import.meta.dirname, "../../../.env");
config({ path: envPath, override: true });

import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import { join } from "node:path";
import { authRoutes } from "./routes/auth.js";
import { sitesRoutes } from "./routes/sites.js";
import { articlesRoutes } from "./routes/articles.js";
import { generateRoutes } from "./routes/generate.js";
import { socialAccountsRoutes } from "./routes/social-accounts.js";
import { socialPostsRoutes } from "./routes/social-posts.js";
import { statsRoutes } from "./routes/stats.js";
import { motionRoutes } from "./routes/motion.js";
import { publishRoutes } from "./routes/publish.js";
import { startScheduler } from "@blogengine/scheduler";

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === "production" ? "warn" : "info",
  },
});

async function start() {
  await app.register(helmet, {
    contentSecurityPolicy: false, // Managed by frontend/Nginx
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow uploaded images
  });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || "http://localhost:3001",
    credentials: true,
  });

  await app.register(cookie, {
    secret: process.env.JWT_SECRET,
  });

  await app.register(rateLimit, {
    global: false,
  });

  // Routes
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(sitesRoutes, { prefix: "/api/sites" });
  await app.register(articlesRoutes, { prefix: "/api/articles" });
  await app.register(generateRoutes, { prefix: "/api/generate" });
  await app.register(socialAccountsRoutes, { prefix: "/api/social" });
  await app.register(socialPostsRoutes, { prefix: "/api/social-posts" });
  await app.register(statsRoutes, { prefix: "/api/stats" });
  await app.register(motionRoutes, { prefix: "/api/motion" });
  await app.register(publishRoutes, { prefix: "/api/publish" });

  // Serve uploaded images (AI-generated social post images)
  await app.register(fastifyStatic, {
    root: join(process.cwd(), "public", "uploads"),
    prefix: "/uploads/",
    decorateReply: false,
  });

  // Health check
  app.get("/api/health", async () => ({ status: "ok" }));

  const port = Number(process.env.API_PORT) || 4000;
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`API running on http://localhost:${port}`);

  // Start the scheduler daemon (checks schedules every minute)
  startScheduler(port);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
