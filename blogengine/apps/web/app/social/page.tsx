"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/use-auth";
import NavbarDropdown from "../../components/NavbarDropdown";
import {
  getSites,
  getSocialAccounts,
  getSocialConfig,
  updateSocialConfig,
  getOAuthUrl,
  disconnectSocialAccount,
  getLinkedInOrgs,
  setLinkedInMode,
  generateStandalonePost,
  getStandalonePosts,
  updateSocialPost,
  approveSocialPost,
  publishSocialPost,
  deleteSocialPost,
  getMotionTemplates,
  generateMotionSlides as generateMotionSlidesApi,
  generateAndRenderMotion,
} from "../../lib/api";

// ─── Platform Definitions ───

const PLATFORM_LIMITS: Record<string, number> = {
  facebook: 500, instagram: 2200, linkedin: 3000, twitter: 280, pinterest: 500, tiktok: 2200,
};

const PLATFORM_META: Record<string, { label: string; color: string; bgColor: string; icon: JSX.Element }> = {
  facebook: {
    label: "Facebook",
    color: "#1877F2",
    bgColor: "bg-[#1877F2]/5",
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  instagram: {
    label: "Instagram",
    color: "#E4405F",
    bgColor: "bg-[#E4405F]/5",
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="#E4405F">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  linkedin: {
    label: "LinkedIn",
    color: "#0A66C2",
    bgColor: "bg-[#0A66C2]/5",
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="#0A66C2">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  twitter: {
    label: "X / Twitter",
    color: "#000000",
    bgColor: "bg-gray-100",
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="#000000">
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
      </svg>
    ),
  },
  pinterest: {
    label: "Pinterest",
    color: "#BD081C",
    bgColor: "bg-[#BD081C]/5",
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="#BD081C">
        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z" />
      </svg>
    ),
  },
  tiktok: {
    label: "TikTok",
    color: "#000000",
    bgColor: "bg-gray-100",
    icon: <img src="/icons/tiktok.svg" alt="TikTok" width={22} height={22} className="object-contain" />,
  },
};

const ALL_PLATFORMS = ["facebook", "instagram", "linkedin", "twitter", "pinterest", "tiktok"];

// ─── Navbar (shared component) ───

// ─── Platform Image Formats ───

const PLATFORM_IMAGE_RATIO: Record<string, { ratio: string; label: string; css: string }> = {
  facebook: { ratio: "1.91:1", label: "Paysage", css: "aspect-[1.91/1]" },
  instagram: { ratio: "1:1", label: "Carre", css: "aspect-square" },
  linkedin: { ratio: "1.91:1", label: "Paysage", css: "aspect-[1.91/1]" },
  twitter: { ratio: "16:9", label: "Paysage", css: "aspect-video" },
  pinterest: { ratio: "2:3", label: "Portrait", css: "aspect-[2/3]" },
  tiktok: { ratio: "9:16", label: "Portrait", css: "aspect-[9/16]" },
};

const PLATFORM_RULES: Record<string, { supportsText: boolean; supportsImage: boolean; requiresCarousel: boolean; maxImages: number }> = {
  facebook: { supportsText: true, supportsImage: true, requiresCarousel: false, maxImages: 10 },
  instagram: { supportsText: true, supportsImage: true, requiresCarousel: false, maxImages: 10 },
  linkedin: { supportsText: true, supportsImage: true, requiresCarousel: false, maxImages: 9 },
  twitter: { supportsText: true, supportsImage: true, requiresCarousel: false, maxImages: 4 },
  pinterest: { supportsText: true, supportsImage: true, requiresCarousel: false, maxImages: 1 },
  tiktok: { supportsText: true, supportsImage: true, requiresCarousel: true, maxImages: 35 },
};

// ─── Carousel Preview Component ───

function CarouselPreview({ slides, aspectClass = "aspect-square" }: {
  slides: Array<{ slideType?: string; title: string; subtitle: string; highlight?: string; imageUrl?: string | null }>;
  aspectClass?: string;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = slides[currentSlide];
  if (!slide) return null;

  const isFirst = currentSlide === 0;
  const isLast = currentSlide === slides.length - 1;

  // Render title with highlight word in accent color
  const renderTitle = (title: string, highlight?: string) => {
    if (!highlight || !title.includes(highlight)) {
      return <span>{title}</span>;
    }
    const parts = title.split(highlight);
    return (
      <>
        {parts[0]}<span className="text-blue-400">{highlight}</span>{parts.slice(1).join(highlight)}
      </>
    );
  };

  return (
    <div className={`relative w-full ${aspectClass} bg-gray-950 overflow-hidden group select-none`}>
      {/* Background image with heavy dark overlay */}
      {slide.imageUrl ? (
        <>
          <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black" />
      )}

      {/* Subtle gradient for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />

      {/* Main text content - clean layout, no type labels */}
      <div className={`absolute inset-0 flex flex-col p-5 ${
        isFirst ? "justify-center items-center text-center" :
        isLast ? "justify-end items-center text-center pb-12" :
        "justify-end items-start pb-12"
      }`}>
        {isFirst ? (
          /* First slide: big centered hook */
          <div className="max-w-[90%]">
            <p className="text-white text-[22px] font-black leading-tight tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {renderTitle(slide.title, slide.highlight)}
            </p>
            <div className="w-10 h-0.5 bg-blue-400 mx-auto mt-3 mb-3 rounded-full" />
            <p className="text-white/80 text-[13px] leading-relaxed font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
              {slide.subtitle}
            </p>
          </div>
        ) : isLast ? (
          /* Last slide: CTA centered */
          <div className="max-w-[90%]">
            <p className="text-white text-[20px] font-black leading-tight tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {renderTitle(slide.title, slide.highlight)}
            </p>
            <p className="text-white/80 text-[12px] leading-relaxed font-medium mt-3 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
              {slide.subtitle}
            </p>
          </div>
        ) : (
          /* Middle slides: left-aligned with accent bar */
          <div className="max-w-[95%]">
            <div className="flex items-start gap-3">
              <div className="w-1 self-stretch rounded-full shrink-0 mt-0.5 bg-blue-400" />
              <div>
                <p className="text-white text-[18px] font-black leading-tight tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  {renderTitle(slide.title, slide.highlight)}
                </p>
                <p className="text-white/75 text-[12px] leading-relaxed font-medium mt-2 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                  {slide.subtitle}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Slide indicators (dots) - bottom center */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setCurrentSlide(i); }}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === currentSlide ? "bg-white w-5" : "bg-white/30 w-1.5 hover:bg-white/50"
            }`}
          />
        ))}
      </div>

      {/* Navigation arrows - appear on hover */}
      {currentSlide > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setCurrentSlide(currentSlide - 1); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}
      {currentSlide < slides.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setCurrentSlide(currentSlide + 1); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      )}

      {/* Slide counter - top right */}
      <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white/80 text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/10">
        {currentSlide + 1}/{slides.length}
      </div>
    </div>
  );
}

// ─── Truncated Post Content (like real social feeds) ───

function TruncatedPostContent({ content, hashtags, maxLines = 4, className = "" }: {
  content: string;
  hashtags?: string;
  maxLines?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const lineHeight = 1.5; // em
  const fontSize = 15; // px
  const maxHeight = maxLines * fontSize * lineHeight;
  const isLong = content.length > 200;

  return (
    <div className={`relative ${className}`}>
      <div
        className={`overflow-y-auto transition-all duration-300 ${expanded ? "" : "overflow-hidden"}`}
        style={{
          maxHeight: expanded ? "300px" : `${maxHeight}px`,
          WebkitOverflowScrolling: "touch",
        }}
      >
        <p className="text-[15px] text-gray-900 leading-relaxed whitespace-pre-wrap">{content}</p>
        {hashtags && <p className="text-[15px] text-blue-600 mt-2">{hashtags}</p>}
      </div>
      {isLong && !expanded && (
        <div className="relative">
          <div className="absolute bottom-full left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(true); }}
            className="text-[13px] text-gray-400 font-medium hover:text-gray-600 transition-colors mt-0.5"
          >
            ...voir plus
          </button>
        </div>
      )}
      {isLong && expanded && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(false); }}
          className="text-[13px] text-gray-400 font-medium hover:text-gray-600 transition-colors mt-1"
        >
          voir moins
        </button>
      )}
    </div>
  );
}

// ─── Post Preview Modal (full-screen overlay) ───

function PostPreviewModal({
  post, device, platform, onDeviceChange, onPlatformChange, connectedPlatforms, onClose,
}: {
  post: any;
  device: "phone" | "desktop";
  platform: string;
  onDeviceChange: (d: "phone" | "desktop") => void;
  onPlatformChange: (p: string) => void;
  connectedPlatforms: string[];
  onClose: () => void;
}) {
  const meta = PLATFORM_META[platform] || PLATFORM_META.facebook;
  const imageRatio = PLATFORM_IMAGE_RATIO[platform] || PLATFORM_IMAGE_RATIO.facebook;
  const rules = PLATFORM_RULES[platform] || PLATFORM_RULES.facebook;
  const imageUrl = post.mediaUrls?.[0] ?? null;
  const hashtags = (Array.isArray(post.hashtags) ? post.hashtags : []).map((h: string) => h.startsWith("#") ? h : `#${h}`).join(" ");
  const isCompatible = !(rules.requiresCarousel && (!imageUrl || (post.mediaUrls?.length || 0) < 2));
  const allPlatforms = connectedPlatforms.length > 0 ? connectedPlatforms : ALL_PLATFORMS;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal content */}
      <div
        className="relative bg-white rounded-none sm:rounded-2xl shadow-2xl w-full sm:max-w-[800px] h-full sm:h-auto sm:max-h-[90vh] overflow-hidden animate-fade-in-up sm:mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
          <h3 className="text-base sm:text-lg font-bold text-gray-900">Apercu du post</h3>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Device toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => onDeviceChange("phone")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  device === "phone" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Mobile
              </button>
              <button
                onClick={() => onDeviceChange("desktop")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  device === "desktop" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Desktop
              </button>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Platform tabs */}
        <div className="flex gap-1 px-3 sm:px-6 py-2 sm:py-3 border-b border-gray-100 overflow-x-auto scrollbar-hide">
          {allPlatforms.map((p) => {
            const pmeta = PLATFORM_META[p];
            if (!pmeta) return null;
            return (
              <button
                key={p}
                onClick={() => onPlatformChange(p)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                  platform === p
                    ? "bg-white border-gray-200 shadow-sm text-gray-900"
                    : "border-transparent text-gray-500 hover:bg-gray-50"
                }`}
              >
                <span className="w-4 h-4 flex items-center justify-center shrink-0">{pmeta.icon}</span>
                {pmeta.label}
              </button>
            );
          })}
        </div>

        {/* Preview area */}
        <div className="overflow-y-auto p-3 sm:p-6" style={{ maxHeight: "calc(100vh - 140px)" }}>
          {!isCompatible && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-sm text-amber-800">
              Ce format n'est pas compatible avec {meta?.label || platform}.
              {rules.requiresCarousel && " TikTok necessite un carrousel avec plusieurs images."}
            </div>
          )}

          <div className={`flex justify-center ${device === "phone" ? "" : ""}`}>
            <div className={`transition-all duration-300 ${device === "phone" ? "w-[375px]" : "w-full max-w-[600px]"}`}>
              {/* Device frame */}
              <div className={`bg-white ${
                device === "phone"
                  ? "rounded-[2.5rem] border-[8px] border-gray-900 shadow-2xl flex flex-col overflow-hidden"
                  : "rounded-xl border border-gray-200 shadow-lg overflow-hidden"
              }`} style={device === "phone" ? { height: "680px" } : undefined}>
                {/* Phone status bar */}
                {device === "phone" && (
                  <div className="bg-white px-6 py-2 flex items-center justify-between shrink-0">
                    <span className="text-xs font-semibold text-gray-900">9:41</span>
                    <div className="absolute left-1/2 -translate-x-1/2 w-[80px] h-[25px] bg-gray-900 rounded-full" />
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-gray-900" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21l3.6-4.8A6 6 0 0012 14a6 6 0 00-3.6 2.2L12 21z"/><path d="M12 21l5.7-7.6A9 9 0 0012 11a9 9 0 00-5.7 2.4L12 21z" opacity="0.5"/><path d="M12 21l7.8-10.4A12 12 0 0012 8a12 12 0 00-7.8 2.6L12 21z" opacity="0.25"/></svg>
                      <svg className="w-4 h-4 text-gray-900" fill="currentColor" viewBox="0 0 24 24"><rect x="1" y="6" width="3" height="12" rx="0.5" opacity="0.3"/><rect x="6" y="4" width="3" height="14" rx="0.5" opacity="0.5"/><rect x="11" y="2" width="3" height="16" rx="0.5" opacity="0.7"/><rect x="16" y="0" width="3" height="18" rx="0.5"/></svg>
                      <svg className="w-6 h-4 text-gray-900" fill="currentColor" viewBox="0 0 28 14"><rect x="0" y="1" width="22" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/><rect x="23" y="4.5" width="2" height="5" rx="1" opacity="0.4"/><rect x="2" y="3" width="16" height="8" rx="1"/></svg>
                    </div>
                  </div>
                )}

                {/* Scrollable content area for phone */}
                <div className={device === "phone" ? "flex-1 min-h-0 overflow-y-auto scrollbar-hide" : ""}>

                {/* Platform app header */}
                {platform === "facebook" ? (
                  <div className="bg-white border-b border-gray-200">
                    <div className="px-4 py-2.5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                        {(post.socialAccount?.accountName || "P")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-gray-900">{post.socialAccount?.accountName || "Ma Page"}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] text-gray-500">A l'instant</span>
                          <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.418 14.032c-.354.354-.92.354-1.274 0l-3.79-3.79A.9.9 0 0111 11.568V7.5a.9.9 0 011.8 0v3.742l3.618 3.618c.354.354.354.92 0 1.274v-.002z"/></svg>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 ml-auto" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="18" r="2"/></svg>
                    </div>
                  </div>
                ) : platform === "instagram" ? (
                  <div className="bg-white border-b border-gray-200">
                    <div className="px-4 py-2.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-[2px]">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-xs font-bold text-gray-900">
                          {(post.socialAccount?.accountName || "P")[0].toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-gray-900">{post.socialAccount?.accountName || "mon_compte"}</p>
                        <p className="text-[11px] text-gray-500">Localisation</p>
                      </div>
                      <svg className="w-5 h-5 text-gray-900 ml-auto" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="18" r="2"/></svg>
                    </div>
                  </div>
                ) : platform === "twitter" ? (
                  <div className="bg-white border-b border-gray-200">
                    <div className="px-4 py-3 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                        {(post.socialAccount?.accountName || "P")[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[15px] font-bold text-gray-900">{post.socialAccount?.accountName || "Mon Compte"}</span>
                          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"/></svg>
                        </div>
                        <span className="text-[13px] text-gray-500">@{(post.socialAccount?.accountName || "compte").toLowerCase().replace(/\s/g, "_")}</span>
                      </div>
                    </div>
                  </div>
                ) : platform === "linkedin" ? (
                  <div className="bg-white border-b border-gray-200">
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-sm font-bold">
                        {(post.socialAccount?.accountName || "P")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-gray-900">{post.socialAccount?.accountName || "Mon Entreprise"}</p>
                        <p className="text-[12px] text-gray-500">1 234 abonnes</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[11px] text-gray-400">A l'instant</span>
                          <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1.5 15.5v-7l6 3.5-6 3.5z"/></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : platform === "tiktok" ? (
                  <div className="bg-black">
                    <div className="px-4 py-2 flex items-center justify-between">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                      <div className="flex gap-6">
                        <span className="text-white/60 text-sm font-semibold">Suivis</span>
                        <span className="text-white text-sm font-bold border-b-2 border-white pb-0.5">Pour toi</span>
                      </div>
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">{meta?.icon}</div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{post.socialAccount?.accountName || "Mon compte"}</p>
                      <p className="text-xs text-gray-400">A l'instant</p>
                    </div>
                  </div>
                )}

                {/* Post content by platform */}
                {platform === "instagram" ? (
                  <>
                    {imageUrl && (
                      <div className="w-full aspect-square bg-gray-100 overflow-hidden">
                        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex gap-4">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                        </div>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                      </div>
                      <p className="text-xs font-bold text-gray-900 mb-1">42 J'aime</p>
                      <div className="relative">
                        <TruncatedPostContent
                          content={`${(post.socialAccount?.accountName || "mon_compte").toLowerCase().replace(/\s/g, "_")} ${post.content}`}
                          hashtags={hashtags ? hashtags.replace(/text-blue-600/g, "text-blue-900") : undefined}
                          maxLines={3}
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-2">Voir les 3 commentaires</p>
                    </div>
                  </>
                ) : platform === "tiktok" ? (
                  <div className="relative bg-black">
                    {imageUrl ? (
                      <div className={`w-full ${device === "phone" ? "aspect-[9/16]" : "aspect-video"} overflow-hidden`}>
                        <img src={imageUrl} alt="" className="w-full h-full object-cover opacity-90" />
                      </div>
                    ) : (
                      <div className={`w-full ${device === "phone" ? "aspect-[9/16]" : "aspect-video"} bg-gray-900`} />
                    )}
                    <div className="absolute bottom-0 left-0 right-14 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                      <p className="text-white text-[13px] font-bold mb-1">@{(post.socialAccount?.accountName || "compte").toLowerCase().replace(/\s/g, "_")}</p>
                      <p className="text-white text-[13px] leading-relaxed line-clamp-3">{post.content}</p>
                      {hashtags && <p className="text-white/80 text-[12px] mt-1">{hashtags}</p>}
                      <div className="flex items-center gap-2 mt-3">
                        <div className="w-5 h-5 rounded-full bg-white/20" />
                        <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden"><div className="w-1/3 h-full bg-white rounded-full" /></div>
                      </div>
                    </div>
                    {device === "phone" && (
                      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-6">
                        <div className="w-10 h-10 rounded-full bg-gray-600 border-2 border-white overflow-hidden flex items-center justify-center text-white text-xs font-bold">
                          {(post.socialAccount?.accountName || "P")[0].toUpperCase()}
                        </div>
                        {[
                          { icon: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z", label: "4.2K" },
                          { icon: "M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z", label: "89" },
                          { icon: "M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z", label: "" },
                          { icon: "M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z", label: "312" },
                        ].map((item, i) => (
                          <div key={i} className="flex flex-col items-center">
                            <svg className="w-7 h-7 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
                            {item.label && <span className="text-white text-[10px] font-semibold mt-0.5">{item.label}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : platform === "twitter" ? (
                  <>
                    <div className="px-4 pb-3">
                      <TruncatedPostContent content={post.content} hashtags={hashtags} maxLines={6} />
                    </div>
                    {imageUrl && (
                      <div className="mx-4 mb-3 rounded-2xl overflow-hidden border border-gray-200">
                        <div className="w-full aspect-video bg-gray-100 overflow-hidden">
                          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )}
                    <div className="px-4 pb-3 pt-2 border-t border-gray-100 flex justify-between text-gray-500">
                      {[
                        { icon: "M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z", count: "3" },
                        { icon: "M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3", count: "7" },
                        { icon: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z", count: "42" },
                        { icon: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5", count: "" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
                          {item.count && <span className="text-[12px]">{item.count}</span>}
                        </div>
                      ))}
                    </div>
                  </>
                ) : platform === "pinterest" ? (
                  <>
                    {imageUrl && (
                      <div className="w-full aspect-[2/3] max-h-[400px] bg-gray-100 overflow-hidden">
                        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="px-4 py-3">
                      <p className="text-[15px] font-bold text-gray-900 mb-1">{post.content.slice(0, 100)}</p>
                      <p className="text-[13px] text-gray-600 leading-relaxed">{post.content.slice(100)}</p>
                      {hashtags && <p className="text-[13px] text-gray-500 mt-2">{hashtags}</p>}
                      <div className="flex items-center gap-3 mt-3">
                        <button className="flex-1 bg-red-600 text-white text-sm font-bold py-2.5 rounded-full">Enregistrer</button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Facebook / LinkedIn */}
                    <div className="px-4 py-3">
                      <TruncatedPostContent content={post.content} hashtags={hashtags} maxLines={5} />
                    </div>
                    {imageUrl && (
                      <div className={`w-full ${imageRatio.css} bg-gray-100 overflow-hidden`}>
                        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="px-4 py-1.5 flex justify-between text-gray-500 text-[12px]">
                      <span>42 reactions</span>
                      <span>3 commentaires - 2 partages</span>
                    </div>
                    <div className="px-4 py-2.5 flex border-t border-gray-200">
                      {(platform === "facebook"
                        ? [{ label: "J'aime", icon: "M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V2.75a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.228.22.442.396.632C6.888 19.988 7.616 20.5 8.5 20.5h.5" },
                          { label: "Commenter", icon: "M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" },
                          { label: "Partager", icon: "M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" }]
                        : [{ label: "J'aime", icon: "M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V2.75a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.228.22.442.396.632C6.888 19.988 7.616 20.5 8.5 20.5h.5" },
                          { label: "Commenter", icon: "M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" },
                          { label: "Republier", icon: "M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" }]
                      ).map((item) => (
                        <button key={item.label} className="flex-1 flex items-center justify-center gap-2 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
                          <span className="text-[13px] font-semibold">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                </div>{/* End scrollable content area */}

                {/* Phone home bar */}
                {device === "phone" && platform !== "tiktok" && (
                  <div className="bg-white flex justify-center py-2 shrink-0">
                    <div className="w-32 h-1 bg-gray-300 rounded-full" />
                  </div>
                )}
                {device === "phone" && platform === "tiktok" && (
                  <div className="bg-black flex justify-center py-2 shrink-0">
                    <div className="w-32 h-1 bg-gray-600 rounded-full" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Format info */}
          <div className="mt-5 flex items-center justify-center gap-4 text-[11px] text-gray-400">
            <span>Format : {imageRatio.ratio} ({imageRatio.label})</span>
            <span>Max {PLATFORM_LIMITS[platform] || "?"} caracteres</span>
            {rules.requiresCarousel && <span className="text-amber-500 font-semibold">Carrousel requis</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Onboarding Wizard ───

const ONBOARDING_STEPS = [
  {
    title: "Connectez vos reseaux",
    desc: "Liez vos comptes en un clic via OAuth. Vos tokens sont chiffres et securises.",
    visual: "platforms",
  },
  {
    title: "Generez du contenu",
    desc: "Notre IA cree des posts optimises pour chaque plateforme, avec visuels et hashtags.",
    visual: "generate",
  },
  {
    title: "Publiez partout",
    desc: "Validez, planifiez ou laissez le mode automatique publier a votre place.",
    visual: "publish",
  },
];

function OnboardingWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [animating, setAnimating] = useState(false);

  const goTo = (newStep: number) => {
    if (animating || newStep === step) return;
    setDirection(newStep > step ? "next" : "prev");
    setAnimating(true);
    setTimeout(() => {
      setStep(newStep);
      setAnimating(false);
    }, 300);
  };

  const current = ONBOARDING_STEPS[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg mx-2 sm:mx-4 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glass card */}
        <div className="card-elevated overflow-hidden rounded-2xl sm:rounded-3xl">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Visual area */}
          <div className="relative h-40 sm:h-56 bg-gradient-to-br from-blue-50 via-purple-50/50 to-pink-50 overflow-hidden">
            {/* Background decorative circles */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-400/10" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-purple-400/10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-white/20 backdrop-blur-sm" />

            {/* Step visual content */}
            <div
              className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                animating
                  ? direction === "next"
                    ? "-translate-x-full opacity-0"
                    : "translate-x-full opacity-0"
                  : "translate-x-0 opacity-100"
              }`}
            >
              {current.visual === "platforms" && (
                <div className="flex items-center gap-2 sm:gap-3">
                  {[
                    { icon: PLATFORM_META.facebook.icon, color: "#1877F2", delay: 0 },
                    { icon: PLATFORM_META.instagram.icon, color: "#E4405F", delay: 100 },
                    { icon: PLATFORM_META.linkedin.icon, color: "#0A66C2", delay: 200 },
                    { icon: PLATFORM_META.twitter.icon, color: "#000", delay: 300 },
                    { icon: PLATFORM_META.pinterest.icon, color: "#BD081C", delay: 400 },
                    { icon: PLATFORM_META.tiktok.icon, color: "#000", delay: 500 },
                  ].map((p, i) => (
                    <div
                      key={i}
                      className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center transform hover:scale-110 transition-transform animate-fade-in-up"
                      style={{ animationDelay: `${p.delay}ms` }}
                    >
                      <div className="w-7 h-7 flex items-center justify-center">{p.icon}</div>
                    </div>
                  ))}
                </div>
              )}
              {current.visual === "generate" && (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex gap-2">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="w-28 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3 animate-fade-in-up"
                        style={{ animationDelay: `${n * 150}ms` }}
                      >
                        <div className="w-full h-14 rounded-lg bg-gradient-to-br from-gray-200 to-gray-100 mb-2" />
                        <div className="h-1.5 bg-gray-200 rounded-full w-3/4 mb-1.5" />
                        <div className="h-1.5 bg-gray-200 rounded-full w-1/2" />
                        <div className="flex gap-1 mt-2">
                          <div className="h-1 bg-blue-300/60 rounded-full w-6" />
                          <div className="h-1 bg-blue-300/60 rounded-full w-8" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm animate-fade-in-up" style={{ animationDelay: "500ms" }}>
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-xs font-semibold text-gray-600">IA en action...</span>
                  </div>
                </div>
              )}
              {current.visual === "publish" && (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-6">
                    {[
                      { color: "from-blue-500 to-blue-600", icon: PLATFORM_META.facebook.icon, status: "Publie" },
                      { color: "from-pink-500 to-rose-500", icon: PLATFORM_META.instagram.icon, status: "Publie" },
                      { color: "from-blue-600 to-blue-700", icon: PLATFORM_META.linkedin.icon, status: "Planifie" },
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col items-center gap-2 animate-fade-in-up" style={{ animationDelay: `${i * 200}ms` }}>
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} shadow-lg flex items-center justify-center`}>
                          <div className="w-7 h-7 flex items-center justify-center [&_svg]:fill-white [&_img]:brightness-0 [&_img]:invert">{item.icon}</div>
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 bg-white/80 px-2 py-0.5 rounded-full">{item.status}</span>
                      </div>
                    ))}
                  </div>
                  <svg className="w-10 h-10 text-emerald-500 animate-fade-in-up" style={{ animationDelay: "600ms" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Content area */}
          <div className="px-4 sm:px-8 pt-5 sm:pt-6 pb-6 sm:pb-8">
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {ONBOARDING_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? "w-8 bg-blue-600" : "w-2 bg-gray-200 hover:bg-gray-300"
                  }`}
                />
              ))}
            </div>

            {/* Text */}
            <div
              className={`text-center transition-all duration-300 ${
                animating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
              }`}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-2">{current.title}</h2>
              <p className="text-[15px] text-gray-600 leading-relaxed max-w-sm mx-auto">{current.desc}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-8">
              {step > 0 ? (
                <button
                  onClick={() => goTo(step - 1)}
                  className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors px-4 py-2"
                >
                  Precedent
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors px-4 py-2"
                >
                  Passer
                </button>
              )}

              {step < ONBOARDING_STEPS.length - 1 ? (
                <button
                  onClick={() => goTo(step + 1)}
                  className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2"
                >
                  Suivant
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2"
                >
                  Commencer
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Config ───

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function SocialScheduleConfig({
  config, setConfig, onSave, saving, saved, connectedPlatforms, collapsed, onToggle, onOpenWizard,
}: {
  config: any;
  setConfig: (c: any) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  connectedPlatforms: Set<string>;
  collapsed: boolean;
  onToggle: () => void;
  onOpenWizard: () => void;
}) {
  const toggleDay = (day: number) => {
    const days: number[] = config.activeDays || [1, 2, 3, 4, 5];
    const next = days.includes(day) ? days.filter((d: number) => d !== day) : [...days, day].sort();
    setConfig({ ...config, activeDays: next });
  };

  const togglePlatform = (platform: string) => {
    const platforms: string[] = config.activePlatforms || [];
    const next = platforms.includes(platform)
      ? platforms.filter((p: string) => p !== platform)
      : [...platforms, platform];
    setConfig({ ...config, activePlatforms: next });
  };

  return (
    <div className="card p-4 sm:p-6 animate-fade-in" style={{ animationDelay: "400ms" }}>
      <button onClick={onToggle} className="w-full flex items-center justify-between">
        <div className="text-left">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">Mode de publication</h3>
          <p className="text-sm text-gray-500">
            {config.autoPublish ? "Automatique" : "Manuel"}
          </p>
          {saved && collapsed && (
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg animate-fade-in">
              Configuration sauvegardee
            </span>
          )}
        </div>
        <svg className={`w-5 h-5 text-gray-400 transition-transform ${collapsed ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {collapsed ? null : <>
      <div className="mt-6" />

      {/* Manual / Auto toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {[false, true].map((isAuto) => (
          <button
            key={String(isAuto)}
            onClick={() => setConfig({ ...config, autoPublish: isAuto })}
            className={`flex-1 rounded-xl px-4 sm:px-5 py-3 sm:py-4 text-left transition-all border ${
              config.autoPublish === isAuto
                ? "bg-white/60 border-blue-200 shadow-sm"
                : "bg-white/30 border-white/40 hover:bg-white/50"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                config.autoPublish === isAuto ? "border-blue-600" : "border-gray-300"
              }`}>
                {config.autoPublish === isAuto && <div className="w-2 h-2 rounded-full bg-blue-600" />}
              </div>
              <span className={`text-sm font-bold ${
                config.autoPublish === isAuto ? "text-blue-600" : "text-gray-600"
              }`}>
                {isAuto ? "Automatique" : "Manuel"}
              </span>
            </div>
            <p className="text-xs text-gray-500 pl-7">
              {isAuto
                ? "Les posts sont generes et publies automatiquement selon le planning."
                : "Vous validez chaque post avant sa publication."}
            </p>
          </button>
        ))}
      </div>

      {/* Planning config (always visible) */}
      <div className="bg-white/40 rounded-xl border border-white/50 p-5 space-y-5 animate-fade-in">
        <p className="text-sm font-bold text-gray-900">Planning de publication</p>

        {/* Posts per day */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">
            Nombre de posts par jour
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const current = config.postsPerDay || 1;
                if (current <= 1) return;
                const newVal = current - 1;
                const slots = (config.postSlots || ["10:00"]).slice(0, newVal);
                const modes = (config.slotModes || slots.map(() => "stock")).slice(0, newVal);
                setConfig({ ...config, postsPerDay: newVal, postSlots: slots, slotModes: modes });
              }}
              disabled={(config.postsPerDay || 1) <= 1}
              className="w-10 h-10 rounded-xl bg-white/60 border border-gray-200/50 text-gray-600 hover:bg-white/80 hover:border-gray-300 flex items-center justify-center transition-all text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed"
            >
              -
            </button>
            <div className="w-16 h-10 rounded-xl bg-white/70 border border-blue-200 flex items-center justify-center">
              <span className="text-lg font-extrabold text-blue-600">{config.postsPerDay || 1}</span>
            </div>
            <button
              onClick={() => {
                const current = config.postsPerDay || 1;
                if (current >= 10) return;
                setConfig({ ...config, postsPerDay: current + 1 });
              }}
              disabled={(config.postsPerDay || 1) >= 10}
              className="w-10 h-10 rounded-xl bg-white/60 border border-gray-200/50 text-gray-600 hover:bg-white/80 hover:border-gray-300 flex items-center justify-center transition-all text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed"
            >
              +
            </button>
            <span className="text-xs text-gray-500 font-medium ml-1">post{(config.postsPerDay || 1) > 1 ? "s" : ""} / jour</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Nombre de contenus generes et publies chaque jour actif. Chaque post correspond a un creneau horaire.
          </p>
        </div>

        {/* Post time slots */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">
            Creneaux de publication
          </label>
          <div className="space-y-2">
            {(config.postSlots || ["10:00"]).map((slot: string, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-400 w-6 shrink-0">{index + 1}.</span>
                <input
                  type="time"
                  value={slot}
                  onChange={(e) => {
                    const slots = [...(config.postSlots || ["10:00"])];
                    slots[index] = e.target.value;
                    setConfig({ ...config, postSlots: slots });
                  }}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200/60 bg-white/70 text-sm font-medium text-gray-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
                {(config.postSlots || ["10:00"]).length > 1 && (
                  <button
                    onClick={() => {
                      const slots = [...(config.postSlots || ["10:00"])];
                      const newModes = [...(config.slotModes || slots.map(() => "stock"))];
                      slots.splice(index, 1);
                      newModes.splice(index, 1);
                      setConfig({ ...config, postsPerDay: Math.max(1, (config.postsPerDay || 1) - 1), postSlots: slots.length > 0 ? slots : ["10:00"], slotModes: newModes.length > 0 ? newModes : ["stock"] });
                    }}
                    className="w-8 h-8 rounded-xl border border-gray-200/50 text-gray-400 hover:text-red-500 hover:border-red-200 flex items-center justify-center transition-colors shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          {(config.postSlots || ["10:00"]).length < (config.postsPerDay || 1) && (
            <button
              onClick={() => {
                const slots = [...(config.postSlots || ["10:00"])];
                const modes = [...(config.slotModes || slots.map(() => "stock"))];
                const last = slots[slots.length - 1] || "10:00";
                const [h, m] = last.split(":").map(Number);
                const nextH = Math.min(h + 2, 23);
                slots.push(`${String(nextH).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
                modes.push("stock");
                setConfig({ ...config, postSlots: slots, slotModes: modes });
              }}
              className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Ajouter un creneau
            </button>
          )}
          <p className="text-[11px] text-gray-400 mt-2">
            {(config.postSlots || ["10:00"]).length} / {config.postsPerDay || 1} creneau{(config.postsPerDay || 1) > 1 ? "x" : ""} configure{(config.postsPerDay || 1) > 1 ? "s" : ""}. Chaque creneau = 1 post publie a cette heure.
          </p>
        </div>

        {/* Active days */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">
            Jours actifs
          </label>
          <div className="flex gap-1.5 sm:gap-2">
            {DAY_LABELS.map((label, i) => {
              const dayNum = i + 1;
              const active = (config.activeDays || [1, 2, 3, 4, 5]).includes(dayNum);
              return (
                <button
                  key={dayNum}
                  onClick={() => toggleDay(dayNum)}
                  className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${
                    active
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white/60 border border-gray-200/50 text-gray-500 hover:bg-white/80"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Weekly planning overview */}
          {(() => {
            const activeDays = config.activeDays || [1, 2, 3, 4, 5];
            const dayModes: Record<string, string[]> = config.dayModes || {};
            const slots = config.postSlots || ["10:00"];
            const defaultSlotModes = config.slotModes || slots.map(() => "stock");

            const getModeLabel = (mode: string) => {
              if (mode.includes("ai") && mode.includes("carousel")) return "IA + Carrousel";
              if (mode.includes("carousel")) return "Carrousel";
              if (mode.includes("ai")) return "IA";
              return "Stock";
            };
            const getModeColor = (mode: string) => {
              if (mode.includes("ai") && mode.includes("carousel")) return "text-indigo-600 bg-indigo-50";
              if (mode.includes("carousel")) return "text-blue-600 bg-blue-50";
              if (mode.includes("ai")) return "text-purple-600 bg-purple-50";
              return "text-gray-600 bg-gray-50";
            };

            const getDaySlotMode = (dayNum: number, slotIdx: number) => {
              const dayArr = dayModes[String(dayNum)];
              if (dayArr && dayArr[slotIdx]) return dayArr[slotIdx];
              return defaultSlotModes[slotIdx] || "stock";
            };

            if (activeDays.length === 0) return null;

            return (
              <div className="mt-4 p-3 sm:p-4 bg-white/50 rounded-xl border border-gray-200/30 overflow-x-auto">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-gray-700">Ma semaine type</p>
                  <button
                    onClick={onOpenWizard}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                    Modifier
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5 min-w-[420px] sm:min-w-0">
                  {DAY_LABELS.map((label, i) => {
                    const dayNum = i + 1;
                    const active = activeDays.includes(dayNum);
                    return (
                      <div key={dayNum} className={`text-center rounded-lg py-2 px-1 transition-all ${
                        active ? "bg-white border border-gray-200/50 shadow-sm" : "bg-gray-50/50 opacity-30"
                      }`}>
                        <p className={`text-[10px] font-bold mb-1 ${active ? "text-gray-900" : "text-gray-400"}`}>{label}</p>
                        {active && slots.map((slot: string, si: number) => (
                          <div key={si} className="mb-0.5">
                            <span className="text-[8px] text-gray-400 font-medium">{slot}</span>
                            <span className={`block text-[8px] font-bold px-1 py-0.5 rounded mx-auto ${getModeColor(getDaySlotMode(dayNum, si))}`}>
                              {getModeLabel(getDaySlotMode(dayNum, si))}
                            </span>
                          </div>
                        ))}
                        {!active && (
                          <p className="text-[9px] text-gray-300 font-medium">OFF</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-400 mt-3">
                  Cliquez "Modifier" pour configurer chaque creneau
                </p>
              </div>
            );
          })()}
        </div>

        {/* Active platforms */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">
            Plateformes actives pour le planning
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_PLATFORMS.map((platform) => {
              const meta = PLATFORM_META[platform]!;
              const active = (config.activePlatforms || []).includes(platform);
              const connected = connectedPlatforms.has(platform);
              return (
                <button
                  key={platform}
                  onClick={() => togglePlatform(platform)}
                  disabled={!connected}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                    active && connected
                      ? "bg-white/70 border-blue-200 text-gray-900 shadow-sm"
                      : connected
                        ? "bg-white/30 border-gray-200/50 text-gray-500 hover:bg-white/50"
                        : "bg-gray-50/50 border-gray-100 text-gray-300 cursor-not-allowed"
                  }`}
                >
                  <div className="w-5 h-5 flex items-center justify-center" style={{ opacity: connected ? 1 : 0.3 }}>
                    {meta.icon}
                  </div>
                  {meta.label}
                  {!connected && <span className="text-[10px] text-gray-400 font-medium ml-1">non connecte</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={onSave}
          disabled={saving}
          className="btn-primary px-6 py-2.5 text-sm"
        >
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </button>
        {saved && (
          <span className="text-sm text-emerald-600 font-medium animate-fade-in">
            Configuration sauvegardee
          </span>
        )}
      </div>
      </>}
    </div>
  );
}

// ─── Main Page ───

export default function SocialPage() {
  const { user, loading: authLoading } = useAuth();
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savedConfig, setSavedConfig] = useState(false);
  const [configCollapsed, setConfigCollapsed] = useState(false);
  const [standalonePosts, setStandalonePosts] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [postTopic, setPostTopic] = useState("");
  const [imageMode, setImageMode] = useState<"ai" | "stock">("stock");
  const [isCarousel, setIsCarousel] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editHashtags, setEditHashtags] = useState("");
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [previewPostId, setPreviewPostId] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"phone" | "desktop">("phone");
  const [previewPlatform, setPreviewPlatform] = useState<string>("facebook");
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window !== "undefined") {
      return !localStorage.getItem("social_onboarding_done");
    }
    return true;
  });
  const [mismatchWarning, setMismatchWarning] = useState<{ siteName: string; accountName: string; platform: string } | null>(null);
  const [linkedinOrgs, setLinkedinOrgs] = useState<{ personId: string; personName: string; organizations: Array<{ id: string; name: string }>; activeMode: "personal" | "organization"; activeOrgId: string | null } | null>(null);
  const [switchingLinkedinMode, setSwitchingLinkedinMode] = useState(false);
  const [showWeeklyWizard, setShowWeeklyWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [showMotionPanel, setShowMotionPanel] = useState(false);
  const [motionTemplates, setMotionTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [motionTopic, setMotionTopic] = useState("");
  const [motionFormat, setMotionFormat] = useState<"square" | "vertical" | "landscape">("square");
  const [generatingMotion, setGeneratingMotion] = useState(false);
  const [motionPreview, setMotionPreview] = useState<any>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Load sites + restore siteId from URL after OAuth redirect
  useEffect(() => {
    if (!user) return;
    getSites()
      .then((s) => {
        setSites(s);
        const params = new URLSearchParams(window.location.search);
        const urlSiteId = params.get("siteId");
        if (urlSiteId && s.some((site: any) => site.id === urlSiteId)) {
          setSelectedSiteId(urlSiteId);
        } else if (s.length > 0) {
          setSelectedSiteId(s[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  // Load accounts + config + standalone posts when site changes
  useEffect(() => {
    if (!selectedSiteId) return;
    Promise.all([
      getSocialAccounts(selectedSiteId),
      getSocialConfig(selectedSiteId),
      getStandalonePosts(selectedSiteId),
    ]).then(([accs, cfg, posts]) => {
      setAccounts(accs);
      setConfig(cfg);
      setStandalonePosts(posts || []);
    }).catch(console.error);
  }, [selectedSiteId]);

  // Load LinkedIn organizations when LinkedIn account is connected
  useEffect(() => {
    const linkedinAccount = accounts.find((a) => a.platform === "linkedin");
    if (linkedinAccount) {
      getLinkedInOrgs(linkedinAccount.id)
        .then(setLinkedinOrgs)
        .catch(() => setLinkedinOrgs(null));
    } else {
      setLinkedinOrgs(null);
    }
  }, [accounts]);

  const handleLinkedInModeSwitch = useCallback(async (mode: "personal" | "organization", orgId?: string, orgName?: string) => {
    const linkedinAccount = accounts.find((a) => a.platform === "linkedin");
    if (!linkedinAccount) return;
    setSwitchingLinkedinMode(true);
    try {
      await setLinkedInMode(linkedinAccount.id, mode, orgId, orgName);
      const orgs = await getLinkedInOrgs(linkedinAccount.id);
      setLinkedinOrgs(orgs);
      // Update account name in the list
      setAccounts((prev) => prev.map((a) =>
        a.id === linkedinAccount.id
          ? { ...a, accountName: mode === "organization" ? orgName : orgs.personName }
          : a
      ));
    } catch (err) {
      console.error("Failed to switch LinkedIn mode:", err);
    } finally {
      setSwitchingLinkedinMode(false);
    }
  }, [accounts]);

  const handleConnect = useCallback(async (platform: string) => {
    if (!selectedSiteId) return;
    setConnecting(platform);
    try {
      const { url } = await getOAuthUrl(platform, selectedSiteId);
      const popup = window.open(url, "_blank", "width=600,height=700");
      if (popup) {
        const prevAccountIds = new Set(accounts.map((a) => a.id));
        const interval = setInterval(async () => {
          if (popup.closed) {
            clearInterval(interval);
            setConnecting(null);
            try {
              const accs = await getSocialAccounts(selectedSiteId);
              setAccounts(accs);
              // Detect mismatch: only if site has a domain (we have context)
              const site = sites.find((s) => s.id === selectedSiteId);
              if (site?.domain) {
                const newAccount = accs.find((a: any) => !prevAccountIds.has(a.id));
                if (newAccount) {
                  const siteWords = (site.name || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w: string) => w.length > 2);
                  const accountWords = (newAccount.accountName || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w: string) => w.length > 2);
                  const domainClean = (site.domain || "").replace(/^www\./, "").split(".")[0].toLowerCase();
                  const accountClean = (newAccount.accountName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                  // Check if ANY word overlaps or domain is in account name
                  const hasOverlap = siteWords.some((w: string) => accountWords.some((aw: string) => aw.includes(w) || w.includes(aw)))
                    || accountClean.includes(domainClean) || domainClean.includes(accountClean);
                  // Only warn for page-like accounts (not personal names with spaces = likely personal)
                  // Heuristic: if no overlap at all and account looks like a brand/page name
                  if (!hasOverlap && siteWords.length > 0) {
                    setMismatchWarning({ siteName: site.name, accountName: newAccount.accountName, platform: newAccount.platform });
                  }
                }
              }
            } catch {}
          }
        }, 500);
      }
    } catch (err: any) {
      alert(err.message || "Erreur OAuth");
      setConnecting(null);
    }
  }, [selectedSiteId, sites, accounts]);

  const handleDisconnect = useCallback(async (accountId: string) => {
    try {
      await disconnectSocialAccount(accountId);
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch (err: any) {
      alert(err.message || "Erreur");
    }
  }, []);

  const handleSaveConfig = useCallback(async () => {
    if (!selectedSiteId || !config) return;
    setSavingConfig(true);
    setSavedConfig(false);
    try {
      await updateSocialConfig(selectedSiteId, {
        autoPublish: config.autoPublish,
        defaultHashtags: config.defaultHashtags || [],
        postsPerDay: config.postsPerDay || 1,
        postSlots: config.postSlots || ["10:00"],
        slotModes: config.slotModes || (config.postSlots || ["10:00"]).map(() => "stock"),
        activeDays: config.activeDays || [1, 2, 3, 4, 5],
        dayModes: config.dayModes || {},
        activePlatforms: config.activePlatforms || [],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setSavedConfig(true);
      setConfigCollapsed(true);
      setTimeout(() => setSavedConfig(false), 3500);
    } catch (err: any) {
      alert(err.message || "Erreur");
    } finally {
      setSavingConfig(false);
    }
  }, [selectedSiteId, config]);

  if (authLoading || loading) {
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

  const connectedPlatforms = new Set(accounts.map((a) => a.platform));

  return (
    <div className="min-h-screen bg-white bg-orbs overflow-x-hidden">
      <NavbarDropdown user={user} />

      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10 relative z-10 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-0 mb-6 sm:mb-8 animate-fade-in-up">
          <div>
            <Link href="/" className="text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors mb-4 inline-flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Dashboard
            </Link>
            <div className="flex items-center gap-3 mt-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reseaux sociaux</h1>
              <button
                onClick={() => setShowOnboarding(true)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-blue-50 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors"
                title="Comment ca marche"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-500 font-medium mt-1">
              Connectez vos comptes et automatisez vos publications
            </p>
          </div>

          {/* Site selector */}
          {sites.length > 1 && (
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="input w-full sm:w-auto sm:min-w-[200px]"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Connected / Available Platforms */}
        <div className="mb-10 animate-fade-in" style={{ animationDelay: "250ms" }}>
          <h2 className="text-lg font-bold text-gray-900 mb-5">Plateformes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ALL_PLATFORMS.map((platform, i) => {
              const meta = PLATFORM_META[platform]!;
              const account = accounts.find((a) => a.platform === platform);
              const isConnected = !!account;

              return (
                <div
                  key={platform}
                  className="card p-4 sm:p-5 animate-fade-in-up"
                  style={{ animationDelay: `${150 + i * 50}ms` }}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl ${meta.bgColor} flex items-center justify-center`}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-gray-900">{meta.label}</p>
                      {isConnected ? (
                        <p className="text-xs text-emerald-600 font-semibold">
                          {account.accountName || "Connecte"}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 font-medium">Non connecte</p>
                      )}
                    </div>
                  </div>

                  {isConnected ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-approved">Actif</span>
                        <button
                          onClick={() => handleDisconnect(account.id)}
                          className="ml-auto text-xs text-gray-400 hover:text-red-500 font-medium transition-colors"
                        >
                          Deconnecter
                        </button>
                      </div>

                      {/* LinkedIn organization selector */}
                      {platform === "linkedin" && linkedinOrgs && linkedinOrgs.organizations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200/40">
                          <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Publier en tant que</p>
                          <div className="space-y-1.5">
                            {/* Personal profile option */}
                            <button
                              onClick={() => handleLinkedInModeSwitch("personal")}
                              disabled={switchingLinkedinMode}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                                linkedinOrgs.activeMode === "personal"
                                  ? "bg-blue-50 border border-blue-200 text-blue-700 font-semibold"
                                  : "bg-white/50 border border-gray-200/50 text-gray-600 hover:bg-white/80"
                              }`}
                            >
                              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                              </svg>
                              <span className="truncate">{linkedinOrgs.personName}</span>
                              {linkedinOrgs.activeMode === "personal" && (
                                <svg className="w-4 h-4 ml-auto text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              )}
                            </button>

                            {/* Organization options */}
                            {linkedinOrgs.organizations.map((org) => (
                              <button
                                key={org.id}
                                onClick={() => handleLinkedInModeSwitch("organization", org.id, org.name)}
                                disabled={switchingLinkedinMode}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                                  linkedinOrgs.activeMode === "organization" && linkedinOrgs.activeOrgId === org.id
                                    ? "bg-blue-50 border border-blue-200 text-blue-700 font-semibold"
                                    : "bg-white/50 border border-gray-200/50 text-gray-600 hover:bg-white/80"
                                }`}
                              >
                                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M3.75 3v18h16.5V3H3.75zm3 3.75h3v3h-3v-3zm6.75 0h3v3h-3v-3zm-6.75 6h3v3h-3v-3zm6.75 0h3v3h-3v-3z" />
                                </svg>
                                <span className="truncate">{org.name}</span>
                                {linkedinOrgs.activeMode === "organization" && linkedinOrgs.activeOrgId === org.id && (
                                  <svg className="w-4 h-4 ml-auto text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                          {switchingLinkedinMode && (
                            <p className="text-[11px] text-gray-400 mt-1.5 font-medium">Changement en cours...</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(platform)}
                      disabled={connecting === platform}
                      className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2"
                    >
                      {connecting === platform ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Connexion...
                        </>
                      ) : (
                        "Connecter"
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Publication Config */}
        {config && (
          <SocialScheduleConfig
            config={config}
            setConfig={setConfig}
            onSave={handleSaveConfig}
            saving={savingConfig}
            saved={savedConfig}
            connectedPlatforms={connectedPlatforms}
            collapsed={configCollapsed}
            onToggle={() => setConfigCollapsed(!configCollapsed)}
            onOpenWizard={() => { setWizardStep(0); setShowWeeklyWizard(true); }}
          />
        )}

        {/* Generate standalone post (manual mode only) */}
        {config && !config.autoPublish && connectedPlatforms.size > 0 && (
          <div className="mt-6 sm:mt-8 card p-4 sm:p-6 animate-fade-in" style={{ animationDelay: "450ms" }}>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">Creer un post</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-4">Generez un post pour vos reseaux sans passer par un article.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={postTopic}
                onChange={(e) => setPostTopic(e.target.value)}
                placeholder="Sujet du post (optionnel)"
                className="input flex-1"
              />
              <button
                onClick={async () => {
                  setGenerating(true);
                  try {
                    await generateStandalonePost(selectedSiteId, postTopic || undefined, undefined, imageMode, isCarousel || undefined);
                    const posts = await getStandalonePosts(selectedSiteId);
                    setStandalonePosts(posts || []);
                    setPostTopic("");
                    showToast("success", "Post genere avec succes");
                  } catch (err: any) { showToast("error", err.message || "Erreur lors de la generation"); }
                  setGenerating(false);
                }}
                disabled={generating}
                className="btn-primary px-6 py-2.5 text-sm whitespace-nowrap disabled:opacity-50 w-full sm:w-auto"
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generation...
                  </span>
                ) : "Generer"}
              </button>
            </div>

            {/* Image source + Carousel toggle (separate controls) */}
            <div className="mt-4 flex items-center gap-3 sm:gap-4 flex-wrap">
              {/* Image source: Stock vs IA */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Visuel :</span>
                <div className="flex items-center bg-white/60 border border-gray-200/50 rounded-xl p-1 gap-1">
                  <button
                    onClick={() => setImageMode("stock")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      imageMode === "stock"
                        ? "bg-white shadow-sm text-gray-900 border border-gray-200/50"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Stock
                  </button>
                  <button
                    onClick={() => setImageMode("ai")}
                    className="group relative px-4 py-1.5 rounded-lg text-xs font-bold transition-all overflow-hidden"
                  >
                    <div className={`absolute inset-0 rounded-lg transition-opacity duration-300 ${
                      imageMode === "ai" ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                    }`} style={{
                      background: "linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899, #f59e0b, #10b981, #3b82f6)",
                      backgroundSize: "300% 300%",
                      animation: imageMode === "ai" ? "gradient-shift 4s ease infinite" : "none",
                    }} />
                    <div className="absolute inset-[1.5px] rounded-[7px] bg-white" />
                    <span className={`relative flex items-center gap-1.5 transition-colors ${
                      imageMode === "ai" ? "text-gray-900" : "text-gray-500 group-hover:text-gray-700"
                    }`}>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                      </svg>
                      IA Gen
                    </span>
                  </button>
                </div>
              </div>

              {/* Separator */}
              <div className="w-px h-6 bg-gray-200" />

              {/* Carousel toggle (independent) */}
              <button
                onClick={() => setIsCarousel(!isCarousel)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  isCarousel
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                    : "bg-white/60 border-gray-200/50 text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h4v4H6V6zm8 0h4v4h-4V6zm-8 8h4v4H6v-4zm8 0h4v4h-4v-4z" />
                </svg>
                Carrousel {isCarousel ? "ON" : "OFF"}
              </button>

              {/* Status labels */}
              {imageMode === "ai" && (
                <span className="text-[11px] text-purple-600 font-medium animate-fade-in">
                  Visuels IA
                </span>
              )}
              {isCarousel && (
                <span className="text-[11px] text-blue-600 font-medium animate-fade-in">
                  4-5 slides
                </span>
              )}
            </div>
            {generating && (
              <div className="mt-5 animate-fade-in">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-sm text-gray-600 font-medium">L'IA redige votre post...</span>
                </div>
                <div className="space-y-2.5">
                  <div className="shimmer-line h-4 w-full" />
                  <div className="shimmer-line h-4 w-4/5" />
                  <div className="shimmer-line h-4 w-3/5" />
                  <div className="flex gap-2 mt-3">
                    <div className="shimmer-line h-6 w-20 rounded-full" />
                    <div className="shimmer-line h-6 w-24 rounded-full" />
                    <div className="shimmer-line h-6 w-16 rounded-full" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Motion Design - standalone section, no social accounts needed */}
        {selectedSiteId && (
          <div className="mt-8 card p-5 animate-fade-in" style={{ animationDelay: "400ms" }}>
            <button
              onClick={() => {
                setShowMotionPanel(!showMotionPanel);
                if (!showMotionPanel && motionTemplates.length === 0) {
                  getMotionTemplates().then(setMotionTemplates).catch(() => {});
                }
              }}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <div className="text-left">
                  <h3 className="text-base font-bold text-gray-900">Motion Design</h3>
                  <p className="text-xs text-gray-500">Videos animees pour vos reseaux sociaux</p>
                </div>
              </div>
              <svg className={`w-5 h-5 text-gray-400 transition-transform ${showMotionPanel ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>
        )}

        {showMotionPanel && selectedSiteId && (
          <div className="mt-2 card p-6 animate-fade-in -mt-1">
            {/* Template selection */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Template</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {motionTemplates.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id === selectedTemplate ? "" : t.id)}
                    className="card hover-lift relative p-3 text-left transition-all"
                    style={selectedTemplate === t.id ? { border: "2px solid #3b82f6", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" } : {}}
                  >
                    <div className="w-full h-1 rounded-full mb-2" style={{ backgroundColor: t.previewColor }} />
                    <div className="text-xs font-bold text-gray-900">{t.name}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{t.slideCount} slides - {t.estimatedDuration}</div>
                  </button>
                ))}
                {motionTemplates.length === 0 && (
                  <div className="col-span-full text-xs text-gray-400 py-3">Chargement des templates...</div>
                )}
              </div>
            </div>

            {/* Topic + Format */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input
                value={motionTopic}
                onChange={(e) => setMotionTopic(e.target.value)}
                placeholder="Sujet de la video (optionnel)"
                className="input flex-1"
              />
              <div className="flex items-center gap-1 justify-center sm:justify-start">
                {(["square", "vertical", "landscape"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setMotionFormat(f)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      motionFormat === f
                        ? "btn-primary"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                    }`}
                  >
                    {f === "square" ? "1:1" : f === "vertical" ? "9:16" : "16:9"}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={async () => {
                setGeneratingMotion(true);
                setMotionPreview(null);
                try {
                  const result = await generateMotionSlidesApi(
                    selectedSiteId,
                    motionTopic || undefined,
                    selectedTemplate || undefined
                  );
                  setMotionPreview(result);
                  showToast("success", `Video generee : ${result.estimatedDuration}`);
                } catch (err: any) {
                  showToast("error", err.message || "Erreur lors de la generation");
                }
                setGeneratingMotion(false);
              }}
              disabled={generatingMotion}
              className="btn-primary w-full py-3 text-sm font-bold"
            >
              {generatingMotion ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generation des slides...
                </span>
              ) : "Generer la video"}
            </button>

            {/* Motion Preview */}
            {motionPreview && (
              <div className="mt-5 card p-5 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold text-gray-900">Apercu des slides</span>
                  <span className="badge badge-blue">
                    {motionPreview.config?.slides?.length || 0} slides - {motionPreview.estimatedDuration}
                  </span>
                </div>
                <div className="space-y-2">
                  {(motionPreview.config?.slides || []).map((slide: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white/70 border-l-3 transition-colors hover:bg-white"
                      style={{ borderLeftColor: slide.accentColor || "#3b82f6", borderLeftWidth: 3 }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{slide.title}</div>
                        {slide.subtitle && (
                          <div className="text-xs text-gray-500 truncate mt-0.5">{slide.subtitle}</div>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-3">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{slide.slideType}</span>
                        <span className="text-[10px] text-gray-400">{((slide.durationFrames || 90) / 30).toFixed(1)}s</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Render button */}
                <button
                  onClick={async () => {
                    setGeneratingMotion(true);
                    try {
                      const result = await generateAndRenderMotion(
                        selectedSiteId,
                        motionTopic || undefined,
                        selectedTemplate || undefined,
                        motionFormat
                      );
                      showToast("success", "Video rendue avec succes");
                      setMotionPreview({ ...motionPreview, videoUrl: result.videoUrl });
                    } catch (err: any) {
                      showToast("error", err.message || "Erreur lors du rendu");
                    }
                    setGeneratingMotion(false);
                  }}
                  disabled={generatingMotion}
                  className="btn-primary mt-4 w-full py-2.5 text-sm font-bold"
                >
                  {generatingMotion ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Rendu en cours...
                    </span>
                  ) : "Rendre la video (MP4)"}
                </button>

                {/* Video player */}
                {motionPreview.videoUrl && (
                  <div className="mt-4 card p-3 animate-fade-in">
                    <video
                      src={motionPreview.videoUrl}
                      controls
                      className="w-full rounded-xl"
                      style={{ maxHeight: 400 }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Standalone posts list with inline preview */}
        {standalonePosts.length > 0 && (
          <div className="mt-8 animate-fade-in" style={{ animationDelay: "500ms" }}>
            <h3 className="text-lg font-bold text-gray-900 mb-5">Posts</h3>
            <div className="space-y-8">
              {standalonePosts.map((post) => {
                const meta = PLATFORM_META[post.platform] || PLATFORM_META.facebook;
                const isEditing = editingPostId === post.id;
                const activePlatform = previewPostId === post.id && previewPlatform ? previewPlatform : post.platform;
                // TikTok is always phone — no desktop layout exists
                const activeDevice = activePlatform === "tiktok" ? "phone" : previewDevice;
                const imageUrl = post.mediaUrls?.[0];
                const carouselSlides = post.carouselData as Array<{ slideType?: string; title: string; subtitle: string; highlight?: string; imageUrl?: string | null }> | null;
                const hasCarousel = carouselSlides && carouselSlides.length > 0;
                const displayContent = isEditing ? editContent : post.content;
                const displayHashtags = isEditing
                  ? editHashtags.split(",").map((h: string) => h.trim()).filter(Boolean).map((h: string) => h.startsWith("#") ? h : `#${h}`).join(" ")
                  : (post.hashtags || []).map((h: string) => h.startsWith("#") ? h : `#${h}`).join(" ");
                const charLimit = PLATFORM_LIMITS[activePlatform] || PLATFORM_LIMITS[post.platform] || 3000;
                const statusBadge: Record<string, string> = {
                  PENDING_REVIEW: "badge-review", APPROVED: "badge-approved",
                  PUBLISHED: "badge-published", FAILED: "badge-failed", PUBLISHING: "badge-publishing",
                };
                const statusLabel: Record<string, string> = {
                  PENDING_REVIEW: "A valider", APPROVED: "Approuve",
                  PUBLISHED: "Publie", FAILED: "Echec", PUBLISHING: "Publication...",
                };

                return (
                  <div key={post.id} className="card-elevated overflow-hidden">
                    {/* Top bar: platform + status + actions */}
                    <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-gray-200/30">
                      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap min-w-0">
                        <div className="w-5 h-5 flex items-center justify-center shrink-0">{meta.icon}</div>
                        <span className="text-sm font-bold shrink-0" style={{ color: meta.color }}>{meta.label}</span>
                        {post.socialAccount && <span className="text-xs text-gray-500 font-medium truncate hidden sm:inline">{post.socialAccount.accountName}</span>}
                        <span className={`badge ${statusBadge[post.status] || "badge-draft"}`}>
                          {statusLabel[post.status] || post.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                        {post.status === "PUBLISHED" && post.platformUrl && (
                          <a href={post.platformUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-600 font-semibold hover:underline px-2 py-1">Voir</a>
                        )}
                        {post.status !== "PUBLISHED" && (
                          <>
                            {post.status === "PENDING_REVIEW" && (
                              <button onClick={async () => { await approveSocialPost(post.id); const posts = await getStandalonePosts(selectedSiteId); setStandalonePosts(posts || []); showToast("success", "Post approuve"); }}
                                className="text-xs text-emerald-600 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors">Approuver</button>
                            )}
                            {post.status === "APPROVED" && (
                              <button onClick={async () => { setPublishingId(post.id); try { await publishSocialPost(post.id); const posts = await getStandalonePosts(selectedSiteId); setStandalonePosts(posts || []); } catch (err: any) { showToast("error", err.message || "Erreur lors de la generation"); } setPublishingId(null); }}
                                disabled={publishingId === post.id}
                                className="btn-primary px-3 py-1.5 text-xs">{publishingId === post.id ? "..." : "Publier"}</button>
                            )}
                            <button onClick={async () => { if (!confirm("Supprimer ce post ?")) return; await deleteSocialPost(post.id); setStandalonePosts((prev) => prev.filter((p: any) => p.id !== post.id)); }}
                              className="text-xs text-gray-400 hover:text-red-500 font-semibold px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">Suppr.</button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Platform tabs + device toggle */}
                    <div className="flex items-center justify-between px-2 sm:px-5 py-2 border-b border-gray-200/20 bg-white/30">
                      <div className="flex gap-0.5 overflow-x-auto scrollbar-hide flex-1 min-w-0">
                        {ALL_PLATFORMS.map((p) => {
                          const pmeta = PLATFORM_META[p];
                          if (!pmeta) return null;
                          return (
                            <button key={p} onClick={() => { setPreviewPostId(post.id); setPreviewPlatform(p); }}
                              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all shrink-0 ${
                                activePlatform === p
                                  ? "bg-white shadow-sm text-gray-900 border border-gray-200/60"
                                  : "text-gray-400 hover:text-gray-600 hover:bg-white/50"
                              }`}>
                              <span className="w-4 h-4 flex items-center justify-center shrink-0 [&_svg]:w-[14px] [&_svg]:h-[14px] [&_img]:w-[14px] [&_img]:h-[14px]">{pmeta.icon}</span>
                              <span className="hidden sm:inline">{pmeta.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <div className="flex bg-gray-100/80 rounded-lg p-0.5">
                          <button onClick={() => setPreviewDevice("phone")}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-semibold transition-all ${activeDevice === "phone" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"}`}>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                            <span className="hidden sm:inline">Mobile</span>
                          </button>
                          <button onClick={() => setPreviewDevice("desktop")}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-semibold transition-all ${activeDevice === "desktop" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"}`}>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            <span className="hidden sm:inline">Desktop</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Two-column layout: Preview + Info panel */}
                    <div className="flex flex-col lg:flex-row">
                      {/* Left: Inline preview */}
                      <div className={`flex-1 flex justify-center p-3 sm:p-6 ${activePlatform === "tiktok" ? "bg-gray-950" : "bg-gradient-to-br from-gray-50/80 via-gray-100/40 to-white/60"}`}>
                        <div className={`transition-all duration-300 w-full ${activeDevice === "phone" ? "max-w-[280px] sm:max-w-[320px]" : "max-w-[520px]"}`}>
                          {/* Device frame */}
                          <div className={`bg-white transition-all duration-300 ${
                            activeDevice === "phone"
                              ? "rounded-[2.8rem] border-[6px] border-gray-900 shadow-[0_0_0_2px_rgba(0,0,0,0.1),0_20px_60px_rgba(0,0,0,0.15)] relative flex flex-col overflow-hidden"
                              : "rounded-xl border border-gray-200/80 shadow-lg overflow-hidden"
                          }`} style={activeDevice === "phone" ? { height: "min(620px, 70vh)" } : undefined}>
                            {/* Phone notch + status bar */}
                            {activeDevice === "phone" && (
                              <div className={`px-5 pt-3 pb-1.5 flex items-center justify-between relative shrink-0 ${activePlatform === "tiktok" ? "bg-black" : "bg-white"}`}>
                                <span className={`text-[11px] font-semibold ${activePlatform === "tiktok" ? "text-white" : "text-gray-900"}`}>9:41</span>
                                <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[90px] h-[24px] bg-gray-900 rounded-b-2xl" />
                                <div className="flex items-center gap-1">
                                  <svg className={`w-3.5 h-3.5 ${activePlatform === "tiktok" ? "text-white" : "text-gray-900"}`} fill="currentColor" viewBox="0 0 24 24"><rect x="1" y="6" width="3" height="12" rx="0.5" opacity="0.3"/><rect x="6" y="4" width="3" height="14" rx="0.5" opacity="0.5"/><rect x="11" y="2" width="3" height="16" rx="0.5" opacity="0.7"/><rect x="16" y="0" width="3" height="18" rx="0.5"/></svg>
                                  <svg className={`w-4 h-3 ${activePlatform === "tiktok" ? "text-white" : "text-gray-900"}`} fill="currentColor" viewBox="0 0 20 12"><path d="M2.5 1A1.5 1.5 0 001 2.5v7A1.5 1.5 0 002.5 11h11A1.5 1.5 0 0015 9.5v-7A1.5 1.5 0 0013.5 1h-11z" opacity="0.35"/><rect x="2" y="3" width="10" height="6" rx="0.5"/><path d="M16 4.5v3a1 1 0 001 1h.5a.5.5 0 00.5-.5V4a.5.5 0 00-.5-.5H17a1 1 0 00-1 1z" opacity="0.4"/></svg>
                                </div>
                              </div>
                            )}

                            {/* Scrollable phone content */}
                            <div className={activeDevice === "phone" ? "flex-1 min-h-0 overflow-y-auto scrollbar-hide" : ""}>

                            {/* ═══ FACEBOOK ═══ */}
                            {activePlatform === "facebook" && (
                              <>
                                <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">{(post.socialAccount?.accountName || "P")[0]}</div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[14px] font-bold text-gray-900 truncate">{post.socialAccount?.accountName || "Ma Page"}</p>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[12px] text-gray-500">A l'instant</span>
                                      <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 16 16"><path d="M8 16A8 8 0 108 0a8 8 0 000 16zM7 3.5a.5.5 0 011 0v4a.5.5 0 01-.146.354l-2 2a.5.5 0 01-.708-.708L7 7.293V3.5z"/></svg>
                                    </div>
                                  </div>
                                  <svg className="w-5 h-5 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="18" r="2"/></svg>
                                </div>
                                <div className="px-4 py-3">
                                  <p className="text-[15px] text-gray-900 leading-relaxed whitespace-pre-wrap">{displayContent}</p>
                                  {displayHashtags && <p className="text-[14px] text-blue-600 mt-1.5">{displayHashtags}</p>}
                                </div>
                                {hasCarousel ? (
                                  <CarouselPreview slides={carouselSlides!} aspectClass="aspect-[1.91/1]" />
                                ) : imageUrl ? (
                                  <div className="w-full aspect-[1.91/1] bg-gray-100 overflow-hidden"><img src={imageUrl} alt="" className="w-full h-full object-cover" /></div>
                                ) : null}
                                <div className="px-4 py-1.5 flex justify-between text-[12px] text-gray-500 border-b border-gray-100">
                                  <div className="flex items-center gap-1">
                                    <div className="flex -space-x-1">
                                      <div className="w-[18px] h-[18px] rounded-full bg-blue-500 flex items-center justify-center"><svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/></svg></div>
                                      <div className="w-[18px] h-[18px] rounded-full bg-red-500 flex items-center justify-center"><svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg></div>
                                    </div>
                                    <span>42</span>
                                  </div>
                                  <span>3 commentaires</span>
                                </div>
                                <div className="px-2 py-1 flex">
                                  {[
                                    { label: "J'aime", d: "M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" },
                                    { label: "Commenter", d: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
                                    { label: "Partager", d: "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" },
                                  ].map((item) => (
                                    <button key={item.label} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors">
                                      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={item.d} /></svg>
                                      <span className="text-[13px] font-semibold">{item.label}</span>
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}

                            {/* ═══ INSTAGRAM ═══ */}
                            {activePlatform === "instagram" && (
                              <>
                                <div className="px-3 py-2 flex items-center gap-3 border-b border-gray-100">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-gray-900">{(post.socialAccount?.accountName || "P")[0]}</div>
                                  </div>
                                  <p className="text-[13px] font-bold text-gray-900 flex-1">{(post.socialAccount?.accountName || "mon_compte").toLowerCase().replace(/\s/g, "_")}</p>
                                  <svg className="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="6" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="18" r="1.5"/></svg>
                                </div>
                                {hasCarousel ? (
                                  <CarouselPreview slides={carouselSlides!} aspectClass="aspect-square" />
                                ) : imageUrl ? (
                                  <div className="w-full aspect-square bg-gray-100 overflow-hidden"><img src={imageUrl} alt="" className="w-full h-full object-cover" /></div>
                                ) : (
                                  <div className="w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center"><svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v13.5a2.25 2.25 0 002.25 2.25z" /></svg></div>
                                )}
                                <div className="px-3 py-2.5">
                                  <div className="flex items-center justify-between mb-2.5">
                                    <div className="flex gap-4">
                                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>
                                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                                    </div>
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                                  </div>
                                  <p className="text-[12px] font-bold text-gray-900 mb-1">42 J'aime</p>
                                  <p className="text-[13px] text-gray-900 leading-relaxed"><span className="font-bold">{(post.socialAccount?.accountName || "compte").toLowerCase().replace(/\s/g, "_")}</span> {displayContent}</p>
                                  {displayHashtags && <p className="text-[13px] text-blue-800 mt-1">{displayHashtags}</p>}
                                  <p className="text-[11px] text-gray-400 mt-2">Voir les 3 commentaires</p>
                                </div>
                              </>
                            )}

                            {/* ═══ TWITTER / X ═══ */}
                            {activePlatform === "twitter" && (
                              <div className="px-4 py-3 flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">{(post.socialAccount?.accountName || "P")[0]}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="text-[15px] font-bold text-gray-900">{post.socialAccount?.accountName || "Compte"}</span>
                                    <svg className="w-4 h-4 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"/></svg>
                                    <span className="text-[13px] text-gray-500 truncate">@{(post.socialAccount?.accountName || "compte").toLowerCase().replace(/\s/g, "_")}</span>
                                  </div>
                                  <p className="text-[15px] text-gray-900 leading-relaxed mt-1 whitespace-pre-wrap">{displayContent}</p>
                                  {displayHashtags && <p className="text-[15px] text-blue-500 mt-1">{displayHashtags}</p>}
                                  {hasCarousel ? (
                                    <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200">
                                      <CarouselPreview slides={carouselSlides!} aspectClass="aspect-video" />
                                    </div>
                                  ) : imageUrl ? (
                                    <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200"><div className="w-full aspect-video bg-gray-100 overflow-hidden"><img src={imageUrl} alt="" className="w-full h-full object-cover" /></div></div>
                                  ) : null}
                                  <div className="flex justify-between mt-3 text-gray-500 max-w-[280px]">
                                    {[
                                      { d: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z", c: "3" },
                                      { d: "M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3", c: "7" },
                                      { d: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z", c: "42" },
                                      { d: "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13", c: "" },
                                    ].map((item, i) => (
                                      <div key={i} className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={item.d} /></svg>
                                        {item.c && <span className="text-[12px]">{item.c}</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* ═══ LINKEDIN ═══ */}
                            {activePlatform === "linkedin" && (
                              <>
                                <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-sm font-bold">{(post.socialAccount?.accountName || "P")[0]}</div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[14px] font-bold text-gray-900 truncate">{post.socialAccount?.accountName || "Entreprise"}</p>
                                    <p className="text-[12px] text-gray-500">1 234 abonnes</p>
                                    <p className="text-[11px] text-gray-400">A l'instant</p>
                                  </div>
                                </div>
                                <div className="px-4 py-3">
                                  <p className="text-[15px] text-gray-900 leading-relaxed whitespace-pre-wrap">{displayContent}</p>
                                  {displayHashtags && <p className="text-[14px] text-blue-600 mt-1.5">{displayHashtags}</p>}
                                </div>
                                {hasCarousel ? (
                                  <CarouselPreview slides={carouselSlides!} aspectClass="aspect-[1.91/1]" />
                                ) : imageUrl ? (
                                  <div className="w-full aspect-[1.91/1] bg-gray-100 overflow-hidden"><img src={imageUrl} alt="" className="w-full h-full object-cover" /></div>
                                ) : null}
                                <div className="px-4 py-1.5 flex justify-between text-[12px] text-gray-500 border-b border-gray-100">
                                  <span>42 reactions</span><span>3 commentaires</span>
                                </div>
                                <div className="px-2 py-1 flex">
                                  {["J'aime", "Commenter", "Republier", "Envoyer"].map((l) => (
                                    <button key={l} className="flex-1 flex items-center justify-center py-2.5 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"><span className="text-[12px] font-semibold">{l}</span></button>
                                  ))}
                                </div>
                              </>
                            )}

                            {/* ═══ TIKTOK ═══ */}
                            {activePlatform === "tiktok" && (
                              <div className="relative bg-black">
                                {activeDevice === "phone" && (
                                  <div className="absolute top-0 left-0 right-0 z-10 px-4 py-2 flex items-center justify-between">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                                    <div className="flex gap-5">
                                      <span className="text-white/60 text-[13px] font-semibold">Suivis</span>
                                      <span className="text-white text-[13px] font-bold border-b-2 border-white pb-0.5">Pour toi</span>
                                    </div>
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                  </div>
                                )}
                                {imageUrl ? (
                                  <div className={`w-full ${activeDevice === "phone" ? "aspect-[9/16]" : "aspect-video"} overflow-hidden`}><img src={imageUrl} alt="" className="w-full h-full object-cover opacity-90" /></div>
                                ) : (
                                  <div className={`w-full ${activeDevice === "phone" ? "aspect-[9/16]" : "aspect-video"} bg-gradient-to-b from-gray-800 to-gray-950`} />
                                )}
                                <div className="absolute bottom-0 left-0 right-14 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                                  <p className="text-white text-[14px] font-bold mb-1">@{(post.socialAccount?.accountName || "compte").toLowerCase().replace(/\s/g, "_")}</p>
                                  <p className="text-white/90 text-[13px] leading-relaxed line-clamp-3">{displayContent}</p>
                                  {displayHashtags && <p className="text-white/70 text-[12px] mt-1">{displayHashtags}</p>}
                                  <div className="flex items-center gap-2 mt-3">
                                    <div className="w-5 h-5 rounded-full bg-white/20 animate-spin" style={{ animationDuration: "3s" }} />
                                    <div className="flex-1 h-[3px] bg-white/20 rounded-full overflow-hidden"><div className="w-1/3 h-full bg-white rounded-full" /></div>
                                  </div>
                                </div>
                                {activeDevice === "phone" && (
                                  <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5">
                                    <div className="w-10 h-10 rounded-full bg-gray-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold">{(post.socialAccount?.accountName || "P")[0]}</div>
                                    {[
                                      { d: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z", l: "4.2K" },
                                      { d: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z", l: "89" },
                                      { d: "M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3", l: "312" },
                                    ].map((item, i) => (
                                      <div key={i} className="flex flex-col items-center">
                                        <svg className="w-7 h-7 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={item.d} /></svg>
                                        <span className="text-white text-[10px] font-semibold mt-0.5">{item.l}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* ═══ PINTEREST ═══ */}
                            {activePlatform === "pinterest" && (
                              <>
                                {imageUrl ? (
                                  <div className="w-full aspect-[2/3] max-h-[380px] bg-gray-100 overflow-hidden relative">
                                    <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                                    <div className="absolute top-3 right-3">
                                      <button className="bg-red-600 text-white text-[13px] font-bold px-5 py-2 rounded-full shadow-lg">Enregistrer</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-full aspect-[2/3] max-h-[380px] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center"><svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v13.5a2.25 2.25 0 002.25 2.25z" /></svg></div>
                                )}
                                <div className="px-4 py-3">
                                  <p className="text-[16px] font-bold text-gray-900 mb-1 leading-snug">{displayContent.slice(0, 100)}</p>
                                  {displayContent.length > 100 && <p className="text-[13px] text-gray-600 leading-relaxed">{displayContent.slice(100)}</p>}
                                  {displayHashtags && <p className="text-[13px] text-gray-500 mt-2">{displayHashtags}</p>}
                                </div>
                              </>
                            )}

                            </div>{/* End scrollable phone content */}

                            {/* Phone home bar */}
                            {activeDevice === "phone" && (
                              <div className={`flex justify-center py-2 shrink-0 ${activePlatform === "tiktok" ? "bg-black" : "bg-white"}`}>
                                <div className={`w-28 h-1 rounded-full ${activePlatform === "tiktok" ? "bg-gray-600" : "bg-gray-300"}`} />
                              </div>
                            )}
                          </div>

                          {/* Phone reflection effect */}
                          {activeDevice === "phone" && (
                            <div className="mt-3 mx-auto w-16 h-1 bg-gray-200 rounded-full opacity-60" />
                          )}
                        </div>
                      </div>

                      {/* Right: Info + edit panel */}
                      <div className="w-full lg:w-[300px] shrink-0 border-t lg:border-t-0 lg:border-l border-gray-200/30 bg-white/40 flex flex-col">
                        {/* Post info */}
                        <div className="p-4 space-y-4 flex-1">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Contenu</p>
                            {isEditing ? (
                              <div className="space-y-2">
                                <div className="relative">
                                  <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    maxLength={charLimit}
                                    className="input w-full min-h-[120px] resize-y text-[13px] leading-relaxed"
                                    placeholder="Contenu du post..."
                                  />
                                  <span className={`absolute bottom-2 right-2 text-[10px] font-semibold ${editContent.length > charLimit * 0.9 ? "text-red-500" : "text-gray-400"}`}>
                                    {editContent.length}/{charLimit}
                                  </span>
                                </div>
                                <input
                                  value={editHashtags}
                                  onChange={(e) => setEditHashtags(e.target.value)}
                                  className="input text-[13px]"
                                  placeholder="#hashtag1, #hashtag2"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={async () => {
                                      await updateSocialPost(post.id, {
                                        content: editContent,
                                        hashtags: editHashtags.split(",").map((h: string) => h.trim()).filter(Boolean),
                                      });
                                      const posts = await getStandalonePosts(selectedSiteId);
                                      setStandalonePosts(posts || []);
                                      setEditingPostId(null);
                                    }}
                                    className="btn-primary px-4 py-2 text-xs flex-1"
                                  >
                                    Sauvegarder
                                  </button>
                                  <button
                                    onClick={() => setEditingPostId(null)}
                                    className="px-4 py-2 text-xs text-gray-500 font-semibold hover:bg-gray-100 rounded-xl transition-colors"
                                  >
                                    Annuler
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-[13px] text-gray-700 leading-relaxed line-clamp-6">{post.content}</p>
                                {(post.hashtags || []).length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {(post.hashtags || []).map((h: string, i: number) => (
                                      <span key={i} className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                                        {h.startsWith("#") ? h : `#${h}`}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {post.status !== "PUBLISHED" && (
                                  <button
                                    onClick={() => { setEditingPostId(post.id); setEditContent(post.content); setEditHashtags((post.hashtags || []).join(", ")); }}
                                    className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-600 text-[12px] font-bold hover:bg-blue-100 hover:border-blue-300 transition-all"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                                    Modifier le contenu
                                  </button>
                                )}
                              </>
                            )}
                          </div>

                          {/* Meta info */}
                          <div className="space-y-2.5 pt-2 border-t border-gray-200/30">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Caracteres</span>
                              <span className={`text-[12px] font-semibold ${displayContent.length > charLimit * 0.9 ? "text-red-500" : "text-gray-600"}`}>
                                {displayContent.length} / {charLimit}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${displayContent.length > charLimit * 0.9 ? "bg-red-500" : displayContent.length > charLimit * 0.7 ? "bg-amber-400" : "bg-blue-500"}`}
                                style={{ width: `${Math.min((displayContent.length / charLimit) * 100, 100)}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Format image</span>
                              <span className="text-[12px] text-gray-600 font-semibold">{PLATFORM_IMAGE_RATIO[activePlatform]?.ratio || "1.91:1"}</span>
                            </div>
                            {hasCarousel && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Carrousel</span>
                                  <span className="text-[12px] text-blue-600 font-semibold">{carouselSlides!.length} slides</span>
                                </div>
                                <div className="space-y-1">
                                  {carouselSlides!.map((s: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2 text-[11px]">
                                      <span className="text-[10px] text-gray-400 font-bold w-4 shrink-0">{i + 1}.</span>
                                      <span className="text-gray-500 font-medium truncate">{s.title}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Plateforme</span>
                              <div className="flex items-center gap-1.5">
                                <span className="w-3.5 h-3.5 flex items-center justify-center [&_svg]:w-3 [&_svg]:h-3 [&_img]:w-3 [&_img]:h-3">{(PLATFORM_META[activePlatform] || meta).icon}</span>
                                <span className="text-[12px] text-gray-600 font-semibold">{(PLATFORM_META[activePlatform] || meta).label}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Date */}
                        <div className="px-4 py-3 border-t border-gray-200/30 bg-white/20">
                          <p className="text-[10px] text-gray-400 font-medium">
                            Cree le {new Date(post.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* Weekly Planning Wizard */}
      {showWeeklyWizard && config && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setShowWeeklyWizard(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg mx-2 sm:mx-4 animate-fade-in-up max-h-[95vh] sm:max-h-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-elevated overflow-hidden rounded-2xl max-h-[95vh] sm:max-h-none overflow-y-auto">
              {/* Progress bar */}
              <div className="h-1 bg-gray-100">
                <div
                  className="h-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${((wizardStep + 1) / 3) * 100}%` }}
                />
              </div>

              <div className="p-4 sm:p-6">
                {/* Close button */}
                <button
                  onClick={() => setShowWeeklyWizard(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Step 0: Introduction */}
                {wizardStep === 0 && (
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/50 flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Planifiez votre semaine</h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                      En 2 etapes, configurez quels jours publier et quel type de contenu pour chaque jour. Tout est modifiable a tout moment.
                    </p>
                    <div className="space-y-3 mb-6">
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/80">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Choisissez vos jours et creneaux</p>
                          <p className="text-xs text-gray-500 mt-0.5">Quels jours publier et a quelle heure</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/80">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Personnalisez chaque jour</p>
                          <p className="text-xs text-gray-500 mt-0.5">Choisissez le type de visuel jour par jour</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setWizardStep(1)}
                      className="btn-primary w-full py-2.5 text-sm"
                    >
                      C'est parti
                    </button>
                  </div>
                )}

                {/* Step 1: Days & Slots */}
                {wizardStep === 1 && (
                  <div>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Etape 1/2</p>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Jours et creneaux</h3>
                    <p className="text-sm text-gray-500 mb-5">Selectionnez les jours actifs et les horaires de publication.</p>

                    {/* Day toggles */}
                    <div className="flex gap-1.5 sm:gap-2 mb-5">
                      {DAY_LABELS.map((label, i) => {
                        const dayNum = i + 1;
                        const active = (config.activeDays || [1, 2, 3, 4, 5]).includes(dayNum);
                        return (
                          <button
                            key={dayNum}
                            onClick={() => {
                              const days = config.activeDays || [1, 2, 3, 4, 5];
                              const next = active ? days.filter((d: number) => d !== dayNum) : [...days, dayNum].sort();
                              setConfig({ ...config, activeDays: next });
                            }}
                            className={`flex-1 h-9 sm:h-11 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${
                              active
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-white/60 border border-gray-200/50 text-gray-400 hover:bg-white/80"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Slot times */}
                    <div className="space-y-2 mb-5">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Horaires de publication</p>
                      {(config.postSlots || ["10:00"]).map((slot: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="time"
                            value={slot}
                            onChange={(e) => {
                              const slots = [...(config.postSlots || ["10:00"])];
                              slots[idx] = e.target.value;
                              setConfig({ ...config, postSlots: slots });
                            }}
                            className="flex-1 px-3 py-2 rounded-xl border border-gray-200/60 bg-white/70 text-sm font-medium text-gray-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                          />
                          {(config.postSlots || ["10:00"]).length > 1 && (
                            <button
                              onClick={() => {
                                const slots = [...(config.postSlots || ["10:00"])];
                                const modes = [...(config.slotModes || slots.map(() => "stock"))];
                                slots.splice(idx, 1);
                                modes.splice(idx, 1);
                                setConfig({ ...config, postSlots: slots, slotModes: modes });
                              }}
                              className="w-9 h-9 rounded-xl border border-gray-200/50 text-gray-400 hover:text-red-500 hover:border-red-200 flex items-center justify-center transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const slots = [...(config.postSlots || ["10:00"])];
                          const modes = [...(config.slotModes || slots.map(() => "stock"))];
                          const last = slots[slots.length - 1] || "10:00";
                          const [h, m] = last.split(":").map(Number);
                          slots.push(`${String(Math.min(h + 2, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
                          modes.push("stock");
                          setConfig({ ...config, postSlots: slots, slotModes: modes });
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Ajouter un creneau
                      </button>
                    </div>

                    <div className="flex gap-3">
                      <button onClick={() => setWizardStep(0)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                        Retour
                      </button>
                      <button onClick={() => setWizardStep(2)} className="flex-1 btn-primary py-2.5 text-sm">
                        Suivant
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Per-slot per-day mode config */}
                {wizardStep === 2 && (() => {
                  const activeDays = (config.activeDays || [1, 2, 3, 4, 5]) as number[];
                  const slots = (config.postSlots || ["10:00"]) as string[];
                  const dayModes: Record<string, string[]> = config.dayModes || {};
                  const defaultSlotModes = (config.slotModes || slots.map(() => "stock")) as string[];

                  const getDaySlotMode = (dayNum: number, slotIdx: number) => {
                    const dayArr = dayModes[String(dayNum)];
                    if (dayArr && dayArr[slotIdx]) return dayArr[slotIdx];
                    return defaultSlotModes[slotIdx] || "stock";
                  };

                  const setDaySlotMode = (dayNum: number, slotIdx: number, mode: string) => {
                    const next = { ...dayModes };
                    if (!next[String(dayNum)]) {
                      next[String(dayNum)] = slots.map((_: string, si: number) => defaultSlotModes[si] || "stock");
                    }
                    next[String(dayNum)] = [...next[String(dayNum)]];
                    next[String(dayNum)][slotIdx] = mode;
                    setConfig({ ...config, dayModes: next });
                  };

                  // Parse compound mode into image source + carousel flag
                  const parseMode = (m: string) => ({
                    img: m.startsWith("ai") ? "ai" : "stock",
                    carousel: m.includes("carousel"),
                  });
                  const buildMode = (img: string, carousel: boolean) => carousel ? `${img}-carousel` : img;

                  const getModeLabel = (m: string) => {
                    const { img, carousel } = parseMode(m);
                    return `${img === "ai" ? "IA" : "Stock"}${carousel ? " + Carrousel" : ""}`;
                  };
                  const getModeColor = (m: string) => {
                    const { img, carousel } = parseMode(m);
                    if (carousel && img === "ai") return "text-indigo-600 bg-indigo-50 border-indigo-200/50";
                    if (carousel) return "text-blue-600 bg-blue-50 border-blue-200/50";
                    if (img === "ai") return "text-purple-600 bg-purple-50 border-purple-200/50";
                    return "bg-gray-100 text-gray-700 border-gray-200/50";
                  };

                  return (
                    <div>
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Etape 2/2</p>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">Configurez chaque post</h3>
                      <p className="text-sm text-gray-500 mb-4">Pour chaque creneau de chaque jour, choisissez le type de visuel.</p>

                      <div className="space-y-3 mb-5 max-h-[340px] overflow-y-auto pr-1">
                        {DAY_LABELS.map((label, i) => {
                          const dayNum = i + 1;
                          if (!activeDays.includes(dayNum)) return null;
                          return (
                            <div key={dayNum} className="p-3 rounded-xl bg-white/60 border border-gray-200/30">
                              <p className="text-xs font-bold text-gray-900 mb-2">{label}</p>
                              <div className="space-y-1.5">
                                {slots.map((slot: string, si: number) => {
                                  const current = getDaySlotMode(dayNum, si);
                                  const { img, carousel } = parseMode(current);
                                  return (
                                    <div key={si} className="flex items-center gap-2">
                                      <span className="text-[11px] font-medium text-gray-500 w-12 shrink-0">{slot}</span>
                                      {/* Image source: Stock / IA */}
                                      <div className="flex bg-gray-100/80 rounded-lg p-0.5 gap-0.5">
                                        <button
                                          onClick={() => setDaySlotMode(dayNum, si, buildMode("stock", carousel))}
                                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                                            img === "stock" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                          }`}
                                        >
                                          Stock
                                        </button>
                                        <button
                                          onClick={() => setDaySlotMode(dayNum, si, buildMode("ai", carousel))}
                                          className="group relative px-2.5 py-1 rounded-md text-[10px] font-bold transition-all overflow-hidden"
                                        >
                                          <div className={`absolute inset-0 rounded-md transition-opacity duration-300 ${
                                            img === "ai" ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                                          }`} style={{
                                            background: "linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899, #f59e0b, #10b981, #3b82f6)",
                                            backgroundSize: "300% 300%",
                                            animation: img === "ai" ? "gradient-shift 4s ease infinite" : "none",
                                          }} />
                                          <div className="absolute inset-[1px] rounded-[5px] bg-white" />
                                          <span className={`relative flex items-center gap-1 transition-colors ${
                                            img === "ai" ? "text-gray-900" : "text-gray-400 group-hover:text-gray-600"
                                          }`}>
                                            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                            </svg>
                                            IA
                                          </span>
                                        </button>
                                      </div>
                                      {/* Carousel toggle */}
                                      <button
                                        onClick={() => setDaySlotMode(dayNum, si, buildMode(img, !carousel))}
                                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                                          carousel
                                            ? "bg-blue-600 border-blue-600 text-white"
                                            : "bg-white border-gray-200/50 text-gray-400 hover:text-gray-600 hover:border-gray-300"
                                        }`}
                                      >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h4v4H6V6zm8 0h4v4h-4V6zm-8 8h4v4H6v-4zm8 0h4v4h-4v-4z" />
                                        </svg>
                                        Carrousel
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Summary grid */}
                      <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/30 mb-5 overflow-x-auto">
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">Resume</p>
                        <div className="grid grid-cols-7 gap-1 min-w-[350px] sm:min-w-0">
                          {DAY_LABELS.map((label, i) => {
                            const dayNum = i + 1;
                            const active = activeDays.includes(dayNum);
                            return (
                              <div key={dayNum} className={`text-center py-1 rounded-lg ${active ? "bg-white" : "opacity-30"}`}>
                                <p className="text-[9px] font-bold text-gray-500 mb-0.5">{label}</p>
                                {active && slots.map((_, si) => (
                                  <span key={si} className={`block text-[8px] font-bold px-1 py-0.5 rounded mt-0.5 ${getModeColor(getDaySlotMode(dayNum, si))}`}>
                                    {getModeLabel(getDaySlotMode(dayNum, si))}
                                  </span>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button onClick={() => setWizardStep(1)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                          Retour
                        </button>
                        <button
                          onClick={async () => {
                            setShowWeeklyWizard(false);
                            setSavingConfig(true);
                            try {
                              await updateSocialConfig(selectedSiteId, config);
                              setSavedConfig(true);
                              setTimeout(() => setSavedConfig(false), 2000);
                              showToast("success", "Planning sauvegarde");
                            } catch (e) {
                              console.error(e);
                              showToast("error", "Erreur lors de la sauvegarde");
                            } finally {
                              setSavingConfig(false);
                            }
                          }}
                          className="flex-1 btn-primary py-2.5 text-sm"
                        >
                          Sauvegarder
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mismatch Warning */}
      {mismatchWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setMismatchWarning(null)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative w-full max-w-md mx-2 sm:mx-4 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="card-elevated overflow-hidden rounded-2xl">
              {/* Warning accent bar */}
              <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400" />

              <div className="p-4 sm:p-6">
                {/* Icon */}
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/50 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-1">Verification du compte</h3>
                <p className="text-[15px] text-gray-700 leading-relaxed mb-4">
                  Le compte <span className="font-bold text-gray-900">"{mismatchWarning.accountName}"</span> ({PLATFORM_META[mismatchWarning.platform]?.label}) ne semble pas correspondre au site <span className="font-bold text-gray-900">"{mismatchWarning.siteName}"</span>.
                </p>
                <p className="text-[15px] text-gray-600 leading-relaxed mb-5">
                  Les posts generes seront bases sur le contenu de votre site. Assurez-vous que ce compte est bien celui sur lequel vous souhaitez publier.
                </p>

                {/* Comparison visual */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-gray-200/40 mb-5">
                  <div className="flex-1 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Site</p>
                    <p className="text-sm font-bold text-gray-900 truncate">{mismatchWarning.siteName}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Compte</p>
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="w-4 h-4 flex items-center justify-center [&_svg]:w-3 [&_svg]:h-3 [&_img]:w-3 [&_img]:h-3">{PLATFORM_META[mismatchWarning.platform]?.icon}</span>
                      <p className="text-sm font-bold text-gray-900 truncate">{mismatchWarning.accountName}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setMismatchWarning(null)}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    C'est correct
                  </button>
                  <button
                    onClick={() => {
                      setMismatchWarning(null);
                      // Find and disconnect the mismatched account
                      const acc = accounts.find((a) => a.accountName === mismatchWarning.accountName && a.platform === mismatchWarning.platform);
                      if (acc) handleDisconnect(acc.id);
                    }}
                    className="flex-1 px-4 py-2.5 text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl transition-colors"
                  >
                    Deconnecter
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Wizard */}
      {showOnboarding && (
        <OnboardingWizard
          onClose={() => {
            setShowOnboarding(false);
            localStorage.setItem("social_onboarding_done", "1");
          }}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-4 sm:bottom-6 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[200] animate-fade-in-up">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border backdrop-blur-sm ${
            toast.type === "error"
              ? "bg-red-50/95 border-red-200/60 text-red-800"
              : "bg-emerald-50/95 border-emerald-200/60 text-emerald-800"
          }`}>
            {toast.type === "error" ? (
              <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <p className="text-sm font-semibold">{toast.message}</p>
            <button onClick={() => setToast(null)} className="ml-2 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
