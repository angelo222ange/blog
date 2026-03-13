"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getSites, getMe, getSocialAccounts, getDashboardStats, markOnboarded } from "../lib/api";
import GuidedTour from "../components/GuidedTour";
import NavbarDropdown from "../components/NavbarDropdown";

// ─── Social Platform SVG Icons ───

function FacebookIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#E4405F">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function LinkedInIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#0A66C2">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function XIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#000000">
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

function PinterestIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#BD081C">
      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z" />
    </svg>
  );
}

function TikTokIcon({ size = 20 }: { size?: number }) {
  return <img src="/icons/tiktok.svg" alt="TikTok" width={size} height={size} className="object-contain" />;
}

// ─── Navbar (shared component) ───

// ─── Smooth Bezier helper ───

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
  }
  return d;
}

// ─── Area Chart (Articles per month) ───

function AreaChart({ labels, values, delay }: { labels: string[]; values: number[]; delay: number }) {
  const max = Math.max(...values, 1);
  const total = values.reduce((a, b) => a + b, 0);
  const w = 400, h = 180, px = 28, py = 20;
  const innerW = w - px * 2, innerH = h - py * 2 - 14;
  const points = values.map((v, i) => ({
    x: px + (i / Math.max(values.length - 1, 1)) * innerW,
    y: py + innerH - (v / max) * innerH,
  }));
  const line = smoothPath(points);
  const lastP = points[points.length - 1];
  const firstP = points[0];
  const area = `${line} L${lastP.x},${h - 10} L${firstP.x},${h - 10} Z`;
  const lastVal = values[values.length - 1];
  const prevVal = values[values.length - 2] || 0;
  const trend = lastVal > prevVal ? "up" : lastVal < prevVal ? "down" : "flat";

  return (
    <div className="card-elevated animate-fade-in-up overflow-hidden" style={{ animationDelay: `${delay}ms` }}>
      <div className="px-4 md:px-6 pt-4 md:pt-5 pb-3 md:pb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Articles generes</p>
            <div className="flex items-baseline gap-2.5 mt-1">
              <p className="text-2xl md:text-3xl font-bold text-gray-900 tabular-nums">{total}</p>
              {trend !== "flat" && (
                <span className={`text-xs font-semibold ${trend === "up" ? "text-emerald-500" : "text-red-400"}`}>
                  {trend === "up" ? "+" : "-"}{lastVal} ce mois
                </span>
              )}
            </div>
          </div>
          <span className="text-[10px] text-gray-400 font-medium bg-gray-50 px-2.5 py-1 rounded-md">6 mois</span>
        </div>

        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: "160px" }} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((pct, i) => (
            <line key={i} x1={px} x2={w - px} y1={py + innerH * (1 - pct)} y2={py + innerH * (1 - pct)}
              stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4 4" />
          ))}
          <path d={area} fill="url(#areaGrad)" />
          <path d={line} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={values[i] > 0 ? 3.5 : 2.5} fill="white" stroke="#3b82f6" strokeWidth="2" />
              {values[i] > 0 && (
                <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#6b7280" fontSize="9" fontWeight="600">{values[i]}</text>
              )}
            </g>
          ))}
        </svg>
        <div className="flex justify-between px-1 mt-1">
          {labels.map((l, i) => (
            <span key={i} className={`text-[10px] font-medium ${i === labels.length - 1 ? "text-gray-600" : "text-gray-400"}`}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Donut Chart (clean) ───

function DonutChart({ data, delay, label, total, icon }: {
  data: Array<{ name: string; value: number; color: string }>;
  delay: number;
  label: string;
  total: number;
  icon?: React.ReactNode;
}) {
  const size = 120;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="card-elevated animate-fade-in-up overflow-hidden" style={{ animationDelay: `${delay}ms` }}>
      <div className="px-4 md:px-6 pt-4 md:pt-5 pb-4 md:pb-5">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-4 md:mb-5">{label}</p>
        <div className="flex items-center gap-4 md:gap-6">
          <div className="relative shrink-0">
            <svg width={size} height={size} className="-rotate-90">
              <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
              {data.map((d, i) => {
                const pct = total > 0 ? d.value / total : 0;
                const gap = data.length > 1 ? 0.02 : 0;
                const dashLen = Math.max((pct - gap) * circumference, 0);
                const dashArray = `${dashLen} ${circumference - dashLen}`;
                const dashOffset = -(offset + gap / 2) * circumference;
                offset += pct;
                return (
                  <circle key={i} cx={size / 2} cy={size / 2} r={radius} fill="none"
                    stroke={d.color} strokeWidth={strokeWidth}
                    strokeDasharray={dashArray} strokeDashoffset={dashOffset}
                    strokeLinecap="butt"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {icon ? (
                <>
                  <div className="text-gray-300">{icon}</div>
                  <span className="text-sm font-bold text-gray-900 mt-0.5">{total}</span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold text-gray-900 leading-none tabular-nums">{total}</span>
                  <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wider mt-0.5">total</span>
                </>
              )}
            </div>
          </div>
          <div className="space-y-3 flex-1 min-w-0">
            {data.map((d, i) => {
              const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
              return (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-xs text-gray-600 font-medium">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-medium">{pct}%</span>
                    <span className="text-xs text-gray-900 font-bold tabular-nums">{d.value}</span>
                  </div>
                </div>
              );
            })}
            {data.length === 0 && (
              <p className="text-xs text-gray-400 font-medium py-4 text-center">Aucune donnee</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Platform Stats Card ───

const PLATFORM_COLORS: Record<string, string> = {
  facebook: "#1877F2", instagram: "#E4405F", linkedin: "#0A66C2",
  twitter: "#14171A", pinterest: "#BD081C", tiktok: "#000000",
};

const PLATFORM_ICONS_MAP: Record<string, JSX.Element> = {
  facebook: <FacebookIcon size={18} />,
  instagram: <InstagramIcon size={18} />,
  linkedin: <LinkedInIcon size={18} />,
  twitter: <XIcon size={18} />,
  pinterest: <PinterestIcon size={18} />,
  tiktok: <TikTokIcon size={18} />,
};

function PlatformStatsCard({ data, delay, totalPosts, publishedPosts }: {
  data: Record<string, number>;
  delay: number;
  totalPosts: number;
  publishedPosts: number;
}) {
  const platforms = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...platforms.map(([, v]) => v), 1);

  return (
    <div className="card-elevated animate-fade-in-up overflow-hidden" style={{ animationDelay: `${delay}ms` }}>
      <div className="px-4 md:px-6 pt-4 md:pt-5 pb-4 md:pb-5">
        <div className="flex items-start justify-between mb-4 md:mb-5">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Posts sociaux</p>
            <div className="flex items-baseline gap-2.5 mt-1">
              <p className="text-2xl md:text-3xl font-bold text-gray-900 tabular-nums">{totalPosts}</p>
              {publishedPosts > 0 && (
                <span className="text-xs font-semibold text-emerald-500">{publishedPosts} publies</span>
              )}
            </div>
          </div>
        </div>

        {platforms.length === 0 ? (
          <div className="py-3">
            <div className="flex items-center justify-center gap-3 mb-3">
              {["facebook", "instagram", "linkedin", "twitter", "tiktok"].map((p) => (
                <div key={p} className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center opacity-30">
                  {PLATFORM_ICONS_MAP[p]}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 font-medium text-center">Generez votre premier post</p>
          </div>
        ) : (
          <div className="space-y-3">
            {platforms.map(([platform, count]) => {
              const color = PLATFORM_COLORS[platform] || "#6b7280";
              const pct = Math.round((count / max) * 100);
              return (
                <div key={platform} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                    {PLATFORM_ICONS_MAP[platform] || (
                      <span className="text-xs font-semibold" style={{ color }}>{platform[0].toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600 capitalize">{platform}</span>
                      <span className="text-xs font-bold text-gray-900 tabular-nums">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.max(pct, 5)}%`, backgroundColor: color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stat Card (hero number) ───

function StatCard({ label, value, sub, delay }: {
  label: string; value: string | number; sub?: string; delay: number;
}) {
  return (
    <div className="card-elevated p-4 md:p-6 animate-fade-in-up overflow-hidden" style={{ animationDelay: `${delay}ms` }}>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl md:text-3xl font-bold text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1 font-medium">{sub}</p>}
    </div>
  );
}

// ─── Quick Action ───

function QuickAction({ href, icon, label, color, delay }: {
  href: string; icon: React.ReactNode; label: string; color: string; delay: number;
}) {
  return (
    <Link
      href={href}
      className="card hover-lift px-3 md:px-5 py-3 md:py-4 flex items-center gap-3 md:gap-4 group animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <span className="text-xs md:text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
        {label}
      </span>
      <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600 ml-auto transition-colors hidden md:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

// ─── Status Badge ───

const BADGE_MAP: Record<string, string> = {
  REVIEW: "badge-review", APPROVED: "badge-approved", PUBLISHED: "badge-published",
  REJECTED: "badge-rejected", DRAFT: "badge-draft", PUBLISHING: "badge-publishing", FAILED: "badge-failed",
};

// ─── Social Platform Card ───

const PLATFORMS = [
  { key: "facebook", name: "Facebook", icon: <FacebookIcon size={18} /> },
  { key: "instagram", name: "Instagram", icon: <InstagramIcon size={18} /> },
  { key: "linkedin", name: "LinkedIn", icon: <LinkedInIcon size={18} /> },
  { key: "twitter", name: "X", icon: <XIcon size={18} /> },
  { key: "pinterest", name: "Pinterest", icon: <PinterestIcon size={18} /> },
  { key: "tiktok", name: "TikTok", icon: <TikTokIcon size={18} /> },
];

// ─── Article Slideshow ───

interface ArticlePreview {
  id: string;
  title: string;
  heroImage?: string;
  heroImageAlt?: string;
  excerpt?: string;
  keywords?: string[];
  category?: string;
  readTime?: string;
  status: string;
  createdAt: string;
  siteName: string;
  siteDomain?: string;
  socialPostsCount?: number;
}

function ArticleSlideshow({ articles }: { articles: ArticlePreview[] }) {
  const [current, setCurrent] = useState(0);

  const goTo = useCallback((idx: number) => {
    setCurrent(Math.max(0, Math.min(idx, articles.length - 1)));
  }, [articles.length]);

  if (articles.length === 0) {
    return (
      <div className="card p-6 md:p-8 text-center flex flex-col items-center justify-center h-full min-h-[320px] md:min-h-[420px]">
        <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p className="text-gray-500 text-sm font-medium">Aucun article genere.</p>
        <p className="text-gray-400 text-xs mt-1">Selectionnez un site pour commencer.</p>
      </div>
    );
  }

  const article = articles[current];

  return (
    <div className="card-elevated overflow-hidden flex flex-col h-full">
      {/* Hero image */}
      <Link href={`/articles/${article.id}`} className="block relative overflow-hidden group shrink-0 h-[180px] md:h-[220px]">
        {article.heroImage ? (
          <img
            src={article.heroImage}
            alt={article.heroImageAlt || article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <svg className="w-12 h-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
        )}
        {/* Overlays */}
        <div className="absolute top-2.5 left-2.5">
          <span className={`badge ${BADGE_MAP[article.status] || "badge-draft"} text-[10px]`}>
            {article.status}
          </span>
        </div>
        {article.category && (
          <div className="absolute top-2.5 right-2.5">
            <span className="text-[10px] font-semibold text-gray-900 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-md">
              {article.category}
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4 md:p-5 flex-1 flex flex-col">
        <Link href={`/articles/${article.id}`} className="group">
          <h3 className="text-sm md:text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug mb-1.5">
            {article.title}
          </h3>
        </Link>
        {/* Site + status row */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-bold text-blue-600">{article.siteName[0]}</span>
          </div>
          <span className="text-xs text-gray-600 font-medium">{article.siteName}</span>
          <span className="text-gray-300">|</span>
          <span className={`text-[10px] font-semibold ${article.status === "PUBLISHED" ? "text-emerald-600" : article.status === "REVIEW" ? "text-amber-600" : "text-gray-500"}`}>
            {article.status}
          </span>
          {article.readTime && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {article.readTime}
              </span>
            </>
          )}
        </div>
        {article.excerpt && (
          <p className="text-sm text-gray-500 leading-relaxed mb-3 line-clamp-3">
            {article.excerpt}
          </p>
        )}
        {/* Keywords tags */}
        {article.keywords && article.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {article.keywords.map((kw, i) => (
              <span key={i} className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                {kw}
              </span>
            ))}
          </div>
        )}
        {/* Footer row */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {new Date(article.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </span>
            {(article.socialPostsCount ?? 0) > 0 && (
              <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
                {article.socialPostsCount} posts
              </span>
            )}
          </div>
          <Link href={`/articles/${article.id}`} className="text-xs text-blue-600 font-semibold hover:underline">
            Voir l'article
          </Link>
        </div>
      </div>

      {/* Navigation */}
      {articles.length > 1 && (
        <div className="px-5 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {articles.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`transition-all duration-300 rounded-full ${
                  i === current ? "w-5 h-1.5 bg-blue-500" : "w-1.5 h-1.5 bg-gray-200 hover:bg-gray-300"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goTo(current - 1)}
              disabled={current === 0}
              className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => goTo(current + 1)}
              disabled={current === articles.length - 1}
              className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [socialSiteId, setSocialSiteId] = useState<string>("");
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    getMe()
      .then((u) => {
        setUser(u);
        // Show tour only on first-ever login (never onboarded)
        if (!u.onboardedAt) setShowTour(true);
        return Promise.all([getSites(), getDashboardStats()]);
      })
      .then(([s, st]) => {
        setSites(s);
        setStats(st);
        if (s.length > 0) setSocialSiteId(s[0].id);
      })
      .catch(() => { window.location.href = "/login"; })
      .finally(() => { setAuthChecked(true); setLoading(false); });
  }, []);

  // Load social accounts when selected site changes
  useEffect(() => {
    if (!socialSiteId) return;
    getSocialAccounts(socialSiteId)
      .then(setSocialAccounts)
      .catch(() => setSocialAccounts([]));
  }, [socialSiteId]);

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white bg-orbs gap-5">
        <div className="loader-orbit" />
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="loader-dot" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
        <div className="loader-bar-track" />
      </div>
    );
  }
  if (!user) return null;

  // Compute stats from sites data
  const totalArticles = sites.reduce((sum, s) => sum + (s.articles?.length || 0), 0);
  const allArticles = sites.flatMap((s) =>
    (s.articles || []).map((a: any) => ({ ...a, siteName: s.name, siteId: s.id }))
  );

  const now = new Date();
  const thisMonth = allArticles.filter((a: any) => {
    const d = new Date(a.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="min-h-screen bg-white bg-orbs">
      <NavbarDropdown user={user} />

      <main className="max-w-6xl mx-auto px-3 md:px-6 py-6 md:py-10">
        {/* Welcome + Stats */}
        <div className="mb-6 md:mb-10 animate-fade-in-up" data-tour="welcome">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
            Bonjour, {user.name || user.email.split("@")[0]}
          </h1>
          <p className="text-xs md:text-sm text-gray-500 font-medium">
            Vue d'ensemble de votre activite
          </p>
        </div>

        {stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5 mb-6 md:mb-10" data-tour="stats">
            <AreaChart
              labels={stats.months}
              values={stats.articlesByMonth}
              delay={50}
            />
            <DonutChart
              label="Articles par site"
              data={stats.articlesBySite.filter((s: any) => s.count > 0).map((s: any, i: number) => ({
                name: s.name.length > 18 ? s.name.slice(0, 18) + "..." : s.name,
                value: s.count,
                color: ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#ec4899", "#06b6d4"][i % 7],
              }))}
              total={totalArticles}
              delay={100}
            />
            <PlatformStatsCard
              data={stats.postsByPlatform || {}}
              totalPosts={stats.totalSocialPosts}
              publishedPosts={stats.publishedPosts}
              delay={150}
            />
            <DonutChart
              label="Statut des publications"
              data={[
                { name: "Publies", value: stats.publishedPosts || 0, color: "#10b981" },
                { name: "En attente", value: (stats.postsByStatus?.PENDING_REVIEW || 0) + (stats.postsByStatus?.APPROVED || 0), color: "#f59e0b" },
                { name: "Echecs", value: stats.postsByStatus?.FAILED || 0, color: "#ef4444" },
              ].filter((d) => d.value > 0)}
              total={stats.totalSocialPosts}
              delay={200}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-10">
            <StatCard label="Sites" value={sites.length} sub="actifs" delay={50} />
            <StatCard label="Articles" value={totalArticles} sub="total generes" delay={100} />
            <StatCard label="Ce mois" value={thisMonth} sub="articles" delay={150} />
            <StatCard label="Reseaux" value="0" sub="posts programmes" delay={200} />
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-6 md:mb-10" data-tour="actions">
          <h2 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4 animate-fade-in">Actions rapides</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
            <QuickAction
              href={sites[0] ? `/sites/${sites[0].id}` : "#"}
              icon={
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4C4 2.89543 4.89543 2 6 2H14L20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V4Z" fill="#3b5bfe" opacity="0.15"/>
                  <path d="M14 2L20 8H15C14.4477 8 14 7.55228 14 7V2Z" fill="#3b5bfe" opacity="0.3"/>
                  <path d="M12 11V17M9 14H15" stroke="#3b5bfe" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              }
              label="Generer un article"
              color="bg-blue-50"
              delay={250}
            />
            <QuickAction
              href="/social"
              icon={
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="3" fill="#f97316" opacity="0.15"/>
                  <path d="M8 2V5M16 2V5" stroke="#f97316" strokeWidth="2" strokeLinecap="round"/>
                  <rect x="7" y="10" width="3" height="3" rx="0.5" fill="#f97316"/>
                  <rect x="7" y="15" width="3" height="3" rx="0.5" fill="#f97316" opacity="0.4"/>
                  <rect x="12" y="10" width="3" height="3" rx="0.5" fill="#f97316" opacity="0.4"/>
                  <rect x="12" y="15" width="3" height="3" rx="0.5" fill="#f97316" opacity="0.4"/>
                </svg>
              }
              label="Programmer un post"
              color="bg-orange-50"
              delay={300}
            />
            <QuickAction
              href="/social"
              icon={
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle cx="6" cy="12" r="3" fill="#7c3aed" opacity="0.2"/>
                  <circle cx="18" cy="6" r="3" fill="#7c3aed" opacity="0.2"/>
                  <circle cx="18" cy="18" r="3" fill="#7c3aed" opacity="0.2"/>
                  <circle cx="6" cy="12" r="2" fill="#7c3aed"/>
                  <circle cx="18" cy="6" r="2" fill="#7c3aed"/>
                  <circle cx="18" cy="18" r="2" fill="#7c3aed"/>
                  <path d="M8 11L16 7M8 13L16 17" stroke="#7c3aed" strokeWidth="1.5"/>
                </svg>
              }
              label="Voir les reseaux"
              color="bg-purple-50"
              delay={350}
            />
            <QuickAction
              href={sites[0] ? `/sites/${sites[0].id}` : "#"}
              icon={
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="3" width="9" height="9" rx="2" fill="#10b981" opacity="0.2"/>
                  <rect x="13" y="3" width="9" height="9" rx="2" fill="#10b981" opacity="0.2"/>
                  <rect x="2" y="14" width="9" height="9" rx="2" fill="#10b981" opacity="0.2"/>
                  <rect x="13" y="14" width="9" height="9" rx="2" fill="#10b981" opacity="0.2"/>
                  <rect x="4" y="5" width="5" height="5" rx="1" fill="#10b981"/>
                  <rect x="15" y="5" width="5" height="5" rx="1" fill="#10b981" opacity="0.6"/>
                  <rect x="4" y="16" width="5" height="5" rx="1" fill="#10b981" opacity="0.6"/>
                  <rect x="15" y="16" width="5" height="5" rx="1" fill="#10b981" opacity="0.4"/>
                </svg>
              }
              label="Gerer les sites"
              color="bg-emerald-50"
              delay={400}
            />
          </div>
        </div>

        {/* Two-column: Article Slideshow + Social */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-10 items-stretch">
          {/* Article Slideshow */}
          <div className="lg:col-span-2 animate-fade-in flex flex-col" style={{ animationDelay: "450ms" }} data-tour="activity">
            <h2 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Activite recente</h2>
            <div className="flex-1">
              <ArticleSlideshow articles={stats?.recentArticles || []} />
            </div>
          </div>

          {/* Social Platforms */}
          <div className="animate-fade-in flex flex-col" style={{ animationDelay: "500ms" }} data-tour="social">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base md:text-lg font-bold text-gray-900">Reseaux sociaux</h2>
              <Link href="/social" className="text-xs text-blue-600 font-semibold hover:underline">
                Configurer
              </Link>
            </div>
            <div className="card p-4 flex-1 flex flex-col">
              {/* Site selector */}
              {sites.length > 1 && (
                <div className="mb-3 pb-3 border-b border-gray-200">
                  <select
                    value={socialSiteId}
                    onChange={(e) => setSocialSiteId(e.target.value)}
                    className="w-full text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {sites.length === 1 && (
                <div className="mb-3 pb-3 border-b border-gray-200">
                  <span className="text-sm font-semibold text-gray-900">{sites[0].name}</span>
                </div>
              )}
              <div className="space-y-2">
                {PLATFORMS.map((p) => {
                  const account = socialAccounts.find((a: any) => a.platform === p.key);
                  const connected = !!account;
                  return (
                    <div key={p.key} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shadow-sm">
                          {p.icon}
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{p.name}</span>
                      </div>
                      {connected ? (
                        <span className="text-xs font-semibold text-emerald-600">
                          {account.accountName || "Connecte"}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-gray-400">
                          Non connecte
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <Link
                href="/social"
                className="block text-center text-sm font-semibold text-blue-600 hover:text-blue-700 pt-3 mt-auto transition-colors"
              >
                Connecter un compte
              </Link>
            </div>
          </div>
        </div>

        {/* Sites Grid */}
        <div className="animate-fade-in" style={{ animationDelay: "550ms" }} data-tour="sites">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base md:text-lg font-bold text-gray-900">Vos sites</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-medium">{sites.length} sites</span>
              <Link href="/sites/new" className="btn-primary px-3 py-1.5 text-xs font-semibold">+ Ajouter</Link>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {sites.map((site, i) => (
              <Link
                key={site.id}
                href={`/sites/${site.id}`}
                className="card hover-lift p-4 md:p-5 block group"
                style={{ animationDelay: `${600 + i * 40}ms` }}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {site.name}
                  </span>
                  <span className={`badge ${site.theme === "SAAS" ? "badge-blue" : "badge-orange"}`}>
                    {site.theme === "SAAS" ? "SaaS" : "Local"}
                  </span>
                </div>
                {site.domain && (
                  <p className="text-xs text-gray-500 font-mono mb-2">{site.domain}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-600 font-medium">
                  {site.city && <span>{site.city}</span>}
                  <span className="text-gray-400">
                    {site.articles?.length || 0} articles
                  </span>
                </div>
                <div className="mt-4 h-[2px] rounded-full bg-gray-200/50 overflow-hidden">
                  <div className="h-full w-0 group-hover:w-1/3 rounded-full transition-all duration-500 bg-blue-600" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      {/* Guided Tour for first-time users */}
      {showTour && (
        <GuidedTour
          tourId="dashboard"
          onComplete={() => { setShowTour(false); markOnboarded().catch(() => {}); }}
          steps={[
            {
              target: "[data-tour='welcome']",
              title: "Bienvenue sur Zuply",
              description: "Votre tableau de bord centralise toute votre activite : sites, articles, reseaux sociaux et statistiques en un coup d'oeil.",
              placement: "bottom",
              icon: "welcome",
            },
            {
              target: "[data-tour='stats']",
              title: "Vos statistiques",
              description: "Suivez l'evolution de votre contenu avec des graphiques detailles : articles par mois, repartition par site, performances sociales.",
              placement: "bottom",
              icon: "chart",
            },
            {
              target: "[data-tour='actions']",
              title: "Actions rapides",
              description: "Generez un article, programmez un post social ou gerez vos sites en un seul clic depuis ces raccourcis.",
              placement: "top",
              icon: "generate",
            },
            {
              target: "[data-tour='activity']",
              title: "Activite recente",
              description: "Retrouvez vos derniers articles generes. Cliquez sur un article pour le modifier, l'approuver ou le publier.",
              placement: "top",
              icon: "sites",
            },
            {
              target: "[data-tour='social']",
              title: "Reseaux sociaux",
              description: "Visualisez l'etat de vos comptes connectes. Allez dans Configurer pour lier de nouvelles plateformes.",
              placement: "left",
              icon: "social",
            },
            {
              target: "[data-tour='sites']",
              title: "Vos sites",
              description: "Chaque carte represente un site. Cliquez pour acceder aux articles, generer du contenu et configurer le blog.",
              placement: "top",
              icon: "check",
            },
          ]}
        />
      )}
    </div>
  );
}
