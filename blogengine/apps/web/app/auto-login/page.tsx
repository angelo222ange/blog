"use client";

import { useEffect, useState } from "react";

export default function AutoLoginPage() {
  const [status, setStatus] = useState("Connexion en cours...");

  useEffect(() => {
    // Dev-only: redirect to the API auto-login endpoint
    if (process.env.NODE_ENV === "production") {
      setStatus("Auto-login desactive en production.");
      return;
    }
    window.location.href = "/api/auth/auto-login";
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <p className="text-gray-600 text-lg font-medium">{status}</p>
    </div>
  );
}
