import type { FastifyInstance } from "fastify";
import { socialPlatformSchema } from "@blogengine/core";
import { getOAuthHandler, encrypt, decrypt, generatePKCE, discoverMetaAccounts } from "@blogengine/social";
import { prisma } from "../lib/prisma.js";
import { authGuard } from "../lib/auth.js";
import { randomBytes } from "node:crypto";

const REDIRECT_BASE = process.env.SOCIAL_OAUTH_REDIRECT_BASE || "http://localhost:4000";

export async function socialAccountsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  // List connected accounts for a site
  app.get<{ Params: { siteId: string } }>(
    "/accounts/:siteId",
    async (request, reply) => {
      const accounts = await prisma.socialAccount.findMany({
        where: { siteId: request.params.siteId },
        select: {
          id: true,
          platform: true,
          accountName: true,
          platformUserId: true,
          isActive: true,
          tokenExpiresAt: true,
          createdAt: true,
        },
      });
      return accounts;
    },
  );

  // Start OAuth flow
  app.get<{ Params: { platform: string }; Querystring: { siteId: string } }>(
    "/oauth/:platform/authorize",
    async (request, reply) => {
      const parsed = socialPlatformSchema.safeParse(request.params.platform);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid platform" });
      }

      const platform = parsed.data;
      const { siteId } = request.query;
      if (!siteId) return reply.status(400).send({ error: "siteId required" });

      // Check required env vars per platform
      const envCheck: Record<string, string[]> = {
        facebook: ["META_APP_ID", "META_APP_SECRET"],
        instagram: ["INSTAGRAM_APP_ID", "INSTAGRAM_APP_SECRET"],
        linkedin: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
        twitter: ["TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET"],
        pinterest: ["PINTEREST_APP_ID", "PINTEREST_APP_SECRET"],
        tiktok: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
      };
      const missing = (envCheck[platform] || []).filter((k) => !process.env[k]);
      if (missing.length > 0) {
        return reply.status(400).send({
          error: `Cles API manquantes pour ${platform}: ${missing.join(", ")}. Configurez-les dans .env puis relancez l'API.`,
        });
      }

      const handler = getOAuthHandler(platform);
      const state = randomBytes(16).toString("hex");
      const redirectUri = `${REDIRECT_BASE}/api/social/oauth/${platform}/callback`;

      const stateData: any = { siteId, platform, state };

      try {
        // Twitter PKCE
        if (platform === "twitter") {
          const pkce = generatePKCE();
          stateData.codeVerifier = pkce.codeVerifier;
          let url = handler.getAuthorizationUrl(state, redirectUri);
          url += `&code_challenge=${pkce.codeChallenge}`;
          reply.setCookie("oauth_state", JSON.stringify(stateData), {
            path: "/",
            httpOnly: true,
            signed: true,
            maxAge: 600,
            sameSite: "lax",
          });
          return { url };
        }

        const url = handler.getAuthorizationUrl(state, redirectUri);
        reply.setCookie("oauth_state", JSON.stringify(stateData), {
          path: "/",
          httpOnly: true,
          signed: true,
          maxAge: 600,
          sameSite: "lax",
        });
        return { url };
      } catch (err: any) {
        console.error(`[social-oauth] Error: ${err.message}`);
        return reply.status(500).send({ error: "Erreur lors de l'initialisation OAuth" });
      }
    },
  );

  // OAuth callback
  app.get<{ Params: { platform: string }; Querystring: { code: string; state: string } }>(
    "/oauth/:platform/callback",
    async (request, reply) => {
      const { code, state } = request.query;
      const signedCookie = request.unsignCookie(request.cookies.oauth_state || "");
      if (!signedCookie.valid || !signedCookie.value) {
        return reply.status(400).send({ error: "Missing or tampered OAuth state" });
      }

      let stateData: any;
      try {
        stateData = JSON.parse(signedCookie.value);
      } catch {
        return reply.status(400).send({ error: "Invalid OAuth state" });
      }

      if (stateData.state !== state) {
        return reply.status(400).send({ error: "OAuth state mismatch" });
      }

      const platform = stateData.platform;
      const siteId = stateData.siteId;
      const handler = getOAuthHandler(platform);
      const redirectUri = `${REDIRECT_BASE}/api/social/oauth/${platform}/callback`;

      try {
        const tokens = await handler.exchangeCode(code, redirectUri, stateData.codeVerifier);

        // Instagram direct login - save account directly
        if (platform === "instagram") {
          await prisma.socialAccount.upsert({
            where: {
              siteId_platform_platformUserId: {
                siteId,
                platform: "instagram",
                platformUserId: tokens.platformUserId || "default",
              },
            },
            create: {
              siteId,
              platform: "instagram",
              platformUserId: tokens.platformUserId || "default",
              accountName: tokens.accountName || "Instagram",
              accessToken: encrypt(tokens.accessToken),
              tokenExpiresAt: tokens.expiresIn
                ? new Date(Date.now() + tokens.expiresIn * 1000)
                : null,
              scope: tokens.scope,
              metadata: JSON.stringify({ instagramId: tokens.platformUserId || "default" }),
            },
            update: {
              accessToken: encrypt(tokens.accessToken),
              accountName: tokens.accountName || "Instagram",
              tokenExpiresAt: tokens.expiresIn
                ? new Date(Date.now() + tokens.expiresIn * 1000)
                : null,
              metadata: JSON.stringify({ instagramId: tokens.platformUserId || "default" }),
            },
          });
        // Facebook - discover pages and linked Instagram accounts
        } else if (platform === "facebook") {
          const { pages } = await discoverMetaAccounts(tokens.accessToken);

          // If no pages found, save the user account directly so connection doesn't silently fail
          if (pages.length === 0) {
            await prisma.socialAccount.upsert({
              where: {
                siteId_platform_platformUserId: {
                  siteId,
                  platform: "facebook",
                  platformUserId: tokens.platformUserId || "default",
                },
              },
              create: {
                siteId,
                platform: "facebook",
                platformUserId: tokens.platformUserId || "default",
                accountName: tokens.accountName || "Facebook",
                accessToken: encrypt(tokens.accessToken),
                tokenExpiresAt: tokens.expiresIn
                  ? new Date(Date.now() + tokens.expiresIn * 1000)
                  : null,
                scope: tokens.scope,
              },
              update: {
                accessToken: encrypt(tokens.accessToken),
                accountName: tokens.accountName || "Facebook",
                tokenExpiresAt: tokens.expiresIn
                  ? new Date(Date.now() + tokens.expiresIn * 1000)
                  : null,
              },
            });
          }

          for (const page of pages) {
            // Create Facebook account
            await prisma.socialAccount.upsert({
              where: {
                siteId_platform_platformUserId: {
                  siteId,
                  platform: "facebook",
                  platformUserId: page.id,
                },
              },
              create: {
                siteId,
                platform: "facebook",
                platformUserId: page.id,
                accountName: page.name,
                accessToken: encrypt(page.accessToken),
                tokenExpiresAt: tokens.expiresIn
                  ? new Date(Date.now() + tokens.expiresIn * 1000)
                  : null,
                scope: tokens.scope,
                metadata: JSON.stringify({ pageId: page.id }),
              },
              update: {
                accessToken: encrypt(page.accessToken),
                accountName: page.name,
                tokenExpiresAt: tokens.expiresIn
                  ? new Date(Date.now() + tokens.expiresIn * 1000)
                  : null,
              },
            });

            // If page has Instagram, create Instagram account too
            if (page.instagramId) {
              await prisma.socialAccount.upsert({
                where: {
                  siteId_platform_platformUserId: {
                    siteId,
                    platform: "instagram",
                    platformUserId: page.instagramId,
                  },
                },
                create: {
                  siteId,
                  platform: "instagram",
                  platformUserId: page.instagramId,
                  accountName: `${page.name} (IG)`,
                  accessToken: encrypt(page.accessToken),
                  tokenExpiresAt: tokens.expiresIn
                    ? new Date(Date.now() + tokens.expiresIn * 1000)
                    : null,
                  scope: tokens.scope,
                  metadata: JSON.stringify({ instagramId: page.instagramId, pageId: page.id }),
                },
                update: {
                  accessToken: encrypt(page.accessToken),
                  tokenExpiresAt: tokens.expiresIn
                    ? new Date(Date.now() + tokens.expiresIn * 1000)
                    : null,
                },
              });
            }
          }
        } else {
          // Other platforms: single account
          await prisma.socialAccount.upsert({
            where: {
              siteId_platform_platformUserId: {
                siteId,
                platform,
                platformUserId: tokens.platformUserId || "default",
              },
            },
            create: {
              siteId,
              platform,
              platformUserId: tokens.platformUserId,
              accountName: tokens.accountName,
              accessToken: encrypt(tokens.accessToken),
              refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
              tokenExpiresAt: tokens.expiresIn
                ? new Date(Date.now() + tokens.expiresIn * 1000)
                : null,
              scope: tokens.scope,
              metadata: tokens.metadata ? JSON.stringify(tokens.metadata) : null,
            },
            update: {
              accessToken: encrypt(tokens.accessToken),
              refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
              accountName: tokens.accountName,
              tokenExpiresAt: tokens.expiresIn
                ? new Date(Date.now() + tokens.expiresIn * 1000)
                : null,
            },
          });
        }

        // Clear cookie and redirect to frontend
        reply.clearCookie("oauth_state", { path: "/" });

        // Redirect to frontend social page
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        return reply.redirect(`${frontendUrl}/social?connected=${platform}&siteId=${siteId}`);
      } catch (error: any) {
        console.error(`[social] OAuth callback error:`, error);
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        return reply.redirect(`${frontendUrl}/social?error=${encodeURIComponent(error.message)}&siteId=${siteId}`);
      }
    },
  );

  // Disconnect account
  app.delete<{ Params: { accountId: string } }>(
    "/account/:accountId",
    async (request, reply) => {
      await prisma.socialPost.deleteMany({
        where: { socialAccountId: request.params.accountId },
      });
      await prisma.socialAccount.delete({
        where: { id: request.params.accountId },
      });
      return { ok: true };
    },
  );

  // Get LinkedIn organizations for account (to choose between personal/company page)
  app.get<{ Params: { accountId: string } }>(
    "/account/:accountId/linkedin-orgs",
    async (request, reply) => {
      const account = await prisma.socialAccount.findUnique({
        where: { id: request.params.accountId },
      });
      if (!account || account.platform !== "linkedin") {
        return reply.status(400).send({ error: "Compte LinkedIn introuvable" });
      }
      const metadata = account.metadata ? JSON.parse(account.metadata) : {};
      return {
        personId: metadata.personId || account.platformUserId,
        personName: metadata.personName || account.accountName,
        organizations: metadata.organizations || [],
        activeMode: metadata.organizationId ? "organization" : "personal",
        activeOrgId: metadata.organizationId || null,
      };
    },
  );

  // Switch LinkedIn publishing between personal profile and organization page
  app.patch<{ Params: { accountId: string } }>(
    "/account/:accountId/linkedin-mode",
    async (request, reply) => {
      const { mode, organizationId, organizationName } = request.body as {
        mode: "personal" | "organization";
        organizationId?: string;
        organizationName?: string;
      };
      const account = await prisma.socialAccount.findUnique({
        where: { id: request.params.accountId },
      });
      if (!account || account.platform !== "linkedin") {
        return reply.status(400).send({ error: "Compte LinkedIn introuvable" });
      }
      const metadata = account.metadata ? JSON.parse(account.metadata) : {};

      if (mode === "organization" && organizationId) {
        metadata.organizationId = organizationId;
        metadata.authorId = undefined;
      } else {
        metadata.organizationId = undefined;
        metadata.authorId = metadata.personId || account.platformUserId;
      }

      const newName = mode === "organization" && organizationName
        ? organizationName
        : metadata.personName || account.accountName;

      await prisma.socialAccount.update({
        where: { id: request.params.accountId },
        data: {
          metadata: JSON.stringify(metadata),
          accountName: newName,
        },
      });

      return { ok: true, mode, accountName: newName };
    },
  );

  // Get social config for a site
  app.get<{ Params: { siteId: string } }>(
    "/config/:siteId",
    async (request, reply) => {
      let config = await prisma.socialConfig.findUnique({
        where: { siteId: request.params.siteId },
      });
      if (!config) {
        config = await prisma.socialConfig.create({
          data: { siteId: request.params.siteId },
        });
      }
      return {
        ...config,
        defaultHashtags: JSON.parse(config.defaultHashtags),
        postSlots: JSON.parse(config.postSlots),
        slotModes: JSON.parse(config.slotModes),
        activeDays: JSON.parse(config.activeDays),
        dayModes: JSON.parse(config.dayModes),
        activePlatforms: JSON.parse(config.activePlatforms),
      };
    },
  );

  // Update social config
  app.put<{ Params: { siteId: string } }>(
    "/config/:siteId",
    async (request, reply) => {
      const body = request.body as any;
      const postsPerDay = Math.max(1, Math.min(10, body.postsPerDay ?? 1));
      // Ensure postSlots length matches postsPerDay
      let postSlots: string[] = body.postSlots ?? ["10:00"];
      if (postSlots.length > postsPerDay) {
        postSlots = postSlots.slice(0, postsPerDay);
      }
      // Ensure slotModes length matches postSlots
      let slotModes: string[] = body.slotModes ?? postSlots.map(() => "stock");
      if (slotModes.length > postSlots.length) {
        slotModes = slotModes.slice(0, postSlots.length);
      }
      while (slotModes.length < postSlots.length) {
        slotModes.push("stock");
      }
      const data = {
        autoPublish: body.autoPublish ?? false,
        defaultHashtags: JSON.stringify(body.defaultHashtags || []),
        postsPerDay,
        postSlots: JSON.stringify(postSlots),
        slotModes: JSON.stringify(slotModes),
        activeDays: JSON.stringify(body.activeDays ?? [1, 2, 3, 4, 5]),
        dayModes: JSON.stringify(body.dayModes ?? {}),
        timezone: body.timezone ?? "Europe/Paris",
        activePlatforms: JSON.stringify(body.activePlatforms ?? ["facebook", "instagram", "linkedin", "twitter", "pinterest"]),
      };
      const config = await prisma.socialConfig.upsert({
        where: { siteId: request.params.siteId },
        create: { siteId: request.params.siteId, ...data },
        update: data,
      });
      return {
        ...config,
        defaultHashtags: JSON.parse(config.defaultHashtags),
        postSlots: JSON.parse(config.postSlots),
        slotModes: JSON.parse(config.slotModes),
        activeDays: JSON.parse(config.activeDays),
        dayModes: JSON.parse(config.dayModes),
        activePlatforms: JSON.parse(config.activePlatforms),
      };
    },
  );
}
