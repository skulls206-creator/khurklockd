"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    // Use a small delay to let the client router hydrate before navigating
    const t = setTimeout(() => router.replace("/generator"), 100);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg-primary text-text-primary">
      <p className="text-text-muted" role="status">Redirecting...</p>
    </main>
  );
}