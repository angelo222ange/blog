/**
 * Propagate SSH config to all sites in the database.
 * Run ON THE VPS: node scripts/propagate-ssh.js
 *
 * Reads the SSH private key from ~/.ssh/, encrypts it,
 * and updates all sites with SSH/VPS deploy config.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Load .env
const envPath = path.join(__dirname, "..", ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const ENCRYPTION_KEY = env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  console.error("ENCRYPTION_KEY not found in .env");
  process.exit(1);
}

// Encryption (same as packages/social/src/encryption.ts)
function encrypt(text) {
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  return `${iv.toString("base64")}:${encrypted}`;
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

console.log(`Using SSH key: ~/.ssh/${keyFile}`);
console.log(`Key starts with: ${privateKey.substring(0, 30)}...`);

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

  console.log(`\nUpdating ${sites.length} sites...\n`);

  for (const site of sites) {
    const vpsPath = `/home/deploy/repos/${site.repoName}`;

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

    console.log(`  ${site.name} -> ${vpsPath}`);
  }

  console.log("\nDone! All sites now have SSH config.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
