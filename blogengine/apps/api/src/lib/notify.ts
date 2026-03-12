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

const APP_URL = process.env.FRONTEND_URL || "https://app.zuply.fr";
const API_URL = process.env.API_URL || "https://app.zuply.fr:4000";
const LOGO_URL = `${API_URL}/uploads/zuply-logo.png`;

function emailLayout(title: string, content: string, ctaText?: string, ctaUrl?: string): string {
  const cta = ctaText && ctaUrl
    ? `<tr><td align="center" style="padding:28px 32px 0;">
        <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#ffffff;font-family:'Quicksand',Arial,sans-serif;font-size:14px;font-weight:700;padding:14px 36px;border-radius:10px;text-decoration:none;box-shadow:0 2px 8px rgba(37,99,235,0.3);">
          ${ctaText}
        </a>
       </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap');</style>
</head><body style="margin:0;padding:0;background:#f0f4f8;font-family:'Quicksand',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#1e40af 0%,#2563eb 50%,#3b82f6 100%);padding:32px 32px 28px;text-align:center;">
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td style="vertical-align:middle;padding-right:12px;">
          <img src="${LOGO_URL}" alt="Zuply" width="36" height="36" style="display:block;border-radius:8px;" />
        </td>
        <td style="vertical-align:middle;">
          <span style="font-size:26px;font-weight:700;color:#ffffff;font-family:'Quicksand',Arial,sans-serif;letter-spacing:0.03em;">zuply</span>
        </td>
      </tr>
    </table>
  </td></tr>
  <!-- Title bar -->
  <tr><td style="padding:24px 32px 0;">
    <table cellpadding="0" cellspacing="0" style="width:100%;">
      <tr>
        <td style="width:4px;background:linear-gradient(180deg,#2563eb,#3b82f6);border-radius:2px;"></td>
        <td style="padding:0 0 0 16px;">
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#0f172a;font-family:'Quicksand',Arial,sans-serif;">${title}</h1>
        </td>
      </tr>
    </table>
  </td></tr>
  <!-- Content -->
  <tr><td style="padding:20px 32px 0;font-size:14px;line-height:1.8;color:#475569;font-family:'Quicksand',Arial,sans-serif;">
    ${content}
  </td></tr>
  <!-- CTA -->
  ${cta}
  <!-- Divider -->
  <tr><td style="padding:28px 32px 0;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#e2e8f0,transparent);"></div>
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:20px 32px 28px;text-align:center;">
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td style="vertical-align:middle;padding-right:8px;">
          <img src="${LOGO_URL}" alt="Zuply" width="16" height="16" style="display:block;border-radius:3px;opacity:0.5;" />
        </td>
        <td style="vertical-align:middle;">
          <span style="font-size:12px;color:#94a3b8;font-family:'Quicksand',Arial,sans-serif;">Zuply &middot; Notifications automatiques</span>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function statusPill(text: string, color: string, bgColor: string): string {
  return `<span style="display:inline-block;font-size:12px;font-weight:700;color:${color};background:${bgColor};padding:4px 12px;border-radius:20px;font-family:'Quicksand',Arial,sans-serif;">${text}</span>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;font-size:12px;color:#94a3b8;font-family:'Quicksand',Arial,sans-serif;width:110px;vertical-align:top;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">${label}</td>
    <td style="padding:8px 12px;font-size:14px;color:#1e293b;font-family:'Quicksand',Arial,sans-serif;font-weight:600;">${value}</td>
  </tr>`;
}

function infoTable(rows: [string, string][]): string {
  return `<table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
    ${rows.map(([l, v]) => infoRow(l, v)).join("")}
  </table>`;
}

async function sendViaResend(opts: NotifyOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const fromEmail = process.env.RESEND_FROM || "Zuply <onboarding@resend.dev>";

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
      ["Erreur", `<span style="color:#dc2626;">${error}</span>`],
      ...(blockedFiles.length > 0 ? [["Bloques", blockedFiles.join(", ")] as [string, string]] : []),
      ["Statut", statusPill("Echec", "#dc2626", "#fef2f2")],
      ["Date", new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })],
    ])}
  `;

  return {
    subject: `[Zuply] Erreur publication - ${siteName}`,
    body: `Publication echouee pour "${siteName}"\nArticle: ${articleSlug}\nErreur: ${error}\n-- Zuply`,
    html: emailLayout("Publication echouee", content),
  };
}

export function formatDeployError(
  siteName: string,
  error: string
): { subject: string; body: string; html: string } {
  const content = `
    <p>Le deploiement a echoue pour <strong>${siteName}</strong>.</p>
    ${infoTable([
      ["Site", siteName],
      ["Erreur", `<span style="color:#dc2626;">${error}</span>`],
      ["Statut", statusPill("Echec", "#dc2626", "#fef2f2")],
      ["Date", new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })],
    ])}
    <p style="margin-top:12px;font-size:13px;color:#64748b;">Verifiez la configuration SSH et le chemin VPS dans les parametres du site.</p>
  `;

  return {
    subject: `[Zuply] Erreur deploiement - ${siteName}`,
    body: `Deploiement echoue pour "${siteName}"\nErreur: ${error}\n-- Zuply`,
    html: emailLayout("Deploiement echoue", content),
  };
}

export function formatGenerateSuccess(
  siteName: string,
  articleTitle: string,
  articleSlug: string,
  wordCount: number,
  articleId?: string
): { subject: string; body: string; html: string } {
  const articleUrl = articleId ? `${APP_URL}/articles/${articleId}` : `${APP_URL}`;
  const content = `
    <p>Un nouvel article a ete genere et attend votre validation.</p>
    ${infoTable([
      ["Site", siteName],
      ["Titre", articleTitle],
      ["Slug", `<code style="font-size:13px;background:#f1f5f9;padding:2px 8px;border-radius:4px;">${articleSlug}</code>`],
      ["Mots", `~${wordCount}`],
      ["Statut", statusPill("En revue", "#2563eb", "#eff6ff")],
      ["Date", new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })],
    ])}
  `;

  return {
    subject: `[Zuply] Nouvel article - ${siteName}`,
    body: `Nouvel article genere pour "${siteName}"\nTitre: ${articleTitle}\nSlug: ${articleSlug}\n-- Zuply`,
    html: emailLayout(
      "Nouvel article genere",
      content,
      "Voir l'article",
      articleUrl
    ),
  };
}

export function formatPublishSuccess(
  siteName: string,
  articleTitle: string,
  commitSha: string,
  siteDomain?: string,
  articleSlug?: string
): { subject: string; body: string; html: string } {
  const articleUrl = siteDomain && articleSlug ? `https://${siteDomain}/blog/${articleSlug}` : undefined;
  const siteUrl = siteDomain ? `https://${siteDomain}` : undefined;
  const content = `
    <p>L'article a ete publie avec succes sur <strong>${siteName}</strong>.</p>
    ${infoTable([
      ["Titre", articleTitle],
      ...(articleUrl ? [["Lien", `<a href="${articleUrl}" style="color:#2563eb;text-decoration:none;font-weight:600;">${articleUrl}</a>`] as [string, string]] : []),
      ["Commit", `<code style="font-size:13px;background:#f1f5f9;padding:2px 8px;border-radius:4px;">${commitSha.slice(0, 12)}</code>`],
      ["Statut", statusPill("Publie", "#16a34a", "#f0fdf4")],
      ["Date", new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })],
    ])}
  `;

  return {
    subject: `[Zuply] Article publie - ${siteName}`,
    body: `Article publie sur "${siteName}"\nTitre: ${articleTitle}\n${articleUrl ? `Lien: ${articleUrl}\n` : ""}Commit: ${commitSha}\n-- Zuply`,
    html: emailLayout(
      "Article publie",
      content,
      articleUrl ? "Voir l'article sur le blog" : (siteUrl ? "Voir le site" : undefined),
      articleUrl || siteUrl
    ),
  };
}

export function formatDeploySuccess(
  siteName: string,
  siteDomain?: string
): { subject: string; body: string; html: string } {
  const siteUrl = siteDomain ? `https://${siteDomain}` : undefined;
  const content = `
    <p>Le site <strong>${siteName}</strong> a ete deploye avec succes sur le VPS.</p>
    ${infoTable([
      ["Site", siteName],
      ["Statut", statusPill("En ligne", "#16a34a", "#f0fdf4")],
      ["Date", new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })],
    ])}
  `;

  return {
    subject: `[Zuply] Site deploye - ${siteName}`,
    body: `Le site "${siteName}" a ete deploye avec succes.\n-- Zuply`,
    html: emailLayout(
      "Deploiement reussi",
      content,
      siteUrl ? "Voir le site" : undefined,
      siteUrl
    ),
  };
}

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
  facebook: "Facebook",
  instagram: "Instagram",
  pinterest: "Pinterest",
};

export function formatSocialPublishSuccess(
  siteName: string,
  platform: string,
  platformUrl?: string,
  articleTitle?: string
): { subject: string; body: string; html: string } {
  const platformLabel = PLATFORM_LABELS[platform] || platform;
  const content = `
    <p>Un post a ete publie avec succes sur <strong>${platformLabel}</strong> pour <strong>${siteName}</strong>.</p>
    ${infoTable([
      ["Plateforme", statusPill(platformLabel, "#2563eb", "#eff6ff")],
      ...(articleTitle ? [["Article", articleTitle] as [string, string]] : []),
      ...(platformUrl ? [["Lien", `<a href="${platformUrl}" style="color:#2563eb;text-decoration:none;font-weight:600;">${platformUrl}</a>`] as [string, string]] : []),
      ["Statut", statusPill("Publie", "#16a34a", "#f0fdf4")],
      ["Date", new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })],
    ])}
  `;

  return {
    subject: `[Zuply] Post ${platformLabel} publie - ${siteName}`,
    body: `Post ${platformLabel} publie pour "${siteName}"${platformUrl ? `\nLien: ${platformUrl}` : ""}\n-- Zuply`,
    html: emailLayout(
      `Post ${platformLabel} publie`,
      content,
      platformUrl ? "Voir le post" : undefined,
      platformUrl
    ),
  };
}

export function formatSocialPublishError(
  siteName: string,
  platform: string,
  error: string
): { subject: string; body: string; html: string } {
  const platformLabel = PLATFORM_LABELS[platform] || platform;
  const content = `
    <p>La publication du post <strong>${platformLabel}</strong> a echoue pour <strong>${siteName}</strong>.</p>
    ${infoTable([
      ["Plateforme", platformLabel],
      ["Erreur", `<span style="color:#dc2626;">${error}</span>`],
      ["Statut", statusPill("Echec", "#dc2626", "#fef2f2")],
      ["Date", new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })],
    ])}
  `;

  return {
    subject: `[Zuply] Erreur post ${platformLabel} - ${siteName}`,
    body: `Publication ${platformLabel} echouee pour "${siteName}"\nErreur: ${error}\n-- Zuply`,
    html: emailLayout(`Echec publication ${platformLabel}`, content),
  };
}
