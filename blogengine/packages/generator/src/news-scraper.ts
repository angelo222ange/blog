/**
 * Scrape des actualites recentes pour un secteur donne.
 * Utilise Google News RSS (gratuit, pas d'API key) + flux RSS sectoriels.
 */

interface NewsItem {
  title: string;
  source: string;
  date: string;
  snippet: string;
}

// Flux RSS par secteur
const RSS_FEEDS: Record<string, string[]> = {
  LOCAL_SERVICE: [
    // BTP / artisanat
    "https://www.batiweb.com/rss",
    "https://www.lemoniteur.fr/rss/a-la-une.html",
  ],
  SAAS: [
    "https://www.journaldunet.com/rss/",
    "https://www.usine-digitale.fr/rss",
  ],
};

// Mots-cles de recherche Google News par theme de site
const NEWS_KEYWORDS: Record<string, string[]> = {
  // Rideaux metalliques / serrurerie
  "rideau-metallique": ["rideau metallique reglementation", "securite commerce cambriolage", "norme rideau metallique"],
  "serrurerie": ["serrurerie reglementation", "securite habitation", "cambriolage statistiques"],
  // SaaS
  "saas": ["SaaS tendances", "logiciel entreprise", "transformation digitale"],
};

function detectSiteKeywords(siteName: string, theme: string): string[] {
  const name = siteName.toLowerCase();
  if (name.includes("rideau") || name.includes("drm")) return NEWS_KEYWORDS["rideau-metallique"]!;
  if (name.includes("serrurier")) return NEWS_KEYWORDS["serrurerie"]!;
  if (theme === "SAAS") return NEWS_KEYWORDS["saas"]!;
  return ["actualite commerce artisan"];
}

async function fetchGoogleNewsRSS(query: string): Promise<NewsItem[]> {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://news.google.com/rss/search?q=${encoded}&hl=fr&gl=FR&ceid=FR:fr`;
    const res = await fetch(url, {
      headers: { "User-Agent": "BlogEngine/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const items: NewsItem[] = [];

    // Simple XML parsing (no dependency needed)
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
      const itemXml = match[1]!;
      const title = itemXml.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, "$1") || "";
      const source = itemXml.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || "";
      const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
      const description = itemXml.match(/<description>(.*?)<\/description>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, "$1").replace(/<[^>]+>/g, "") || "";

      if (title) {
        items.push({
          title: decodeHtmlEntities(title),
          source: decodeHtmlEntities(source),
          date: pubDate ? new Date(pubDate).toISOString().split("T")[0]! : "",
          snippet: decodeHtmlEntities(description).substring(0, 200),
        });
      }
    }

    return items;
  } catch {
    return [];
  }
}

async function fetchRSSFeed(url: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "BlogEngine/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const items: NewsItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && items.length < 3) {
      const itemXml = match[1]!;
      const title = itemXml.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, "$1") || "";
      const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";

      if (title) {
        items.push({
          title: decodeHtmlEntities(title),
          source: new URL(url).hostname,
          date: pubDate ? new Date(pubDate).toISOString().split("T")[0]! : "",
          snippet: "",
        });
      }
    }

    return items;
  } catch {
    return [];
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

export interface NewsContext {
  items: NewsItem[];
  prompt: string;
}

export async function scrapeNewsForSite(
  siteName: string,
  theme: string,
  city?: string | null
): Promise<NewsContext> {
  const keywords = detectSiteKeywords(siteName, theme);
  const allItems: NewsItem[] = [];

  // Google News search with site-specific keywords
  const googlePromises = keywords.map((kw) => {
    const query = city ? `${kw} ${city}` : kw;
    return fetchGoogleNewsRSS(query);
  });

  // Sector RSS feeds
  const feeds = RSS_FEEDS[theme] || [];
  const rssPromises = feeds.map((url) => fetchRSSFeed(url));

  const results = await Promise.allSettled([...googlePromises, ...rssPromises]);
  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
    }
  }

  // Deduplicate by title similarity
  const unique: NewsItem[] = [];
  for (const item of allItems) {
    const isDupe = unique.some((u) =>
      u.title.toLowerCase().includes(item.title.toLowerCase().substring(0, 30)) ||
      item.title.toLowerCase().includes(u.title.toLowerCase().substring(0, 30))
    );
    if (!isDupe) unique.push(item);
  }

  // Keep only recent items (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recent = unique.filter((item) => {
    if (!item.date) return true; // keep if no date
    return new Date(item.date) >= thirtyDaysAgo;
  });

  const items = recent.slice(0, 10);

  if (items.length === 0) {
    return { items: [], prompt: "" };
  }

  const prompt = `## ACTUALITES RECENTES DU SECTEUR (derniers 30 jours)
Ces actualites peuvent t'inspirer pour choisir un sujet d'article en lien avec l'actu.
Un article lie a une actualite recente a plus de chances de ranker rapidement.
Tu n'es PAS oblige de les utiliser, mais si une actu est pertinente pour le site, utilise-la comme angle.
Si tu utilises une actu, CITE la source dans l'article.

${items.map((item) => `- "${item.title}" (${item.source}, ${item.date})${item.snippet ? ` - ${item.snippet}` : ""}`).join("\n")}`;

  return { items, prompt };
}
