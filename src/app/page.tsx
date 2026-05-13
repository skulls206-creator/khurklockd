"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/generator");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-primary text-text-primary">
      <p className="text-text-muted">Redirecting...</p>
    </main>
  );
}
