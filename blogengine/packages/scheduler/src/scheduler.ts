/**
 * BlogEngine Scheduler Daemon
 *
 * Runs as part of the API process. Every minute, checks all active schedules
 * and triggers article generation when the current time matches.
 *
 * Supports multiple post times per day via comma-separated postTime (e.g. "10:00,17:00").
 * Each time slot fires independently; evergreenPerDay controls the total daily cap.
 *
 * The scheduler uses the API's internal HTTP endpoint to generate articles,
 * which keeps all the logic (adapter, image pipeline, DB save, notifications)
 * in one place.
 */
import cron from "node-cron";

let task: cron.ScheduledTask | null = null;
let apiPort = 4000;
let authToken = "";

/**
 * Send an error notification email via the API's internal notify endpoint.
 * Used when the API route itself wasn't reached (network/timeout errors)
 * or when the route doesn't handle notifications (e.g. social generation).
 */
async function sendErrorNotification(
  siteId: string,
  pipeline: "generate" | "publish" | "deploy" | "social",
  error: string
): Promise<void> {
  try {
    const schedulerSecret = process.env.SCHEDULER_SECRET;
    if (!schedulerSecret) return;

    await fetch(`http://localhost:${apiPort}/api/notify/error`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Scheduler-Secret": schedulerSecret,
      },
      body: JSON.stringify({ siteId, pipeline, error }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (notifyErr: any) {
    console.error(`[scheduler] Failed to send error notification: ${notifyErr.message}`);
  }
}

// Day mapping: JS getDay() returns 0=Sunday, we use 1=Monday...7=Sunday
function jsDayToScheduleDay(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * Parse postTime which can be a single time "10:00" or comma-separated "10:00,17:00".
 * Returns sorted array of HH:MM strings.
 */
function parsePostTimes(postTime: string): string[] {
  return postTime
    .split(",")
    .map((t) => t.trim())
    .filter((t) => /^\d{2}:\d{2}$/.test(t))
    .sort();
}

async function getAuthToken(): Promise<string> {
  if (authToken) return authToken;

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
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    throw new Error(`Scheduler auth failed: ${res.status}`);
  }

  const data = (await res.json()) as { token?: string };
  if (data.token) {
    authToken = data.token;
  }

  return authToken;
}

async function triggerGeneration(siteId: string, siteName: string, imageSource?: string): Promise<string | null> {
  try {
    const token = await getAuthToken();

    console.log(`[scheduler] Generating article for ${siteName} (image: ${imageSource || "ai"})...`);

    const body: any = { siteId };
    if (imageSource) body.imageSource = imageSource;

    const res = await fetch(`http://localhost:${apiPort}/api/generate/article`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `token=${token}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      console.error(`[scheduler] Generation failed for ${siteName}: ${err.slice(0, 200)}`);
      // The API generate route now sends error emails itself on 500,
      // but for other status codes (400, 404), notify from here
      if (res.status !== 500) {
        await sendErrorNotification(siteId, "generate", `HTTP ${res.status}: ${err.slice(0, 200)}`);
      }
      return null;
    }

    const data = (await res.json()) as any;
    console.log(`[scheduler] Article generated for ${siteName}: "${data.title || data.slug || "ok"}"`);
    return data.id || null;
  } catch (err: any) {
    console.error(`[scheduler] Error generating for ${siteName}: ${err.message}`);
    // Network/timeout errors — API was never reached, so notify from scheduler
    await sendErrorNotification(siteId, "generate", err.message);
    return null;
  }
}

async function triggerPublishPipeline(siteId: string, articleId: string): Promise<boolean> {
  try {
    const token = await getAuthToken();

    console.log(`[scheduler] Publishing article ${articleId}...`);
    const pubRes = await fetch(`http://localhost:${apiPort}/api/publish/${articleId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `token=${token}` },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(60000),
    });

    if (!pubRes.ok) {
      const err = await pubRes.text().catch(() => "unknown");
      console.error(`[scheduler] Publish failed: ${err.slice(0, 200)}`);
      // The publish route already sends error emails on 500,
      // but notify for other status codes
      if (pubRes.status !== 500) {
        await sendErrorNotification(siteId, "publish", `Publish HTTP ${pubRes.status}: ${err.slice(0, 200)}`);
      }
      return false;
    }

    console.log(`[scheduler] Deploying site ${siteId}...`);
    const deployRes = await fetch(`http://localhost:${apiPort}/api/publish/deploy/${siteId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `token=${token}` },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(120000),
    });

    if (!deployRes.ok) {
      const err = await deployRes.text().catch(() => "unknown");
      console.error(`[scheduler] Deploy failed: ${err.slice(0, 200)}`);
      // The deploy route already sends error emails on 500
      if (deployRes.status !== 500) {
        await sendErrorNotification(siteId, "deploy", `Deploy HTTP ${deployRes.status}: ${err.slice(0, 200)}`);
      }
      return false;
    }

    console.log(`[scheduler] Publish + deploy complete for article ${articleId}`);
    return true;
  } catch (err: any) {
    console.error(`[scheduler] Publish pipeline error: ${err.message}`);
    // Network/timeout errors — API never reached
    await sendErrorNotification(siteId, "publish", err.message);
    return false;
  }
}

async function triggerSocialPipeline(siteId: string, articleId: string): Promise<void> {
  try {
    const token = await getAuthToken();

    console.log(`[scheduler] Generating social posts for article ${articleId}...`);
    const res = await fetch(`http://localhost:${apiPort}/api/social-posts/generate/${articleId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `token=${token}` },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      console.error(`[scheduler] Social generation failed: ${err.slice(0, 200)}`);
      await sendErrorNotification(siteId, "social", `Social generation HTTP ${res.status}: ${err.slice(0, 200)}`);
      return;
    }

    console.log(`[scheduler] Social posts generated for article ${articleId}`);
  } catch (err: any) {
    console.error(`[scheduler] Social pipeline error: ${err.message}`);
    await sendErrorNotification(siteId, "social", err.message);
  }
}

async function checkSchedules(): Promise<void> {
  try {
    const token = await getAuthToken();

    const res = await fetch(`http://localhost:${apiPort}/api/sites`, {
      headers: { Cookie: `token=${token}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`[scheduler] Failed to fetch sites: ${res.status}`);
      return;
    }

    const sites = (await res.json()) as any[];

    const now = new Date();
    const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    const currentDay = jsDayToScheduleDay(parisTime.getDay());
    const currentHour = parisTime.getHours();
    const currentMinute = parisTime.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;

    // Log every 10 minutes to confirm scheduler is alive
    if (currentMinute % 10 === 0) {
      console.log(`[scheduler] Heartbeat: Paris time ${currentTimeStr}, day ${currentDay} (1=Mon..7=Sun), ${sites.length} site(s)`);
    }

    for (const site of sites) {
      if (!site.schedules || site.schedules.length === 0) {
        if (currentMinute % 10 === 0) console.log(`[scheduler] ${site.name}: no schedule configured`);
        continue;
      }

      const schedule = site.schedules[0];
      if (!schedule.cronExpr) {
        if (currentMinute % 10 === 0) console.log(`[scheduler] ${site.name}: no cronExpr`);
        continue;
      }

      // Fetch full schedule data
      const schedRes = await fetch(`http://localhost:${apiPort}/api/sites/${site.id}/schedule`, {
        headers: { Cookie: `token=${token}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!schedRes.ok) {
        console.error(`[scheduler] ${site.name}: failed to fetch schedule: ${schedRes.status}`);
        continue;
      }

      const schedData = (await schedRes.json()) as any;
      if (!schedData.isActive) {
        if (currentMinute % 10 === 0) console.log(`[scheduler] ${site.name}: schedule inactive`);
        continue;
      }

      const activeDays: number[] = Array.isArray(schedData.activeDays)
        ? schedData.activeDays
        : JSON.parse(schedData.activeDays || "[]");
      const dayTimes: Record<string, string> = schedData.dayTimes && typeof schedData.dayTimes === "object"
        ? schedData.dayTimes
        : {};
      const postTime: string = schedData.postTime || "08:00";

      // Multi-time support: postTime can be "10:00,17:00"
      // dayTimes override can also be comma-separated per day
      const rawTodayTime: string = dayTimes[String(currentDay)] || postTime;
      const todayTimes: string[] = parsePostTimes(rawTodayTime);

      // Log schedule state every 10 minutes
      if (currentMinute % 10 === 0) {
        console.log(`[scheduler] ${site.name}: activeDays=${JSON.stringify(activeDays)}, currentDay=${currentDay}, times=${JSON.stringify(todayTimes)}, currentTime=${currentTimeStr}, autoApprove=${schedData.autoApprove}, generatedToday=${schedData.articlesGeneratedToday}/${schedData.evergreenPerDay}`);
      }

      // Check if today is an active day
      if (!activeDays.includes(currentDay)) {
        if (currentMinute % 10 === 0) console.log(`[scheduler] ${site.name}: SKIP - day ${currentDay} not in activeDays ${JSON.stringify(activeDays)}`);
        continue;
      }

      // Check if current time matches any of the configured times
      const slotIndex = todayTimes.indexOf(currentTimeStr);
      if (slotIndex === -1) continue;

      // Time matches! Log it
      console.log(`[scheduler] ${site.name}: TIME MATCH ${currentTimeStr} in ${JSON.stringify(todayTimes)} (slot ${slotIndex + 1}), checking remaining conditions...`);

      // Check daily article limit (replaces the old "already ran today" check)
      const evergreenPerDay = schedData.evergreenPerDay || 1;
      const generatedToday = schedData.articlesGeneratedToday || 0;
      if (generatedToday >= evergreenPerDay) {
        console.log(`[scheduler] ${site.name}: SKIP - daily limit reached (${generatedToday}/${evergreenPerDay})`);
        continue;
      }

      // Prevent double-trigger: check if lastRunAt is within the last 2 minutes
      const lastRun = schedData.lastRunAt ? new Date(schedData.lastRunAt) : null;
      if (lastRun && now.getTime() - lastRun.getTime() < 120000) {
        console.log(`[scheduler] ${site.name}: SKIP - already ran ${Math.round((now.getTime() - lastRun.getTime()) / 1000)}s ago`);
        continue;
      }

      // Determine image source for this slot from dayTimes.__modes
      let slotImageSource: string = "ai";
      try {
        const modesStr = dayTimes.__modes;
        if (modesStr) {
          const modes = JSON.parse(modesStr);
          if (Array.isArray(modes) && modes[slotIndex]) {
            slotImageSource = modes[slotIndex] === "stock" ? "auto" : "ai";
          }
        }
      } catch {}

      console.log(`[scheduler] TRIGGERING generation for ${site.name} (time=${currentTimeStr}, day=${currentDay}, image=${slotImageSource}, autoApprove=${schedData.autoApprove}, slot ${generatedToday + 1}/${evergreenPerDay})`);

      // Trigger generation
      const articleId = await triggerGeneration(site.id, site.name, slotImageSource);

      if (articleId) {
        // If autoApprove is on, trigger publish + deploy + social
        if (schedData.autoApprove) {
          await triggerPublishPipeline(site.id, articleId);
          await triggerSocialPipeline(site.id, articleId);
        }

        // Update schedule tracking
        const newGeneratedToday = generatedToday + 1;
        const nextDay = findNextActiveDay(activeDays, currentDay);
        const nextDayPostTime = dayTimes[String(nextDay)] || postTime;
        const firstTimeNextDay = parsePostTimes(nextDayPostTime)[0] || postTime.split(",")[0] || "08:00";
        const nextRunAt = computeNextRunAt(firstTimeNextDay, nextDay);

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
            articlesGeneratedToday: newGeneratedToday,
          }),
          signal: AbortSignal.timeout(5000),
        }).catch((err: any) => {
          console.error(`[scheduler] Failed to update schedule: ${err.message}`);
        });
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

function computeNextRunAt(postTime: string, nextDay: number): Date {
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
    console.log("[scheduler] Running daily counter reset...");
    const token = await getAuthToken();
    const res = await fetch(`http://localhost:${apiPort}/api/sites`, {
      headers: { Cookie: `token=${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error(`[scheduler] Daily reset: failed to fetch sites: ${res.status}`);
      return;
    }

    const sites = (await res.json()) as any[];
    let resetCount = 0;

    for (const site of sites) {
      if (!site.schedules || site.schedules.length === 0) continue;

      const schedRes = await fetch(`http://localhost:${apiPort}/api/sites/${site.id}/schedule`, {
        headers: { Cookie: `token=${token}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!schedRes.ok) continue;

      const schedData = (await schedRes.json()) as any;
      if (schedData.articlesGeneratedToday > 0) {
        const putRes = await fetch(`http://localhost:${apiPort}/api/sites/${site.id}/schedule`, {
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
        });
        if (putRes.ok) {
          resetCount++;
        } else {
          console.error(`[scheduler] Daily reset failed for ${site.name}: ${putRes.status}`);
        }
      }
    }

    console.log(`[scheduler] Daily reset complete: ${resetCount} counter(s) reset`);
  } catch (err: any) {
    console.error(`[scheduler] Reset error: ${err.message}`);
  }
}

/**
 * Crawl niche trends for all active sites via the API endpoint.
 */
async function crawlTrendsForAllSites(): Promise<void> {
  try {
    const token = await getAuthToken();
    const res = await fetch(`http://localhost:${apiPort}/api/sites`, {
      headers: { Cookie: `token=${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return;

    const sites = (await res.json()) as any[];
    let crawled = 0;

    for (const site of sites) {
      if (!site.isActive) continue;
      try {
        console.log(`[scheduler] Crawling trends for ${site.name}...`);
        const crawlRes = await fetch(
          `http://localhost:${apiPort}/api/social-posts/crawl-trends/${site.id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Cookie: `token=${token}` },
            body: JSON.stringify({}),
            signal: AbortSignal.timeout(60000),
          },
        );
        if (crawlRes.ok) {
          const result = (await crawlRes.json()) as any;
          if (!result.skipped) crawled++;
          console.log(
            `[scheduler] Trends for ${site.name}: ${result.trendsFound} found${result.skipped ? " (skipped)" : ""}`,
          );
        }
      } catch (err: any) {
        console.error(`[scheduler] Trend crawl failed for ${site.name}: ${err.message}`);
      }
    }

    if (crawled > 0) {
      console.log(`[scheduler] Trend crawl complete: ${crawled} site(s) crawled`);
    }
  } catch (err: any) {
    console.error(`[scheduler] Trend crawl error: ${err.message}`);
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
  setInterval(() => {
    authToken = "";
  }, 12 * 60 * 60 * 1000);

  // Run every minute
  task = cron.schedule("* * * * *", () => {
    checkSchedules().catch((err) => {
      console.error(`[scheduler] Unhandled error: ${err.message}`);
    });
  });

  // Reset daily counters at midnight Paris time (0:00)
  cron.schedule(
    "0 0 * * *",
    () => {
      resetDailyCounters().catch((err) => {
        console.error(`[scheduler] Reset error: ${err.message}`);
      });
    },
    { timezone: "Europe/Paris" },
  );

  // Crawl niche trends daily at 6:00 Paris time
  cron.schedule(
    "0 6 * * *",
    () => {
      crawlTrendsForAllSites().catch((err) => {
        console.error(`[scheduler] Trend crawl error: ${err.message}`);
      });
    },
    { timezone: "Europe/Paris" },
  );

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
