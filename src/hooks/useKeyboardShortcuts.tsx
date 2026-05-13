"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useVault } from "@/hooks/useVault";
import { useClipboard } from "@/hooks/useClipboard";
import { useToast } from "@/components/ui/Toast";
import { KeyboardShortcutsHelp } from "@/components/vault/KeyboardShortcutsHelp";
import type { LoginItem, CardItem, IdentityItem } from "@/types";

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** Check if the event target is an editable element where letter shortcuts should be suppressed. */
function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (EDITABLE_TAGS.has(target.tagName)) return true;
  // Walk up the DOM to catch contentEditable ancestors
  let el: HTMLElement | null = target;
  while (el) {
    if (el.isContentEditable) return true;
    el = el.parentElement;
  }
  return false;
}

/** Query the DOM for item cards within the main content area. */
function getItemCardElements(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-item-id]'),
  );
}

export interface UseKeyboardShortcutsOptions {
  /** Ref to the search input element for focus shortcuts. */
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  /** The currently selected item ID when viewing detail (null otherwise). */
  selectedItemId: string | null;
  /** Whether the user is currently viewing an item detail panel. */
  isViewingDetail: boolean;
  /** Callback to navigate back / close detail / dismiss modal. */
  onBack: () => void;
  /** Callback to start creating a new item. */
  onCreateItem: () => void;
}

export interface UseKeyboardShortcutsReturn {
  /** Whether the keyboard shortcuts help modal is visible. */
  showHelp: boolean;
  /** Programmatically show/hide the help modal. */
  setShowHelp: (show: boolean) => void;
  /** The rendered keyboard shortcuts help modal (null when hidden). */
  KeyboardHelpModal: React.ReactNode;
}

/**
 * Registers global keyboard shortcuts for vault navigation.
 * Must be rendered inside a VaultProvider.
 */
export function useKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions,
): UseKeyboardShortcutsReturn {
  const {
    searchInputRef,
    selectedItemId,
    isViewingDetail,
    onBack,
    onCreateItem,
  } = options;

  const { lockVault, getItem } = useVault();
  const { copy } = useClipboard({ clearAfterMs: 30_000 });
  const { addToast } = useToast();
  const [showHelp, setShowHelp] = useState(false);

  // Keep refs to avoid stale closures in the event listener
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const copyRef = useRef(copy);
  copyRef.current = copy;

  const lockVaultRef = useRef(lockVault);
  lockVaultRef.current = lockVault;

  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

  const getItemRef = useRef(getItem);
  getItemRef.current = getItem;

  const navigateFocus = useCallback((direction: "next" | "prev") => {
    const cards = getItemCardElements();
    if (cards.length === 0) return;

    const current = document.activeElement;
    const currentIndex = cards.findIndex(
      (el) => el === current || el.contains(current),
    );

    let nextIndex: number;
    if (currentIndex === -1) {
      nextIndex = direction === "next" ? 0 : cards.length - 1;
    } else {
      nextIndex =
        direction === "next"
          ? (currentIndex + 1) % cards.length
          : (currentIndex - 1 + cards.length) % cards.length;
    }

    cards[nextIndex].focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target;
      const mod = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      const key = e.key;

      // ── Shortcuts that work even inside inputs ──────────────────

      // Ctrl+Shift+L / Cmd+Shift+L — Lock vault
      if (mod && shift && key.toLowerCase() === "l") {
        e.preventDefault();
        lockVaultRef.current();
        addToastRef.current("Vault locked", "success");
        return;
      }

      // ? — Show keyboard shortcuts help (works in inputs since it's shifted)
      if (!mod && shift && key === "?") {
        e.preventDefault();
        setShowHelp(true);
        return;
      }

      // Is focus inside an input/textarea/contentEditable?
      const inInput = isEditableElement(target);

      // ── Shortcuts that fire INSIDE inputs ──────────────────────

      if (inInput) {
        // Escape — blur the focused input
        if (key === "Escape") {
          (target as HTMLElement).blur();
        }
        // Let all other keys go through normal input handling
        return;
      }

      // ── Shortcuts that fire OUTSIDE inputs ─────────────────────

      // Ctrl+K / Cmd+K — Focus search input
      if (mod && !shift && key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // / — Focus search input
      if (!mod && !shift && key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Escape — Go back / close detail / dismiss
      if (key === "Escape") {
        e.preventDefault();
        if (optionsRef.current.isViewingDetail) {
          optionsRef.current.onBack();
        }
        return;
      }

      // j — Navigate down in item list
      if (key === "j") {
        e.preventDefault();
        navigateFocus("next");
        return;
      }

      // k — Navigate up in item list
      if (key === "k") {
        e.preventDefault();
        navigateFocus("prev");
        return;
      }

      // Enter — Open focused item (ItemCard's own handler fires if focused)
      // No explicit handler needed — ItemCard has onKeyDown for Enter.
      // But if we're NOT on an item card and the user presses Enter, it may
      // do nothing. We leave it to the card's handler.

      // n — New item
      if (key === "n") {
        e.preventDefault();
        optionsRef.current.onCreateItem();
        return;
      }

      // Ctrl+C / Cmd+C — Copy credential (if viewing detail, no text selected)
      if (mod && !shift && key.toLowerCase() === "c") {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
          // User selected text — let the browser handle normal copy
          return;
        }

        const { selectedItemId: selId, isViewingDetail: viewing } =
          optionsRef.current;
        if (viewing && selId) {
          const item = getItemRef.current(selId);
          if (item) {
            e.preventDefault();
            if (item.type === "login") {
              const login = item as LoginItem;
              if (login.password) {
                copyRef.current(login.password);
                addToastRef.current("Password copied to clipboard", "success");
              } else if (login.username) {
                copyRef.current(login.username);
                addToastRef.current("Username copied to clipboard", "success");
              } else {
                addToastRef.current("Nothing to copy", "warning");
              }
            } else if (item.type === "card") {
              const card = item as CardItem;
              if (card.number) {
                copyRef.current(card.number);
                addToastRef.current(
                  "Card number copied to clipboard",
                  "success",
                );
              } else if (card.cardholderName) {
                copyRef.current(card.cardholderName);
                addToastRef.current(
                  "Cardholder name copied to clipboard",
                  "success",
                );
              } else {
                addToastRef.current("Nothing to copy", "warning");
              }
            } else if (item.type === "identity") {
              const identity = item as IdentityItem;
              if (identity.email) {
                copyRef.current(identity.email);
                addToastRef.current("Email copied to clipboard", "success");
              } else if (identity.phone) {
                copyRef.current(identity.phone);
                addToastRef.current("Phone copied to clipboard", "success");
              } else {
                addToastRef.current("Nothing to copy", "warning");
              }
            } else {
              addToastRef.current("Nothing to copy", "warning");
            }
          }
        }
        return;
      }
    },
    [searchInputRef, navigateFocus],
  );

  // Register/deregister the global keydown listener
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const helpModal = (
    <KeyboardShortcutsHelp
      open={showHelp}
      onClose={() => setShowHelp(false)}
    />
  );

  return {
    showHelp,
    setShowHelp,
    KeyboardHelpModal: showHelp ? helpModal : null,
  };
}

export default useKeyboardShortcuts;
