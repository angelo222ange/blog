/**
 * BlogEngine Scheduler Daemon
 *
 * Runs as part of the API process. Every minute, checks all active schedules
 * and triggers article generation when the current time matches.
 *
 * How it works:
 * 1. Every minute, queries all Schedule records where isActive = true
 * 2. For each, checks if current day + time matches the schedule
 * 3. If yes, and hasn't already run today, triggers article generation
 * 4. Updates lastRunAt, nextRunAt, articlesGeneratedToday
 *
 * The scheduler uses the API's internal HTTP endpoint to generate articles,
 * which keeps all the logic (adapter, image pipeline, DB save, notifications)
 * in one place.
 */
import cron from "node-cron";

let task: cron.ScheduledTask | null = null;
let apiPort = 4000;
let authToken = "";

// Day mapping: JS getDay() returns 0=Sunday, we use 1=Monday...7=Sunday
function jsDayToScheduleDay(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

interface ScheduleRow {
  id: string;
  siteId: string;
  cronExpr: string;
  timezone: string;
  isActive: boolean;
  postTime: string;
  activeDays: string; // JSON array
  evergreenPerDay: number;
  newsPerWeek: number;
  autoApprove: boolean;
  lastRunAt: string | null;
  articlesGeneratedToday: number;
  site: { id: string; name: string; notifyEmail: string | null };
}

async function getAuthToken(): Promise<string> {
  if (authToken) return authToken;

  // Use internal scheduler secret to get a token without exposing credentials
  const schedulerSecret = process.env.SCHEDULER_SECRET;
  if (!schedulerSecret) {
    throw new Error("SCHEDULER_SECRET not set in .env - required for scheduler auth");
  }

  const res = await fetch(`http://localhost:${apiPort}/api/auth/internal-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Scheduler-Secret": schedulerSecret,
    },
  });

  if (!res.ok) {
    throw new Error(`Scheduler auth failed: ${res.status}`);
  }

  const data = await res.json() as { token?: string };
  if (data.token) {
    authToken = data.token;
  }

  return authToken;
}

async function triggerGeneration(siteId: string, siteName: string): Promise<boolean> {
  try {
    const token = await getAuthToken();

    console.log(`[scheduler] Generating article for ${siteName}...`);

    const res = await fetch(`http://localhost:${apiPort}/api/generate/article`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `token=${token}`,
      },
      body: JSON.stringify({ siteId }),
      signal: AbortSignal.timeout(120000), // 2 min timeout for generation
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      console.error(`[scheduler] Generation failed for ${siteName}: ${err.slice(0, 200)}`);
      return false;
    }

    const data = await res.json();
    console.log(`[scheduler] Article generated for ${siteName}: "${(data as any).title || (data as any).slug || "ok"}"`);
    return true;
  } catch (err: any) {
    console.error(`[scheduler] Error generating for ${siteName}: ${err.message}`);
    return false;
  }
}

async function checkSchedules(): Promise<void> {
  try {
    const token = await getAuthToken();

    // Fetch all active schedules with site info
    // We call the sites API to get schedules
    const res = await fetch(`http://localhost:${apiPort}/api/sites`, {
      headers: { Cookie: `token=${token}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return;

    const sites = (await res.json()) as any[];

    const now = new Date();
    // Convert to Europe/Paris timezone
    const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    const currentDay = jsDayToScheduleDay(parisTime.getDay());
    const currentHour = parisTime.getHours();
    const currentMinute = parisTime.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;
    const todayStr = parisTime.toISOString().slice(0, 10);

    for (const site of sites) {
      if (!site.schedules || site.schedules.length === 0) continue;

      const schedule = site.schedules[0];
      if (!schedule.cronExpr) continue;

      // Fetch full schedule data
      const schedRes = await fetch(`http://localhost:${apiPort}/api/sites/${site.id}/schedule`, {
        headers: { Cookie: `token=${token}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!schedRes.ok) continue;

      const schedData = await schedRes.json() as any;
      if (!schedData.isActive) continue;

      const activeDays: number[] = Array.isArray(schedData.activeDays)
        ? schedData.activeDays
        : JSON.parse(schedData.activeDays || "[]");
      const postTime: string = schedData.postTime || "08:00";

      // Check if today is an active day
      if (!activeDays.includes(currentDay)) continue;

      // Check if current time matches (within 1 minute window)
      if (currentTimeStr !== postTime) continue;

      // Check if already ran today
      const lastRun = schedData.lastRunAt ? new Date(schedData.lastRunAt) : null;
      if (lastRun) {
        const lastRunDate = new Date(lastRun.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
        const lastRunDateStr = lastRunDate.toISOString().slice(0, 10);
        if (lastRunDateStr === todayStr) {
          continue; // Already ran today
        }
      }

      // Check daily article limit
      const evergreenPerDay = schedData.evergreenPerDay || 1;
      const generatedToday = schedData.articlesGeneratedToday || 0;
      if (generatedToday >= evergreenPerDay) continue;

      console.log(`[scheduler] Time to generate for ${site.name} (${postTime}, day ${currentDay})`);

      // Trigger generation
      const success = await triggerGeneration(site.id, site.name);

      if (success) {
        // Update schedule tracking via PUT
        const nextDay = findNextActiveDay(activeDays, currentDay);
        const nextRunAt = computeNextRunAt(postTime, nextDay, schedData.timezone || "Europe/Paris");

        await fetch(`http://localhost:${apiPort}/api/sites/${site.id}/schedule`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: `token=${token}`,
          },
          body: JSON.stringify({
            ...schedData,
            lastRunAt: new Date().toISOString(),
            nextRunAt: nextRunAt.toISOString(),
            articlesGeneratedToday: generatedToday + 1,
          }),
          signal: AbortSignal.timeout(5000),
        }).catch(() => {});
      }
    }
  } catch (err: any) {
    console.error(`[scheduler] Check error: ${err.message}`);
  }
}

function findNextActiveDay(activeDays: number[], currentDay: number): number {
  const sorted = [...activeDays].sort((a, b) => a - b);
  const next = sorted.find((d) => d > currentDay);
  return next ?? sorted[0] ?? currentDay;
}

function computeNextRunAt(postTime: string, nextDay: number, timezone: string): Date {
  const [hours, minutes] = postTime.split(":").map(Number);
  const now = new Date();
  const currentDay = jsDayToScheduleDay(now.getDay());

  let daysAhead = nextDay - currentDay;
  if (daysAhead <= 0) daysAhead += 7;

  const next = new Date(now);
  next.setDate(next.getDate() + daysAhead);
  next.setHours(hours!, minutes!, 0, 0);

  return next;
}

/**
 * Reset daily generation counters at midnight.
 */
async function resetDailyCounters(): Promise<void> {
  try {
    const token = await getAuthToken();
    const res = await fetch(`http://localhost:${apiPort}/api/sites`, {
      headers: { Cookie: `token=${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return;

    const sites = (await res.json()) as any[];
    let resetCount = 0;

    for (const site of sites) {
      if (!site.schedules || site.schedules.length === 0) continue;

      const schedRes = await fetch(`http://localhost:${apiPort}/api/sites/${site.id}/schedule`, {
        headers: { Cookie: `token=${token}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!schedRes.ok) continue;

      const schedData = await schedRes.json() as any;
      if (schedData.articlesGeneratedToday > 0) {
        await fetch(`http://localhost:${apiPort}/api/sites/${site.id}/schedule`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: `token=${token}`,
          },
          body: JSON.stringify({
            ...schedData,
            articlesGeneratedToday: 0,
          }),
          signal: AbortSignal.timeout(5000),
        }).catch(() => {});
        resetCount++;
      }
    }

    if (resetCount > 0) {
      console.log(`[scheduler] Daily reset: ${resetCount} counter(s) reset`);
    }
  } catch (err: any) {
    console.error(`[scheduler] Reset error: ${err.message}`);
  }
}

/**
 * Start the scheduler. Runs every minute to check active schedules.
 */
export function startScheduler(port: number = 4000): void {
  apiPort = port;

  if (task) {
    console.log("[scheduler] Already running");
    return;
  }

  // Reset auth token periodically (tokens expire after 24h)
  setInterval(() => { authToken = ""; }, 12 * 60 * 60 * 1000);

  // Run every minute
  task = cron.schedule("* * * * *", () => {
    checkSchedules().catch((err) => {
      console.error(`[scheduler] Unhandled error: ${err.message}`);
    });
  });

  // Reset daily counters at midnight Paris time (0:00)
  cron.schedule("0 0 * * *", () => {
    resetDailyCounters().catch((err) => {
      console.error(`[scheduler] Reset error: ${err.message}`);
    });
  }, { timezone: "Europe/Paris" });

  console.log("[scheduler] Started - checking schedules every minute");
}

/**
 * Stop the scheduler gracefully.
 */
export function stopScheduler(): void {
  if (task) {
    task.stop();
    task = null;
    console.log("[scheduler] Stopped");
  }
}
