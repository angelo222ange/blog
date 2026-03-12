/**
 * Pre-built motion templates for social video generation.
 * Each template defines a slide structure + animation style.
 */
import type { MotionTemplate, MotionSlide } from "../types.js";

// ─── Carousel Educatif ───
// Format LinkedIn/Instagram: hook -> probleme -> etapes -> CTA

export const EDUCATIONAL_CAROUSEL: MotionTemplate = {
  id: "educational",
  name: "Carousel Educatif",
  description: "Hook percutant, probleme, solution en etapes, CTA",
  category: "educational",
  previewColor: "#3b82f6",
  defaultTransition: "fade",
  defaultSlides: [
    {
      slideType: "hook",
      title: "",
      subtitle: "",
      backgroundColor: "#0f172a",
      textColor: "#ffffff",
      accentColor: "#3b82f6",
      animation: "slide-up",
      durationFrames: 105, // 3.5s
    },
    {
      slideType: "problem",
      title: "",
      subtitle: "",
      backgroundColor: "#1e1b4b",
      textColor: "#ffffff",
      accentColor: "#ef4444",
      animation: "zoom-in",
      durationFrames: 90,
    },
    {
      slideType: "value",
      title: "",
      subtitle: "",
      backgroundColor: "#0c4a6e",
      textColor: "#ffffff",
      accentColor: "#06b6d4",
      animation: "slide-left",
      durationFrames: 90,
    },
    {
      slideType: "value",
      title: "",
      subtitle: "",
      backgroundColor: "#064e3b",
      textColor: "#ffffff",
      accentColor: "#10b981",
      animation: "fade-in",
      durationFrames: 90,
    },
    {
      slideType: "cta",
      title: "",
      subtitle: "",
      backgroundColor: "#0f172a",
      textColor: "#ffffff",
      accentColor: "#3b82f6",
      animation: "bounce-in",
      durationFrames: 105,
    },
  ],
};

// ─── Storytelling ───
// Format narratif: accroche -> tension -> revelation -> morale

export const STORYTELLING: MotionTemplate = {
  id: "storytelling",
  name: "Storytelling",
  description: "Narration captivante avec tension dramatique",
  category: "storytelling",
  previewColor: "#8b5cf6",
  defaultTransition: "slide-left",
  defaultSlides: [
    {
      slideType: "hook",
      title: "",
      subtitle: "",
      backgroundColor: "#1e1b4b",
      textColor: "#ffffff",
      accentColor: "#a78bfa",
      animation: "blur-reveal",
      durationFrames: 105,
    },
    {
      slideType: "problem",
      title: "",
      subtitle: "",
      backgroundColor: "#27272a",
      textColor: "#ffffff",
      accentColor: "#f59e0b",
      animation: "slide-up",
      durationFrames: 90,
    },
    {
      slideType: "proof",
      title: "",
      subtitle: "",
      backgroundColor: "#18181b",
      textColor: "#ffffff",
      accentColor: "#10b981",
      animation: "fade-in",
      durationFrames: 90,
    },
    {
      slideType: "cta",
      title: "",
      subtitle: "",
      backgroundColor: "#1e1b4b",
      textColor: "#ffffff",
      accentColor: "#8b5cf6",
      animation: "scale-pop",
      durationFrames: 105,
    },
  ],
};

// ─── Stat Punch ───
// Chiffre choc avec contexte

export const STAT_PUNCH: MotionTemplate = {
  id: "stat-punch",
  name: "Stat Punch",
  description: "Chiffre choc + contexte + prise de position",
  category: "social",
  previewColor: "#ef4444",
  defaultTransition: "zoom",
  defaultSlides: [
    {
      slideType: "stat",
      title: "",
      highlight: "",
      backgroundColor: "#0f172a",
      textColor: "#ffffff",
      accentColor: "#ef4444",
      animation: "scale-pop",
      durationFrames: 120, // 4s - let the number sink in
    },
    {
      slideType: "problem",
      title: "",
      subtitle: "",
      backgroundColor: "#1c1917",
      textColor: "#ffffff",
      accentColor: "#f97316",
      animation: "slide-up",
      durationFrames: 90,
    },
    {
      slideType: "value",
      title: "",
      subtitle: "",
      backgroundColor: "#0c4a6e",
      textColor: "#ffffff",
      accentColor: "#06b6d4",
      animation: "fade-in",
      durationFrames: 90,
    },
    {
      slideType: "cta",
      title: "",
      subtitle: "",
      backgroundColor: "#0f172a",
      textColor: "#ffffff",
      accentColor: "#3b82f6",
      animation: "bounce-in",
      durationFrames: 90,
    },
  ],
};

// ─── Product Promo ───

export const PRODUCT_PROMO: MotionTemplate = {
  id: "product-promo",
  name: "Promo Produit",
  description: "Presentation produit avec benefices cles",
  category: "promo",
  previewColor: "#f59e0b",
  defaultTransition: "wipe",
  defaultSlides: [
    {
      slideType: "hook",
      title: "",
      subtitle: "",
      backgroundColor: "#0f172a",
      textColor: "#ffffff",
      accentColor: "#f59e0b",
      animation: "zoom-in",
      durationFrames: 90,
    },
    {
      slideType: "value",
      title: "",
      subtitle: "",
      backgroundColor: "#1e1b4b",
      textColor: "#ffffff",
      accentColor: "#a78bfa",
      animation: "slide-left",
      durationFrames: 75,
    },
    {
      slideType: "value",
      title: "",
      subtitle: "",
      backgroundColor: "#064e3b",
      textColor: "#ffffff",
      accentColor: "#34d399",
      animation: "slide-left",
      durationFrames: 75,
    },
    {
      slideType: "proof",
      title: "",
      subtitle: "",
      highlight: "",
      backgroundColor: "#27272a",
      textColor: "#ffffff",
      accentColor: "#fbbf24",
      animation: "fade-in",
      durationFrames: 90,
    },
    {
      slideType: "cta",
      title: "",
      subtitle: "",
      backgroundColor: "#0f172a",
      textColor: "#ffffff",
      accentColor: "#f59e0b",
      animation: "bounce-in",
      durationFrames: 90,
    },
  ],
};

// ─── Quote Card ───

export const QUOTE_CARD: MotionTemplate = {
  id: "quote",
  name: "Citation",
  description: "Citation inspirante avec animation elegante",
  category: "social",
  previewColor: "#10b981",
  defaultTransition: "fade",
  defaultSlides: [
    {
      slideType: "quote",
      title: "",
      subtitle: "",
      backgroundColor: "#0f172a",
      textColor: "#ffffff",
      accentColor: "#10b981",
      animation: "typewriter",
      durationFrames: 150, // 5s
    },
    {
      slideType: "cta",
      title: "",
      subtitle: "",
      backgroundColor: "#064e3b",
      textColor: "#ffffff",
      accentColor: "#10b981",
      animation: "fade-in",
      durationFrames: 90,
    },
  ],
};

// ─── All Templates ───

export const MOTION_TEMPLATES: MotionTemplate[] = [
  EDUCATIONAL_CAROUSEL,
  STORYTELLING,
  STAT_PUNCH,
  PRODUCT_PROMO,
  QUOTE_CARD,
];

export function getTemplate(id: string): MotionTemplate | undefined {
  return MOTION_TEMPLATES.find((t) => t.id === id);
}
