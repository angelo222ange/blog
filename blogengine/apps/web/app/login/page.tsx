"use client";

import { useState } from "react";
import { login } from "../../lib/api";
import { getSupabase } from "../../lib/supabase";
import { SignInPage, Testimonial } from "../../components/ui/sign-in";

const testimonials: Testimonial[] = [
  {
    avatarSrc: "https://i.pravatar.cc/150?img=32",
    name: "Sarah M.",
    handle: "@sarahdigital",
    text: "Zuply a transforme notre strategie SEO. Des articles optimises generes en quelques clics.",
  },
  {
    avatarSrc: "https://i.pravatar.cc/150?img=12",
    name: "Thomas L.",
    handle: "@thomastech",
    text: "L'automatisation de la publication est un game-changer. On gagne des heures chaque semaine.",
  },
  {
    avatarSrc: "https://i.pravatar.cc/150?img=68",
    name: "Julie R.",
    handle: "@juliecreates",
    text: "Interface soignee, resultats concrets. Notre trafic organique a augmente de 40% en 3 mois.",
  },
];

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (email: string, password: string) => {
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message || "Identifiants incorrects");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github" | "facebook") => {
    try {
      const supabase = getSupabase();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) {
        setError(error.message);
      }
    } catch (err: any) {
      setError("OAuth non configure. Contactez l'administrateur.");
    }
  };

  return (
    <div className="bg-white bg-orbs">
      <SignInPage
        heroImageSrc="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80"
        testimonials={testimonials}
        onSignIn={handleSignIn}
        onGoogleSignIn={() => handleOAuth("google")}
        onGitHubSignIn={() => handleOAuth("github")}
        onFacebookSignIn={() => handleOAuth("facebook")}
        loading={loading}
        error={error}
      />
    </div>
  );
}
