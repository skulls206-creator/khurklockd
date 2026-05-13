// ── Khurklockd Lighthouse.Storage Integration ─────────────────────
// Encrypted backup upload, restore download, CID tracking, and
// 100 MB cap enforcement via the Lighthouse API.
//
// Uses fetch() directly against Lighthouse endpoints — no Node SDK
// required, fully browser-compatible.

import type { Vault, SyncManifest, LighthouseStatus } from "@/types";

// ── Constants ──────────────────────────────────────────────────────

/** Lighthouse upload endpoint. */
const LIGHTHOUSE_UPLOAD_URL = "https://node.lighthouse.storage/api/v0/add";

/** Lighthouse IPFS gateway for downloads. */
const LIGHTHOUSE_GATEWAY_URL = "https://gateway.lighthouse.storage/ipfs";

/** Lighthouse user status endpoint. */
const LIGHTHOUSE_STATUS_URL = "https://api.lighthouse.storage/api/user/status";

/** Free tier upload cap in bytes (100 MB). */
const FREE_TIER_CAP_BYTES = 104_857_600;

/** Warning threshold in bytes (80 MB). */
const WARNING_THRESHOLD_BYTES = 83_886_080;

// ── Error Classes ──────────────────────────────────────────────────

export class LighthouseUploadError extends Error {
  constructor(message: string) {
    super(`Lighthouse upload failed: ${message}`);
    this.name = "LighthouseUploadError";
  }
}

export class LighthouseDownloadError extends Error {
  constructor(message: string) {
    super(`Lighthouse download failed: ${message}`);
    this.name = "LighthouseDownloadError";
  }
}

export class LighthouseCapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LighthouseCapError";
  }
}

// ── Internal Helpers ───────────────────────────────────────────────

/** Standard fetch headers for Lighthouse API calls. */
function authHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };
}

/**
 * Extract a human-readable error message from a Lighthouse API response.
 * Lighthouse tends to return plain-text or HTML errors; try JSON first.
 */
async function extractError(response: Response): Promise<string> {
  try {
    const json = await response.json();
    if (typeof json === "object" && json !== null) {
      const msg =
        (json as Record<string, unknown>).message ??
        (json as Record<string, unknown>).error ??
        JSON.stringify(json);
      return String(msg);
    }
    return String(json);
  } catch {
    // Not JSON — grab up to 500 chars of the body
    const text = await response.text();
    return text.slice(0, 500) || `HTTP ${response.status} ${response.statusText}`;
  }
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Upload an encrypted vault to Lighthouse.Storage.
 *
 * The `vault` parameter is the **on-disk** Vault envelope (already
 * encrypted) — this module never sees plaintext passwords or items.
 *
 * @param vault - The encrypted Vault to back up
 * @param apiKey - Lighthouse API key
 * @returns SyncManifest with CID, timestamp, size, and vault version
 * @throws {LighthouseUploadError} If the upload fails
 */
export async function uploadBackup(
  vault: Vault,
  apiKey: string,
): Promise<SyncManifest> {
  const json = JSON.stringify(vault);
  const blob = new Blob([json], { type: "application/json" });
  const sizeBytes = blob.size;

  const formData = new FormData();
  formData.append("file", blob, "vault.khurklockd");

  let response: Response;
  try {
    response = await fetch(LIGHTHOUSE_UPLOAD_URL, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: formData,
    });
  } catch (err) {
    throw new LighthouseUploadError(
      err instanceof Error ? err.message : "Network error during upload",
    );
  }

  if (!response.ok) {
    const detail = await extractError(response);
    throw new LighthouseUploadError(
      `HTTP ${response.status}: ${detail}`,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new LighthouseUploadError("Invalid JSON response from Lighthouse");
  }

  if (
    typeof data !== "object" ||
    data === null ||
    !("Hash" in data) ||
    typeof (data as Record<string, unknown>).Hash !== "string"
  ) {
    throw new LighthouseUploadError(
      `Unexpected response shape: ${JSON.stringify(data)}`,
    );
  }

  const parsed = data as { Hash: string; Name?: string; Size?: string };

  return {
    cid: parsed.Hash,
    uploadedAt: new Date().toISOString(),
    sizeBytes,
    vaultVersion: vault.version,
  };
}

/**
 * Download an encrypted vault backup from Lighthouse.Storage by CID.
 *
 * The returned Vault is **still encrypted** — decryption happens in
 * the vault-manager module after the caller verifies the integrity tag.
 *
 * @param cid - IPFS content identifier of the backup
 * @param apiKey - Lighthouse API key (unused for public gateway downloads
 *   but accepted for future key-gated retrieval)
 * @returns The encrypted Vault object
 * @throws {LighthouseDownloadError} If the download or parse fails
 */
export async function downloadBackup(
  cid: string,
  apiKey: string,
): Promise<Vault> {
  const url = `${LIGHTHOUSE_GATEWAY_URL}/${encodeURIComponent(cid)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: authHeaders(apiKey),
    });
  } catch (err) {
    throw new LighthouseDownloadError(
      err instanceof Error ? err.message : "Network error during download",
    );
  }

  if (!response.ok) {
    const detail = await extractError(response);
    throw new LighthouseDownloadError(
      `HTTP ${response.status}: ${detail}`,
    );
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new LighthouseDownloadError(
      "Response is not valid JSON — the CID may not point to a vault backup",
    );
  }

  // Basic structural validation — the caller should also run the full
  // vault schema and integrity check before trusting the data.
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("version" in raw) ||
    !("encryptedPayload" in raw) ||
    !("keySalt" in raw) ||
    !("iv" in raw) ||
    !("integrityTag" in raw)
  ) {
    throw new LighthouseDownloadError(
      "Downloaded data does not look like a valid vault file",
    );
  }

  return raw as Vault;
}

/**
 * Check the Lighthouse.Storage account status for the given API key.
 *
 * Queries the user status endpoint to retrieve current usage metrics.
 * Falls back to a best-effort estimate if the API call fails.
 *
 * @param apiKey - Lighthouse API key
 * @returns LighthouseStatus with usage metrics
 */
export async function checkStorageStatus(
  apiKey: string,
): Promise<LighthouseStatus> {
  try {
    const response = await fetch(LIGHTHOUSE_STATUS_URL, {
      method: "GET",
      headers: authHeaders(apiKey),
    });

    if (!response.ok) {
      // Best-effort fallback: the key is configured (we got a non-network
      // error), but we can't read the status details.
      return {
        configured: true,
        bytesUploadedThisMonth: 0,
        capBytes: FREE_TIER_CAP_BYTES,
        capUsedPercent: 0,
      };
    }

    const data: unknown = await response.json();

    if (typeof data !== "object" || data === null) {
      return {
        configured: true,
        bytesUploadedThisMonth: 0,
        capBytes: FREE_TIER_CAP_BYTES,
        capUsedPercent: 0,
      };
    }

    const d = data as Record<string, unknown>;

    // Lighthouse status response fields vary — try the common shapes
    const bytesUsed =
      typeof d.bytesUsed === "number"
        ? d.bytesUsed
        : typeof d.dataLimit === "object" && d.dataLimit !== null
          ? Number(
              (d.dataLimit as Record<string, unknown>).bytesUsed ?? 0,
            )
          : 0;

    const cap =
      typeof d.dataLimit === "object" && d.dataLimit !== null
        ? Number(
            (d.dataLimit as Record<string, unknown>).maxBytes ??
              FREE_TIER_CAP_BYTES,
          )
        : FREE_TIER_CAP_BYTES;

    const capBytes = Number.isFinite(cap) && cap > 0 ? cap : FREE_TIER_CAP_BYTES;
    const bytesUploadedThisMonth = Number.isFinite(bytesUsed)
      ? Math.max(0, Math.round(bytesUsed))
      : 0;
    const capUsedPercent = Math.round(
      (bytesUploadedThisMonth / capBytes) * 100,
    );

    return {
      configured: true,
      bytesUploadedThisMonth,
      capBytes,
      capUsedPercent,
    };
  } catch {
    // Network error or unparseable response — the key is presumably
    // configured (the caller provided one), but we can't verify.
    return {
      configured: true,
      bytesUploadedThisMonth: 0,
      capBytes: FREE_TIER_CAP_BYTES,
      capUsedPercent: 0,
    };
  }
}

/**
 * Enforce the 100 MB upload cap.
 *
 * Returns `{ allowed: false }` if the new backup would exceed the cap.
 * Returns `{ allowed: true, message: "..." }` with a warning when
 * approaching 80 MB. Returns `{ allowed: true }` with no message
 * when well under the cap.
 *
 * @param vaultJsonSize - Size of the vault JSON in bytes
 * @param currentBytesUsed - Bytes already used this month
 */
export function enforceCap(
  vaultJsonSize: number,
  currentBytesUsed: number,
): { allowed: boolean; message?: string } {
  const projected = vaultJsonSize + currentBytesUsed;

  if (projected > FREE_TIER_CAP_BYTES) {
    return {
      allowed: false,
      message: `Backup would exceed the 100 MB cap (${(projected / 1_048_576).toFixed(1)} MB projected, ${((currentBytesUsed / 1_048_576).toFixed(1))} MB already used). Free up space or upgrade your Lighthouse plan.`,
    };
  }

  if (projected > WARNING_THRESHOLD_BYTES) {
    return {
      allowed: true,
      message: `Warning: you are approaching the 100 MB cap (${(projected / 1_048_576).toFixed(1)} MB used after this backup). Consider cleaning up old backups.`,
    };
  }

  return { allowed: true };
}
