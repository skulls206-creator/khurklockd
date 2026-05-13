"use client";

import { Modal } from "@/components/ui/Modal";

export interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutEntry {
  keys: string[];
  description: string;
}

const shortcutGroups: { title: string; entries: ShortcutEntry[] }[] = [
  {
    title: "Navigation",
    entries: [
      { keys: ["j", "k"], description: "Move up/down through item list" },
      { keys: ["Enter"], description: "Open selected item" },
      { keys: ["Escape"], description: "Go back / close detail" },
    ],
  },
  {
    title: "Search & Create",
    entries: [
      { keys: ["Ctrl+K", "/"], description: "Focus search input" },
      { keys: ["n"], description: "Create new item" },
    ],
  },
  {
    title: "Actions",
    entries: [
      { keys: ["Ctrl+C"], description: "Copy current credential (password first, then username)" },
      { keys: ["Ctrl+Shift+L"], description: "Lock vault immediately" },
    ],
  },
  {
    title: "Help",
    entries: [
      { keys: ["?"], description: "Show this help dialog" },
    ],
  },
];

function KeyBadge({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className={[
        "inline-flex items-center justify-center",
        "px-2 py-0.5 min-w-[1.5rem]",
        "text-xs font-medium",
        "rounded border border-border-strong",
        "bg-bg-primary text-text-secondary",
        "font-mono",
      ].join(" ")}
    >
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsHelp({
  open,
  onClose,
}: KeyboardShortcutsHelpProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Keyboard Shortcuts"
      footer={
        <button
          onClick={onClose}
          className={[
            "px-4 py-2 rounded-md text-sm font-medium",
            "bg-accent text-white",
            "hover:bg-accent-hover transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
          ].join(" ")}
        >
          Got it
        </button>
      }
    >
      <div className="space-y-5">
        {shortcutGroups.map((group) => (
          <div key={group.title}>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              {group.title}
            </h3>
            <div className="space-y-2">
              {group.entries.map((entry) => (
                <div
                  key={entry.description}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="text-sm text-text-secondary">
                    {entry.description}
                  </span>
                  <span className="flex items-center gap-1 flex-shrink-0">
                    {entry.keys.map((key, i) => (
                      <span key={key} className="flex items-center gap-1">
                        {i > 0 && (
                          <span className="text-xs text-text-muted">or</span>
                        )}
                        <KeyBadge>{key}</KeyBadge>
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export default KeyboardShortcutsHelp;
