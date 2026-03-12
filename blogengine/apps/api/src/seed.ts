import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function seed() {
  const email = process.env.ADMIN_EMAIL || "admin@blogengine.local";
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ADMIN_PASSWORD must be set in production");
    }
    console.warn("[seed] WARNING: Using default password. Set ADMIN_PASSWORD in .env");
  }
  const finalPassword = password || "admin1234";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Utilisateur ${email} existe deja.`);
    return;
  }

  const passwordHash = await bcrypt.hash(finalPassword, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: "Admin",
      role: "ADMIN",
    },
  });

  console.log(`Utilisateur cree : ${user.email}`);

  // Seed some sites from the known repos
  const sites = [
    {
      name: "DRM Bordeaux",
      slug: "rideau-metallique-bordeaux",
      repoName: "rideau-metallique-bordeaux",
      domain: "www.rideau-metallique-bordeaux.fr",
      theme: "LOCAL_SERVICE",
      city: "Bordeaux",
      department: "33",
      blogPattern: "JSON_INDIVIDUAL",
      blogBasePath: "/blog",
      contentDir: "content/blog",
      imageDir: "public/images/blog",
    },
    {
      name: "DRM Montpellier",
      slug: "rideau-metallique-montpellier",
      repoName: "rideau-metallique-montpellier",
      theme: "LOCAL_SERVICE",
      city: "Montpellier",
      department: "34",
      blogPattern: "JSON_ARRAY",
      blogBasePath: "/blog",
      contentDir: "content/blog",
      imageDir: "public/images/blog",
    },
    {
      name: "DRM Nice",
      slug: "rideau-metallique-nice",
      repoName: "rideau-metallique-nice",
      theme: "LOCAL_SERVICE",
      city: "Nice",
      department: "06",
      blogPattern: "JSON_INDIVIDUAL",
      blogBasePath: "/blog",
      contentDir: "content/blog",
      imageDir: "public/images/blog",
    },
    {
      name: "Serrurier Toulouse TS31",
      slug: "toulouse-serrurier",
      repoName: "toulouse-serrurier",
      theme: "LOCAL_SERVICE",
      city: "Toulouse",
      department: "31",
      blogPattern: "CUSTOM_ROUTE",
      blogBasePath: "/blog-serrurier-toulouse",
      contentDir: "content/blog",
      imageDir: "public/images/blog",
    },
    {
      name: "Serrurier Hermes",
      slug: "serrurier-hermes",
      repoName: "serrurier-hermes",
      theme: "LOCAL_SERVICE",
      city: "Paris",
      department: "75",
      blogPattern: "NO_BLOG",
      blogBasePath: "/blog",
      contentDir: "content/blog",
      imageDir: "public/images/blog",
    },
    {
      name: "DRM SEO",
      slug: "drm-seo",
      repoName: "DRM-SEO",
      theme: "LOCAL_SERVICE",
      blogPattern: "MONOREPO",
      blogBasePath: "/blog",
      contentDir: "apps/website/content/blog",
      imageDir: "apps/website/public/images/blog",
    },
    {
      name: "Lio",
      slug: "lio-site",
      repoName: "lio-site",
      domain: "lio-app.com",
      theme: "SAAS",
      blogPattern: "TS_MODULE",
      blogBasePath: "/blog",
      contentDir: "src/data/blog-articles",
      imageDir: "public/images/blog",
    },
  ];

  for (const siteData of sites) {
    const existing = await prisma.site.findUnique({
      where: { slug: siteData.slug },
    });
    if (!existing) {
      await prisma.site.create({ data: siteData });
      console.log(`Site cree : ${siteData.name}`);
    }
  }

  console.log("Seed termine.");
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
