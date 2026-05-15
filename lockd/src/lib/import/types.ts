// ── Khurklockd Import Types ─────────────────────────────
// Intermediate format: all external password-managers are
// normalised into these generic ParsedEntry objects before
// being mapped to VaultItem (the vault's internal schema).

export type ImportFormat =
  | "lastpass"
  | "1password"
  | "bitwarden"
  | "keepass-csv"
  | "generic-csv"
  | "bitwarden-json"
  | "keepass-xml"
  | "auto";

/** A single password/credential entry after parsing but before vault mapping. */
export interface ParsedEntry {
  name: string;
  url?: string;
  username?: string;
  password?: string;
  notes?: string;
  totpSecret?: string;
  category?: "login" | "note" | "card" | "identity";
  extra?: Record<string, string>;
}

/** Result from the parser — entries plus metadata. */
export interface ParseResult {
  entries: ParsedEntry[];
  format: ImportFormat;
  error?: string;
}
