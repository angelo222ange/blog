/**
 * Propagate SSH config to all sites in the database.
 * Run ON THE VPS: node scripts/propagate-ssh.js
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Load .env
const envPath = path.join(__dirname, "..", ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const ENCRYPTION_KEY_HEX = env.SOCIAL_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY_HEX || ENCRYPTION_KEY_HEX.length !== 64) {
  console.error("SOCIAL_ENCRYPTION_KEY not found or invalid in .env (need 64-char hex)");
  process.exit(1);
}

// AES-256-GCM encryption (matches packages/social/src/encryption.ts)
function encrypt(plaintext) {
  const key = Buffer.from(ENCRYPTION_KEY_HEX, "hex");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plaintext, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

// Find SSH key
const sshDir = path.join(require("os").homedir(), ".ssh");
const keyFiles = fs.readdirSync(sshDir).filter(f =>
  !f.endsWith(".pub") && f !== "authorized_keys" && f !== "known_hosts" && f !== "known_hosts.old"
);

if (keyFiles.length === 0) {
  console.error("No SSH private key found in ~/.ssh/");
  process.exit(1);
}

const keyFile = keyFiles[0];
const keyPath = path.join(sshDir, keyFile);
const privateKey = fs.readFileSync(keyPath, "utf-8");

console.log("Using SSH key: ~/.ssh/" + keyFile);

// Encrypt the key
const encryptedKey = encrypt(privateKey);

// VPS config
const SSH_HOST = "176.31.163.195";
const SSH_USER = "ubuntu";
const SSH_PORT = 22;
const DEPLOY_SCRIPT = "git pull origin main && npm install --legacy-peer-deps && npm run build && sudo rsync -a --delete out/ /var/www/${REPO_NAME}/ && sudo chown -R www-data:www-data /var/www/${REPO_NAME}";

// Update all sites
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const sites = await prisma.site.findMany({ select: { id: true, name: true, repoName: true } });

  console.log("\nUpdating " + sites.length + " sites...\n");

  for (const site of sites) {
    const vpsPath = "/home/deploy/repos/" + site.repoName;

    await prisma.site.update({
      where: { id: site.id },
      data: {
        sshHost: SSH_HOST,
        sshUser: SSH_USER,
        sshPort: SSH_PORT,
        sshPrivateKey: encryptedKey,
        vpsPath,
        deployScript: DEPLOY_SCRIPT,
      },
    });

    console.log("  " + site.name + " -> " + vpsPath);
  }

  console.log("\nDone! All sites now have SSH config.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
