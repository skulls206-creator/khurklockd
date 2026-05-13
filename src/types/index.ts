// ── Khurklockd Type Definitions ───────────────────────────────
// Core vault types for the password manager.

/** Unique identifier for vault items. */
export type ItemId = string;

/** Categories of items stored in the vault. */
export type ItemType = "login" | "note" | "card" | "identity";

/** Timestamps stored as ISO-8601 strings. */
export type ISODateTime = string;

// ── Individual Item Types ─────────────────────────────────────

export interface LoginItem {
  id: ItemId;
  type: "login";
  name: string;
  uri?: string;
  username: string;
  password: string;
  totpSecret?: string;
  notes?: string;
  favorite: boolean;
  tags: string[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface NoteItem {
  id: ItemId;
  type: "note";
  name: string;
  content: string;
  favorite: boolean;
  tags: string[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface CardItem {
  id: ItemId;
  type: "card";
  name: string;
  cardholderName: string;
  brand?: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  pin?: string;
  notes?: string;
  favorite: boolean;
  tags: string[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface IdentityItem {
  id: ItemId;
  type: "identity";
  name: string;
  title?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  idNumber?: string;
  notes?: string;
  favorite: boolean;
  tags: string[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** Union of all vault item types. */
export type VaultItem = LoginItem | NoteItem | CardItem | IdentityItem;

// ── Vault ─────────────────────────────────────────────────────

export interface Vault {
  /** Semver version of the vault format. */
  version: string;
  /** ISO-8601 timestamp of vault creation. */
  createdAt: ISODateTime;
  /** ISO-8601 timestamp of last modification. */
  updatedAt: ISODateTime;
  /** Salt used for Argon2 key derivation (hex-encoded). */
  keySalt: string;
  /** Encrypted JSON blob containing VaultPayload. */
  encryptedPayload: string;
  /** AES-256-GCM initialization vector (hex-encoded). */
  iv: string;
  /** HMAC-SHA256 tag for integrity verification. */
  integrityTag: string;
}

/** The decrypted inner payload of a vault. */
export interface VaultPayload {
  items: VaultItem[];
  settings: VaultSettings;
}

// ── Settings ──────────────────────────────────────────────────

export interface VaultSettings {
  /** Vault auto-lock timeout in minutes (0 = never). */
  lockTimeoutMinutes: number;
  /** Number of Argon2 iterations. */
  argon2Iterations: number;
  /** Argon2 memory cost in KiB. */
  argon2MemoryKiB: number;
  /** Argon2 parallelism. */
  argon2Parallelism: number;
  /** Preferred password generator defaults. */
  generatorDefaults: GeneratorConfig;
  /** Lighthouse.Storage CID of the last backup (null if none). */
  lastBackupCid: string | null;
  /** ISO-8601 timestamp of last backup. */
  lastBackupAt: ISODateTime | null;
  /** Emergency access contacts. */
  emergencyContacts: EmergencyContact[];
  /** Dead Man's Switch configuration. */
  deadManSwitch: DeadManSwitchConfig | null;
  /** Master password hint. */
  masterPasswordHint: string;
}

// ── Password Generator ────────────────────────────────────────

export interface GeneratorConfig {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  /** If true, generates passphrases instead of passwords. */
  passphraseMode: boolean;
  /** Number of words in passphrase mode. */
  passphraseWordCount: number;
  /** Word separator in passphrase mode. */
  passphraseSeparator: string;
  /** Custom symbol set (empty = default). */
  customSymbols: string;
  /** Exclude ambiguous characters (Il1O0). */
  excludeAmbiguous: boolean;
}

// ── TOTP ──────────────────────────────────────────────────────

export interface TOTPConfig {
  /** Base32-encoded secret key. */
  secret: string;
  /** Algorithm (SHA-1, SHA-256, SHA-512). */
  algorithm: "SHA-1" | "SHA-256" | "SHA-512";
  /** Number of digits in the code (6 or 8). */
  digits: 6 | 8;
  /** Time step in seconds (default 30). */
  period: number;
  /** Issuer/label for display. */
  label: string;
}

// ── Breach Monitoring ─────────────────────────────────────────

export interface BreachResult {
  /** Email or username checked. */
  query: string;
  /** Whether the query was found in breaches. */
  found: boolean;
  /** List of breach names where the query was found. */
  breaches: BreachDetail[];
  /** ISO-8601 timestamp of the check. */
  checkedAt: ISODateTime;
}

export interface BreachDetail {
  name: string;
  domain: string;
  breachDate: string;
  addedDate: string;
  dataClasses: string[];
  description: string;
  isVerified: boolean;
  isSensitive: boolean;
  pwnCount: number;
}

// ── Emergency Access ──────────────────────────────────────────

export interface EmergencyContact {
  id: string;
  name: string;
  email: string;
  /** Days before access is granted after request. */
  waitTimeDays: number;
  status: "active" | "pending" | "revoked";
  createdAt: ISODateTime;
}

export interface DeadManSwitchConfig {
  /** Days of inactivity before triggering. */
  inactivityDays: number;
  /** Last activity timestamp. */
  lastActivityAt: ISODateTime;
  /** Action to take: notify, share, or both. */
  action: "notify" | "share" | "both";
  /** Whether the switch is armed. */
  armed: boolean;
}

// ── Lighthouse Sync ───────────────────────────────────────────

export interface SyncManifest {
  /** Lighthouse.Storage CID of the latest backup. */
  cid: string;
  /** ISO-8601 timestamp of upload. */
  uploadedAt: ISODateTime;
  /** Size of the encrypted blob in bytes. */
  sizeBytes: number;
  /** Vault version this backup was created with. */
  vaultVersion: string;
}

export interface LighthouseStatus {
  /** Whether the API key is configured. */
  configured: boolean;
  /** Total bytes uploaded this month. */
  bytesUploadedThisMonth: number;
  /** Lighthouse free tier cap (100 MB). */
  capBytes: number;
  /** Percentage of cap used. */
  capUsedPercent: number;
}

// ── UI State ──────────────────────────────────────────────────

export type VaultState =
  | "uninitialized"
  | "locked"
  | "unlocking"
  | "unlocked"
  | "error";

export type ViewRoute =
  | "dashboard"
  | "login"
  | "note"
  | "card"
  | "identity"
  | "generator"
  | "totp"
  | "wallet"
  | "settings"
  | "breach"
  | "emergency"
  | "import";
