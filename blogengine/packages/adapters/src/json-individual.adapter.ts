import fs from "node:fs/promises";
import path from "node:path";
import type {
  SiteAdapter,
  BlogPattern,
  ExistingArticle,
  SiteConfig,
  GeneratedArticle,
  AdapterOutput,
  FileWrite,
  FileModification,
} from "@blogengine/core";

interface SiteInfo {
  repoOwner: string;
  repoName: string;
  blogPattern: string;
  blogBasePath: string;
  contentDir: string;
  imageDir: string;
  city?: string | null;
  name: string;
}

export class JsonIndividualAdapter implements SiteAdapter {
  readonly pattern: BlogPattern = "JSON_INDIVIDUAL";
  private site: SiteInfo;

  constructor(site: SiteInfo) {
    this.site = site;
  }

  async crawlExistingArticles(repoDir: string): Promise<ExistingArticle[]> {
    const articlesPath = path.join(repoDir, this.site.contentDir, "articles.json");

    try {
      const raw = await fs.readFile(articlesPath, "utf-8");
      const data = JSON.parse(raw);

      // Handle both { articles: [...] } and [...] formats
      const articles = Array.isArray(data) ? data : data.articles || [];

      return articles.map((a: any) => ({
        slug: a.slug,
        title: a.title,
        date: a.date || a.dateISO || "",
        category: a.category || "",
        keywords: a.keywords || [],
        excerpt: a.excerpt || "",
      }));
    } catch {
      return [];
    }
  }

  async parseSiteConfig(repoDir: string): Promise<SiteConfig> {
    // Try to read config/site.ts and extract basic info
    const configPaths = [
      path.join(repoDir, "config", "site.ts"),
      path.join(repoDir, "src", "lib", "constants.ts"),
    ];

    for (const configPath of configPaths) {
      try {
        const raw = await fs.readFile(configPath, "utf-8");

        // Extract basic fields via regex (these are TS files, not JSON)
        const domain = raw.match(/domain:\s*["']([^"']+)["']/)?.[1] || "";
        const phone = raw.match(/phone:\s*["']([^"']+)["']/)?.[1] || "";
        const city = raw.match(/city:\s*["']([^"']+)["']/)?.[1] || "";
        const name = raw.match(/name:\s*["']([^"']+)["']/)?.[1] || this.site.name;

        return {
          name,
          domain,
          city: city || this.site.city || undefined,
          phone,
          theme: "LOCAL_SERVICE",
        };
      } catch {
        continue;
      }
    }

    return {
      name: this.site.name,
      domain: "",
      city: this.site.city || undefined,
      theme: "LOCAL_SERVICE",
    };
  }

  formatArticle(article: GeneratedArticle, siteConfig: SiteConfig): AdapterOutput {
    // 1. Article JSON file
    // Build web-accessible image path (strip "public/" prefix for Next.js)
    const webImageDir = this.site.imageDir.replace(/^public\//, "");
    const heroImagePath = article.images[0]
      ? `/${webImageDir}/${article.images[0].filename}`
      : "";

    const articleJson = {
      slug: article.slug,
      title: article.title,
      metaTitle: article.metaTitle,
      metaDescription: article.metaDescription,
      date: article.date,
      author: siteConfig.name || this.site.name,
      category: article.category,
      readTime: article.readTime,
      image: heroImagePath,
      imageAlt: article.images[0]?.alt || "",
      intro: article.intro,
      tldr: article.tldr,
      sections: article.sections,
      faq: article.faq,
      conclusion: article.conclusion,
    };

    const articleFile: FileWrite = {
      path: `${this.site.contentDir}/${article.slug}.json`,
      content: JSON.stringify(articleJson, null, 2),
      encoding: "utf-8",
    };

    // 2. Update articles.json index
    const indexUpdate: FileModification = {
      path: `${this.site.contentDir}/articles.json`,
      type: "json-array-push",
      apply: (existing: string) => {
        const data = JSON.parse(existing);
        const articles = Array.isArray(data) ? data : data.articles || [];

        const newEntry = {
          id: articles.length + 1,
          slug: article.slug,
          title: article.title,
          metaTitle: article.metaTitle,
          metaDescription: article.metaDescription,
          excerpt: article.excerpt,
          date: article.date,
          author: siteConfig.name || this.site.name,
          category: article.category,
          readTime: article.readTime,
          image: heroImagePath,
          keywords: article.keywords,
        };

        if (Array.isArray(data)) {
          data.push(newEntry);
          return JSON.stringify(data, null, 2);
        } else {
          data.articles = [...articles, newEntry];
          return JSON.stringify(data, null, 2);
        }
      },
    };

    // 3. Update [slug]/page.tsx to add static import
    const blogDir = this.site.blogBasePath === "/blog"
      ? "app/blog"
      : `app${this.site.blogBasePath}`;

    const pageUpdate: FileModification = {
      path: `${blogDir}/[slug]/page.tsx`,
      type: "tsx-add-import",
      apply: (existing: string) => {
        return this.addStaticImport(existing, article.slug);
      },
    };

    // 4. Image files
    const imageFiles: FileWrite[] = article.images.map((img) => ({
      path: `${this.site.imageDir}/${img.filename}`,
      content: img.buffer || "",
      encoding: "binary" as const,
    }));

    return {
      articleFile,
      indexUpdate,
      pageUpdate,
      imageFiles,
    };
  }

  private addStaticImport(pageContent: string, slug: string): string {
    // Find the variable name pattern: import articleX from
    const importMatches = pageContent.match(
      /import\s+(\w+)\s+from\s+["']@\/content\/blog\//g
    );
    const nextNum = (importMatches?.length || 0) + 1;
    const varName = `article${nextNum}`;
    const camelSlug = slug.replace(/-./g, (x) => x[1]!.toUpperCase());

    // Add import after the last existing blog import
    const lastImportIdx = pageContent.lastIndexOf(
      'from "@/content/blog/'
    );
    if (lastImportIdx === -1) {
      // No existing imports, try alternate quote style
      const altIdx = pageContent.lastIndexOf("from '@/content/blog/");
      if (altIdx === -1) {
        // No blog imports at all, add before the articles map
        const mapIdx = pageContent.indexOf("const articlesContent");
        if (mapIdx === -1) return pageContent;

        const importLine = `import ${varName} from "@/content/blog/${slug}.json";\n`;
        return pageContent.slice(0, mapIdx) + importLine + pageContent.slice(mapIdx);
      }
    }

    // Find end of the last import line
    const searchStart = lastImportIdx !== -1 ? lastImportIdx : 0;
    const lineEnd = pageContent.indexOf("\n", searchStart);
    const importLine = `\nimport ${varName} from "@/content/blog/${slug}.json";`;

    let result = pageContent.slice(0, lineEnd) + importLine + pageContent.slice(lineEnd);

    // Add to the articles map object
    // Find pattern like: "some-slug": someVar,
    // and add a new entry after the last one
    const mapPattern = /["'][a-z0-9-]+["']:\s*\w+,?\s*\n(\s*}\s*;)/;
    const mapMatch = result.match(mapPattern);
    if (mapMatch && mapMatch.index !== undefined) {
      const insertPos = mapMatch.index + mapMatch[0].length - mapMatch[1]!.length;
      const entry = `  "${slug}": ${varName},\n`;
      result = result.slice(0, insertPos) + entry + result.slice(insertPos);
    }

    return result;
  }
}
