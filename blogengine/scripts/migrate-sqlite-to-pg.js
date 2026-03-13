/**
 * Migrate data from SQLite JSON exports to PostgreSQL (Supabase).
 * First export: sqlite3 prisma/dev.db -json "SELECT * FROM X" > /tmp/migrate_X.json
 * Then run: node scripts/migrate-sqlite-to-pg.js
 */
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function load(table) {
  const f = `/tmp/migrate_${table}.json`;
  if (!fs.existsSync(f)) return [];
  const raw = fs.readFileSync(f, "utf-8").trim();
  if (!raw) return [];
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

function bool(v) { return v === 1 || v === true || v === "1"; }
function date(v) { return v ? new Date(v) : null; }
function dateReq(v) { return v ? new Date(v) : new Date(); }
function intOr(v, d) { return v != null ? parseInt(v) : d; }

async function migrate(table, rows, transform) {
  if (rows.length === 0) { console.log(`  ${table}: 0 rows`); return; }
  let ok = 0, skip = 0;
  for (const row of rows) {
    try {
      const data = transform(row);
      await prisma[table].create({ data });
      ok++;
    } catch (e) {
      if (e.code === "P2002") skip++;
      else { console.error(`  ${table} err:`, e.message.slice(0, 120)); skip++; }
    }
  }
  console.log(`  ${table}: ${ok} migrated, ${skip} skipped`);
}

async function main() {
  console.log("Migrating SQLite -> Supabase PostgreSQL...\n");

  await migrate("user", load("User"), r => ({
    id: r.id, email: r.email, passwordHash: r.passwordHash,
    name: r.name, role: r.role || "ADMIN",
    createdAt: dateReq(r.createdAt), updatedAt: dateReq(r.updatedAt),
    onboardedAt: date(r.onboardedAt),
  }));

  await migrate("site", load("Site"), r => ({
    id: r.id, name: r.name, slug: r.slug,
    repoOwner: r.repoOwner || "angelo222ange", repoName: r.repoName,
    domain: r.domain || null, theme: r.theme || "LOCAL_SERVICE",
    city: r.city || null, department: r.department || null,
    blogPattern: r.blogPattern, blogBasePath: r.blogBasePath || "/blog",
    contentDir: r.contentDir || "content/blog", imageDir: r.imageDir || "public/images/blog",
    deployScript: r.deployScript || null, vpsPath: r.vpsPath || null,
    isActive: bool(r.isActive), adapterConfig: r.adapterConfig || null,
    createdAt: dateReq(r.createdAt), updatedAt: dateReq(r.updatedAt),
    githubToken: r.githubToken || null, notifyEmail: r.notifyEmail || null,
    sshHost: r.sshHost || null, sshPort: intOr(r.sshPort, null),
    sshPrivateKey: r.sshPrivateKey || null, sshUser: r.sshUser || null,
  }));

  await migrate("siteImage", load("SiteImage"), r => ({
    id: r.id, siteId: r.siteId, url: r.url, alt: r.alt || null,
    category: r.category || "general", description: r.description || null,
    width: intOr(r.width, null), height: intOr(r.height, null),
    isUsable: bool(r.isUsable), createdAt: dateReq(r.createdAt),
  }));

  await migrate("article", load("Article"), r => ({
    id: r.id, siteId: r.siteId, slug: r.slug,
    title: r.title, metaTitle: r.metaTitle, metaDescription: r.metaDescription,
    content: r.content, status: r.status || "DRAFT",
    articleType: r.articleType || "evergreen",
    generatedBy: r.generatedBy || null, promptUsed: r.promptUsed || null,
    keywords: r.keywords || "[]", category: r.category || null,
    readTime: r.readTime || null,
    heroImage: r.heroImage || null, heroImageAlt: r.heroImageAlt || null,
    imageUrls: r.imageUrls || "[]",
    scheduledFor: date(r.scheduledFor), publishedAt: date(r.publishedAt),
    publishedBy: r.publishedBy || null, gitCommitSha: r.gitCommitSha || null,
    deployedAt: date(r.deployedAt),
    createdAt: dateReq(r.createdAt), updatedAt: dateReq(r.updatedAt),
  }));

  await migrate("schedule", load("Schedule"), r => ({
    id: r.id, siteId: r.siteId, cronExpr: r.cronExpr,
    timezone: r.timezone || "Europe/Paris", isActive: bool(r.isActive),
    postTime: r.postTime || "08:00", activeDays: r.activeDays || "[1,2,3,4,5]",
    evergreenPerDay: intOr(r.evergreenPerDay, 1), newsPerWeek: intOr(r.newsPerWeek, 1),
    autoApprove: bool(r.autoApprove), dayTimes: r.dayTimes || "{}",
    lastRunAt: date(r.lastRunAt), nextRunAt: date(r.nextRunAt),
    lastGeneratedAt: date(r.lastGeneratedAt),
    articlesGeneratedToday: intOr(r.articlesGeneratedToday, 0),
    newsGeneratedThisWeek: intOr(r.newsGeneratedThisWeek, 0),
    createdAt: dateReq(r.createdAt), updatedAt: dateReq(r.updatedAt),
  }));

  await migrate("crawlSnapshot", load("CrawlSnapshot"), r => ({
    id: r.id, siteId: r.siteId,
    existingArticles: r.existingArticles || "[]",
    topicsCovered: r.topicsCovered || "[]",
    topicsGaps: r.topicsGaps || "[]",
    siteConfig: r.siteConfig || null,
    crawledAt: dateReq(r.crawledAt),
  }));

  await migrate("jobLog", load("JobLog"), r => ({
    id: r.id, jobType: r.jobType, siteId: r.siteId || null,
    articleId: r.articleId || null, status: r.status,
    message: r.message || null, metadata: r.metadata || null,
    startedAt: dateReq(r.startedAt), completedAt: date(r.completedAt),
  }));

  await migrate("socialAccount", load("SocialAccount"), r => ({
    id: r.id, siteId: r.siteId, platform: r.platform,
    platformUserId: r.platformUserId || null, accountName: r.accountName || null,
    accessToken: r.accessToken, refreshToken: r.refreshToken || null,
    tokenExpiresAt: date(r.tokenExpiresAt), scope: r.scope || null,
    metadata: r.metadata || null, isActive: bool(r.isActive),
    createdAt: dateReq(r.createdAt), updatedAt: dateReq(r.updatedAt),
  }));

  await migrate("socialPost", load("SocialPost"), r => ({
    id: r.id, articleId: r.articleId || null, siteId: r.siteId || null,
    socialAccountId: r.socialAccountId, platform: r.platform,
    content: r.content, mediaUrls: r.mediaUrls || "[]",
    hashtags: r.hashtags || "[]", status: r.status || "DRAFT",
    platformPostId: r.platformPostId || null, platformUrl: r.platformUrl || null,
    publishedAt: date(r.publishedAt), scheduledFor: date(r.scheduledFor),
    errorMessage: r.errorMessage || null, carouselData: r.carouselData || null,
    createdAt: dateReq(r.createdAt), updatedAt: dateReq(r.updatedAt),
  }));

  await migrate("socialConfig", load("SocialConfig"), r => ({
    id: r.id, siteId: r.siteId, autoPublish: bool(r.autoPublish),
    defaultHashtags: r.defaultHashtags || "[]",
    postsPerDay: intOr(r.postsPerDay, 1), postSlots: r.postSlots || '["10:00"]',
    slotModes: r.slotModes || '["stock"]', activeDays: r.activeDays || "[1,2,3,4,5]",
    dayModes: r.dayModes || "{}", timezone: r.timezone || "Europe/Paris",
    activePlatforms: r.activePlatforms || '["facebook","instagram","linkedin","twitter","pinterest"]',
    createdAt: dateReq(r.createdAt), updatedAt: dateReq(r.updatedAt),
  }));

  console.log("\nDone! All data migrated to Supabase.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
