// ── Khurklockd JSON Import Parser ─────────────────────────
// Handles Bitwarden JSON export and 1Password 1PUX-like JSON
// (the structured JSON formats those managers produce).
// Also handles generic key-value JSON arrays.

import type { ParsedEntry, ParseResult, ImportFormat } from "./types";

// ── Bitwarden JSON schema (simplified) ────────────────────
interface BWItem {
  type?: number; // 1=login, 2=secure note, 3=card, 4=identity
  name?: string;
  notes?: string;
  favorite?: boolean;
  fields?: Array<{ name: string; value: string; type?: number }>;
  login?: {
    uris?: Array<{ uri?: string }>;
    username?: string;
    password?: string;
    totp?: string;
  };
  card?: {
    cardholderName?: string;
    brand?: string;
    number?: string;
    expMonth?: string;
    expYear?: string;
    code?: string;
  };
  identity?: {
    title?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    idNumber?: string;
  };
}

interface BWExport {
  encrypted: boolean;
  items?: BWItem[];
}

// ── 1Password export schema (1P 8.x JSON format) ────────
interface OPVault {
  attrs?: { title?: string };
  items?: Array<{
    title?: string;
    category?: string;
    urls?: Array<{ u?: string; label?: string }>;
    fields?: Array<{
      designation?: string;
      value?: string;
      type?: string;
      id?: string;
    }>;
    sections?: Array<{
      fields?: Array<{
        t?: string;
        v?: string;
        id?: string;
      }>;
    }>;
    tags?: string[];
  }>;
}

/** Detect JSON format by structural sniffing. */
function detectJSONFormat(data: unknown): ImportFormat {
  if (Array.isArray(data)) {
    // Array of objects — could be 1P flat export or generic
    if (data.length > 0) {
      const first = data[0] as Record<string, unknown>;
      if (first.vaults || first.category) return "1password";
      if (first.login_uris !== undefined || first.login_username !== undefined) return "bitwarden";
    }
    return "generic-csv"; // generic JSON array
  }

  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    if ("encrypted" in obj && "items" in obj) return "bitwarden-json";
    if ("vaults" in obj) return "1password";
    if (Array.isArray(obj.items)) {
      const first = (obj as unknown as BWExport).items?.[0];
      if (first && ("login" in first || "card" in first || "encrypted" in first)) return "bitwarden-json";
      if (first && "category" in first) return "1password";
    }
  }

  return "auto";
}

/** 1Password category → our category */
function opCategoryToCat(cat?: string): ParsedEntry["category"] {
  const lower = (cat || "").toLowerCase();
  if (lower === "password") return "login";
  if (lower === "securenote") return "note";
  if (lower === "creditcard") return "card";
  if (lower === "identity") return "identity";
  return "login";
}

/** Bitwarden numeric type → our category */
function bwTypeToCat(type?: number): ParsedEntry["category"] {
  switch (type) {
    case 1: return "login";
    case 2: return "note";
    case 3: return "card";
    case 4: return "identity";
    default: return "login";
  }
}

/** Parse a 1Password-style vault JSON. */
function parse1PasswordJSON(data: unknown, entries: ParsedEntry[]) {
  // Handle { vaults: [...] } wrapper or flat { items: [...] }
  const vaults = (data as Record<string, unknown>).vaults as Array<{ items?: OPVault["items"] }> | undefined;
  let items: OPVault["items"] | undefined;

  if (vaults) {
    items = vaults.flatMap((v) => v.items ?? []);
  } else {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(data)) {
      items = data as OPVault["items"];
    } else if (Array.isArray(obj.items)) {
      items = obj.items as OPVault["items"];
    }
  }

  if (!items) return;

  for (const item of items) {
    const entry: ParsedEntry = {
      name: item.title || "Untitled",
      category: opCategoryToCat(item.category),
    };

    // URLs
    if (item.urls && item.urls.length > 0) {
      entry.url = item.urls[0].u;
    }

    // Fields
    if (item.fields) {
      for (const f of item.fields) {
        const des = (f.designation || f.id || "").toLowerCase();
        if (des === "username" || des === "email") entry.username = f.value;
        else if (des === "password" || des === "password ") entry.password = f.value;
        else if (des === "totp" || des === "one-time password") entry.totpSecret = f.value;
      }
    }

    // Sections (secure notes etc.)
    if (item.sections) {
      const notes: string[] = [];
      for (const section of item.sections) {
        if (!section.fields) continue;
        for (const f of section.fields) {
          notes.push(`${f.t || ""}: ${f.v || ""}`);
        }
      }
      if (notes.length > 0) {
        entry.notes = notes.join("\n");
      }
    }

    // Tags as grouping
    if (item.tags && item.tags.length > 0) {
      entry.extra = { grouping: item.tags.join(", ") };
    }

    entries.push(entry);
  }
}

/** Parse a Bitwarden JSON export. */
function parseBitwardenJSON(data: unknown, entries: ParsedEntry[]) {
  const bw = data as BWExport;
  const items = bw.items || [];

  for (const item of items) {
    const entry: ParsedEntry = {
      name: item.name || "Untitled",
      category: bwTypeToCat(item.type),
    };

    // Login items
    if (item.login) {
      if (item.login.uris && item.login.uris.length > 0) {
        entry.url = item.login.uris[0].uri;
      }
      if (item.login.username) entry.username = item.login.username;
      if (item.login.password) entry.password = item.login.password;
      if (item.login.totp) entry.totpSecret = item.login.totp;
    }

    // Notes
    if (item.notes) entry.notes = item.notes;

    // Custom fields
    if (item.fields) {
      for (const f of item.fields) {
        if (f.type === 2 && !entry.totpSecret) {
          entry.totpSecret = f.value; // TOTP field
        }
      }
    }

    entries.push(entry);
  }
}

/** Parse generic JSON array of objects. */
function parseGenericJSON(data: unknown, entries: ParsedEntry[]) {
  const items = Array.isArray(data) ? data : [data];

  for (const raw of items) {
    if (typeof raw !== "object" || raw === null) continue;
    const obj = raw as Record<string, unknown>;
    const entry: ParsedEntry = {
      name: String(obj.name || obj.title || obj.service || obj.site || obj.account || "Untitled"),
    };

    const str = (v: unknown) => (v !== null && v !== undefined) ? String(v) : "";

    entry.url = str(obj.url || obj.website || obj.uri);
    entry.username = str(obj.username || obj.user || obj.email || obj.login);
    entry.password = str(obj.password || obj.pass);
    entry.notes = str(obj.notes || obj.comment);
    entry.totpSecret = str(obj.totp || obj.otp);

    entries.push(entry);
  }
}

/** Parse JSON text into ParsedEntry[]. */
export function parseJSON(text: string, forceFormat?: ImportFormat): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { entries: [], format: forceFormat ?? "auto", error: "Invalid JSON: file could not be parsed" };
  }

  const format = forceFormat && forceFormat !== "auto"
    ? forceFormat
    : detectJSONFormat(data);

  const entries: ParsedEntry[] = [];

  switch (format) {
    case "bitwarden-json":
      parseBitwardenJSON(data, entries);
      break;
    case "1password":
      parse1PasswordJSON(data, entries);
      break;
    default:
      parseGenericJSON(data, entries);
      break;
  }

  return { entries, format };
}
