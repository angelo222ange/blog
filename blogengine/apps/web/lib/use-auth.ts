"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "./api";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((data) => setUser(data))
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  return { user, loading };
}
