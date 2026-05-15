// ── Khurklockd Import Mapper ──────────────────────────────
// Converts ParsedEntry[] → VaultItem[] for bulk vault insert.
// Each entry is normalised to the correct discriminated-union
// type (login, note, card, identity).

import type { ParsedEntry } from "./types";
import type { VaultItem } from "@/types";
import {
  loginItemSchema,
  noteItemSchema,
  cardItemSchema,
  identityItemSchema,
} from "@/lib/vault/schema";

function partialLogin(data: Record<string, unknown>): VaultItem {
  return loginItemSchema.partial({ id: true }).parse(data) as VaultItem;
}

function partialNote(data: Record<string, unknown>): VaultItem {
  return noteItemSchema.partial({ id: true }).parse(data) as VaultItem;
}

function partialCard(data: Record<string, unknown>): VaultItem {
  return cardItemSchema.partial({ id: true }).parse(data) as VaultItem;
}

function partialIdentity(data: Record<string, unknown>): VaultItem {
  return identityItemSchema.partial({ id: true }).parse(data) as VaultItem;
}

/** Normalise a parsed entry into a valid VaultItem. */
export function mapToVaultItem(entry: ParsedEntry): VaultItem {
  const base = {
    name: entry.name || "Untitled",
    favorite: false,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Determine category if not already set
  const cat = entry.category ?? inferCategory(entry);

  switch (cat) {
    case "login":
      return partialLogin({
        id: "",
        type: "login",
        ...base,
        uri: entry.url ?? "",
        username: entry.username ?? "",
        password: entry.password ?? "",
        totpSecret: entry.totpSecret ?? "",
        notes: entry.notes ?? "",
        tags: entry.extra?.grouping
          ? [normalizeTag(entry.extra.grouping)]
          : [],
      });

    case "note":
      return partialNote({
        id: "",
        type: "note",
        ...base,
        content: entry.notes ?? entry.password ?? "Imported note",
      });

    case "card": {
      const content = entry.notes || "";
      return partialCard({
        id: "",
        type: "card",
        ...base,
        cardholderName: extractField(content, "cardholder") || entry.name,
        brand: extractField(content, "brand") || "Unknown",
        number: entry.password || extractField(content, "number") || "",
        expiryMonth: extractField(content, "month") || "01",
        expiryYear: extractField(content, "year") || "2030",
        cvv: extractField(content, "cvv") || extractField(content, "code") || "",
        notes: entry.url ? `URL: ${entry.url}` : "",
      });
    }

    case "identity": {
      const content = entry.notes || "";
      return partialIdentity({
        id: "",
        type: "identity",
        ...base,
        firstName: extractField(content, "first") || entry.name.split(" ")[0] || "Unknown",
        lastName: extractField(content, "last") || entry.name.split(" ").slice(1).join(" ") || "",
        email: entry.username || extractField(content, "email") || "",
        phone: extractField(content, "phone") || "",
        address: extractField(content, "address") || "",
      });
    }

    default:
      return partialNote({
        id: "",
        type: "note",
        ...base,
        content: JSON.stringify(entry, null, 2),
      });
  }
}

/** Infer the best category when not explicitly set. */
function inferCategory(entry: ParsedEntry): ParsedEntry["category"] {
  // Has password + username → login
  if (entry.password || entry.username || entry.url) {
    return "login";
  }
  // Has notes but no password fields → note
  if (entry.notes) {
    return "note";
  }
  // Default: note
  return "note";
}

/** Extract a labelled value from multi-line notes. */
function extractField(text: string, keyword: string): string {
  const lines = text.split("\n");
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes(keyword)) {
      // Return everything after the first colon or space
      const idx = line.indexOf(":");
      if (idx !== -1) {
        return line.slice(idx + 1).trim();
      }
      return line.trim();
    }
  }
  return "";
}

/** Normalise a tag string (lowercase, alphanumeric + hyphens). */
function normalizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30) || "imported";
}

/** Bulk map entries and add them to the vault via VaultManager. */
export async function importEntries(
  entries: ParsedEntry[],
): Promise<{ added: number; skipped: number; duplicates: number; errors: string[] }> {
  const { addItem } = await import("@/lib/vault/vault-manager");
  let added = 0;
  let skipped = 0;
  let duplicates = 0;
  const errors: string[] = [];

  for (const entry of entries) {
    try {
      const item = mapToVaultItem(entry);
      const result = addItem(item);
      if (result.result === "duplicate") {
        duplicates++;
      } else {
        added++;
      }
    } catch (err) {
      skipped++;
      errors.push(
        `Skipped "${entry.name}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { added, skipped, duplicates, errors };
}
