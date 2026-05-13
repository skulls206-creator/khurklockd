"use client";

import { useState } from "react";
import { useVault } from "@/hooks/useVault";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { SyncManifest, LighthouseStatus } from "@/types";

export default function BackupPage() {
  const { settings, updateSettings, saveVault } = useVault();
  const [apiKey, setApiKey] = useState("");
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Placeholder manifest list - would come from Lighthouse API
  const [manifests] = useState<SyncManifest[]>([]);

  // Placeholder status
  const lighthouseStatus: LighthouseStatus = {
    configured: !!settings?.lastBackupCid,
    bytesUploadedThisMonth: 0,
    capBytes: 100 * 1024 * 1024, // 100 MB
    capUsedPercent: 0,
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setError("API key is required");
      return;
    }
    setError(null);
    // In a real implementation, the API key would be stored securely
    // For now, store as a setting placeholder
    setSuccess("API key saved");
  };

  const handleBackup = async () => {
    setBackingUp(true);
    setError(null);
    setSuccess(null);
    // Placeholder: would encrypt and upload vault
    await new Promise((r) => setTimeout(r, 1500));
    setSuccess("Backup completed successfully");
    setBackingUp(false);
  };

  const handleRestore = async (cid: string) => {
    setRestoring(true);
    setError(null);
    setSuccess(null);
    // Placeholder: would download and decrypt vault
    await new Promise((r) => setTimeout(r, 1500));
    setSuccess("Restore completed successfully");
    setRestoring(false);
  };

  const capPercent = lighthouseStatus.capUsedPercent;
  const capColor =
    capPercent > 90 ? "bg-danger" : capPercent > 70 ? "bg-warning" : "bg-success";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Lighthouse Backup
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Encrypted backups stored on IPFS via Lighthouse.Storage.
        </p>
      </div>

      {/* Error / Success messages */}
      {error && (
        <div role="alert" className="p-3 rounded-lg bg-danger-muted border border-danger/20 text-sm text-danger">
          {error}
        </div>
      )}
      {success && (
        <div role="alert" className="p-3 rounded-lg bg-success-muted border border-success/20 text-sm text-success">
          {success}
        </div>
      )}

      {/* API Key */}
      <Card header="Lighthouse API Key">
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Get your API key from{" "}
            <a
              href="https://files.lighthouse.storage/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              files.lighthouse.storage
            </a>
          </p>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Lighthouse API key"
              />
            </div>
            <Button onClick={handleSaveApiKey}>Save</Button>
          </div>
        </div>
      </Card>

      {/* Storage usage */}
      <Card header="Storage">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Usage</span>
            <span className="text-text-primary tabular-nums">
              {lighthouseStatus.bytesUploadedThisMonth.toLocaleString()} /{" "}
              {lighthouseStatus.capBytes.toLocaleString()} bytes
            </span>
          </div>
          <div className="h-3 bg-surface rounded-full overflow-hidden">
            <div
              className={`h-full ${capColor} rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(capPercent, 100)}%` }}
            />
          </div>
          {capPercent > 70 && (
            <p className="text-xs text-warning">
              {capPercent > 90
                ? "You're approaching your storage cap. Consider cleaning up old backups."
                : "Storage usage is getting high."}
            </p>
          )}
        </div>
      </Card>

      {/* Controls */}
      <div className="flex gap-3">
        <Button
          variant="primary"
          onClick={handleBackup}
          loading={backingUp}
          className="flex-1"
        >
          {backingUp ? "Backing Up..." : "Backup Now"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            // Would trigger restore flow
          }}
          loading={restoring}
          className="flex-1"
          disabled={manifests.length === 0}
        >
          {restoring ? "Restoring..." : "Restore Latest"}
        </Button>
      </div>

      {/* Backup history */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          Backup History
        </h3>
        {manifests.length === 0 ? (
          <EmptyState
            title="No backups yet"
            description="Create your first backup to see it here."
          />
        ) : (
          <div className="space-y-2">
            {manifests.map((m) => (
              <Card key={m.cid} hover>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono text-text-muted truncate max-w-[200px]">
                      {m.cid}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {new Date(m.uploadedAt).toLocaleString()} {"\u00B7"}{" "}
                      {m.sizeBytes.toLocaleString()} bytes
                    </p>
                  </div>
                  <Badge variant="default">
                    v{m.vaultVersion}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestore(m.cid)}
                  >
                    Restore
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
