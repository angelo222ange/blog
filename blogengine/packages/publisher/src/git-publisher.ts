/**
 * Git Publisher - Phase 2
 *
 * SECURITY MODEL:
 * 1. WHITELIST: Only content/blog/ and public/images/blog/ are writable
 * 2. NO CODE: .ts, .tsx, .js, .jsx, .css, .html files are NEVER touched
 * 3. APPEND ONLY: Existing files are never overwritten (except articles.json index append)
 * 4. PRE-COMMIT CHECK: git diff verifies only whitelisted paths before push
 * 5. SITE ISOLATION: Each operation in unique /tmp dir, repo/site binding verified
 * 6. DUPLICATE CHECK: Slug verified against articles.json before writing
 * 7. ROLLBACK: Any failure = cleanup, nothing pushed
 * 8. AUDIT LOG: Every operation logged
 */
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { simpleGit } from "simple-git";
import type { AdapterOutput, FileWrite, FileModification } from "@blogengine/core";

// ─── Security Constants ───

/** Only these directory prefixes are allowed for writes */
const ALLOWED_WRITE_PREFIXES = [
  "content/blog/",
  "public/images/blog/",
];

/** These file extensions are NEVER writable, regardless of path */
const FORBIDDEN_EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".css", ".scss", ".less",
  ".html", ".htm", ".xml",
  ".yaml", ".yml", ".toml",
  ".env", ".lock",
  ".sh", ".bash", ".zsh",
  ".py", ".rb", ".go", ".rs",
];

/** Max file size for any single write (5MB) */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Max total files per publish operation */
const MAX_FILES_PER_PUBLISH = 20;

// ─── Types ───

export interface PublishSiteInfo {
  id: string;
  name: string;
  repoOwner: string;
  repoName: string;
  contentDir: string;
  imageDir: string;
  githubToken: string;
  branch?: string;
}

export interface DeploySiteInfo {
  id: string;
  name: string;
  sshHost: string;
  sshUser: string;
  sshPort?: number;
  sshPrivateKey: string;
  vpsPath: string;
  deployScript?: string;
}

export interface PublishResult {
  success: boolean;
  commitSha: string;
  filesWritten: string[];
  message: string;
}

export interface DeployResult {
  success: boolean;
  output: string;
  message: string;
}

export interface PublishAuditEntry {
  siteId: string;
  siteName: string;
  articleSlug: string;
  repoOwner: string;
  repoName: string;
  operation: "publish" | "deploy";
  status: "success" | "failed" | "blocked";
  filesWritten: string[];
  blockedFiles: string[];
  commitSha?: string;
  error?: string;
  timestamp: string;
}

// ─── Security Validators ───

function isPathAllowed(filePath: string, allowedPrefixes: string[]): boolean {
  // Normalize: no leading slash, no ..
  const normalized = filePath.replace(/^\/+/, "").replace(/\\/g, "/");

  // Block path traversal
  if (normalized.includes("..") || normalized.includes("./")) {
    return false;
  }

  // Check against whitelist
  return allowedPrefixes.some((prefix) => normalized.startsWith(prefix));
}

function hasForbidenExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return FORBIDDEN_EXTENSIONS.includes(ext);
}

function validateFilePath(
  filePath: string,
  contentDir: string,
  imageDir: string
): { allowed: boolean; reason?: string } {
  const normalized = filePath.replace(/^\/+/, "").replace(/\\/g, "/");

  // Build dynamic whitelist from site config
  const allowedPrefixes = [
    contentDir.replace(/^\/+/, "") + "/",
    imageDir.replace(/^\/+/, "") + "/",
  ];

  if (normalized.includes("..")) {
    return { allowed: false, reason: `Path traversal detected: ${normalized}` };
  }

  if (hasForbidenExtension(normalized)) {
    return { allowed: false, reason: `Forbidden extension: ${path.extname(normalized)} in ${normalized}` };
  }

  if (!isPathAllowed(normalized, allowedPrefixes)) {
    return { allowed: false, reason: `Path not in whitelist: ${normalized} (allowed: ${allowedPrefixes.join(", ")})` };
  }

  return { allowed: true };
}

function validateIndexModification(
  filePath: string,
  modType: string,
  contentDir: string
): { allowed: boolean; reason?: string } {
  const normalized = filePath.replace(/^\/+/, "").replace(/\\/g, "/");
  const expectedIndex = `${contentDir.replace(/^\/+/, "")}/articles.json`;

  if (normalized !== expectedIndex) {
    return { allowed: false, reason: `Index modification not allowed on: ${normalized} (expected: ${expectedIndex})` };
  }

  if (modType !== "json-array-push") {
    return { allowed: false, reason: `Only json-array-push allowed on index, got: ${modType}` };
  }

  return { allowed: true };
}

// ─── Publisher ───

export class GitPublisher {
  private auditLog: PublishAuditEntry[] = [];

  getAuditLog(): PublishAuditEntry[] {
    return [...this.auditLog];
  }

  async publish(
    site: PublishSiteInfo,
    output: AdapterOutput,
    articleSlug: string
  ): Promise<PublishResult> {
    const workDir = path.join("/tmp", `publish-${site.id}-${randomUUID()}`);
    const audit: PublishAuditEntry = {
      siteId: site.id,
      siteName: site.name,
      articleSlug,
      repoOwner: site.repoOwner,
      repoName: site.repoName,
      operation: "publish",
      status: "failed",
      filesWritten: [],
      blockedFiles: [],
      timestamp: new Date().toISOString(),
    };

    try {
      // ── Step 1: Clone repo into isolated temp directory ──
      console.log(`[publisher] Cloning ${site.repoOwner}/${site.repoName} into ${workDir}`);
      await fs.mkdir(workDir, { recursive: true });

      const repoUrl = `https://github.com/${site.repoOwner}/${site.repoName}.git`;
      const git = simpleGit();
      // Use env-based auth to avoid leaking token in process listing or git logs
      const envVars = {
        GIT_TERMINAL_PROMPT: "0",
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: `url.https://x-access-token:${site.githubToken}@github.com/.insteadOf`,
        GIT_CONFIG_VALUE_0: "https://github.com/",
      };
      await git.env(envVars).clone(repoUrl, workDir, ["--depth", "1", "--branch", site.branch || "main"]);

      const repoGit = simpleGit(workDir).env(envVars);

      // Set git identity for commits
      await repoGit.addConfig("user.email", "deploy@zuply.fr");
      await repoGit.addConfig("user.name", "Zuply");

      // ── Step 2: Duplicate check - verify slug doesn't exist ──
      const indexPath = path.join(workDir, site.contentDir, "articles.json");
      if (existsSync(indexPath)) {
        const indexContent = await fs.readFile(indexPath, "utf-8");
        const indexData = JSON.parse(indexContent);
        const articles = Array.isArray(indexData) ? indexData : indexData.articles || [];
        const exists = articles.some((a: any) => a.slug === articleSlug);
        if (exists) {
          audit.status = "blocked";
          audit.error = `Article slug "${articleSlug}" already exists in ${site.repoName}`;
          this.auditLog.push(audit);
          throw new Error(audit.error);
        }
      }

      // ── Step 3: Validate ALL file paths BEFORE writing anything ──
      const allFiles: Array<{ path: string; content: string | Buffer; encoding: string }> = [];
      const allModifications: Array<{ path: string; mod: FileModification }> = [];

      // Article JSON file
      const articleCheck = validateFilePath(output.articleFile.path, site.contentDir, site.imageDir);
      if (!articleCheck.allowed) {
        audit.blockedFiles.push(output.articleFile.path);
        audit.status = "blocked";
        audit.error = `SECURITY: ${articleCheck.reason}`;
        this.auditLog.push(audit);
        throw new Error(audit.error);
      }
      allFiles.push({
        path: output.articleFile.path,
        content: output.articleFile.content,
        encoding: output.articleFile.encoding,
      });

      // Index update (articles.json)
      const indexCheck = validateIndexModification(
        output.indexUpdate.path,
        output.indexUpdate.type,
        site.contentDir
      );
      if (!indexCheck.allowed) {
        audit.blockedFiles.push(output.indexUpdate.path);
        audit.status = "blocked";
        audit.error = `SECURITY: ${indexCheck.reason}`;
        this.auditLog.push(audit);
        throw new Error(audit.error);
      }
      allModifications.push({ path: output.indexUpdate.path, mod: output.indexUpdate });

      // Image files
      for (const img of output.imageFiles) {
        const imgCheck = validateFilePath(img.path, site.contentDir, site.imageDir);
        if (!imgCheck.allowed) {
          audit.blockedFiles.push(img.path);
          audit.status = "blocked";
          audit.error = `SECURITY: ${imgCheck.reason}`;
          this.auditLog.push(audit);
          throw new Error(audit.error);
        }
        allFiles.push({ path: img.path, content: img.content, encoding: img.encoding });
      }

      // SECURITY: Skip pageUpdate entirely - we never modify code files
      if (output.pageUpdate) {
        console.log(`[publisher] SECURITY: Skipping pageUpdate (${output.pageUpdate.path}) - code files are read-only`);
        audit.blockedFiles.push(output.pageUpdate.path);
      }

      // SECURITY: Skip sitemapUpdate - handled by site build
      if (output.sitemapUpdate) {
        console.log(`[publisher] SECURITY: Skipping sitemapUpdate - handled by site build process`);
      }

      // File count limit
      if (allFiles.length > MAX_FILES_PER_PUBLISH) {
        audit.status = "blocked";
        audit.error = `Too many files: ${allFiles.length} (max ${MAX_FILES_PER_PUBLISH})`;
        this.auditLog.push(audit);
        throw new Error(audit.error);
      }

      // ── Step 4: Write files ──
      for (const file of allFiles) {
        const fullPath = path.join(workDir, file.path);

        // Don't overwrite existing files (except articles.json handled separately)
        if (existsSync(fullPath)) {
          audit.blockedFiles.push(file.path);
          console.log(`[publisher] SECURITY: Skipping existing file: ${file.path}`);
          continue;
        }

        // Size check
        const size = typeof file.content === "string" ? Buffer.byteLength(file.content) : file.content.length;
        if (size > MAX_FILE_SIZE) {
          audit.status = "blocked";
          audit.error = `File too large: ${file.path} (${(size / 1024 / 1024).toFixed(1)}MB, max 5MB)`;
          this.auditLog.push(audit);
          throw new Error(audit.error);
        }

        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        if (file.encoding === "binary") {
          await fs.writeFile(fullPath, file.content);
        } else {
          await fs.writeFile(fullPath, file.content, "utf-8");
        }
        audit.filesWritten.push(file.path);
      }

      // ── Step 5: Apply index modification (append only) ──
      for (const { path: modPath, mod } of allModifications) {
        const fullPath = path.join(workDir, modPath);

        if (!existsSync(fullPath)) {
          // Create fresh articles.json if it doesn't exist
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, "[]", "utf-8");
        }

        const existing = await fs.readFile(fullPath, "utf-8");
        const updated = mod.apply(existing);
        await fs.writeFile(fullPath, updated, "utf-8");
        audit.filesWritten.push(modPath);
      }

      // ── Step 6: PRE-COMMIT SECURITY CHECK ──
      // Verify git diff only shows whitelisted paths
      await repoGit.add(".");
      const diff = await repoGit.diff(["--staged", "--name-only"]);
      const changedFiles = diff.split("\n").filter(Boolean);

      const allowedPrefixes = [
        site.contentDir.replace(/^\/+/, ""),
        site.imageDir.replace(/^\/+/, ""),
      ];

      for (const changedFile of changedFiles) {
        const isAllowed = allowedPrefixes.some((p) => changedFile.startsWith(p));
        if (!isAllowed) {
          // CRITICAL: Unauthorized file change detected - abort everything
          audit.status = "blocked";
          audit.error = `CRITICAL SECURITY: Unauthorized file in git diff: ${changedFile}`;
          audit.blockedFiles.push(changedFile);
          this.auditLog.push(audit);

          // Reset and cleanup
          await repoGit.reset(["--hard"]);
          throw new Error(audit.error);
        }
      }

      if (changedFiles.length === 0) {
        audit.status = "blocked";
        audit.error = "No files to commit";
        this.auditLog.push(audit);
        throw new Error(audit.error);
      }

      // ── Step 7: Commit and push ──
      const commitMsg = `blog: ${articleSlug}\n\nPublished via BlogEngine`;
      await repoGit.commit(commitMsg);
      const log = await repoGit.log(["-1"]);
      const commitSha = log.latest?.hash || "unknown";

      await repoGit.push("origin", site.branch || "main");

      audit.commitSha = commitSha;
      audit.status = "success";
      this.auditLog.push(audit);

      console.log(`[publisher] SUCCESS: ${site.repoOwner}/${site.repoName} commit ${commitSha}`);
      console.log(`[publisher] Files: ${audit.filesWritten.join(", ")}`);

      return {
        success: true,
        commitSha,
        filesWritten: audit.filesWritten,
        message: `Article "${articleSlug}" published to ${site.repoOwner}/${site.repoName}`,
      };
    } catch (error: any) {
      if (audit.status !== "blocked") {
        audit.status = "failed";
        audit.error = error.message;
        this.auditLog.push(audit);
      }
      throw error;
    } finally {
      // ── Cleanup: Always remove temp directory ──
      try {
        await fs.rm(workDir, { recursive: true, force: true });
        console.log(`[publisher] Cleaned up: ${workDir}`);
      } catch {
        console.error(`[publisher] Warning: Failed to cleanup ${workDir}`);
      }
    }
  }

  async deploy(site: DeploySiteInfo): Promise<DeployResult> {
    const { Client } = await import("ssh2");

    return new Promise((resolve, reject) => {
      const conn = new Client();
      let output = "";

      // Sanitize paths: only allow alphanumeric, slashes, hyphens, underscores, dots
      const safePath = (s: string) => /^[a-zA-Z0-9\/_\-\.]+$/.test(s);
      if (!site.vpsPath || !safePath(site.vpsPath)) {
        throw new Error(`Invalid vpsPath: contains forbidden characters`);
      }

      // Only allow predefined deploy commands (whitelist)
      const ALLOWED_DEPLOY_SCRIPTS = [
        "git pull origin main && npm run build",
        "git pull origin main && npm install && npm run build",
        "git pull origin main && yarn && yarn build",
        "git pull && npm run build",
        "./deploy.sh",
        "./deploy.sh ${REPO_NAME}",
        "git pull origin main && npm install --legacy-peer-deps && npm run build && sudo rsync -a --delete out/ /var/www/${REPO_NAME}/ && sudo chown -R www-data:www-data /var/www/${REPO_NAME}",
      ];

      // Extract repo name from vpsPath for deploy script variable substitution
      const repoName = site.vpsPath.split("/").filter(Boolean).pop() || "";

      let deployCmd: string;
      if (site.deployScript) {
        // Replace ${REPO_NAME} placeholder in whitelisted scripts
        const resolvedScript = site.deployScript.replace(/\$\{REPO_NAME\}/g, repoName);
        const resolvedWhitelist = ALLOWED_DEPLOY_SCRIPTS.map(s => s.replace(/\$\{REPO_NAME\}/g, repoName));
        if (!resolvedWhitelist.includes(resolvedScript)) {
          throw new Error(`Deploy script not in whitelist. Allowed: ${ALLOWED_DEPLOY_SCRIPTS.join(", ")}`);
        }
        deployCmd = `cd ${site.vpsPath} && ${resolvedScript}`;
      } else {
        deployCmd = `cd ${site.vpsPath} && git pull origin main && npm run build`;
      }

      // If vpsPath is in another user's home, wrap with sudo -u <owner>
      const pathOwnerMatch = site.vpsPath.match(/^\/home\/([a-zA-Z0-9_-]+)\//);
      if (pathOwnerMatch && pathOwnerMatch[1] !== site.sshUser) {
        deployCmd = `sudo -u ${pathOwnerMatch[1]} bash -c '${deployCmd}'`;
      }

      const timeout = setTimeout(() => {
        conn.end();
        reject(new Error("Deploy timeout after 120s"));
      }, 120_000);

      conn.on("ready", () => {
        console.log(`[publisher] SSH connected to ${site.sshHost}`);
        conn.exec(deployCmd, (err: any, stream: any) => {
          if (err) {
            clearTimeout(timeout);
            conn.end();
            return reject(err);
          }

          stream.on("data", (data: Buffer) => {
            output += data.toString();
          });
          stream.stderr.on("data", (data: Buffer) => {
            output += data.toString();
          });
          stream.on("close", (code: number) => {
            clearTimeout(timeout);
            conn.end();

            if (code === 0) {
              console.log(`[publisher] Deploy success on ${site.sshHost}`);
              resolve({
                success: true,
                output,
                message: `Deployed to ${site.sshHost}:${site.vpsPath}`,
              });
            } else {
              reject(new Error(`Deploy failed with code ${code}: ${output}`));
            }
          });
        });
      });

      conn.on("error", (err: any) => {
        clearTimeout(timeout);
        reject(new Error(`SSH connection failed: ${err.message}`));
      });

      conn.connect({
        host: site.sshHost,
        port: site.sshPort || 22,
        username: site.sshUser,
        privateKey: site.sshPrivateKey,
      });
    });
  }
}
