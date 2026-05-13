"use client";

import { useState, useCallback, useRef } from "react";
import { useVault } from "@/hooks/useVault";
import { useToast } from "@/components/ui/Toast";
import { parseCSV, parseJSON, importEntries, saveVault, deleteAllItems } from "@/lib/import";
import type { ParsedEntry, ImportFormat } from "@/lib/import";

type ImportState = "idle" | "parsing" | "preview" | "importing" | "done" | "error";

export default function ImportPage() {
  const { addToast } = useToast();
  const { vaultState, getItemCount, refreshItems, saveVault: sv } = useVault();
  const [state, setState] = useState<ImportState>("idle");
  const [entries, setEntries] = useState<ParsedEntry[]>([]);
  const [format, setFormat] = useState<ImportFormat>("auto");
  const [error, setError] = useState<string>("");
  const [stats, setStats] = useState<{ added: number; skipped: number; duplicates: number; errors: string[] }>({ added: 0, skipped: 0, duplicates: 0, errors: [] });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setState("parsing");
      setError("");

      const text = await file.text();
      const ext = file.name.split(".").pop()?.toLowerCase();
      let result: { entries: ParsedEntry[]; format: ImportFormat; error?: string };

      if (ext === "csv") {
        result = parseCSV(text, format === "auto" ? undefined : format);
      } else if (ext === "json") {
        result = parseJSON(text, format === "auto" ? undefined : format);
      } else {
        setError("Unsupported file type. Use CSV or JSON export files.");
        setState("error");
        return;
      }

      if (result.error) {
        setError(result.error);
        setState("error");
        return;
      }

      if (result.entries.length === 0) {
        setError("No entries found in the file.");
        setState("error");
        return;
      }

      setEntries(result.entries);
      setFormat(result.format);
      setState("preview");
    },
    [format],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleFileInput = useCallback(() => {
    const file = fileInputRef.current?.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = useCallback(async () => {
    setState("importing");
    try {
      const result = await importEntries(entries);
      await sv();
      refreshItems();
      setStats(result);
      setState("done");
      if (result.added > 0 && result.errors.length === 0 && result.duplicates === 0) {
        addToast(`Successfully imported ${result.added} entries`, "success");
      } else if (result.added > 0) {
        let msg = `Imported ${result.added} entries`;
        if (result.duplicates > 0) msg += `, ${result.duplicates} duplicates skipped`;
        if (result.skipped > 0) msg += `, ${result.skipped} failed`;
        addToast(msg, result.errors.length > 0 ? "warning" : "success");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setState("error");
    }
  }, [entries, addToast, sv, refreshItems]);

  const handleClearVault = useCallback(async () => {
    setShowClearConfirm(true);
  }, []);

  const confirmClearVault = useCallback(async () => {
    setClearing(true);
    try {
      const count = await deleteAllItems();
      await sv();
      refreshItems();
      setShowClearConfirm(false);
      setClearing(false);
      addToast(`Cleared ${count} entries from the vault`, "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear vault");
      setClearing(false);
      setShowClearConfirm(false);
    }
  }, [addToast, sv, refreshItems]);

  const cancelClearVault = useCallback(() => {
    setShowClearConfirm(false);
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setEntries([]);
    setError("");
    setStats({ added: 0, skipped: 0, duplicates: 0, errors: [] });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const itemCount = vaultState === "unlocked" ? getItemCount() : 0;

  // ── Render ──────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="h-6 w-6 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <h1 className="text-xl font-semibold">Import Passwords</h1>
        </div>
        {vaultState === "unlocked" && itemCount > 0 && (
          <button
            onClick={handleClearVault}
            className="rounded-lg border border-danger/40 bg-danger-muted px-3 py-1.5 text-sm text-danger hover:bg-danger/20 transition-colors"
          >
            Clear Vault ({itemCount})
          </button>
        )}
      </div>

      {state === "idle" && (
        <div
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-strong bg-bg-tertiary p-12 transition-colors hover:border-accent"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <svg className="mb-4 h-12 w-12 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-0.27 1.625 1.625 0 012.848 1.145v.9a4.5 4.5 0 01-3.41 4.5H6.75z" />
          </svg>
          <p className="mb-1 text-lg font-medium">Drop your export file here</p>
          <p className="text-sm text-text-muted">or click to browse</p>
          <input ref={fileInputRef} type="file" accept=".csv,.json" className="hidden" onChange={handleFileInput} aria-label="Choose a CSV or JSON export file" />
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-xs text-text-secondary">LastPass CSV</span>
            <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-xs text-text-secondary">1Password JSON/CSV</span>
            <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-xs text-text-secondary">Bitwarden CSV/JSON</span>
            <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-xs text-text-secondary">KeePass CSV</span>
            <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-xs text-text-secondary">Generic CSV/JSON</span>
          </div>
        </div>
      )}

      {/* Format selector */}
      {state === "idle" && (
        <div className="mt-4">
          <label className="mb-1 block text-sm text-text-secondary">
            Detected format (auto-detect usually works)
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as ImportFormat)}
            className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm"
          >
            <option value="auto">Auto-detect</option>
            <option value="lastpass">LastPass CSV</option>
            <option value="1password">1Password JSON/CSV</option>
            <option value="bitwarden">Bitwarden CSV/JSON</option>
            <option value="keepass-csv">KeePass CSV</option>
            <option value="generic-csv">Generic CSV/JSON</option>
          </select>
        </div>
      )}

      {/* Parsing spinner */}
      {state === "parsing" && (
        <div role="status" className="flex flex-col items-center justify-center rounded-xl border border-border bg-bg-tertiary p-12">
          <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-text-muted">Parsing file...</p>
        </div>
      )}

      {/* Error state */}
      {state === "error" && (
        <div className="rounded-xl border border-danger/30 bg-danger-muted p-6">
          <p className="mb-2 font-medium text-danger">Import Error</p>
          <p className="text-sm text-text-secondary">{error}</p>
          <button onClick={reset} className="mt-4 rounded-lg bg-surface px-4 py-2 text-sm hover:bg-surface-hover">
            Try Again
          </button>
        </div>
      )}

      {/* Preview */}
      {state === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">{entries.length}</span> entries found
              {format !== "auto" && (
                <span className="ml-2 rounded-full bg-accent-muted px-2 py-0.5 text-xs text-accent">
                  {format}
                </span>
              )}
            </p>
            <button onClick={reset} className="text-sm text-text-muted hover:text-text-primary">
              Cancel
            </button>
          </div>

          {/* Preview table (first 10 entries) */}
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-bg-tertiary">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-text-secondary">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-text-secondary">Username</th>
                  <th className="px-3 py-2 text-left font-medium text-text-secondary">URL</th>
                  <th className="px-3 py-2 text-left font-medium text-text-secondary">Type</th>
                </tr>
              </thead>
              <tbody>
                {entries.slice(0, 10).map((entry, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 truncate font-medium">{entry.name}</td>
                    <td className="px-3 py-2 truncate text-text-secondary">{entry.username || "—"}</td>
                    <td className="px-3 py-2 truncate text-text-secondary">{entry.url || "—"}</td>
                    <td className="px-3 py-2 text-text-secondary">{entry.category || "login"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {entries.length > 10 && (
            <p className="text-xs text-text-muted">Showing first 10 of {entries.length} entries</p>
          )}

          <button
            onClick={handleImport}
            className="w-full rounded-lg bg-accent px-4 py-3 font-medium text-text-inverse hover:bg-accent-hover transition-colors"
          >
            Import {entries.length} Entries
          </button>
        </div>
      )}

      {/* Success */}
      {state === "done" && (
        <div className="rounded-xl border border-success/30 bg-success-muted p-6">
          <p className="mb-2 font-medium text-success">Import Complete</p>
          <p className="mb-4 text-sm text-text-secondary">
            Added {stats.added} entries to your vault.
            {stats.duplicates > 0 && ` ${stats.duplicates} duplicates skipped.`}
            {stats.skipped > 0 && ` ${stats.skipped} entries failed.`}
          </p>
          {stats.errors.length > 0 && (
            <div className="mb-4 max-h-32 overflow-y-auto rounded bg-bg-tertiary p-3">
              {stats.errors.map((e, i) => (
                <p key={i} className="text-xs text-danger">{e}</p>
              ))}
            </div>
          )}
          <button
            onClick={reset}
            className="rounded-lg bg-surface px-4 py-2 text-sm hover:bg-surface-hover"
          >
            Import More
          </button>
        </div>
      )}

      {/* Clear vault confirmation dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={cancelClearVault} role="dialog" aria-modal="true" aria-label="Clear entire vault confirmation">
          <div
            className="mx-4 w-full max-w-md rounded-xl border border-danger/40 bg-bg-elevated p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 text-lg font-semibold text-danger">Clear Entire Vault?</h2>
            <p className="mb-6 text-sm text-text-secondary">
              This will permanently delete every item in your vault. This action cannot be undone — make sure you
              have a backup before proceeding.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelClearVault}
                disabled={clearing}
                className="rounded-lg bg-surface px-4 py-2 text-sm hover:bg-surface-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearVault}
                disabled={clearing}
                className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-text-inverse hover:bg-danger-hover transition-colors disabled:opacity-50"
              >
                {clearing ? "Clearing..." : "Yes, Clear Everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
