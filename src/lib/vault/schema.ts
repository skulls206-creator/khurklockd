// ── Khurklockd Zod Validation Schemas ───────────────────────────
// Runtime validation for vault files, payloads, items, and settings.
// All schemas match the TypeScript interfaces in @/types exactly.
// Importing from zod v3 — no extra deps needed.

import { z } from "zod";

// ── Helpers ──────────────────────────────────────────────────────

/** ISO-8601 datetime string regex (simplified but covers the format we emit). */
const isoDatetime = z.string().datetime({ offset: true }).or(
  z.string().datetime({ offset: false }),
);

/** Hex string (lowercase, even length, no 0x prefix). */
const hexString = z.string().regex(/^[0-9a-f]+$/, "Must be a hex string");

/** Tags are lowercase alphanumeric with hyphens. */
const tag = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, "Invalid tag format");

// ── Generator Config ─────────────────────────────────────────────

export const generatorConfigSchema = z.object({
  length: z.number().int().min(4).max(128),
  includeUppercase: z.boolean(),
  includeLowercase: z.boolean(),
  includeNumbers: z.boolean(),
  includeSymbols: z.boolean(),
  passphraseMode: z.boolean(),
  passphraseWordCount: z.number().int().min(3).max(20),
  passphraseSeparator: z.string().max(4),
  customSymbols: z.string(),
  excludeAmbiguous: z.boolean(),
});

// ── Dead Man's Switch ────────────────────────────────────────────

export const deadManSwitchConfigSchema = z.object({
  inactivityDays: z.number().int().min(1).max(365),
  lastActivityAt: isoDatetime,
  action: z.enum(["notify", "share", "both"]),
  armed: z.boolean(),
});

// ── Emergency Contact ────────────────────────────────────────────

export const emergencyContactSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  waitTimeDays: z.number().int().min(1).max(90),
  status: z.enum(["active", "pending", "revoked"]),
  createdAt: isoDatetime,
});

// ── Vault Settings ───────────────────────────────────────────────

export const vaultSettingsSchema = z.object({
  lockTimeoutMinutes: z.number().int().min(0).max(1440).default(5),
  argon2Iterations: z.number().int().min(1).max(10_000_000).default(600_000),
  argon2MemoryKiB: z.number().int().min(1).max(1_048_576).default(65_536),
  argon2Parallelism: z.number().int().min(1).max(16).default(4),
  generatorDefaults: generatorConfigSchema.default({
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
  }),
  lastBackupCid: z.string().nullable().default(null),
  lastBackupAt: isoDatetime.nullable().default(null),
  emergencyContacts: z.array(emergencyContactSchema).default([]),
  deadManSwitch: deadManSwitchConfigSchema.nullable().default(null),
  masterPasswordHint: z.string().default(""),
});

// ── Item Schemas (discriminated union on "type") ─────────────────

const baseItemFields = {
  id: z.string().min(1),
  name: z.string().min(1),
  favorite: z.boolean(),
  tags: z.array(tag),
  createdAt: isoDatetime,
  updatedAt: isoDatetime,
};

export const loginItemSchema = z.object({
  ...baseItemFields,
  type: z.literal("login"),
  uri: z.string().optional(),
  username: z.string(),
  password: z.string(),
  totpSecret: z.string().optional(),
  notes: z.string().optional(),
});

export const noteItemSchema = z.object({
  ...baseItemFields,
  type: z.literal("note"),
  content: z.string(),
});

export const cardItemSchema = z.object({
  ...baseItemFields,
  type: z.literal("card"),
  cardholderName: z.string().min(1),
  brand: z.string().optional(),
  number: z.string().min(1),
  expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, "MM format (01-12)"),
  expiryYear: z.string().regex(/^\d{2,4}$/, "YY or YYYY format"),
  cvv: z.string().regex(/^\d{3,4}$/, "3 or 4 digit CVV"),
  pin: z.string().optional(),
  notes: z.string().optional(),
});

export const identityItemSchema = z.object({
  ...baseItemFields,
  type: z.literal("identity"),
  title: z.string().optional(),
  firstName: z.string().min(1),
  middleName: z.string().optional(),
  lastName: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  idNumber: z.string().optional(),
  notes: z.string().optional(),
});

/** Discriminated union of all vault item types. */
export const vaultItemSchema = z.discriminatedUnion("type", [
  loginItemSchema,
  noteItemSchema,
  cardItemSchema,
  identityItemSchema,
]);

// ── Vault Payload ────────────────────────────────────────────────

export const vaultPayloadSchema = z.object({
  items: z.array(vaultItemSchema),
  settings: vaultSettingsSchema,
});

// ── Vault File ───────────────────────────────────────────────────

export const vaultFileSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Semver required (e.g. 1.0.0)"),
  createdAt: isoDatetime,
  updatedAt: isoDatetime,
  keySalt: hexString.min(1),
  encryptedPayload: hexString.min(1),
  iv: hexString.min(1),
  integrityTag: hexString.min(1),
});
