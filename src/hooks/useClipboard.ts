"use client";

import { useCallback, useRef } from "react";

export interface UseClipboardOptions {
  /** Delay in ms before clearing clipboard and internal state. Default 30000 (30s). */
  clearAfterMs?: number;
}

export interface UseClipboardReturn {
  /** Copy text to clipboard. Returns true on success, false on failure. */
  copy: (text: string) => Promise<boolean>;
  /** True while a copied value is still "fresh" (hasn't been cleared yet). */
  copied: boolean;
}

/**
 * Copy text to the clipboard with automatic clearing after a configurable delay.
 *
 * Uses the modern `navigator.clipboard.writeText()` API with a
 * `document.execCommand("copy")` fallback for older browsers.
 */
export function useClipboard(
  options: UseClipboardOptions = {},
): UseClipboardReturn {
  const { clearAfterMs = 30_000 } = options;
  const copiedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          await navigator.clipboard.writeText(text);
        } else {
          // Fallback for older browsers
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.style.position = "fixed";
          textarea.style.left = "-9999px";
          textarea.style.top = "-9999px";
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          const success = document.execCommand("copy");
          document.body.removeChild(textarea);
          if (!success) {
            throw new Error("execCommand returned false");
          }
        }

        copiedRef.current = true;

        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          copiedRef.current = false;
          timeoutRef.current = null;
        }, clearAfterMs);

        return true;
      } catch {
        copiedRef.current = false;
        return false;
      }
    },
    [clearAfterMs],
  );

  return { copy, copied: copiedRef.current };
}
