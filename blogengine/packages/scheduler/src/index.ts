/**
 * BlogEngine Scheduler
 *
 * Lightweight cron-based scheduler that runs inside the API process.
 * Checks active schedules every minute and triggers article generation
 * when it's time.
 *
 * No Redis, no BullMQ — just node-cron + Prisma.
 */
export { startScheduler, stopScheduler } from "./scheduler.js";
export { SCHEDULER_VERSION } from "./version.js";
