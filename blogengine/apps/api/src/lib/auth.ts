import { SignJWT, jwtVerify } from "jose";
import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "./prisma.js";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set and at least 32 characters in production");
  }
  console.warn("[auth] WARNING: JWT_SECRET is weak or missing. Set a strong secret in .env");
}
const secret = new TextEncoder().encode(
  jwtSecret || "dev-secret-change-in-production-min-32-chars-long"
);

export async function createToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .setIssuedAt()
    .sign(secret);
}

export async function verifyToken(
  token: string
): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as { sub: string };
  } catch {
    return null;
  }
}

export async function authGuard(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = request.cookies.token;
  if (!token) {
    reply.status(401).send({ error: "Non authentifie" });
    return;
  }

  const payload = await verifyToken(token);
  if (!payload?.sub) {
    reply.status(401).send({ error: "Token invalide" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
  });

  if (!user) {
    reply.status(401).send({ error: "Utilisateur introuvable" });
    return;
  }

  (request as any).user = user;
}
