"use client";

import { useEffect, useCallback, useRef, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWARegister() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const swRegisteredRef = useRef(false);

  const registerSW = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.register("/khurklockd/sw.js", {
        scope: "/khurklockd/",
      });
      console.log("[PWA] Service worker registered:", reg.scope);
    } catch (err) {
      console.warn("[PWA] SW registration failed:", err);
    }
  }, []);

  useEffect(() => {
    if (swRegisteredRef.current) return;
    swRegisteredRef.current = true;
    registerSW();
  }, [registerSW]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setShowInstallBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler as EventListener);
    return () =>
      window.removeEventListener("beforeinstallprompt", handler as EventListener);
  }, []);

  const handleInstall = async () => {
    const e = deferredPromptRef.current;
    if (!e) return;
    await e.prompt();
    const { outcome } = await e.userChoice;
    if (outcome === "accepted") {
      console.log("[PWA] User accepted the install prompt");
    }
    deferredPromptRef.current = null;
    setShowInstallBanner(false);
  };

  const handleDismiss = () => {
    deferredPromptRef.current = null;
    setShowInstallBanner(false);
    sessionStorage.setItem("khurklockd-install-dismissed", "1");
  };

  if (!showInstallBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-xl border border-border bg-surface/95 backdrop-blur-sm shadow-lg p-4 flex items-center gap-3 animate-slide-up">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v10" />
          <path d="m18 13-6 6-6-6" />
          <path d="M18 4H4v16h4" />
        </svg>
      </div>
      <p className="flex-1 text-sm text-text-primary">Install Khurklockd for quick access from your home screen.</p>
      <button
        onClick={handleInstall}
        className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-bg-primary hover:bg-emerald-500 transition-colors"
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        className="shrink-0 rounded-lg px-2 py-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        ✕
      </button>
    </div>
  );
}
