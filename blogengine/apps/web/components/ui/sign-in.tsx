"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// --- OAuth Provider Icons ---

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
  </svg>
);

const GitHubIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const FacebookIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

// --- Testimonial ---

export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

interface SignInPageProps {
  onSignIn?: (email: string, password: string) => void;
  onGoogleSignIn?: () => void;
  onGitHubSignIn?: () => void;
  onFacebookSignIn?: () => void;
  testimonials?: Testimonial[];
  heroImageSrc?: string;
  loading?: boolean;
  error?: string;
}

const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial; delay: string }) => (
  <div
    className={`animate-signin-testimonial ${delay} flex items-start gap-3 rounded-2xl bg-white/30 backdrop-blur-xl border border-white/20 p-4 w-60`}
  >
    <img
      src={testimonial.avatarSrc}
      className="h-9 w-9 object-cover rounded-xl"
      alt={testimonial.name}
    />
    <div className="text-sm leading-snug">
      <p className="font-semibold text-white">{testimonial.name}</p>
      <p className="text-white/60 text-xs">{testimonial.handle}</p>
      <p className="mt-1 text-white/80 text-xs">{testimonial.text}</p>
    </div>
  </div>
);

// --- Main Component ---

export const SignInPage: React.FC<SignInPageProps> = ({
  onSignIn,
  onGoogleSignIn,
  onGitHubSignIn,
  onFacebookSignIn,
  testimonials = [],
  heroImageSrc,
  loading = false,
  error,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSignIn?.(email, password);
  };

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row w-full">
      {/* Left: Sign-in form */}
      <section className="flex-1 flex items-center justify-center p-6 md:p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            {/* Logo + title */}
            <div className="animate-signin-element animate-signin-delay-100">
              <div className="flex items-center gap-2.5 mb-6">
                <img src="/favicon.png" alt="Zuply" className="w-10 h-10 object-contain" />
                <span className="text-2xl font-bold tracking-tight" style={{ color: "#2563eb" }}>zuply</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight leading-tight">
                Bienvenue
              </h1>
            </div>
            <p className="animate-signin-element animate-signin-delay-200 text-gray-500 font-medium">
              Connectez-vous pour acceder a votre plateforme
            </p>

            {/* Email/Password form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="animate-signin-element animate-signin-delay-300">
                <label className="block text-xs text-gray-600 mb-1.5 tracking-wider uppercase font-semibold">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="input"
                  autoFocus
                />
              </div>

              <div className="animate-signin-element animate-signin-delay-400">
                <label className="block text-xs text-gray-600 mb-1.5 tracking-wider uppercase font-semibold">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mot de passe"
                    className="input pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="animate-signin-element bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="animate-signin-element animate-signin-delay-500 w-full btn-primary py-3.5 text-sm"
              >
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>

            {/* Divider */}
            <div className="animate-signin-element animate-signin-delay-600 relative flex items-center justify-center">
              <span className="w-full border-t border-gray-200"></span>
              <span className="px-4 text-xs text-gray-400 bg-white absolute font-semibold uppercase tracking-wider">
                Ou continuer avec
              </span>
            </div>

            {/* OAuth buttons */}
            <div className="animate-signin-element animate-signin-delay-700 flex flex-col gap-3">
              <button
                type="button"
                onClick={onGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                <GoogleIcon />
                Google
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onGitHubSignIn}
                  className="flex-1 flex items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  <GitHubIcon />
                  GitHub
                </button>
                <button
                  type="button"
                  onClick={onFacebookSignIn}
                  className="flex-1 flex items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  <FacebookIcon />
                  Facebook
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Right: Hero image + testimonials */}
      {heroImageSrc && (
        <section className="hidden md:block flex-1 relative p-3">
          <div
            className="animate-signin-slide-right animate-signin-delay-300 absolute inset-3 rounded-3xl bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImageSrc})` }}
          >
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/50 via-transparent to-black/10" />
          </div>
          {testimonials.length > 0 && (
            <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex gap-3 px-6 w-full justify-center">
              <TestimonialCard testimonial={testimonials[0]} delay="animate-signin-delay-1000" />
              {testimonials[1] && (
                <div className="hidden xl:flex">
                  <TestimonialCard testimonial={testimonials[1]} delay="animate-signin-delay-1200" />
                </div>
              )}
              {testimonials[2] && (
                <div className="hidden 2xl:flex">
                  <TestimonialCard testimonial={testimonials[2]} delay="animate-signin-delay-1400" />
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
