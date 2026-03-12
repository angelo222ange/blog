"use client";

import { useEffect, useState, useCallback } from "react";

// ─── Types ───

export interface TourStep {
  target: string;
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right";
  icon?: "welcome" | "sites" | "chart" | "social" | "generate" | "settings" | "check";
}

interface GuidedTourProps {
  tourId: string;
  steps: TourStep[];
  onComplete?: () => void;
}

// ─── Visual Scenes ───

function WelcomeVisual({ animating, direction }: { animating: boolean; direction: string }) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
      animating ? (direction === "next" ? "-translate-x-full opacity-0" : "translate-x-full opacity-0") : "translate-x-0 opacity-100"
    }`}>
      <div className="flex flex-col items-center gap-3">
        {/* Mini dashboard mockup */}
        <div className="flex gap-2">
          {[
            { w: "w-32", color: "from-blue-100 to-blue-50", accent: "bg-blue-500", label: "12", sub: "Articles" },
            { w: "w-28", color: "from-indigo-100 to-indigo-50", accent: "bg-indigo-500", label: "3", sub: "Sites" },
            { w: "w-24", color: "from-violet-100 to-violet-50", accent: "bg-violet-500", label: "28", sub: "Posts" },
          ].map((card, i) => (
            <div key={i} className={`${card.w} bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3 animate-fade-in-up`}
              style={{ animationDelay: `${i * 120}ms` }}>
              <div className={`h-0.5 ${card.accent} rounded-full w-8 mb-2`} />
              <p className="text-lg font-extrabold text-gray-900 leading-none">{card.label}</p>
              <p className="text-[9px] font-semibold text-gray-400 mt-0.5">{card.sub}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm animate-fade-in-up" style={{ animationDelay: "400ms" }}>
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <span className="text-[11px] font-semibold text-gray-600">Tableau de bord pret</span>
        </div>
      </div>
    </div>
  );
}

function StatsVisual({ animating, direction }: { animating: boolean; direction: string }) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
      animating ? (direction === "next" ? "-translate-x-full opacity-0" : "translate-x-full opacity-0") : "translate-x-0 opacity-100"
    }`}>
      <div className="flex items-end gap-4">
        {/* Mini chart */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 w-44 animate-fade-in-up" style={{ animationDelay: "0ms" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Articles / mois</span>
          </div>
          <div className="flex items-end gap-1.5 h-16">
            {[30, 45, 25, 60, 80, 95].map((h, i) => (
              <div key={i} className="flex-1 rounded-t-sm animate-fade-in-up"
                style={{
                  height: `${h}%`,
                  background: `linear-gradient(to top, #3b82f6, #6366f1)`,
                  opacity: 0.3 + (i / 6) * 0.7,
                  animationDelay: `${100 + i * 80}ms`,
                }} />
            ))}
          </div>
        </div>
        {/* Mini donut */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <svg width="80" height="80" className="-rotate-90">
            <circle cx="40" cy="40" r="30" fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle cx="40" cy="40" r="30" fill="none" stroke="#3b82f6" strokeWidth="8"
              strokeDasharray="120 189" strokeLinecap="round" />
            <circle cx="40" cy="40" r="30" fill="none" stroke="#8b5cf6" strokeWidth="8"
              strokeDasharray="50 189" strokeDashoffset="-120" strokeLinecap="round" />
          </svg>
          <div className="text-center -mt-1">
            <span className="text-[9px] font-bold text-gray-400">REPARTITION</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionsVisual({ animating, direction }: { animating: boolean; direction: string }) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
      animating ? (direction === "next" ? "-translate-x-full opacity-0" : "translate-x-full opacity-0") : "translate-x-0 opacity-100"
    }`}>
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { icon: "M12 4.5v15m7.5-7.5h-15", color: "from-blue-500 to-blue-600", label: "Generer" },
          { icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5", color: "from-orange-500 to-orange-600", label: "Planifier" },
          { icon: "M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314", color: "from-purple-500 to-purple-600", label: "Reseaux" },
          { icon: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z", color: "from-emerald-500 to-emerald-600", label: "Sites" },
        ].map((action, i) => (
          <div key={i} className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 animate-fade-in-up hover:scale-105 transition-transform"
            style={{ animationDelay: `${i * 100}ms` }}>
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center shadow-sm`}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
              </svg>
            </div>
            <span className="text-[11px] font-bold text-gray-700">{action.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityVisual({ animating, direction }: { animating: boolean; direction: string }) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
      animating ? (direction === "next" ? "-translate-x-full opacity-0" : "translate-x-full opacity-0") : "translate-x-0 opacity-100"
    }`}>
      <div className="w-72 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
        {[
          { title: "Guide SEO 2026", status: "Publie", statusColor: "bg-emerald-100 text-emerald-700", date: "09 mars" },
          { title: "Tendances marketing", status: "En revue", statusColor: "bg-amber-100 text-amber-700", date: "08 mars" },
          { title: "Strategies digitales", status: "Brouillon", statusColor: "bg-gray-100 text-gray-600", date: "07 mars" },
        ].map((article, i) => (
          <div key={i} className={`px-4 py-3 flex items-center justify-between animate-fade-in-up ${i < 2 ? "border-b border-gray-100" : ""}`}
            style={{ animationDelay: `${i * 150}ms` }}>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-gray-800 truncate">{article.title}</p>
              <p className="text-[9px] text-gray-400 mt-0.5">{article.date}</p>
            </div>
            <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full shrink-0 ${article.statusColor}`}>
              {article.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SocialVisual({ animating, direction }: { animating: boolean; direction: string }) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
      animating ? (direction === "next" ? "-translate-x-full opacity-0" : "translate-x-full opacity-0") : "translate-x-0 opacity-100"
    }`}>
      <div className="flex items-center gap-3">
        {[
          { color: "#1877F2", name: "Fb", path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
          { color: "#E4405F", name: "Ig", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" },
          { color: "#0A66C2", name: "Li", path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" },
          { color: "#14171A", name: "X", path: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" },
          { color: "#BD081C", name: "Pi", path: "M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z" },
        ].map((p, i) => (
          <div key={i} className="w-14 h-14 rounded-2xl bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center transform hover:scale-110 transition-transform animate-fade-in-up"
            style={{ animationDelay: `${i * 100}ms` }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill={p.color}><path d={p.path} /></svg>
          </div>
        ))}
      </div>
    </div>
  );
}

function SitesVisual({ animating, direction }: { animating: boolean; direction: string }) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
      animating ? (direction === "next" ? "-translate-x-full opacity-0" : "translate-x-full opacity-0") : "translate-x-0 opacity-100"
    }`}>
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-2.5">
          {[
            { name: "Mon Blog Tech", articles: 8, color: "bg-blue-500" },
            { name: "Agence SEO", articles: 12, color: "bg-indigo-500" },
            { name: "E-commerce", articles: 5, color: "bg-violet-500" },
          ].map((site, i) => (
            <div key={i} className="w-32 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3.5 animate-fade-in-up"
              style={{ animationDelay: `${i * 150}ms` }}>
              <div className={`w-8 h-8 rounded-lg ${site.color} mb-2.5 flex items-center justify-center`}>
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3" />
                </svg>
              </div>
              <p className="text-[10px] font-bold text-gray-800 truncate">{site.name}</p>
              <p className="text-[8px] text-gray-400 mt-0.5">{site.articles} articles</p>
              <div className="h-1 bg-gray-100 rounded-full mt-2 overflow-hidden">
                <div className={`h-full rounded-full ${site.color}`} style={{ width: `${(site.articles / 12) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <svg className="w-8 h-8 text-emerald-500 animate-fade-in-up" style={{ animationDelay: "500ms" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </div>
  );
}

const VISUAL_MAP: Record<string, React.FC<{ animating: boolean; direction: string }>> = {
  welcome: WelcomeVisual,
  chart: StatsVisual,
  generate: ActionsVisual,
  sites: ActivityVisual,
  social: SocialVisual,
  check: SitesVisual,
};

// ─── Gradient map for visual area per step icon ───

const GRADIENT_MAP: Record<string, string> = {
  welcome: "from-blue-50 via-indigo-50/50 to-violet-50",
  chart: "from-indigo-50 via-blue-50/50 to-cyan-50",
  generate: "from-orange-50 via-amber-50/50 to-yellow-50",
  sites: "from-slate-50 via-gray-50/50 to-blue-50",
  social: "from-pink-50 via-purple-50/50 to-blue-50",
  check: "from-emerald-50 via-teal-50/50 to-cyan-50",
};

// ─── Component ───

export default function GuidedTour({ tourId, steps, onComplete }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState(false);

  const step = steps[currentStep];

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const finish = useCallback(() => {
    setVisible(false);
    localStorage.setItem(`tour_${tourId}_done`, "1");
    onComplete?.();
  }, [tourId, onComplete]);

  const goTo = useCallback((newStep: number) => {
    if (animating || newStep === currentStep) return;
    setDirection(newStep > currentStep ? "next" : "prev");
    setAnimating(true);
    setTimeout(() => {
      setCurrentStep(newStep);
      setAnimating(false);
    }, 300);
  }, [animating, currentStep]);

  const goNext = useCallback(() => {
    if (currentStep >= steps.length - 1) {
      finish();
      return;
    }
    goTo(currentStep + 1);
  }, [currentStep, steps.length, finish, goTo]);

  const goPrev = useCallback(() => {
    if (currentStep <= 0) return;
    goTo(currentStep - 1);
  }, [currentStep, goTo]);

  if (!step || !visible) return null;

  const isLast = currentStep === steps.length - 1;
  const iconKey = step.icon || "welcome";
  const VisualComponent = VISUAL_MAP[iconKey] || WelcomeVisual;
  const gradient = GRADIENT_MAP[iconKey] || GRADIENT_MAP.welcome;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={finish}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg mx-4 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glass card */}
        <div className="card-elevated overflow-hidden rounded-3xl">
          {/* Close button */}
          <button
            onClick={finish}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Visual area */}
          <div className={`relative h-56 bg-gradient-to-br ${gradient} overflow-hidden`}>
            {/* Background decorative circles */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-400/10" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-purple-400/10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-white/20 backdrop-blur-sm" />

            {/* Step visual */}
            <VisualComponent animating={animating} direction={direction} />
          </div>

          {/* Content area */}
          <div className="px-8 pt-6 pb-8">
            {/* Step indicator dots */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep ? "w-8 bg-blue-600" : "w-2 bg-gray-200 hover:bg-gray-300"
                  }`}
                />
              ))}
            </div>

            {/* Text */}
            <div className={`text-center transition-all duration-300 ${
              animating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
            }`}>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h2>
              <p className="text-[15px] text-gray-600 leading-relaxed max-w-sm mx-auto">{step.description}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-8">
              {currentStep > 0 ? (
                <button
                  onClick={goPrev}
                  className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors px-4 py-2"
                >
                  Precedent
                </button>
              ) : (
                <button
                  onClick={finish}
                  className="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors px-4 py-2"
                >
                  Passer
                </button>
              )}

              {!isLast ? (
                <button
                  onClick={goNext}
                  className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2"
                >
                  Suivant
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={finish}
                  className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2"
                >
                  Commencer
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
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

// ─── Hook to check if tour should show ───
// Only shows on first-ever login (onboardedAt === null), persisted server-side

export function useTourState(_tourId: string): [boolean, () => void] {
  const [show, setShow] = useState(false);

  const dismiss = useCallback(() => {
    setShow(false);
    // Mark as onboarded server-side
    import("../lib/api").then(({ markOnboarded }) => markOnboarded().catch(() => {}));
  }, []);

  return [show, dismiss];
}

// Call this from the page after getMe() to set tour visibility
export function shouldShowTour(user: { onboardedAt: string | null }): boolean {
  return user.onboardedAt === null;
}
