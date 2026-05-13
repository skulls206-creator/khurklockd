// ── Khurklockd Vault Manager ─────────────────────────────────────
// Core vault lifecycle: create, open, save, lock, and item CRUD.
// Module-scoped state — NOT React state. This is the pure logic
// layer consumed by React hooks and components.

import type {
  Vault,
  VaultPayload,
  VaultItem,
  VaultSettings,
  ItemType,
} from "@/types";
import {
  generateRandomBytes,
  bytesToHex,
  hexToBytes,
  generateUUID,
} from "@/lib/crypto";
import type { Argon2Config } from "@/lib/crypto";
import {
  deriveKey,
  deriveKeyForHmac,
  encryptVault,
  decryptVault,
  computeIntegrityTag,
  verifyIntegrityTag,
  DecryptionError,
  IntegrityError,
} from "@/lib/crypto";
import type { EncryptedPayload } from "@/lib/crypto";
import { vaultPayloadSchema } from "./schema";
import { loadFile, saveFile, createNewFile } from "./file-io";
import type { FileSystemFileHandle } from "./file-io";

// ── Error Classes ────────────────────────────────────────────────

export class VaultLockedError extends Error {
  constructor() {
    super("Vault is locked — call openVault() first");
    this.name = "VaultLockedError";
  }
}

export class VaultCorruptedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VaultCorruptedError";
  }
}

// ── Module-Scoped State ──────────────────────────────────────────

/** The decrypted vault contents. Null when locked or uninitialized. */
let activeVault: VaultPayload | null = null;

/** FSAA file handle for in-place saves. Null in fallback (download) mode. */
let vaultFileHandle: FileSystemFileHandle | null = null;

/** AES-256-GCM encryption key (non-extractable, lives in Web Crypto). */
let encryptionKey: CryptoKey | null = null;

/** HMAC-SHA256 integrity key (non-extractable). */
let hmacKey: CryptoKey | null = null;

/** Metadata about the loaded vault file. */
let vaultMeta: {
  filePath: string;
  salt: string;
  config: Argon2Config;
} | null = null;

/**
 * The on-disk Vault representation (version, timestamps, etc.).
 * Stored separately from activeVault (the decrypted payload) so we can
 * update envelope fields (updatedAt, integrityTag) on save.
 */
let currentVaultFile: Vault | null = null;

// ── Defaults ─────────────────────────────────────────────────────

const DEFAULT_SETTINGS: VaultSettings = {
  lockTimeoutMinutes: 5,
  argon2Iterations: 600_000,
  argon2MemoryKiB: 65_536,
  argon2Parallelism: 4,
  generatorDefaults: {
    length: 20,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    passphraseMode: false,
    passphraseWordCount: 4,
    passphraseSeparator: "-",
    customSymbols: "",
    excludeAmbiguous: false,
  },
  lastBackupCid: null,
  lastBackupAt: null,
  emergencyContacts: [],
  deadManSwitch: null,
  masterPasswordHint: "",
};

// ── Helpers ──────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString();
}

function generateItemId(): string {
  return generateUUID();
}

function getArgon2Config(settings: VaultSettings): Argon2Config {
  return {
    iterations: settings.argon2Iterations,
    memory: settings.argon2MemoryKiB,
    parallelism: settings.argon2Parallelism,
  };
}

/**
 * Create a new VaultPayload with default settings merged with any overrides.
 */
function makeEmptyPayload(
  settings?: Partial<VaultSettings>,
): VaultPayload {
  const merged: VaultSettings = {
    ...DEFAULT_SETTINGS,
    ...settings,
    generatorDefaults: {
      ...DEFAULT_SETTINGS.generatorDefaults,
      ...(settings?.generatorDefaults ?? {}),
    },
    // Don't shallow-merge arrays — override entirely
    emergencyContacts:
      settings?.emergencyContacts ?? DEFAULT_SETTINGS.emergencyContacts,
  };

  return {
    items: [],
    settings: merged,
  };
}

// ── Vault Lifecycle ──────────────────────────────────────────────

/**
 * Create a brand-new vault with the given master password.
 *
 * Generates a fresh random salt, derives encryption and HMAC keys,
 * creates an empty vault, encrypts it, and saves to a new file via
 * the File System Access API (or download fallback).
 *
 * After calling this, the vault is unlocked and ready for item CRUD.
 *
 * @param masterPassword - The master password (NFC-normalized internally)
 * @param settings - Optional overrides for default vault settings
 */
export async function createVault(
  masterPassword: string,
  settings?: Partial<VaultSettings>,
): Promise<void> {
  // Generate random 32-byte salt
  const salt = generateRandomBytes(32);
  const saltHex = bytesToHex(salt);

  // Derive keys
  encryptionKey = await deriveKey(masterPassword, salt);
  hmacKey = await deriveKeyForHmac(masterPassword, salt);

  // Create the empty vault payload
  const payload = makeEmptyPayload(settings);

  // Validate the payload we just constructed
  const parsed = vaultPayloadSchema.parse(payload) as VaultPayload;

  // Encrypt the payload
  const encrypted: EncryptedPayload = await encryptVault(parsed, encryptionKey);

  // Compute integrity tag over the ciphertext
  const integrityTag = await computeIntegrityTag(encrypted.ciphertext, hmacKey);

  // Build the on-disk Vault envelope
  const now = nowISO();
  const vault: Vault = {
    version: "1.0.0",
    createdAt: now,
    updatedAt: now,
    keySalt: saltHex,
    encryptedPayload: encrypted.ciphertext,
    iv: encrypted.iv,
    integrityTag,
  };

  // Create a new file (FSAA handle or null in fallback mode)
  const handle = await createNewFile();
  await saveFile(vault, handle);

  // Set module-scoped state
  activeVault = parsed;
  vaultFileHandle = handle;
  currentVaultFile = vault;
  vaultMeta = {
    filePath: handle?.name ?? "MyVault.khurklockd",
    salt: saltHex,
    config: getArgon2Config(parsed.settings),
  };
}

/**
 * Open an existing vault file using the master password.
 *
 * Opens a file picker, loads the .khurklockd file, verifies integrity,
 * decrypts the payload, validates the schema, and sets all module-scoped
 * state so the vault is ready for item CRUD.
 *
 * @param masterPassword - The master password for decryption
 * @returns The decrypted VaultPayload
 * @throws {VaultCorruptedError} If the integrity tag doesn't match
 * @throws {DecryptionError} If the password is wrong
 * @throws {VaultFileError} If the file cannot be read
 */
export async function openVault(
  masterPassword: string,
): Promise<VaultPayload> {
  const { vault, handle } = await loadFile();

  // Extract salt and derive keys
  const salt = hexToBytes(vault.keySalt);
  encryptionKey = await deriveKey(masterPassword, salt);
  hmacKey = await deriveKeyForHmac(masterPassword, salt);

  // Verify integrity BEFORE decryption
  const valid = await verifyIntegrityTag(
    vault.encryptedPayload,
    vault.integrityTag,
    hmacKey,
  );

  if (!valid) {
    // Nullify keys on failure — don't leave partial state
    encryptionKey = null;
    hmacKey = null;
    throw new VaultCorruptedError(
      "Vault file is corrupted or has been tampered with — the integrity check failed",
    );
  }

  // Decrypt
  const encrypted: EncryptedPayload = {
    ciphertext: vault.encryptedPayload,
    iv: vault.iv,
  };

  let decrypted: unknown;
  try {
    decrypted = await decryptVault(encrypted, encryptionKey!);
  } catch (err) {
    encryptionKey = null;
    hmacKey = null;
    if (err instanceof DecryptionError) {
      throw err;
    }
    throw new DecryptionError(
      err instanceof Error ? err.message : "Decryption failed",
    );
  }

  // Validate the decrypted payload against the schema
  const parsed = vaultPayloadSchema.parse(decrypted) as VaultPayload;

  // Set module-scoped state
  activeVault = parsed;
  vaultFileHandle = handle;
  currentVaultFile = vault;
  vaultMeta = {
    filePath: handle?.name ?? "MyVault.khurklockd",
    salt: vault.keySalt,
    config: getArgon2Config(parsed.settings),
  };

  return parsed;
}

/**
 * Save the current vault state to disk.
 *
 * Re-encrypts the payload with the existing encryption key, recomputes
 * the integrity tag, and writes to the original file handle (or triggers
 * a download in fallback mode).
 *
 * Must be called after any item mutations to persist changes.
 *
 * @throws {VaultLockedError} If the vault is locked
 */
export async function saveVault(): Promise<void> {
  if (!activeVault || !encryptionKey || !hmacKey || !currentVaultFile) {
    throw new VaultLockedError();
  }

  // Validate payload before encrypting
  const parsed = vaultPayloadSchema.parse(activeVault) as VaultPayload;

  // Re-encrypt
  const encrypted: EncryptedPayload = await encryptVault(parsed, encryptionKey);

  // Recompute integrity tag
  const integrityTag = await computeIntegrityTag(
    encrypted.ciphertext,
    hmacKey,
  );

  // Update the on-disk Vault envelope
  currentVaultFile.updatedAt = nowISO();
  currentVaultFile.encryptedPayload = encrypted.ciphertext;
  currentVaultFile.iv = encrypted.iv;
  currentVaultFile.integrityTag = integrityTag;

  // Persist to disk
  await saveFile(currentVaultFile, vaultFileHandle);
}

/**
 * Lock the vault, clearing all sensitive data from memory.
 *
 * After calling this, the vault must be reopened with `openVault()`
 * before any item CRUD operations can be performed.
 */
export function lockVault(): void {
  activeVault = null;
  encryptionKey = null;
  hmacKey = null;
  vaultMeta = null;
  currentVaultFile = null;
  // vaultFileHandle is intentionally kept — it's not sensitive and
  // allows progressive enhancement when the user reopens the same file
}

/**
 * Returns the current decrypted vault payload.
 *
 * @throws {VaultLockedError} If the vault is locked
 */
export function getActiveVault(): VaultPayload {
  if (!activeVault) {
    throw new VaultLockedError();
  }
  return activeVault;
}

/**
 * Check whether the vault is currently unlocked.
 */
export function isUnlocked(): boolean {
  return activeVault !== null;
}

/**
 * Get the vault's file path or name.
 * Returns null if no vault has been loaded.
 */
export function getVaultFilePath(): string | null {
  return vaultMeta?.filePath ?? null;
}

// ── Item CRUD ────────────────────────────────────────────────────

function ensureUnlocked(): VaultPayload {
  if (!activeVault) {
    throw new VaultLockedError();
  }
  return activeVault;
}

/**
 * Generate a deterministic "duplicate key" from a VaultItem.
 * Two items are considered duplicates if they share the same key:
 * - Login items: uri + '|' + username (if both present), or exact name+url match
 * - Other items (note, card, identity): exact name + type match
 *
 * Returns null if the item doesn't produce a meaningful key.
 */
function duplicateKey(item: VaultItem): string | null {
  if (item.type === "login") {
    if (item.uri && item.username) {
      return `login|${item.uri.toLowerCase()}|${item.username.toLowerCase()}`;
    }
    if (item.uri && item.name) {
      return `login|${item.uri.toLowerCase()}|${item.name.toLowerCase()}`;
    }
  }
  if (item.name) {
    return `${item.type}|${item.name.toLowerCase()}`;
  }
  // Item with no name — can't reliably dedup
  return null;
}

/**
 * Check whether an item that would be a duplicate already exists.
 */
function findDuplicate(vault: VaultPayload, item: VaultItem): VaultItem | null {
  const key = duplicateKey(item);
  if (!key) return null;
  return vault.items.find((existing) => duplicateKey(existing) === key) ?? null;
}

/**
 * Add a new item to the vault.
 * The caller is responsible for calling `saveVault()` to persist.
 *
 * @param item - The item to add (id, createdAt, updatedAt will be auto-generated)
 * @param options - Optional { skipDuplicateCheck } to bypass dedup
 * @returns { result: 'added' | 'duplicate', item } — duplicate returns the existing item
 */
export function addItem(
  item: VaultItem,
  options?: { skipDuplicateCheck?: boolean },
): { result: "added" | "duplicate"; item: VaultItem } {
  const vault = ensureUnlocked();

  if (!options?.skipDuplicateCheck) {
    const dup = findDuplicate(vault, item);
    if (dup) {
      return { result: "duplicate", item: dup };
    }
  }

  const now = nowISO();
  const populated = {
    ...item,
    id: item.id || generateItemId(),
    createdAt: item.createdAt || now,
    updatedAt: now,
    tags: item.tags ?? [],
    favorite: item.favorite ?? false,
  } as VaultItem;

  vault.items.push(populated);
  return { result: "added", item: populated };
}

/**
 * Update an existing item's fields.
 * The caller is responsible for calling `saveVault()` to persist.
 *
 * @param id - The item's unique id
 * @param updates - Partial fields to merge (type cannot be changed)
 * @returns The updated item
 * @throws {Error} If the item is not found
 */
export function updateItem(
  id: string,
  updates: Partial<VaultItem>,
): VaultItem {
  const vault = ensureUnlocked();
  const index = vault.items.findIndex((item) => item.id === id);

  if (index === -1) {
    throw new Error(`Item not found: ${id}`);
  }

  const updated = {
    ...vault.items[index],
    ...updates,
    id, // id is immutable
    type: vault.items[index].type, // type is immutable
    updatedAt: nowISO(),
  } as VaultItem;

  vault.items[index] = updated;
  return updated;
}

/**
 * Delete an item from the vault.
 * The caller is responsible for calling `saveVault()` to persist.
 *
 * @param id - The item's unique id
 * @returns True if the item was found and deleted, false otherwise
 */
export function deleteItem(id: string): boolean {
  const vault = ensureUnlocked();
  const index = vault.items.findIndex((item) => item.id === id);

  if (index === -1) {
    return false;
  }

  vault.items.splice(index, 1);
  return true;
}

/**
 * Toggle the favorite flag on an item.
 * The caller is responsible for calling `saveVault()` to persist.
 *
 * @param id - The item's unique id
 * @returns The updated item, or null if not found
 */
export function toggleFavorite(id: string): VaultItem | null {
  const vault = ensureUnlocked();
  const item = vault.items.find((i) => i.id === id);

  if (!item) {
    return null;
  }

  item.favorite = !item.favorite;
  item.updatedAt = nowISO();
  return item;
}

/**
 * Get a single item by id.
 *
 * @param id - The item's unique id
 * @returns The item, or undefined if not found
 */
export function getItem(id: string): VaultItem | undefined {
  const vault = ensureUnlocked();
  return vault.items.find((item) => item.id === id);
}

/**
 * Search items by name, username, URI, or notes.
 * Case-insensitive, matches substrings.
 *
 * @param query - The search string
 * @param type - Optional item type filter
 * @returns Matching items, ordered by relevance (exact name match first)
 */
export function searchItems(
  query: string,
  type?: ItemType,
): VaultItem[] {
  const vault = ensureUnlocked();
  const lower = query.toLowerCase().trim();

  if (!lower) {
    return type ? getItemsByType(type) : [...vault.items];
  }

  const candidates = type
    ? vault.items.filter((item) => item.type === type)
    : vault.items;

  // Score each item: exact name match = 2, substring match = 1
  const scored = candidates.map((item) => {
    let score = 0;
    const name = item.name.toLowerCase();

    if (name === lower) {
      score = 2;
    } else if (name.includes(lower)) {
      score = 1;
    }

    // Also search in type-specific fields
    if (item.type === "login") {
      if (item.username.toLowerCase().includes(lower)) score = Math.max(score, 1);
      if (item.uri?.toLowerCase().includes(lower)) score = Math.max(score, 1);
      if (item.notes?.toLowerCase().includes(lower)) score = Math.max(score, 1);
    } else if (item.type === "note") {
      if (item.content.toLowerCase().includes(lower)) score = Math.max(score, 1);
    } else if (item.type === "card") {
      if (item.cardholderName.toLowerCase().includes(lower)) score = Math.max(score, 1);
      if (item.number.toLowerCase().includes(lower)) score = Math.max(score, 1);
      if (item.notes?.toLowerCase().includes(lower)) score = Math.max(score, 1);
    } else if (item.type === "identity") {
      if (item.firstName.toLowerCase().includes(lower)) score = Math.max(score, 1);
      if (item.lastName.toLowerCase().includes(lower)) score = Math.max(score, 1);
      if (item.email?.toLowerCase().includes(lower)) score = Math.max(score, 1);
      if (item.notes?.toLowerCase().includes(lower)) score = Math.max(score, 1);
    }

    return { item, score };
  });

  // Filter to matches, sort by score descending, return items
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.item);
}

/**
 * Get all items of a specific type.
 *
 * @param type - The item type to filter by
 */
export function getItemsByType(type: ItemType): VaultItem[] {
  const vault = ensureUnlocked();
  return vault.items.filter((item) => item.type === type);
}

/**
 * Get all favorited items.
 */
export function getFavorites(): VaultItem[] {
  const vault = ensureUnlocked();
  return vault.items.filter((item) => item.favorite);
}

/**
 * Get the total number of items in the vault.
 */
export function getItemCount(): number {
  const vault = ensureUnlocked();
  return vault.items.length;
}

/**
 * Delete all items from the vault.
 * The caller is responsible for calling `saveVault()` to persist.
 *
 * @returns Number of items deleted
 */
export function deleteAllItems(): number {
  const vault = ensureUnlocked();
  const count = vault.items.length;
  vault.items = [];
  return count;
}

/**
 * Get the vault's settings.
 * Shortcut — equivalent to getActiveVault().settings.
 */
export function getSettings(): VaultSettings {
  return ensureUnlocked().settings;
}

/**
 * Update one or more vault settings.
 * The caller is responsible for calling `saveVault()` to persist.
 *
 * @param updates - Partial settings to merge
 */
export function updateSettings(updates: Partial<VaultSettings>): void {
  const vault = ensureUnlocked();
  vault.settings = { ...vault.settings, ...updates };
}
