"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastData {
  id: string;
  message: string;
  variant: ToastVariant;
  createdAt: number;
}

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const variantIcons: Record<ToastVariant, ReactNode> = {
  success: (
    <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg className="h-5 w-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21.28 5L12 21.28 2.72 5h18.56z" />
    </svg>
  ),
  info: (
    <svg className="h-5 w-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
    </svg>
  ),
};

const variantClasses: Record<ToastVariant, string> = {
  success: "border-success/30",
  error: "border-danger/30",
  warning: "border-warning/30",
  info: "border-info/30",
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  return (
    <div
      role="alert"
      className={[
        "flex items-start gap-3 p-4 rounded-lg border bg-surface shadow-lg",
        "animate-[toastSlideIn_0.3s_ease-out]",
        "min-w-[300px] max-w-[420px]",
        variantClasses[toast.variant],
      ].join(" ")}
    >
      <span className="flex-shrink-0 mt-0.5">
        {variantIcons[toast.variant]}
      </span>
      <p className="flex-1 text-sm text-text-primary">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="flex-shrink-0 text-text-muted hover:text-text-primary transition-colors rounded-sm p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Toast Context ───────────────────────────────────────────────

interface ToastContextValue {
  addToast: (message: string, variant?: ToastVariant) => void;
}

let toastContext: ToastContextValue | null = null;
let toastListeners: Array<(ctx: ToastContextValue) => void> = [];

export function useToast(): ToastContextValue {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = (ctx: ToastContextValue) => {
      toastContext = ctx;
      forceUpdate((n) => n + 1);
    };
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);

  if (!toastContext) {
    // Return a noop context — will be populated when ToastContainer mounts
    return {
      addToast: () => {
        // queued; will show once container mounts
      },
    };
  }

  return toastContext;
}

// ── Toast Container ─────────────────────────────────────────────

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, variant, createdAt: Date.now() }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Register global context
  useEffect(() => {
    const ctx: ToastContextValue = { addToast };
    toastContext = ctx;
    toastListeners.forEach((l) => l(ctx));
    return () => {
      toastContext = null;
      toastListeners.forEach((l) => l({ addToast: () => {} }));
    };
  }, [addToast]);

  // Auto-dismiss after 5s
  useEffect(() => {
    if (toasts.length === 0) return;

    const oldest = toasts[0];
    const elapsed = Date.now() - oldest.createdAt;
    const remaining = Math.max(0, 5_000 - elapsed);

    const timer = setTimeout(() => {
      dismiss(oldest.id);
    }, remaining);

    return () => clearTimeout(timer);
  }, [toasts, dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}

      <style jsx>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(100%) scale(0.95); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
