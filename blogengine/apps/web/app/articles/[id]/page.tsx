"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/use-auth";
import {
  getArticle, updateArticleStatus, logout,
  generateSocialPosts, getSocialPostsForArticle,
  updateSocialPost, approveSocialPost, publishSocialPost,
  publishAllSocialPosts, deleteSocialPost, getSocialAccounts,
  publishArticle, deploySite,
} from "../../../lib/api";

interface ArticleContent {
  title: string; slug: string; metaTitle: string; metaDescription: string;
  intro: string; tldr: string;
  sections: { id: string; title: string; content: string; list?: { title: string; description: string }[] | null; table?: { headers: string[]; rows: string[][] } | null; }[];
  faq: { question: string; answer: string }[];
  conclusion: string; keywords: string[];
  internalLinks: { text: string; href: string }[];
  externalLinks: { text: string; href: string; source: string }[];
}

// ─── Social ───

interface SocialPost {
  id: string;
  platform: string;
  content: string;
  hashtags: string[];
  mediaUrls: string[];
  status: string;
  publishedAt?: string;
  platformUrl?: string;
  errorMessage?: string;
  socialAccount?: { accountName: string; platform: string };
}

const PLATFORM_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode; maxChars: number }> = {
  twitter: {
    label: "X / Twitter", color: "text-gray-900", bg: "bg-gray-50", border: "border-gray-200",
    maxChars: 280,
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  },
  facebook: {
    label: "Facebook", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200",
    maxChars: 500,
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  },
  instagram: {
    label: "Instagram", color: "text-pink-600", bg: "bg-pink-50", border: "border-pink-200",
    maxChars: 2200,
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
  },
  linkedin: {
    label: "LinkedIn", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200",
    maxChars: 3000,
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  },
  pinterest: {
    label: "Pinterest", color: "text-red-600", bg: "bg-red-50", border: "border-red-200",
    maxChars: 500,
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z"/></svg>,
  },
};

const POST_STATUS_BADGE: Record<string, string> = {
  PENDING_REVIEW: "badge-review",
  APPROVED: "badge-approved",
  PUBLISHING: "badge-publishing",
  PUBLISHED: "badge-published",
  FAILED: "badge-failed",
};

const POST_STATUS_LABEL: Record<string, string> = {
  PENDING_REVIEW: "A valider",
  APPROVED: "Approuve",
  PUBLISHING: "Publication...",
  PUBLISHED: "Publie",
  FAILED: "Echec",
};

function SocialTab({ articleId, siteId }: { articleId: string; siteId: string }) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [publishingAll, setPublishingAll] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editHashtags, setEditHashtags] = useState("");
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);

  const loadPosts = async () => {
    try {
      const data = await getSocialPostsForArticle(articleId);
      setPosts(data || []);
    } catch {}
    setLoading(false);
  };

  const loadAccounts = async () => {
    try {
      const accounts = await getSocialAccounts(siteId);
      setConnectedPlatforms(accounts.map((a: any) => a.platform));
    } catch {}
  };

  useEffect(() => { loadPosts(); loadAccounts(); }, [articleId, siteId]);

  const handleGenerate = async (platforms?: string[]) => {
    setGenerating(true);
    try {
      await generateSocialPosts(articleId, platforms);
      await loadPosts();
    } catch (err: any) { alert(err.message || "Erreur de generation"); }
    setGenerating(false);
  };

  const handleApproveAll = async () => {
    const pending = posts.filter((p) => p.status === "PENDING_REVIEW");
    for (const p of pending) {
      try { await approveSocialPost(p.id); } catch {}
    }
    await loadPosts();
  };

  const handlePublishAll = async () => {
    setPublishingAll(true);
    try {
      await publishAllSocialPosts(articleId);
      await loadPosts();
    } catch (err: any) { alert(err.message || "Erreur"); }
    setPublishingAll(false);
  };

  const handlePublishOne = async (postId: string) => {
    setPublishing(postId);
    try {
      await publishSocialPost(postId);
      await loadPosts();
    } catch (err: any) { alert(err.message || "Erreur"); }
    setPublishing(null);
  };

  const handleApproveOne = async (postId: string) => {
    try { await approveSocialPost(postId); await loadPosts(); } catch {}
  };

  const handleDelete = async (postId: string) => {
    try { await deleteSocialPost(postId); setPosts((prev) => prev.filter((p) => p.id !== postId)); } catch {}
  };

  const startEdit = (post: SocialPost) => {
    setEditingId(post.id);
    setEditContent(post.content);
    setEditHashtags(post.hashtags.join(", "));
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await updateSocialPost(editingId, {
        content: editContent,
        hashtags: editHashtags.split(",").map((h) => h.trim()).filter(Boolean),
      });
      setEditingId(null);
      await loadPosts();
    } catch (err: any) { alert(err.message || "Erreur"); }
  };

  const pendingCount = posts.filter((p) => p.status === "PENDING_REVIEW").length;
  const approvedCount = posts.filter((p) => p.status === "APPROVED").length;
  const publishedCount = posts.filter((p) => p.status === "PUBLISHED").length;

  if (loading) {
    return <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="loader-orbit" />
      <div className="loader-bar-track" />
    </div>;
  }

  // No posts yet — generation CTA
  if (posts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="card-elevated px-4 md:px-8 py-8 md:py-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900">Generer les posts sociaux</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            L'IA va creer un post optimise pour chaque plateforme connectee, adapte au ton et aux contraintes de chacune.
          </p>
          {connectedPlatforms.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-amber-600 font-medium">Aucune plateforme connectee</p>
              <a href="/social" className="inline-block btn-primary px-6 py-3 text-sm">Connecter un reseau</a>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                {connectedPlatforms.map((p) => {
                  const meta = PLATFORM_META[p];
                  return meta ? (
                    <span key={p} className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${meta.bg} ${meta.color} border ${meta.border}`}>
                      {meta.icon} {meta.label}
                    </span>
                  ) : null;
                })}
              </div>
              <button onClick={() => handleGenerate()} disabled={generating}
                className="btn-primary px-8 py-3 text-sm disabled:opacity-50">
                {generating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generation en cours...
                  </span>
                ) : "Generer les posts"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Posts exist — management view
  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          <span className="text-sm font-semibold text-gray-900">{posts.length} posts</span>
          {pendingCount > 0 && <span className="badge badge-review">{pendingCount} a valider</span>}
          {approvedCount > 0 && <span className="badge badge-approved">{approvedCount} prets</span>}
          {publishedCount > 0 && <span className="badge badge-published">{publishedCount} publies</span>}
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button onClick={handleApproveAll}
              className="btn-success px-4 py-2 text-xs">
              Tout approuver
            </button>
          )}
          {approvedCount > 0 && (
            <button onClick={handlePublishAll} disabled={publishingAll}
              className="btn-primary px-4 py-2 text-xs disabled:opacity-50">
              {publishingAll ? "Publication..." : "Tout publier"}
            </button>
          )}
          <button onClick={() => handleGenerate()} disabled={generating}
            className="btn-danger-outline px-4 py-2 text-xs disabled:opacity-50"
            style={{ color: "#6366f1", borderColor: "#c4b5fd" }}>
            {generating ? "..." : "Regenerer"}
          </button>
        </div>
      </div>

      {/* Post cards */}
      <div className="space-y-4">
        {posts.map((post) => {
          const meta = PLATFORM_META[post.platform] || PLATFORM_META.twitter;
          const isEditing = editingId === post.id;
          const charCount = isEditing ? editContent.length : post.content.length;
          const charOver = charCount > meta.maxChars;

          return (
            <div key={post.id} className="card overflow-hidden">
              {/* Header */}
              <div className={`flex items-center justify-between px-3 md:px-5 py-3 border-b border-gray-200/30 ${meta.bg}`}>
                <div className="flex items-center gap-2">
                  <span className={meta.color}>{meta.icon}</span>
                  <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                  {post.socialAccount && (
                    <span className="text-xs text-gray-500">@{post.socialAccount.accountName}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${POST_STATUS_BADGE[post.status] || "badge-draft"}`}>
                    {POST_STATUS_LABEL[post.status] || post.status}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="px-3 md:px-5 py-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="input w-full min-h-[120px] resize-y text-sm"
                      style={{ fontFamily: "inherit" }}
                    />
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${charOver ? "text-red-500" : "text-gray-500"}`}>
                        {charCount} / {meta.maxChars}
                      </span>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium block mb-1">Hashtags (separes par des virgules)</label>
                      <input
                        value={editHashtags}
                        onChange={(e) => setEditHashtags(e.target.value)}
                        className="input text-sm"
                        placeholder="#marketing, #seo, #digital"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button onClick={saveEdit} className="btn-primary px-4 py-2 text-xs">Sauvegarder</button>
                      <button onClick={() => setEditingId(null)} className="btn-danger-outline px-4 py-2 text-xs"
                        style={{ color: "#6b7280", borderColor: "#d1d5db" }}>Annuler</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {post.hashtags.map((h, i) => (
                          <span key={i} className={`text-xs font-medium ${meta.color}`}>
                            {h.startsWith("#") ? h : `#${h}`}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className={`text-xs font-medium ${charOver ? "text-red-500" : "text-gray-400"}`}>
                        {charCount} / {meta.maxChars} car.
                      </span>
                      <div className="flex items-center gap-1.5">
                        {post.status === "PUBLISHED" && post.platformUrl && (
                          <a href={post.platformUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-600 font-medium hover:underline">
                            Voir le post
                          </a>
                        )}
                        {post.status === "FAILED" && post.errorMessage && (
                          <span className="text-xs text-red-500" title={post.errorMessage}>
                            Erreur: {post.errorMessage.slice(0, 60)}...
                          </span>
                        )}
                        {post.status !== "PUBLISHED" && (
                          <>
                            <button onClick={() => startEdit(post)}
                              className="text-xs text-gray-500 hover:text-blue-600 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                              Editer
                            </button>
                            {post.status === "PENDING_REVIEW" && (
                              <button onClick={() => handleApproveOne(post.id)}
                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors">
                                Approuver
                              </button>
                            )}
                            {post.status === "APPROVED" && (
                              <button onClick={() => handlePublishOne(post.id)}
                                disabled={publishing === post.id}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50">
                                {publishing === post.id ? "..." : "Publier"}
                              </button>
                            )}
                            <button onClick={() => handleDelete(post.id)}
                              className="text-xs text-gray-400 hover:text-red-500 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                              Suppr.
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const BADGE_MAP: Record<string, string> = {
  REVIEW: "badge-review", APPROVED: "badge-approved", PUBLISHED: "badge-published",
  REJECTED: "badge-rejected", DRAFT: "badge-draft",
};

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${BADGE_MAP[status] || "badge-draft"}`}>{status}</span>;
}

function HtmlContent({ html, className }: { html: string; className?: string }) {
  const DOMPurify = require("isomorphic-dompurify");
  const clean = DOMPurify.sanitize(html);
  return <span className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}

export default function ArticleViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [article, setArticle] = useState<any>(null);
  const [content, setContent] = useState<ArticleContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [publishing, setPublishingArticle] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [tab, setTab] = useState<"preview" | "meta" | "social" | "json">("preview");

  useEffect(() => {
    if (!user || !id) return;
    getArticle(id)
      .then((data) => {
        setArticle(data);
        try { setContent(typeof data.content === "string" ? JSON.parse(data.content) : data.content); } catch {}
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, id]);

  const handleStatusUpdate = async (status: string) => {
    if (!article) return;
    setUpdating(true);
    try {
      const updated = await updateArticleStatus(article.id, status);
      setArticle({ ...article, ...updated, status });
    } catch (err: any) { alert(err.message || "Erreur"); }
    finally { setUpdating(false); }
  };

  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  const handlePublish = async () => {
    if (!article) return;
    setPublishingArticle(true);
    setPublishSuccess(false);
    setPublishedUrl(null);
    try {
      await publishArticle(article.id);
      // Deploy to VPS (optional — skip if SSH not configured)
      try { await deploySite(article.siteId); } catch {}
      setArticle({ ...article, status: "PUBLISHED" });
      setPublishSuccess(true);
      if (article.site?.domain && article.slug) {
        setPublishedUrl(`https://${article.site.domain}/blog/${article.slug}`);
      }
    } catch (err: any) { alert(err.message || "Erreur de publication"); }
    finally { setPublishingArticle(false); }
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
  if (!article || !content) {
    return (
      <div className="min-h-screen bg-white bg-orbs">
        <div className="sticky top-0 z-50 px-2 md:px-4 pt-2 md:pt-4">
          <nav className="navbar-float max-w-6xl mx-auto px-3 md:px-6 h-12 md:h-14 flex items-center">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity"><img src="/favicon.png" alt="Zuply" className="w-6 h-6 md:w-7 md:h-7 object-contain" /><span className="text-lg md:text-xl font-bold tracking-tight" style={{ color: "#2563eb" }}>zuply</span></Link>
          </nav>
        </div>
        <main className="max-w-6xl mx-auto px-3 md:px-6 py-10 relative z-10"><p className="text-gray-500">Article introuvable.</p></main>
      </div>
    );
  }

  const wordCount = [content.intro, ...content.sections.map((s) => s.content), content.conclusion]
    .join(" ").replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-white bg-orbs">
      {/* Floating navbar */}
      <div className="sticky top-0 z-50 px-2 md:px-4 pt-2 md:pt-4">
        <nav className="navbar-float max-w-6xl mx-auto px-3 md:px-6 h-12 md:h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-5 min-w-0">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"><img src="/favicon.png" alt="Zuply" className="w-6 h-6 md:w-7 md:h-7 object-contain" /><span className="text-lg md:text-xl font-bold tracking-tight" style={{ color: "#2563eb" }}>zuply</span></Link>
            <span className="text-gray-300 hidden md:inline">/</span>
            <Link href={`/sites/${article.siteId}`} className="text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors hidden md:inline">Site</Link>
            <span className="text-gray-300 hidden md:inline">/</span>
            <span className="text-sm text-gray-600 truncate max-w-[120px] md:max-w-[200px] font-medium hidden md:inline">{article.title}</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <StatusBadge status={article.status} />
            {article.status === "REVIEW" && (
              <>
                <button onClick={() => handleStatusUpdate("APPROVED")} disabled={updating}
                  className="btn-success px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm disabled:opacity-50">Approuver</button>
                <button onClick={() => handleStatusUpdate("REJECTED")} disabled={updating}
                  className="btn-danger-outline px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm disabled:opacity-50">Rejeter</button>
              </>
            )}
            {article.status === "PUBLISHED" && article.site?.domain && article.slug && (
              <a href={`https://${article.site.domain}/blog/${article.slug}`} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2">
                Voir sur le blog
              </a>
            )}
            {article.status === "APPROVED" && (
              <button onClick={handlePublish} disabled={publishing}
                className="btn-primary px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm disabled:opacity-50 flex items-center gap-2">
                {publishing && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {publishing ? "Publication..." : "Publier sur le blog"}
              </button>
            )}
            {publishSuccess && (
              <div className="flex items-center gap-2 animate-fade-in">
                <span className="text-xs text-emerald-600 font-medium">Publie avec succes</span>
                {publishedUrl && (
                  <a href={publishedUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2">
                    Voir sur le blog
                  </a>
                )}
              </div>
            )}
          </div>
        </nav>
      </div>

      <main className="max-w-4xl mx-auto px-3 md:px-6 py-6 md:py-10 animate-fade-in relative z-10">
        {/* Tabs */}
        <div className="flex items-center gap-0.5 md:gap-1 mb-6 md:mb-8 border-b border-gray-200 overflow-x-auto">
          {(["preview", "meta", "social", "json"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 md:px-5 py-2.5 md:py-3 text-xs md:text-sm font-semibold capitalize transition-all border-b-2 -mb-px whitespace-nowrap ${
                tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-900"
              }`}>
              {t === "preview" ? "Apercu" : t === "meta" ? "SEO / Meta" : t === "social" ? "Reseaux sociaux" : "JSON brut"}
            </button>
          ))}
          <div className="flex-1" />
          <span className="text-xs text-gray-500 font-medium py-2 whitespace-nowrap">{wordCount} mots</span>
        </div>

        {/* PREVIEW */}
        {tab === "preview" && (
          <article className="space-y-8">
            {article.heroImage && (
              <div className="space-y-3">
                <div className="relative w-full aspect-[1.9/1] rounded-2xl overflow-hidden shadow-lg">
                  <img src={article.heroImage} alt={article.heroImageAlt || content.title}
                    title={(content as any).heroImageTitle || content.title}
                    className="w-full h-full object-cover" loading="eager" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-5 py-4">
                    {article.heroImageAlt && <p className="text-xs text-white/80 mb-1">alt: {article.heroImageAlt}</p>}
                  </div>
                  <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md rounded-lg px-3 py-1.5">
                    <span className="text-[10px] text-white font-mono font-medium">
                      {article.heroImage.endsWith(".webp") ? "WebP" : "Preview"} / 1200x630
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 text-[11px]">
                  {[
                    { label: "Filename", value: article.heroImage.split("/").pop() || article.heroImage, mono: true },
                    { label: "Alt (SEO)", value: article.heroImageAlt || "--" },
                    { label: "Format", value: "WebP obligatoire", accent: true },
                  ].map((item) => (
                    <div key={item.label} className="card px-4 py-3">
                      <span className="text-gray-500 block mb-0.5 font-semibold">{item.label}</span>
                      <span className={`${item.mono ? "font-mono" : ""} ${item.accent ? "text-blue-600 font-medium" : "text-gray-700"} truncate block`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <header>
              <h1 className="text-2xl md:text-3xl font-bold leading-tight text-gray-900 mb-3">{content.title}</h1>
              <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                {article.category && <span>{article.category}</span>}
                {article.readTime && <span>{article.readTime}</span>}
                {article.createdAt && <span>{new Date(article.createdAt).toLocaleDateString("fr-FR")}</span>}
              </div>
            </header>

            {content.tldr && (
              <div className="card px-4 md:px-6 py-4 md:py-5" style={{ background: "linear-gradient(135deg, rgba(59,91,254,0.06), rgba(249,115,22,0.03))" }}>
                <p className="text-xs text-blue-600 font-bold tracking-wider uppercase mb-2">En bref</p>
                <p className="text-sm text-gray-800 leading-relaxed"><HtmlContent html={content.tldr} /></p>
              </div>
            )}

            {content.intro && (
              <p className="text-gray-700 leading-relaxed text-[15px]"><HtmlContent html={content.intro} /></p>
            )}

            {content.sections.map((section, i) => (
              <section key={section.id || i} className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 pt-2">{section.title}</h2>
                {section.content.split("\n").filter(Boolean).map((para, j) => (
                  <p key={j} className="text-gray-700 leading-relaxed text-[15px]"><HtmlContent html={para} /></p>
                ))}
                {section.list && section.list.length > 0 && (
                  <ul className="space-y-2 pl-1">
                    {section.list.map((item, j) => (
                      <li key={j} className="flex gap-3 text-sm">
                        <span className="text-blue-600 mt-1 shrink-0">&#8226;</span>
                        <div>
                          <span className="text-gray-900 font-semibold">{item.title}</span>
                          {item.description && <span className="text-gray-600"> -- {item.description}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {section.table && section.table.headers && (
                  <div className="overflow-x-auto card">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-white/40">
                          {section.table.headers.map((h, j) => (
                            <th key={j} className="px-4 py-3 text-left text-xs text-gray-600 font-semibold tracking-wider uppercase border-b border-gray-200/50">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100/50">
                        {section.table.rows.map((row, j) => (
                          <tr key={j} className="hover:bg-white/30 transition-colors">
                            {row.map((cell, k) => <td key={k} className="px-4 py-3 text-gray-700"><HtmlContent html={cell} /></td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}

            {content.faq && content.faq.length > 0 && (
              <section className="space-y-4 pt-4">
                <h2 className="text-xl font-bold text-gray-900">Questions frequentes</h2>
                <p className="text-xs text-gray-500 font-medium">{content.faq.length} questions -- Schema FAQPage</p>
                <div className="space-y-3">
                  {content.faq.map((item, i) => (
                    <details key={i} className="group card overflow-hidden" open={i === 0}>
                      <summary className="flex items-center justify-between cursor-pointer px-3 md:px-5 py-3 md:py-4 text-sm text-gray-900 font-semibold select-none hover:bg-white/30 transition-colors">
                        <span>{item.question}</span>
                        <svg className="w-4 h-4 text-gray-400 shrink-0 ml-3 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="px-3 md:px-5 pb-4 text-sm text-gray-700 leading-relaxed border-t border-gray-200/30 pt-3">
                        <HtmlContent html={item.answer} />
                      </div>
                    </details>
                  ))}
                </div>
                <div className="card px-3 md:px-5 py-3 md:py-4 overflow-hidden" style={{ background: "rgba(59,91,254,0.04)" }}>
                  <p className="text-xs text-blue-600 font-bold mb-2">Schema.org FAQPage (sera injecte a la publication)</p>
                  <pre className="text-[10px] text-gray-500 font-mono leading-relaxed max-h-32 overflow-auto">
{JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: content.faq.map((f) => ({ "@type": "Question", name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer.replace(/<[^>]+>/g, "") } })),
}, null, 2)}
                  </pre>
                </div>
              </section>
            )}

            {content.conclusion && (
              <section className="pt-4 border-t border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-3">Conclusion</h2>
                <p className="text-gray-700 leading-relaxed text-[15px]"><HtmlContent html={content.conclusion} /></p>
              </section>
            )}

            {content.keywords && content.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-4">
                {content.keywords.map((kw, i) => (
                  <span key={i} className={`text-xs font-medium rounded-full px-3 py-1.5 ${i === 0 ? "badge-blue" : "bg-gray-100 text-gray-600 border border-gray-200"}`}>{kw}</span>
                ))}
              </div>
            )}
          </article>
        )}

        {/* META */}
        {tab === "meta" && (
          <div className="space-y-6">
            {[
              { label: "Meta Title", value: content.metaTitle, counter: `${content.metaTitle?.length || 0} / 60` },
              { label: "Meta Description", value: content.metaDescription, counter: `${content.metaDescription?.length || 0} / 155` },
              { label: "Slug", value: content.slug, mono: true },
            ].map((item) => (
              <div key={item.label} className="space-y-3">
                <h3 className="text-sm text-gray-500 font-semibold tracking-wider uppercase">{item.label}</h3>
                <div className="card px-5 py-4">
                  <p className={`text-sm text-gray-900 font-medium ${item.mono ? "font-mono" : ""}`}>{item.value}</p>
                  {item.counter && <p className="text-xs text-gray-500 mt-1">{item.counter}</p>}
                </div>
              </div>
            ))}
            <div className="space-y-3">
              <h3 className="text-sm text-gray-500 font-semibold tracking-wider uppercase">Apercu Google</h3>
              <div className="bg-white rounded-xl px-4 md:px-6 py-4 md:py-5 max-w-[600px] shadow-sm border border-gray-100">
                <p className="text-[#1a0dab] text-lg leading-snug font-medium">{content.metaTitle}</p>
                <p className="text-[#006621] text-sm mt-1">example.com &rsaquo; blog &rsaquo; {content.slug}</p>
                <p className="text-[#545454] text-sm mt-1 leading-relaxed">{content.metaDescription}</p>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm text-gray-500 font-semibold tracking-wider uppercase">Keywords ({content.keywords?.length || 0})</h3>
              <div className="flex flex-wrap gap-2">
                {content.keywords?.map((kw, i) => (
                  <span key={i} className={`text-xs font-medium border rounded-full px-3 py-1.5 ${i === 0 ? "badge-blue" : "border-gray-200 text-gray-600 bg-white"}`}>{kw}</span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { title: "Liens internes", links: content.internalLinks },
                { title: "Liens externes", links: content.externalLinks },
              ].map((group) => (
                <div key={group.title} className="space-y-3">
                  <h3 className="text-sm text-gray-500 font-semibold tracking-wider uppercase">{group.title}</h3>
                  {group.links?.map((link: any, i: number) => (
                    <div key={i} className="card px-4 py-3">
                      <p className="text-sm text-gray-900 font-medium">{link.text}</p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{link.href}</p>
                      {link.source && <p className="text-xs text-blue-500 mt-0.5">{link.source}</p>}
                    </div>
                  ))}
                  {(!group.links || group.links.length === 0) && <p className="text-sm text-gray-500">Aucun</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SOCIAL */}
        {tab === "social" && (
          <SocialTab articleId={article.id} siteId={article.siteId} />
        )}

        {/* JSON */}
        {tab === "json" && (
          <div className="card-elevated p-3 md:p-6 overflow-auto max-h-[70vh]">
            <pre className="text-xs text-gray-700 font-mono leading-relaxed whitespace-pre-wrap">
              {JSON.stringify(content, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
