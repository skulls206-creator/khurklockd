// ── Khurklockd Emergency Access Module ──────────────────────────
// Trusted contacts, Dead Man's Switch, and emergency access payloads.
//
// All mutation functions operate on the in-memory vault via vault-manager.
// NONE of them call saveVault() — the caller is responsible for persisting
// changes to disk after one or more mutations.
//
// All functions expect the vault to be unlocked. If the vault is locked,
// they throw VaultLockedError (propagated from getActiveVault/getSettings).

import type { EmergencyContact, DeadManSwitchConfig, VaultPayload } from "@/types";
import {
  getActiveVault,
  getSettings,
  updateSettings,
  getVaultFilePath,
} from "@/lib/vault";
import { generateUUID } from "@/lib/crypto";

// ── Helpers ──────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString();
}

// ── Contact Management ───────────────────────────────────────────

/**
 * Add a trusted emergency contact to the vault.
 *
 * Generates an id and createdAt timestamp. The contact is pushed directly
 * onto the active vault's emergencyContacts array.
 *
 * Does NOT auto-save — the caller must call saveVault() to persist.
 *
 * @param contact - The contact to add (id and createdAt are auto-generated)
 */
export function addContact(contact: EmergencyContact): void {
  const vault: VaultPayload = getActiveVault();

  const populated: EmergencyContact = {
    ...contact,
    id: contact.id || generateUUID(),
    createdAt: contact.createdAt || nowISO(),
  };

  vault.settings.emergencyContacts.push(populated);
}

/**
 * Remove an emergency contact by id.
 *
 * Does NOT auto-save — the caller must call saveVault() to persist.
 *
 * @param id - The contact's unique id
 * @returns True if the contact was found and removed, false otherwise
 */
export function removeContact(id: string): boolean {
  const vault: VaultPayload = getActiveVault();
  const { emergencyContacts } = vault.settings;
  const index = emergencyContacts.findIndex((c) => c.id === id);

  if (index === -1) {
    return false;
  }

  emergencyContacts.splice(index, 1);
  return true;
}

/**
 * Get all emergency contacts from the vault.
 *
 * @returns Array of emergency contacts (empty array if none are configured)
 */
export function getContacts(): EmergencyContact[] {
  return getSettings().emergencyContacts;
}

/**
 * Update the wait time for an emergency contact.
 *
 * Does NOT auto-save — the caller must call saveVault() to persist.
 *
 * @param id - The contact's unique id
 * @param waitTimeDays - New wait time in days (1-90)
 * @returns The updated contact, or null if not found
 */
export function updateContactWaitTime(
  id: string,
  waitTimeDays: number,
): EmergencyContact | null {
  const vault: VaultPayload = getActiveVault();
  const contact = vault.settings.emergencyContacts.find((c) => c.id === id);

  if (!contact) {
    return null;
  }

  contact.waitTimeDays = waitTimeDays;
  return contact;
}

// ── Dead Man's Switch ────────────────────────────────────────────

/**
 * Arm (enable) the Dead Man's Switch.
 *
 * The switch monitors vault unlock activity. If the user does not unlock
 * the vault for `inactivityDays` consecutive days, the configured action
 * is triggered (notify emergency contacts, share vault access, or both).
 *
 * Does NOT auto-save — the caller must call saveVault() to persist.
 *
 * @param config - Switch configuration (inactivityDays and action are required)
 */
export function armDeadManSwitch(
  config: Partial<DeadManSwitchConfig> & {
    inactivityDays: number;
    action: "notify" | "share" | "both";
  },
): void {
  const deadManSwitch: DeadManSwitchConfig = {
    inactivityDays: config.inactivityDays,
    action: config.action,
    lastActivityAt: nowISO(),
    armed: true,
  };

  updateSettings({ deadManSwitch });
}

/**
 * Disarm (disable) the Dead Man's Switch.
 *
 * If the switch is not currently armed, this is a no-op.
 *
 * Does NOT auto-save — the caller must call saveVault() to persist.
 */
export function disarmDeadManSwitch(): void {
  const settings = getSettings();

  if (!settings.deadManSwitch) {
    return;
  }

  settings.deadManSwitch.armed = false;
}

/**
 * Record a "check-in" to reset the Dead Man's Switch countdown.
 *
 * Call this whenever the user performs an action that proves they are
 * still active (unlocking the vault, saving, etc.). Updates the
 * lastActivityAt timestamp to now, effectively resetting the timer.
 *
 * If the switch is not armed, this is a no-op.
 *
 * Does NOT auto-save — the caller must call saveVault() to persist.
 */
export function checkInDeadManSwitch(): void {
  const settings = getSettings();

  if (!settings.deadManSwitch || !settings.deadManSwitch.armed) {
    return;
  }

  settings.deadManSwitch.lastActivityAt = nowISO();
}

/**
 * Check whether the Dead Man's Switch has been triggered.
 *
 * Computes the number of full calendar days since the last check-in.
 * If that exceeds the configured inactivity threshold, the switch is
 * considered triggered.
 *
 * @returns { triggered: boolean; missedDays: number } if the switch is
 *          armed, or null if the switch is not configured / not armed
 */
export function checkDeadManSwitch(): {
  triggered: boolean;
  missedDays: number;
} | null {
  const settings = getSettings();

  if (!settings.deadManSwitch || !settings.deadManSwitch.armed) {
    return null;
  }

  const { inactivityDays, lastActivityAt } = settings.deadManSwitch;
  const lastActivity = new Date(lastActivityAt).getTime();
  const now = Date.now();
  const diffMs = now - lastActivity;

  // Full calendar days since last activity (floor, not round — the
  // switch should trigger only after the full threshold has elapsed)
  const missedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return {
    triggered: missedDays > inactivityDays,
    missedDays,
  };
}

// ── Emergency Access Payload ─────────────────────────────────────

/**
 * Generate an emergency access payload for a trusted contact.
 *
 * The payload contains vault metadata that, combined with vault key
 * material (transmitted out-of-band or via PGP), allows a contact to
 * decrypt the vault after their wait period elapses.
 *
 * **Security note:** In production, this payload MUST be encrypted with
 * the contact's PGP public key before being transmitted. The current
 * implementation returns the payload as plain JSON — it is a stub
 * awaiting PGP integration.
 *
 * @param contactId - The emergency contact's unique id
 * @returns A JSON string with vault metadata, or null if the contact
 *          is not found
 */
export function generateEmergencyAccessPayload(
  contactId: string,
): string | null {
  const settings = getSettings();
  const contact = settings.emergencyContacts.find((c) => c.id === contactId);

  if (!contact) {
    return null;
  }

  const vaultName = getVaultFilePath() ?? "MyVault.khurklockd";

  // keySalt is stored in the on-disk Vault envelope, which is not directly
  // exposed by vault-manager. In a production implementation, the salt (or
  // a derived share token) would be retrieved from the vault metadata layer.
  //
  // For recovery to work, the contact needs:
  //   1. This payload (identifies which vault + account to recover)
  //   2. The vault key material — either the master password (shared
  //      out-of-band) or a Shamir-shared key shard
  //   3. The encrypted vault file itself (Lighthouse CID or direct transfer)
  const payload = {
    vaultName,
    keySalt:
      "<retrieved from vault envelope — requires vaultMeta/keySalt export from vault-manager>",
    instructions:
      "This is an emergency access payload from Khurklockd. " +
      "The vault owner has designated you as a trusted contact. " +
      "If the owner has been unreachable for the configured wait period, " +
      "you may use this payload together with the key material you received " +
      "to decrypt the vault file.",
    contactEmail: contact.email,
  };

  // TODO: Encrypt with contact's PGP public key before sending
  return JSON.stringify(payload, null, 2);
}
