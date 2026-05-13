"use client";

import { useState } from "react";
import { useVault } from "@/hooks/useVault";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function SettingsPage() {
  const { settings, updateSettings, saveVault, vaultFilePath } = useVault();

  const [vaultName, setVaultName] = useState(vaultFilePath ?? "MyVault.khurklockd");
  const [lockTimeoutMinutes, setLockTimeoutMinutes] = useState(
    settings?.lockTimeoutMinutes ?? 5,
  );
  const [argon2Iterations, setArgon2Iterations] = useState(
    settings?.argon2Iterations ?? 600_000,
  );
  const [argon2MemoryKiB, setArgon2MemoryKiB] = useState(
    settings?.argon2MemoryKiB ?? 65_536,
  );
  const [argon2Parallelism, setArgon2Parallelism] = useState(
    settings?.argon2Parallelism ?? 4,
  );
  const [masterPasswordHint, setMasterPasswordHint] = useState(
    settings?.masterPasswordHint ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSavedMessage(null);
    updateSettings({
      lockTimeoutMinutes,
      argon2Iterations,
      argon2MemoryKiB,
      argon2Parallelism,
      masterPasswordHint,
    });
    await saveVault();
    setSaving(false);
    setSavedMessage("Settings saved");
    setTimeout(() => setSavedMessage(null), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
          <p className="text-sm text-text-muted mt-1">
            Configure your vault.
          </p>
        </div>
        <Button variant="primary" onClick={handleSave} loading={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {savedMessage && (
        <div className="p-3 rounded-lg bg-success-muted border border-success/20 text-sm text-success">
          {savedMessage}
        </div>
      )}

      {/* Vault */}
      <Card header="Vault">
        <Input
          label="Vault Name"
          value={vaultName}
          onChange={(e) => setVaultName(e.target.value)}
          placeholder="MyVault.khurklockd"
          hint="Display name for the vault file"
        />
      </Card>

      {/* Security */}
      <Card header="Security">
        <div className="space-y-4">
          <Input
            label="Auto-Lock Timeout (minutes)"
            type="number"
            value={String(lockTimeoutMinutes)}
            onChange={(e) =>
              setLockTimeoutMinutes(Math.max(0, Number(e.target.value)))
            }
            hint="Set to 0 to never auto-lock"
          />

          <Input
            label="Argon2 Iterations"
            type="number"
            value={String(argon2Iterations)}
            onChange={(e) =>
              setArgon2Iterations(Math.max(1, Number(e.target.value)))
            }
            hint="Higher = slower unlock but more secure (default: 600,000)"
          />

          <Input
            label="Argon2 Memory (KiB)"
            type="number"
            value={String(argon2MemoryKiB)}
            onChange={(e) =>
              setArgon2MemoryKiB(Math.max(8192, Number(e.target.value)))
            }
            hint="Memory used for key derivation (default: 65,536 KiB = 64 MiB)"
          />

          <Input
            label="Argon2 Parallelism"
            type="number"
            value={String(argon2Parallelism)}
            onChange={(e) =>
              setArgon2Parallelism(Math.max(1, Math.min(8, Number(e.target.value))))
            }
            hint="Number of parallel threads (1-8, default: 4)"
          />

          <Input
            label="Master Password Hint"
            value={masterPasswordHint}
            onChange={(e) => setMasterPasswordHint(e.target.value)}
            placeholder="A hint to help you remember your master password"
            hint="Will be shown on the unlock screen"
          />
        </div>
      </Card>

      {/* About */}
      <Card header="About Khurklockd">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Version</span>
            <span className="text-text-primary">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Encryption</span>
            <span className="text-text-primary">AES-256-GCM + Argon2id</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Storage</span>
            <span className="text-text-primary">Local-First + Lighthouse</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Platform</span>
            <span className="text-text-primary">Web (Next.js 15)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">License</span>
            <a
              href="https://github.com/skulls206-creator/khurklockd"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
