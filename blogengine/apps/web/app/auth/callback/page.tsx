"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../../lib/supabase";
import { oauthLogin } from "../../../lib/api";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    async function handleCallback() {
      try {
        const supabase = getSupabase();
        // Supabase auto-parses the hash fragment from the OAuth redirect
        const { data, error: authError } = await supabase.auth.getSession();

        if (authError || !data.session) {
          setError("Echec de l'authentification OAuth");
          setTimeout(() => router.replace("/login"), 3000);
          return;
        }

        const user = data.session.user;
        const email = user.email;
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.preferred_username ||
          email?.split("@")[0] ||
          "";
        const provider = user.app_metadata?.provider || "oauth";
        const providerId = user.id;

        // Sync with our API: create or login the user in our DB
        await oauthLogin({
          email: email!,
          name,
          provider,
          providerId,
        });

        window.location.href = "/";
      } catch (err: any) {
        console.error("OAuth callback error:", err);
        setError(err.message || "Erreur lors de la connexion");
        setTimeout(() => router.replace("/login"), 3000);
      }
    }

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-white bg-orbs flex items-center justify-center">
      <div className="text-center relative z-10">
        {error ? (
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-600 font-medium text-sm">{error}</p>
            <p className="text-gray-400 text-xs">Redirection vers la page de connexion...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-10 h-10 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 font-medium text-sm">Connexion en cours...</p>
          </div>
        )}
      </div>
    </div>
  );
}
