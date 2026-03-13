"use client";

import { useState } from "react";
import { login } from "../../lib/api";
import { getSupabase } from "../../lib/supabase";
import { SignInPage, Testimonial } from "../../components/ui/sign-in";

const testimonials: Testimonial[] = [
  {
    avatarSrc: "https://api.dicebear.com/9.x/notionists/svg?seed=Sarah&backgroundColor=b6e3f4",
    name: "Sarah M.",
    handle: "@sarahdigital",
    text: "Zuply a transforme notre strategie SEO. Des articles optimises generes en quelques clics.",
  },
  {
    avatarSrc: "https://api.dicebear.com/9.x/notionists/svg?seed=Thomas&backgroundColor=c0aede",
    name: "Thomas L.",
    handle: "@thomastech",
    text: "L'automatisation de la publication est un game-changer. On gagne des heures chaque semaine.",
  },
  {
    avatarSrc: "https://api.dicebear.com/9.x/notionists/svg?seed=Julie&backgroundColor=ffd5dc",
    name: "Julie R.",
    handle: "@juliecreates",
    text: "Interface soignee, resultats concrets. Notre trafic organique a augmente de 40% en 3 mois.",
  },
  {
    avatarSrc: "https://api.dicebear.com/9.x/notionists/svg?seed=Marc&backgroundColor=d1f4d1",
    name: "Marc D.",
    handle: "@marcdev",
    text: "Le multi-site est genial. On gere 5 blogs depuis un seul tableau de bord.",
  },
  {
    avatarSrc: "https://api.dicebear.com/9.x/notionists/svg?seed=Lea&backgroundColor=ffe0b2",
    name: "Lea P.",
    handle: "@leapro",
    text: "La planification automatique nous a fait gagner 10h par semaine. Indispensable.",
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
