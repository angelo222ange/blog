/**
 * Set notifyEmail for all sites in the database.
 * Usage: node scripts/set-notify-email.js <email>
 * Example: node scripts/set-notify-email.js angelo.ameurcam07@gmail.com
 */
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/set-notify-email.js <email>");
  process.exit(1);
}

p.site.updateMany({ data: { notifyEmail: email } })
  .then(r => console.log(r.count + " sites mis a jour avec " + email))
  .finally(() => p.$disconnect());
