"use client";

import { useEffect, useCallback, useRef, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "khurklockd:install-prompt-dismissed:v1";

type Mode = null | "prompt" | "ios";

export default function PWARegister() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const swRegisteredRef = useRef(false);

  const registerSW = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
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

    // Honor stored dismissal
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch (err) {
      console.warn("[PWA] install prompt: localStorage read failed", err);
    }
    if (dismissed) return;

    const nav = navigator as Navigator & { standalone?: boolean };
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      nav.standalone === true;
    if (isStandalone) return;

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setMode("prompt");
    };

    window.addEventListener("beforeinstallprompt", handler as EventListener);

    // iOS Safari fallback (no beforeinstallprompt support)
    const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
    if (isIOS) {
      setMode((m) => m ?? "ios");
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler as EventListener);
    };
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
    setMode(null);
  };

  const handleDismiss = () => {
    deferredPromptRef.current = null;
    setMode(null);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch (err) {
      console.warn("[PWA] install prompt: localStorage write failed", err);
    }
  };

  if (!mode) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Khurklockd"
      className={[
        "fixed left-3 right-3 z-50 mx-auto max-w-sm",
        "bottom-[calc(env(safe-area-inset-bottom)+1rem+56px)] md:bottom-[calc(env(safe-area-inset-bottom)+1rem)]",
        "rounded-xl border border-border bg-surface/95 backdrop-blur-sm shadow-lg",
        "p-4 flex items-center gap-3 animate-slide-up",
      ].join(" ")}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-muted text-accent">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2v10" />
          <path d="m18 13-6 6-6-6" />
          <path d="M18 4H4v16h4" />
        </svg>
      </div>
      <p className="flex-1 text-sm text-text-primary break-words">
        {mode === "prompt"
          ? "Install Khurklockd for quick access from your home screen."
          : "Install Khurklockd: tap Share, then Add to Home Screen."}
      </p>
      {mode === "prompt" && (
        <button
          type="button"
          onClick={handleInstall}
          className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-text-inverse hover:bg-accent-hover transition-colors"
        >
          Install
        </button>
      )}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss install prompt"
        className="shrink-0 inline-flex items-center justify-center rounded-lg px-2 py-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
