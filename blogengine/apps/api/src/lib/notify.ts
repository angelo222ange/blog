/**
 * Email notifications via Resend API.
 * Zero dependency - uses native fetch().
 * Set RESEND_API_KEY in .env to activate.
 */

interface NotifyOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

function emailLayout(title: string, content: string, ctaText?: string, ctaUrl?: string): string {
  const cta = ctaText && ctaUrl
    ? `<tr><td style="padding:24px 0 0">
        <a href="${ctaUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;font-family:'Quicksand',Arial,sans-serif;font-size:14px;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;">
          ${ctaText}
        </a>
       </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap');</style>
</head><body style="margin:0;padding:0;background:#f1f5f9;font-family:'Quicksand',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#1e40af,#2563eb,#3b82f6);padding:28px 32px;text-align:center;">
    <div style="font-size:22px;font-weight:700;color:#ffffff;font-family:'Quicksand',Arial,sans-serif;letter-spacing:0.02em;">BlogEngine</div>
  </td></tr>
  <!-- Title -->
  <tr><td style="padding:28px 32px 0;">
    <h1 style="margin:0;font-size:20px;font-weight:700;color:#0f172a;font-family:'Quicksand',Arial,sans-serif;">${title}</h1>
  </td></tr>
  <!-- Content -->
  <tr><td style="padding:16px 32px 0;font-size:14px;line-height:1.7;color:#475569;font-family:'Quicksand',Arial,sans-serif;">
    ${content}
  </td></tr>
  <!-- CTA -->
  ${cta}
  <!-- Footer -->
  <tr><td style="padding:28px 32px;border-top:1px solid #e2e8f0;margin-top:24px;">
    <p style="margin:0;font-size:12px;color:#94a3b8;font-family:'Quicksand',Arial,sans-serif;text-align:center;">
      BlogEngine &middot; Notifications automatiques
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:#94a3b8;font-family:'Quicksand',Arial,sans-serif;width:100px;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;font-size:14px;color:#1e293b;font-family:'Quicksand',Arial,sans-serif;font-weight:600;">${value}</td>
  </tr>`;
}

function infoTable(rows: [string, string][]): string {
  return `<table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;background:#f8fafc;border-radius:10px;padding:16px;">
    ${rows.map(([l, v]) => infoRow(l, v)).join("")}
  </table>`;
}

async function sendViaResend(opts: NotifyOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const fromEmail = process.env.RESEND_FROM || "BlogEngine <onboarding@resend.dev>";

  const payload: any = {
    from: fromEmail,
    to: [opts.to],
    subject: opts.subject,
    text: opts.body,
  };
  if (opts.html) {
    payload.html = opts.html;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    throw new Error(`Resend API error ${res.status}: ${err}`);
  }

  return true;
}

export async function sendErrorNotification(opts: NotifyOptions): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[notify] RESEND_API_KEY non configure. Email non envoye.`);
    console.log(`[notify] Subject: ${opts.subject}`);
    return;
  }

  try {
    await sendViaResend(opts);
    console.log(`[notify] Email envoye a ${opts.to}: ${opts.subject}`);
  } catch (err: any) {
    console.error(`[notify] Echec envoi email: ${err.message}`);
  }
}

export async function sendSuccessNotification(opts: NotifyOptions): Promise<void> {
  return sendErrorNotification(opts);
}

export function formatPublishError(
  siteName: string,
  articleSlug: string,
  error: string,
  blockedFiles: string[]
): { subject: string; body: string; html: string } {
  const content = `
    <p>La publication a echoue pour <strong>${siteName}</strong>.</p>
    ${infoTable([
      ["Article", articleSlug],
      ["Erreur", error],
      ...(blockedFiles.length > 0 ? [["Bloques", blockedFiles.join(", ")] as [string, string]] : []),
      ["Date", new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })],
    ])}
  `;

  return {
    subject: `[BlogEngine] Erreur publication - ${siteName}`,
    body: `Publication echouee pour "${siteName}"\nArticle: ${articleSlug}\nErreur: ${error}\n-- BlogEngine`,
    html: emailLayout("Publication echouee", content),
  };
}

export function formatGenerateSuccess(
  siteName: string,
  articleTitle: string,
  articleSlug: string,
  wordCount: number
): { subject: string; body: string; html: string } {
  const content = `
    <p>Un nouvel article a ete genere et attend votre validation.</p>
    ${infoTable([
      ["Site", siteName],
      ["Titre", articleTitle],
      ["Slug", articleSlug],
      ["Mots", `~${wordCount}`],
      ["Statut", "En revue"],
      ["Date", new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })],
    ])}
  `;

  return {
    subject: `[BlogEngine] Nouvel article - ${siteName}`,
    body: `Nouvel article genere pour "${siteName}"\nTitre: ${articleTitle}\nSlug: ${articleSlug}\n-- BlogEngine`,
    html: emailLayout(
      "Nouvel article a valider",
      content,
      "Voir dans le dashboard",
      process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/articles` : "http://localhost:3001/articles"
    ),
  };
}

export function formatPublishSuccess(
  siteName: string,
  articleTitle: string,
  commitSha: string
): { subject: string; body: string; html: string } {
  const content = `
    <p>L'article a ete publie avec succes sur <strong>${siteName}</strong>.</p>
    ${infoTable([
      ["Titre", articleTitle],
      ["Commit", commitSha.slice(0, 12)],
      ["Date", new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })],
    ])}
  `;

  return {
    subject: `[BlogEngine] Article publie - ${siteName}`,
    body: `Article publie sur "${siteName}"\nTitre: ${articleTitle}\nCommit: ${commitSha}\n-- BlogEngine`,
    html: emailLayout("Article publie", content),
  };
}

export function formatDeploySuccess(
  siteName: string
): { subject: string; body: string; html: string } {
  const content = `
    <p>Le site <strong>${siteName}</strong> a ete deploye avec succes sur le VPS.</p>
    ${infoTable([
      ["Site", siteName],
      ["Date", new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })],
    ])}
  `;

  return {
    subject: `[BlogEngine] Site deploye - ${siteName}`,
    body: `Le site "${siteName}" a ete deploye avec succes.\n-- BlogEngine`,
    html: emailLayout("Deploiement reussi", content),
  };
}
