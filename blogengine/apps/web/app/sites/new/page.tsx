"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/use-auth";
import { createSite, logout } from "../../../lib/api";

const THEMES = [
  { value: "LOCAL_SERVICE", label: "Service local", desc: "Plombier, serrurier, electricien..." },
  { value: "SAAS", label: "SaaS / Tech", desc: "Application web, logiciel, startup..." },
];

const PATTERNS = [
  { value: "JSON_INDIVIDUAL", label: "JSON Individual", desc: "Un fichier JSON par article (recommande)" },
  { value: "JSON_ARRAY", label: "JSON Array", desc: "Tous les articles dans un seul JSON" },
  { value: "TS_MODULE", label: "TypeScript Module", desc: "Articles en modules TS" },
  { value: "MONOREPO", label: "Monorepo", desc: "Structure monorepo" },
  { value: "CUSTOM_ROUTE", label: "Custom Route", desc: "Routes personnalisees" },
  { value: "NO_BLOG", label: "Pas de blog", desc: "Site sans blog" },
];

export default function NewSitePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [domain, setDomain] = useState("");
  const [repoOwner, setRepoOwner] = useState("");
  const [repoName, setRepoName] = useState("");
  const [theme, setTheme] = useState("LOCAL_SERVICE");
  const [blogPattern, setBlogPattern] = useState("JSON_INDIVIDUAL");
  const [city, setCity] = useState("");
  const [department, setDepartment] = useState("");
  const [contentDir, setContentDir] = useState("content/blog");
  const [imageDir, setImageDir] = useState("public/images/blog");
  const [blogBasePath, setBlogBasePath] = useState("/blog");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const autoSlug = (val: string) => {
    setName(val);
    if (!slug || slug === autoSlugify(name)) {
      setSlug(autoSlugify(val));
    }
  };

  function autoSlugify(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug || !repoName) {
      setError("Nom, slug et nom du repo sont requis.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const site = await createSite({
        name,
        slug,
        repoName,
        repoOwner: repoOwner || undefined,
        domain: domain || undefined,
        theme,
        blogPattern,
        city: city || undefined,
        department: department || undefined,
        contentDir,
        imageDir,
        blogBasePath,
      });

      router.push(`/sites/${site.id}`);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la creation");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white bg-orbs gap-5">
        <div className="loader-orbit" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-white bg-orbs">
      <div className="sticky top-0 z-50 px-2 md:px-4 pt-2 md:pt-4">
        <nav className="navbar-float max-w-6xl mx-auto px-3 md:px-6 h-12 md:h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-8">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src="/favicon.png" alt="Zuply" className="w-6 h-6 md:w-7 md:h-7 object-contain" />
              <span className="text-lg md:text-xl font-bold tracking-tight" style={{ color: "#2563eb" }}>zuply</span>
            </Link>
          </div>
          <div className="flex items-center gap-3 md:gap-5">
            <span className="hidden md:inline text-sm text-gray-500 font-medium">{user.name || user.email}</span>
            <button
              onClick={async () => { try { await logout(); } catch {} router.replace("/login"); }}
              className="text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors"
            >Deconnexion</button>
          </div>
        </nav>
      </div>

      <main className="max-w-2xl mx-auto px-3 md:px-6 py-6 md:py-10 relative z-10">
        <Link href="/" className="text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors mb-6 inline-flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 animate-fade-in-up">Ajouter un site</h1>
        <p className="text-sm text-gray-500 mb-8">Configurez votre nouveau site pour commencer a generer et publier des articles.</p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm text-red-600 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="card p-5 md:p-6 space-y-4 animate-fade-in">
            <h2 className="text-lg font-bold text-gray-900">Informations generales</h2>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Nom du site *</label>
              <input type="text" value={name} onChange={(e) => autoSlug(e.target.value)}
                placeholder="Depannage Rideau Metallique Bordeaux" className="input w-full" required />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Slug *</label>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)}
                placeholder="depannage-rideau-metallique-bordeaux" className="input w-full" required />
              <p className="text-xs text-gray-400 mt-1">Identifiant unique, sans espaces ni caracteres speciaux.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Nom de domaine</label>
              <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)}
                placeholder="depannage-rideau-metallique-bordeaux.fr" className="input w-full" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Ville</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                  placeholder="Bordeaux" className="input w-full" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Departement</label>
                <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)}
                  placeholder="33" className="input w-full" />
              </div>
            </div>
          </div>

          {/* Theme */}
          <div className="card p-5 md:p-6 space-y-4 animate-fade-in">
            <h2 className="text-lg font-bold text-gray-900">Type de site</h2>
            <div className="grid grid-cols-2 gap-3">
              {THEMES.map((t) => (
                <button key={t.value} type="button" onClick={() => setTheme(t.value)}
                  className={`rounded-xl px-4 py-3 text-left transition-all border ${
                    theme === t.value
                      ? "bg-white/60 border-blue-200 shadow-sm"
                      : "bg-white/30 border-white/40 hover:bg-white/50"
                  }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${theme === t.value ? "border-blue-600" : "border-gray-300"}`}>
                      {theme === t.value && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                    </div>
                    <span className={`text-sm font-bold ${theme === t.value ? "text-blue-600" : "text-gray-600"}`}>{t.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 pl-5.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* GitHub Repo */}
          <div className="card p-5 md:p-6 space-y-4 animate-fade-in">
            <h2 className="text-lg font-bold text-gray-900">Repository GitHub</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Owner</label>
                <input type="text" value={repoOwner} onChange={(e) => setRepoOwner(e.target.value)}
                  placeholder="angelo222ange" className="input w-full" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Nom du repo *</label>
                <input type="text" value={repoName} onChange={(e) => setRepoName(e.target.value)}
                  placeholder="rideau-metallique-bordeaux" className="input w-full" required />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Blog Pattern</label>
              <select value={blogPattern} onChange={(e) => setBlogPattern(e.target.value)} className="input w-full">
                {PATTERNS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label} - {p.desc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Advanced */}
          <div className="card p-5 md:p-6 animate-fade-in">
            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors w-full">
              <svg className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Options avancees
            </button>
            {showAdvanced && (
              <div className="mt-4 space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Chemin du blog</label>
                  <input type="text" value={blogBasePath} onChange={(e) => setBlogBasePath(e.target.value)} className="input w-full" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Dossier contenu</label>
                  <input type="text" value={contentDir} onChange={(e) => setContentDir(e.target.value)} className="input w-full" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Dossier images</label>
                  <input type="text" value={imageDir} onChange={(e) => setImageDir(e.target.value)} className="input w-full" />
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center gap-4">
            <button type="submit" disabled={saving} className="btn-primary px-8 py-3 text-sm flex items-center gap-2">
              {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? "Creation..." : "Creer le site"}
            </button>
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors">Annuler</Link>
          </div>
        </form>
      </main>
    </div>
  );
}
