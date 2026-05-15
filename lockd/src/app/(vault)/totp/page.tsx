"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useVault } from "@/hooks/useVault";
import { useClipboard } from "@/hooks/useClipboard";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import {
  generateTOTPFromConfig,
  getRemainingSeconds,
} from "@/lib/totp";
import type { LoginItem, TOTPConfig } from "@/types";

export default function TOTPPage() {
  const { items } = useVault();
  const { copy, copied } = useClipboard({ clearAfterMs: 30_000 });
  const [now, setNow] = useState(Date.now());

  const totpItems = useMemo(() => {
    return items
      .filter(
        (item): item is LoginItem =>
          item.type === "login" && !!item.totpSecret,
      )
      .map((item) => {
        const config: TOTPConfig = {
          secret: item.totpSecret!,
          algorithm: "SHA-1",
          digits: 6,
          period: 30,
          label: item.name,
        };
        return { item, config };
      });
  }, [items]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (totpItems.length === 0) {
    return (
      <EmptyState
        title="No TOTP codes configured"
        description="Add a TOTP secret to a login item to see codes here."
        icon={
          <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">TOTP Codes</h1>
        <p className="text-sm text-text-muted mt-1">
          Time-based one-time passwords for your accounts.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {totpItems.map(({ item, config }) => (
          <TOTPCard
            key={item.id}
            name={item.name}
            username={item.username}
            config={config}
            now={now}
            onCopy={copy}
            copied={copied}
          />
        ))}
      </div>
    </div>
  );
}

function TOTPCard({
  name,
  username,
  config,
  now,
  onCopy,
  copied,
}: {
  name: string;
  username: string;
  config: TOTPConfig;
  now: number;
  onCopy: (code: string) => void;
  copied: boolean;
}) {
  const [code, setCode] = useState("-------");

  useEffect(() => {
    let cancelled = false;
    generateTOTPFromConfig(config)
      .then((c) => { if (!cancelled) setCode(c); })
      .catch(() => { if (!cancelled) setCode("ERROR"); });
    return () => { cancelled = true; };
  }, [config, now]);

  const remaining = useMemo(() => {
    try {
      return getRemainingSeconds(config.period ?? 30);
    } catch {
      return 0;
    }
  }, [config, now]);

  const progress = ((config.period ?? 30) - remaining) / (config.period ?? 30);

  return (
    <Card hover>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-text-primary truncate">
            {name}
          </h3>
          <p className="text-xs text-text-muted mt-0.5">{username}</p>
        </div>
        <Badge variant="info">TOTP</Badge>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <p className="text-2xl font-password font-bold text-text-primary tabular-nums">
          {code}
        </p>
        <button
          type="button"
          onClick={() => onCopy(code)}
          aria-label="Copy TOTP code"
          className={[
            "p-1.5 rounded-md transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
            copied
              ? "text-success bg-success-muted"
              : "text-text-muted hover:text-text-primary",
          ].join(" ")}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
        </button>
      </div>

      {/* Countdown */}
      <div className="mt-3 flex items-center gap-2">
        <div
          className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={remaining}
          aria-valuemin={0}
          aria-valuemax={config.period ?? 30}
          aria-label={`TOTP code expires in ${remaining} seconds`}
        >
          <div
            className="h-full rounded-full transition-all duration-1000 ease-linear"
            style={{
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: remaining <= 5 ? "#ef4444" : "#06b6d4",
            }}
          />
        </div>
        <span
          className="text-xs tabular-nums w-8 text-right"
          style={{
            color: remaining <= 5 ? "#ef4444" : "#5f6f85",
          }}
        >
          {remaining}s
        </span>
      </div>
    </Card>
  );
}
