"use client";

import { useState, type FormEvent } from "react";
import { useVault } from "@/hooks/useVault";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function UnlockScreen() {
  const { vaultState, error, createVault, openVault } = useVault();

  // Create vault form
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordHint, setPasswordHint] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  // Open vault form
  const [openPassword, setOpenPassword] = useState("");
  const [openError, setOpenError] = useState<string | null>(null);

  const [mode, setMode] = useState<"create" | "open">("create");

  const isLoading = vaultState === "unlocking";
  const displayError = error ?? localError ?? openError;

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (masterPassword.length < 6) {
      setLocalError("Master password must be at least 6 characters");
      return;
    }

    if (masterPassword !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    await createVault(masterPassword, passwordHint || undefined);
  };

  const handleOpen = async (e: FormEvent) => {
    e.preventDefault();
    setOpenError(null);
    setLocalError(null);

    if (!openPassword) {
      setOpenError("Enter your master password");
      return;
    }

    await openVault(openPassword);
  };

  const switchMode = (newMode: "create" | "open") => {
    setMode(newMode);
    setLocalError(null);
    setOpenError(null);
    setMasterPassword("");
    setConfirmPassword("");
    setPasswordHint("");
    setOpenPassword("");
  };

  // Handle error from context (wrong password)
  const contextError = error && vaultState === "error" ? error : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
      <div className="w-full max-w-md">
        {/* Lock icon + branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-muted mb-4">
            <svg
              className="h-8 w-8 text-accent"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Khurklockd</h1>
          <p className="text-sm text-text-muted mt-1">
            Encrypted Digital Vault
          </p>
        </div>

        {/* Mode tabs */}
        <div className="flex rounded-lg bg-surface p-1 mb-6">
          <button
            onClick={() => switchMode("create")}
            className={[
              "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              mode === "create"
                ? "bg-bg-elevated text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary",
            ].join(" ")}
          >
            Create New Vault
          </button>
          <button
            onClick={() => switchMode("open")}
            className={[
              "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              mode === "open"
                ? "bg-bg-elevated text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary",
            ].join(" ")}
          >
            Open Vault
          </button>
        </div>

        {/* Error display */}
        {(displayError || contextError) && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-lg bg-danger-muted border border-danger/20 text-sm text-danger"
          >
            {contextError || displayError}
          </div>
        )}

        {/* Create form */}
        {mode === "create" && (
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Master Password"
              type="password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              placeholder="At least 6 characters"
              disabled={isLoading}
              autoFocus
            />
            <Input
              label="Confirm Master Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your master password"
              disabled={isLoading}
            />
            <Input
              label="Password Hint (optional)"
              type="text"
              value={passwordHint}
              onChange={(e) => setPasswordHint(e.target.value)}
              placeholder="A hint to help you remember"
              disabled={isLoading}
            />
            <Button
              type="submit"
              loading={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? "Generating Keys..." : "Create Vault"}
            </Button>
          </form>
        )}

        {/* Open form */}
        {mode === "open" && (
          <form onSubmit={handleOpen} className="space-y-4">
            <Input
              label="Master Password"
              type="password"
              value={openPassword}
              onChange={(e) => setOpenPassword(e.target.value)}
              placeholder="Enter your master password"
              disabled={isLoading}
              autoFocus
            />
            <Button
              type="submit"
              loading={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? "Unlocking..." : "Unlock"}
            </Button>
          </form>
        )}

        <p className="text-xs text-text-muted text-center mt-8">
          AES-256-GCM &middot; Argon2id &middot; Local-First &middot;
          Lighthouse.Storage Backup
        </p>
      </div>
    </div>
  );
}

export default UnlockScreen;
