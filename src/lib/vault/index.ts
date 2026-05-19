// ── Khurklockd Vault Module — Barrel Export ──────────────────────

// ── Schemas ─────────────────────────────────────────────────────
export {
  vaultFileSchema,
  vaultPayloadSchema,
  vaultItemSchema,
  loginItemSchema,
  noteItemSchema,
  cardItemSchema,
  identityItemSchema,
  vaultSettingsSchema,
  generatorConfigSchema,
  deadManSwitchConfigSchema,
  emergencyContactSchema,
} from "./schema";

// ── File I/O ────────────────────────────────────────────────────
export {
  loadFile,
  saveFile,
  createNewFile,
  VaultFileError,
  VaultValidationError,
} from "./file-io";
export type { LoadResult } from "./file-io";

// ── Vault Manager ───────────────────────────────────────────────
export {
  createVault,
  openVault,
  saveVault,
  lockVault,
  getActiveVault,
  isUnlocked,
  getVaultFilePath,
  addItem,
  updateItem,
  deleteItem,
  toggleFavorite,
  getItem,
  searchItems,
  getItemsByType,
  getFavorites,
  getItemCount,
  getAllTags,
  getItemsByTag,
  getCountByType,
  getSettings,
  updateSettings,
  VaultLockedError,
  VaultCorruptedError,
  resetUnlockRateLimit,
  MIN_MASTER_PASSWORD_LENGTH,
} from "./vault-manager";

// ── Lock Timer ──────────────────────────────────────────────────
export {
  startLockTimer,
  resetLockTimer,
  clearLockTimer,
  getRemainingLockTime,
} from "./lock";
