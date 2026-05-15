// ── Khurklockd File I/O ──────────────────────────────────────────
// File System Access API for reading and writing .khurklockd vault
// files, with graceful fallback for browsers that don't support
// the File System Access API (e.g. Firefox, older Safari).

import type { Vault } from "@/types";
import { vaultFileSchema } from "./schema";
import { ZodError } from "zod";

// ── File System Access API Type Declarations ────────────────────
// TypeScript's DOM lib doesn't include the WICG File System Access
// types yet. We declare the minimum needed here.

export interface FileSystemFileHandle {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemHandlePermissionDescriptor {
  mode?: "read" | "readwrite";
}

interface OpenFilePickerOptions {
  multiple?: boolean;
  types?: FilePickerAcceptType[];
}

interface FilePickerAcceptType {
  description: string;
  accept: Record<string, string[]>;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: FilePickerAcceptType[];
}

declare global {
  interface Window {
    showOpenFilePicker?(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
  }
}

// ── Constants ────────────────────────────────────────────────────

const FILE_EXTENSION = ".khurklockd";
const MIME_TYPE = "application/x-khurklockd+vault";

/** File picker accept config for .khurklockd files. */
const ACCEPT_OPTIONS: FilePickerAcceptType = {
  description: "Khurklockd Vault",
  accept: { [MIME_TYPE]: [FILE_EXTENSION] },
};

// ── Error Classes ────────────────────────────────────────────────

export class VaultFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VaultFileError";
  }
}

export class VaultValidationError extends Error {
  constructor(message: string, public readonly zodError: ZodError) {
    super(message);
    this.name = "VaultValidationError";
  }
}

// ── Feature Detection ────────────────────────────────────────────

function supportsFileSystemAccess(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.showOpenFilePicker === "function" &&
    typeof window.showSaveFilePicker === "function"
  );
}

// ── FSAA: Load ───────────────────────────────────────────────────

async function loadViaFSAA(): Promise<{ vault: Vault; handle: FileSystemFileHandle }> {
  const [handle] = await window.showOpenFilePicker!({
    multiple: false,
    types: [ACCEPT_OPTIONS],
  });

  const file = await handle.getFile();
  const text = await file.text();

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new VaultFileError(
      "The selected file is not valid JSON — make sure you opened a .khurklockd vault file",
    );
  }

  const vault = validateVaultFile(raw);
  return { vault, handle };
}

// ── FSAA: Save ───────────────────────────────────────────────────

async function saveViaFSAA(
  vault: Vault,
  handle: FileSystemFileHandle,
): Promise<void> {
  // Ensure we still have write permission; if not, request it
  const permission =
    (await handle.queryPermission({ mode: "readwrite" })) === "granted" ||
    (await handle.requestPermission({ mode: "readwrite" })) === "granted";

  if (!permission) {
    throw new VaultFileError(
      "Write permission denied for the vault file — the user cancelled the permission prompt",
    );
  }

  const json = JSON.stringify(vault, null, 2);
  const writable = await handle.createWritable();
  try {
    await writable.write(json);
    await writable.close();
  } catch (err) {
    // Ensure the writable is closed even on error
    try { await writable.close(); } catch { /* ignore */ }
    throw new VaultFileError(
      `Failed to write vault file: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// ── FSAA: Create ─────────────────────────────────────────────────

async function createViaFSAA(): Promise<FileSystemFileHandle> {
  const handle = await window.showSaveFilePicker!({
    suggestedName: `MyVault${FILE_EXTENSION}`,
    types: [ACCEPT_OPTIONS],
  });
  return handle;
}

// ── Fallback: Load via <input type="file"> ───────────────────────

function loadViaInput(): Promise<{ vault: Vault; handle: null }> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = FILE_EXTENSION;
    input.style.display = "none";

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new VaultFileError("No file was selected"));
        return;
      }

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        const text = reader.result as string;
        let raw: unknown;
        try {
          raw = JSON.parse(text);
        } catch {
          reject(
            new VaultFileError(
              "The selected file is not valid JSON — make sure you opened a .khurklockd vault file",
            ),
          );
          return;
        }

        try {
          const vault = validateVaultFile(raw);
          resolve({ vault, handle: null });
        } catch (err) {
          reject(err);
        }
      });

      reader.addEventListener("error", () => {
        reject(new VaultFileError("Failed to read the selected file"));
      });

      reader.readAsText(file);
    });

    // Clean up on cancel (no file selected)
    input.addEventListener("cancel", () => {
      reject(new VaultFileError("File selection was cancelled"));
    });

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  });
}

// ── Fallback: Save via Blob + download link ──────────────────────

function saveViaDownload(vault: Vault): void {
  const json = JSON.stringify(vault, null, 2);
  const blob = new Blob([json], { type: MIME_TYPE });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `MyVault${FILE_EXTENSION}`;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();

  // Clean up after a short delay so the download has time to start
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 100);
}

// ── Fallback: Create via download ────────────────────────────────

async function createViaDownload(): Promise<null> {
  // For browsers without FSAA, "create" is just a download.
  // We return null and the caller handles saving via the download path.
  return null;
}

// ── Validation Helper ────────────────────────────────────────────

function validateVaultFile(raw: unknown): Vault {
  try {
    return vaultFileSchema.parse(raw) as Vault;
  } catch (err) {
    if (err instanceof ZodError) {
      throw new VaultValidationError(
        "The vault file has an invalid format — it may be corrupted or from a different version",
        err,
      );
    }
    throw err;
  }
}

// ── Public API ───────────────────────────────────────────────────

export interface LoadResult {
  vault: Vault;
  /** FileSystemFileHandle when FSAA is available, null in fallback mode. */
  handle: FileSystemFileHandle | null;
}

/**
 * Open a file picker and load a .khurklockd vault file.
 *
 * Uses the File System Access API when available (Chrome, Edge, Opera).
 * Falls back to a hidden `<input type="file">` in other browsers.
 *
 * @returns The parsed and validated Vault and an optional file handle
 * @throws {VaultFileError} If the file cannot be read or parsed
 * @throws {VaultValidationError} If the file fails schema validation
 */
export async function loadFile(): Promise<LoadResult> {
  if (supportsFileSystemAccess()) {
    return loadViaFSAA();
  }
  return loadViaInput();
}

/**
 * Save a vault to disk.
 *
 * If a file handle is available (FSAA mode), writes in-place to the
 * existing file. Otherwise triggers a download via Blob + anchor link.
 *
 * @param vault - The complete Vault object to persist
 * @param handle - A FileSystemFileHandle from a previous load/create, or null
 */
export async function saveFile(
  vault: Vault,
  handle: FileSystemFileHandle | null,
): Promise<void> {
  if (handle) {
    await saveViaFSAA(vault, handle);
  } else {
    saveViaDownload(vault);
  }
}

/**
 * Open a save dialog for a new .khurklockd vault file.
 *
 * Uses the File System Access API when available. In fallback mode
 * (no FSAA), returns null — the caller should use `saveFile` with
 * `handle: null` to trigger a download.
 *
 * @returns A FileSystemFileHandle for later saves, or null in fallback mode
 */
export async function createNewFile(): Promise<FileSystemFileHandle | null> {
  if (supportsFileSystemAccess()) {
    return createViaFSAA();
  }
  return createViaDownload();
}
