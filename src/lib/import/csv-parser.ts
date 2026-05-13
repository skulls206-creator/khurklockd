// ── Khurklockd CSV Import Parser ──────────────────────────
// Handles LastPass, 1Password, Bitwarden, KeePass CSV exports
// plus generic name/username/password/url CSV files.
// Detects format by column-header signature.

import type { ParsedEntry, ParseResult, ImportFormat } from "./types";

// ── Column maps per format ────────────────────────────────
// Each format exports different column names. We normalise to
// { url, name, username, password, notes, totp }.

interface ColumnMap {
  url: string[];
  name: string[];
  username: string[];
  password: string[];
  notes: string[];
  totp: string[];
  grouping: string[];
  type: string[];
}

const LASTPASS_MAP: ColumnMap = {
  url: ["url"],
  name: ["name"],
  username: ["username"],
  password: ["password"],
  notes: ["notes"],
  totp: ["totp"],
  grouping: ["grouping", "group"],
  type: [],
};

const ONEPASSWORD_MAP: ColumnMap = {
  url: ["urls", "url", "website"],
  name: ["title", "name"],
  username: ["username", "email"],
  password: ["password"],
  notes: ["notes", "notesPlain", "notes plain"],
  totp: ["totp", "otp", "one time password", "one-time password"],
  grouping: ["tags", "category", "vault name"],
  type: ["type"],
};

const BITWARDEN_MAP: ColumnMap = {
  url: ["login_uri", "login_uri", "uri"],
  name: ["name", "item_name"],
  username: ["login_username", "username"],
  password: ["login_password", "password"],
  notes: ["notes", "item_notes"],
  totp: ["totp", "login_totp", "login_otp"],
  grouping: ["folder"],
  type: ["type", "item_type"],
};

const KEEPASS_MAP: ColumnMap = {
  url: ["URL", "Url"],
  name: ["Title", "Account"],
  username: ["User Name", "UserName", "Username"],
  password: ["Password"],
  notes: ["Notes", "Comment"],
  totp: ["TOTP Seed", "totp"],
  grouping: ["Group"],
  type: [],
};

const GENERIC_MAP: ColumnMap = {
  url: ["url", "website", "site", "uri", "URL", "Website", "Site", "Uri"],
  name: ["name", "title", "application", "service", "Name", "Title", "Application"],
  username: ["username", "user", "email", "login", "Username", "User", "Email", "Login"],
  password: ["password", "pass", "Password", "Pass"],
  notes: ["notes", "comment", "Notes", "Comment"],
  totp: ["totp", "otp", "Totp", "Otp"],
  grouping: ["group", "category", "folder"],
  type: ["type"],
};

const FORMAT_MAPS: Record<string, ColumnMap> = {
  lastpass: LASTPASS_MAP,
  "1password": ONEPASSWORD_MAP,
  bitwarden: BITWARDEN_MAP,
  "keepass-csv": KEEPASS_MAP,
  "generic-csv": GENERIC_MAP,
};

/**
 * Detect format by header signature.
 */
function detectFormat(headers: string[]): ImportFormat {
  const lower = headers.map((h) => h.toLowerCase().trim());

  const has = (candidates: string[]) =>
    candidates.some((c) => lower.includes(c.toLowerCase()));

  if (has(["grouping"])) return "lastpass";
  if (has(["login_uri", "login_username", "login_password"])) return "bitwarden";
  if (has(["Group", "Title"]) && (has(["URL", "Url"]))) return "keepass-csv";
  if (has(["urls", "title"]) && (has(["password"]))) return "1password";

  return "generic-csv";
}

/**
 * Resolve a value from a row using a list of possible column names.
 */
function resolve(
  row: Record<string, string>,
  candidates: string[],
): string {
  for (const c of candidates) {
    // Case-insensitive match
    const key = Object.keys(row).find(
      (k) => k.toLowerCase().trim() === c.toLowerCase().trim(),
    );
    if (key && row[key]) return row[key];
  }
  return "";
}

/**
 * Parse CSV text into ParsedEntry[] with auto-detected format.
 */
export function parseCSV(text: string, forceFormat?: ImportFormat): ParseResult {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) {
    return { entries: [], format: forceFormat ?? "auto", error: "CSV file is empty or has only a header row" };
  }

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row);
  }

  const format = forceFormat && forceFormat !== "auto"
    ? forceFormat
    : detectFormat(headers);

  const columnMap = FORMAT_MAPS[format] ?? GENERIC_MAP;

  const entries: ParsedEntry[] = rows.map((row) => {
    const entry: ParsedEntry = {
      name: resolve(row, columnMap.name) || "Untitled",
    };

    const url = resolve(row, columnMap.url);
    if (url) entry.url = url;

    const username = resolve(row, columnMap.username);
    if (username) entry.username = username;

    const password = resolve(row, columnMap.password);
    if (password) entry.password = password;

    const notes = resolve(row, columnMap.notes);
    if (notes) entry.notes = notes;

    const totp = resolve(row, columnMap.totp);
    if (totp) entry.totpSecret = totp;

    const grouping = resolve(row, columnMap.grouping);
    if (grouping) {
      entry.extra = { grouping };
    }

    // Type detection from source field
    const typeVal = resolve(row, columnMap.type).toLowerCase().trim();
    if (typeVal) {
      if (typeVal === "note" || typeVal === "secure note") {
        entry.category = "note";
      } else if (typeVal === "card" || typeVal === "credit card") {
        entry.category = "card";
      } else if (typeVal === "identity") {
        entry.category = "identity";
      } else {
        entry.category = "login";
      }
    }

    return entry;
  });

  return { entries, format };
}

/**
 * Minimal CSV line parser that handles quoted fields with commas and escaped quotes.
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }

  result.push(current.trim());
  return result;
}
