"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/use-auth";
import { getSite, generateArticle, getSchedule, updateSchedule, getPublishConfig, updatePublishConfig, logout } from "../../../lib/api";

const BADGE_MAP: Record<string, string> = {
  REVIEW: "badge-review", APPROVED: "badge-approved", PUBLISHED: "badge-published",
  REJECTED: "badge-rejected", DRAFT: "badge-draft", PUBLISHING: "badge-publishing", FAILED: "badge-failed",
};
const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${BADGE_MAP[status] || "badge-draft"}`}>{status}</span>;
}

function Navbar({ user }: { user: { email: string; name: string } }) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <div className="sticky top-0 z-50 px-2 md:px-4 pt-2 md:pt-4">
      <nav className="navbar-float max-w-6xl mx-auto px-3 md:px-6 h-12 md:h-14 flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-8">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity"><img src="/favicon.png" alt="Zuply" className="w-6 h-6 md:w-7 md:h-7 object-contain" /><span className="text-lg md:text-xl font-bold tracking-tight" style={{ color: "#2563eb" }}>zuply</span></Link>
          <div className="hidden md:flex items-center gap-1">
            <Link href="/" className="px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-900 hover:bg-white/30 transition-all">Dashboard</Link>
            <Link href="/social" className="px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-900 hover:bg-white/30 transition-all">Reseaux</Link>
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-5">
          <span className="hidden md:inline text-sm text-gray-500 font-medium">{user.name || user.email}</span>
          <button
            onClick={async () => { try { await logout(); } catch {} router.replace("/login"); }}
            className="hidden md:inline text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors"
          >Deconnexion</button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-white/30 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              }
            </svg>
          </button>
        </div>
      </nav>
      {mobileMenuOpen && (
        <div className="md:hidden navbar-float max-w-6xl mx-auto mt-1 px-3 py-3 rounded-xl animate-fade-in">
          <div className="flex flex-col gap-1">
            <Link href="/" className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-900 hover:bg-white/30 transition-all" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
            <Link href="/social" className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-900 hover:bg-white/30 transition-all" onClick={() => setMobileMenuOpen(false)}>Reseaux</Link>
          </div>
          <div className="border-t border-gray-200/30 mt-2 pt-2 flex items-center justify-between px-3">
            <span className="text-sm text-gray-500 font-medium truncate">{user.name || user.email}</span>
            <button
              onClick={async () => { try { await logout(); } catch {} router.replace("/login"); }}
              className="text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors shrink-0 ml-3"
            >Deconnexion</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PublicationModeSection({ siteId }: { siteId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [postTime, setPostTime] = useState("09:00");
  const [activeDays, setActiveDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [evergreenPerDay, setEvergreenPerDay] = useState(1);
  const [newsPerWeek, setNewsPerWeek] = useState(3);
  const [dayTimes, setDayTimes] = useState<Record<string, string>>({});
  const [perDayMode, setPerDayMode] = useState(false);

  useEffect(() => {
    getSchedule(siteId)
      .then((data) => {
        setAutoApprove(data.autoApprove ?? false);
        setPostTime(data.postTime ?? "09:00");
        setActiveDays(data.activeDays ?? [1, 2, 3, 4, 5]);
        setEvergreenPerDay(data.evergreenPerDay ?? 1);
        setNewsPerWeek(data.newsPerWeek ?? 3);
        const dt = data.dayTimes ?? {};
        setDayTimes(dt);
        setPerDayMode(Object.keys(dt).length > 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [siteId]);

  const handleSave = useCallback(async () => {
    setSaving(true); setSaved(false);
    try {
      await updateSchedule(siteId, {
        postTime, activeDays, evergreenPerDay, newsPerWeek, autoApprove,
        isActive: true, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dayTimes: perDayMode ? dayTimes : {},
      });
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (err: any) { alert(err.message || "Erreur"); }
    finally { setSaving(false); }
  }, [siteId, postTime, activeDays, evergreenPerDay, newsPerWeek, autoApprove, dayTimes, perDayMode]);

  const toggleDay = (day: number) => {
    setActiveDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort());
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3">
          <div className="loader-orbit" style={{ width: 20, height: 20 }} />
          <span className="text-sm text-gray-500">Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4 md:p-6 animate-fade-in">
      <h3 className="text-lg font-bold text-gray-900 mb-1">Mode de publication</h3>
      <p className="text-sm text-gray-500 mb-6">Choisissez comment les articles sont valides et publies.</p>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        {[false, true].map((isAuto) => (
          <button
            key={String(isAuto)}
            onClick={() => setAutoApprove(isAuto)}
            className={`flex-1 rounded-xl px-4 md:px-5 py-3 md:py-4 text-left transition-all border ${
              autoApprove === isAuto
                ? "bg-white/60 border-blue-200 shadow-sm"
                : "bg-white/30 border-white/40 hover:bg-white/50"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${autoApprove === isAuto ? "border-blue-600" : "border-gray-300"}`}>
                {autoApprove === isAuto && <div className="w-2 h-2 rounded-full bg-blue-600" />}
              </div>
              <span className={`text-sm font-bold ${autoApprove === isAuto ? "text-blue-600" : "text-gray-600"}`}>
                {isAuto ? "Automatique" : "Manuel"}
              </span>
            </div>
            <p className="text-xs text-gray-500 pl-7">
              {isAuto ? "Articles publies automatiquement selon le planning." : "Vous approuvez chaque article avant publication."}
            </p>
          </button>
        ))}
      </div>

      {autoApprove && (
        <div className="bg-white/40 rounded-xl border border-white/50 p-5 space-y-5 animate-fade-in">
          <p className="text-sm font-bold text-gray-900">Configuration du planning</p>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Heure de publication</label>
            <input type="time" value={postTime} onChange={(e) => setPostTime(e.target.value)} className="input w-auto" />
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input type="checkbox" checked={perDayMode} onChange={(e) => setPerDayMode(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-xs text-gray-600 font-medium">Heure differente par jour</span>
            </label>
          </div>
          {perDayMode && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">Heures par jour</label>
              <div className="space-y-2">
                {activeDays.sort((a, b) => a - b).map((dayNum) => (
                  <div key={dayNum} className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700 w-10">{DAY_LABELS[dayNum - 1]}</span>
                    <input
                      type="time"
                      value={dayTimes[String(dayNum)] || postTime}
                      onChange={(e) => setDayTimes((prev) => ({ ...prev, [String(dayNum)]: e.target.value }))}
                      className="input w-auto"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">Jours actifs</label>
            <div className="flex flex-wrap gap-2">
              {DAY_LABELS.map((label, i) => {
                const dayNum = i + 1;
                const active = activeDays.includes(dayNum);
                return (
                  <button key={dayNum} onClick={() => toggleDay(dayNum)}
                    className={`w-10 h-10 md:w-11 md:h-11 rounded-xl text-xs font-bold transition-all ${
                      active ? "bg-blue-600 text-white shadow-sm" : "bg-white/60 border border-gray-200/50 text-gray-500 hover:bg-white/80"
                    }`}
                  >{label}</button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Articles / jour</label>
              <input type="number" min={0} max={10} value={evergreenPerDay} onChange={(e) => setEvergreenPerDay(parseInt(e.target.value) || 0)} className="input" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">News / semaine</label>
              <input type="number" min={0} max={50} value={newsPerWeek} onChange={(e) => setNewsPerWeek(parseInt(e.target.value) || 0)} className="input" />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mt-6">
        <button onClick={handleSave} disabled={saving} className="btn-primary px-6 py-2.5 text-sm">
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium animate-fade-in">Configuration sauvegardee</span>}
      </div>
    </div>
  );
}

function PublishConfigSection({ siteId, userRole }: { siteId: string; userRole?: string }) {
  const isAdmin = userRole === "ADMIN";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<any>({});
  const [githubToken, setGithubToken] = useState("");
  const [sshHost, setSshHost] = useState("");
  const [sshUser, setSshUser] = useState("deploy");
  const [sshPort, setSshPort] = useState(22);
  const [sshPrivateKey, setSshPrivateKey] = useState("");
  const [vpsPath, setVpsPath] = useState("");
  const [deployScript, setDeployScript] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");

  useEffect(() => {
    getPublishConfig(siteId)
      .then((data) => {
        setConfig(data);
        setSshHost(data.sshHost || "");
        setSshUser(data.sshUser || "deploy");
        setSshPort(data.sshPort || 22);
        setVpsPath(data.vpsPath || "");
        setDeployScript(data.deployScript || "");
        setNotifyEmail(data.notifyEmail || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [siteId]);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      const data: any = {
        sshHost: sshHost || undefined,
        sshUser: sshUser || undefined,
        sshPort,
        vpsPath: vpsPath || undefined,
        deployScript: deployScript || undefined,
        notifyEmail: notifyEmail || undefined,
      };
      if (githubToken) data.githubToken = githubToken;
      if (sshPrivateKey) data.sshPrivateKey = sshPrivateKey;
      await updatePublishConfig(siteId, data);
      setConfig((prev: any) => ({
        ...prev,
        hasGithubToken: githubToken ? true : prev.hasGithubToken,
        hasSshKey: sshPrivateKey ? true : prev.hasSshKey,
        sshHost, sshUser, sshPort, vpsPath, deployScript, notifyEmail,
      }));
      setGithubToken("");
      setSshPrivateKey("");
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (err: any) { alert(err.message || "Erreur"); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3">
          <div className="loader-orbit" style={{ width: 20, height: 20 }} />
          <span className="text-sm text-gray-500">Chargement...</span>
        </div>
      </div>
    );
  }

  const hasGitHub = config.hasGithubToken;
  const hasSSH = config.hasSshKey && config.sshHost;

  return (
    <div className="card p-4 md:p-6 animate-fade-in">
      <button onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Configuration publication</h3>
          <p className="text-sm text-gray-500 mt-0.5">GitHub, VPS, notifications</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${hasGitHub ? "bg-emerald-500" : "bg-gray-300"}`} />
            <span className="text-xs text-gray-500 font-medium">GitHub</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${hasSSH ? "bg-emerald-500" : "bg-gray-300"}`} />
            <span className="text-xs text-gray-500 font-medium">VPS</span>
          </div>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="mt-6 space-y-6 animate-fade-in">
          {/* GitHub */}
          <div className="bg-white/40 rounded-xl border border-white/50 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">GitHub</p>
              {hasGitHub && <span className="text-xs text-emerald-600 font-semibold">Connecte</span>}
            </div>
            {hasGitHub ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex-1">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-emerald-700 font-medium">GitHub connecte — acces repo OK</span>
                </div>
                <a href={`/api/publish/github/authorize?siteId=${siteId}`}
                  className="text-xs text-gray-500 hover:text-blue-600 font-medium transition-colors whitespace-nowrap">
                  Reconnecter
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                <a href={`/api/publish/github/authorize?siteId=${siteId}`}
                  className="btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  Connecter GitHub
                </a>
                <p className="text-xs text-gray-400">Autorisez Zuply a publier des articles sur vos repos GitHub.</p>
                <details className="group">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 font-medium">
                    Ou entrer un token manuellement
                  </summary>
                  <div className="mt-2">
                    <input type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxx"
                      className="input w-full font-mono text-sm" />
                  </div>
                </details>
              </div>
            )}
          </div>

          {/* VPS / SSH — admin only */}
          {isAdmin && (
            <div className="bg-white/40 rounded-xl border border-white/50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900">Deploiement VPS</p>
                {hasSSH && <span className="text-xs text-emerald-600 font-semibold">SSH configure</span>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Host SSH</label>
                  <input type="text" value={sshHost} onChange={(e) => setSshHost(e.target.value)}
                    placeholder="123.45.67.89" className="input w-full font-mono text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">User</label>
                    <input type="text" value={sshUser} onChange={(e) => setSshUser(e.target.value)}
                      placeholder="deploy" className="input w-full text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Port</label>
                    <input type="number" value={sshPort} onChange={(e) => setSshPort(parseInt(e.target.value) || 22)}
                      className="input w-full text-sm" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Cle privee SSH</label>
                <textarea value={sshPrivateKey} onChange={(e) => setSshPrivateKey(e.target.value)}
                  placeholder={config.hasSshKey ? "Laisser vide pour garder l'actuelle" : "-----BEGIN OPENSSH PRIVATE KEY-----\n..."}
                  rows={3} className="input w-full font-mono text-xs resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Chemin du projet sur le VPS</label>
                <input type="text" value={vpsPath} onChange={(e) => setVpsPath(e.target.value)}
                  placeholder="/home/deploy/repos/mon-site" className="input w-full font-mono text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Script de deploiement</label>
                <select value={deployScript} onChange={(e) => setDeployScript(e.target.value)} className="input w-full text-sm">
                  <option value="">Par defaut (git pull + build)</option>
                  <option value="git pull origin main && npm run build">git pull + npm run build</option>
                  <option value="git pull origin main && npm install && npm run build">git pull + npm install + npm run build</option>
                  <option value="git pull origin main && yarn && yarn build">git pull + yarn + yarn build</option>
                  <option value="git pull && npm run build">git pull + npm run build (simple)</option>
                  <option value="./deploy.sh">./deploy.sh (script personnalise)</option>
                </select>
              </div>
            </div>
          )}

          {/* Notifications */}
          <div className="bg-white/40 rounded-xl border border-white/50 p-5 space-y-4">
            <p className="text-sm font-bold text-gray-900">Notifications</p>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Email de notification</label>
              <input type="email" value={notifyEmail} onChange={(e) => setNotifyEmail(e.target.value)}
                placeholder="vous@domaine.com" className="input w-full text-sm" />
              <p className="text-xs text-gray-400 mt-1">Recevez des alertes sur la generation, publication et deploiement.</p>
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-primary px-6 py-2.5 text-sm">
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </button>
            {saved && <span className="text-sm text-emerald-600 font-medium animate-fade-in">Configuration sauvegardee</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [site, setSite] = useState<any>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [topicHint, setTopicHint] = useState("");
  const [showTopicInput, setShowTopicInput] = useState(false);
  const [genError, setGenError] = useState("");
  const [githubMsg, setGithubMsg] = useState("");

  useEffect(() => {
    if (searchParams.get("github") === "connected") {
      setGithubMsg("GitHub connecte avec succes");
      setTimeout(() => setGithubMsg(""), 5000);
      window.history.replaceState({}, "", `/sites/${id}`);
    } else if (searchParams.get("github_error")) {
      setGithubMsg(`Erreur GitHub: ${searchParams.get("github_error")}`);
      setTimeout(() => setGithubMsg(""), 8000);
      window.history.replaceState({}, "", `/sites/${id}`);
    }
  }, [searchParams, id]);

  useEffect(() => {
    if (!user || !id) return;
    getSite(id)
      .then((data) => { setSite(data); setArticles(Array.isArray(data.articles) ? data.articles : []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, id]);

  const handleGenerate = async () => {
    if (!site) return;
    setGenerating(true); setGenError("");
    try {
      const newArticle = await generateArticle(site.id, topicHint || undefined);
      setArticles((prev) => [newArticle, ...prev]);
      setTopicHint(""); setShowTopicInput(false);
    } catch (err: any) { setGenError(err.message || "Erreur de generation"); }
    finally { setGenerating(false); }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex flex-col items-center justify-center bg-white bg-orbs gap-5">
      <div className="loader-orbit" />
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="loader-dot" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
      <div className="loader-bar-track" />
    </div>;
  }
  if (!user) return null;
  if (!site) {
    return (
      <div className="min-h-screen bg-white bg-orbs">
        <Navbar user={user} />
        <main className="max-w-6xl mx-auto px-3 md:px-6 py-10 relative z-10">
          <p className="text-gray-500">Site introuvable.</p>
          <Link href="/" className="text-blue-600 text-sm font-medium mt-4 inline-block hover:underline">Retour</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white bg-orbs">
      <Navbar user={user} />
      <main className="max-w-6xl mx-auto px-3 md:px-6 py-6 md:py-10 relative z-10">
        <Link href="/" className="text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors mb-6 inline-flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Tous les sites
        </Link>

        {githubMsg && (
          <div className={`rounded-xl px-4 py-3 mb-4 text-sm font-medium animate-fade-in ${
            githubMsg.startsWith("Erreur") ? "bg-red-50 border border-red-200 text-red-600" : "bg-emerald-50 border border-emerald-200 text-emerald-700"
          }`}>{githubMsg}</div>
        )}

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8 animate-fade-in-up">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{site.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              {site.domain && <span className="text-xs md:text-sm text-gray-500 font-mono">{site.domain}</span>}
              {site.city && <span className="text-xs md:text-sm text-gray-600">{site.city}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {showTopicInput && (
              <input type="text" value={topicHint} onChange={(e) => setTopicHint(e.target.value)}
                placeholder="Sujet (optionnel)" className="input w-full md:w-56"
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()} />
            )}
            {!showTopicInput && (
              <button onClick={() => setShowTopicInput(true)} className="text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors">+ sujet</button>
            )}
            <button onClick={handleGenerate} disabled={generating} className="btn-primary px-4 md:px-5 py-2.5 text-xs md:text-sm flex items-center gap-2 whitespace-nowrap">
              {generating && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {generating ? "Generation..." : "Generer un article"}
            </button>
          </div>
        </div>

        {generating && (
          <div className="card p-5 mb-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm text-gray-600 font-medium">L'IA redige votre article...</span>
            </div>
            <div className="space-y-2.5">
              <div className="shimmer-line h-5 w-2/3" />
              <div className="shimmer-line h-4 w-full" />
              <div className="shimmer-line h-4 w-5/6" />
              <div className="shimmer-line h-4 w-4/6" />
              <div className="flex gap-3 mt-3">
                <div className="shimmer-line h-24 w-32 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="shimmer-line h-4 w-full" />
                  <div className="shimmer-line h-4 w-3/4" />
                  <div className="shimmer-line h-4 w-1/2" />
                </div>
              </div>
            </div>
          </div>
        )}

        {genError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm text-red-600 font-medium">{genError}</div>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8 md:mb-10">
          {[
            { label: "Pattern", value: site.blogPattern?.replace(/_/g, " ") || "N/A" },
            { label: "Theme", value: site.theme === "SAAS" ? "SaaS" : "Service local" },
            { label: "Articles", value: String(articles.length) },
            { label: "Repo", value: site.repoName || "N/A" },
          ].map((item) => (
            <div key={item.label} className="card px-3 md:px-5 py-3 md:py-4">
              <p className="text-[10px] md:text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">{item.label}</p>
              <p className="text-xs md:text-sm text-gray-900 font-bold truncate">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-6"><PublicationModeSection siteId={site.id} /></div>
        <div className="mb-10"><PublishConfigSection siteId={site.id} userRole={user.role} /></div>

        <div className="animate-fade-in">
          <h2 className="text-xl font-bold text-gray-900 mb-5">Articles</h2>
          {articles.length === 0 && (
            <div className="card p-10 text-center">
              <p className="text-gray-500 text-sm font-medium">Aucun article genere pour ce site.</p>
              <p className="text-gray-400 text-xs mt-2">Cliquez sur "Generer un article" pour commencer.</p>
            </div>
          )}
          {articles.length > 0 && (
            <div className="card-elevated overflow-hidden divide-y divide-gray-200/30">
              {articles.map((article) => (
                <Link key={article.id} href={`/articles/${article.id}`}
                  className="flex items-center justify-between px-3 md:px-6 py-4 md:py-5 hover:bg-white/30 transition-colors group">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm text-gray-900 font-semibold group-hover:text-blue-600 transition-colors truncate">{article.title}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      {article.category && <span className="text-xs text-gray-500 font-medium">{article.category}</span>}
                      {article.createdAt && <span className="text-xs text-gray-400">{new Date(article.createdAt).toLocaleDateString("fr-FR")}</span>}
                      {article.readTime && <span className="text-xs text-gray-400">{article.readTime}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={article.status} />
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
