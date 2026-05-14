"use client";

import { useCallback, useMemo, useState } from "react";
import { useVault } from "@/hooks/useVault";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { scanPasswords, type ItemBreachResult } from "@/lib/breach";
import type { LoginItem } from "@/types";

export default function BreachPage() {
  const { items } = useVault();
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ItemBreachResult[] | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const scannable = useMemo(
    () =>
      items.filter(
        (item): item is LoginItem =>
          item.type === "login" && Boolean(item.password),
      ),
    [items],
  );

  const handleScan = useCallback(async () => {
    setScanning(true);
    setScanError(null);
    setResults(null);
    try {
      const entries = scannable.map((i) => ({
        itemId: i.id,
        itemName: i.name || i.username || "Untitled",
        password: i.password,
      }));
      const out = await scanPasswords(entries);
      setResults(out);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }, [scannable]);

  const breachedCount = results?.filter((r) => r.pwned).length ?? 0;
  const erroredCount = results?.filter((r) => r.error).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Breach Monitor
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Scan your saved passwords against the Have I Been Pwned corpus
            using the k-anonymity model — only the first 5 characters of
            each password&apos;s SHA-1 hash leave your browser.
          </p>
        </div>
        <Button
          variant={results ? "secondary" : "primary"}
          onClick={handleScan}
          loading={scanning}
          disabled={scannable.length === 0}
        >
          {scanning
            ? "Scanning..."
            : results
              ? "Scan Again"
              : `Scan ${scannable.length} password${scannable.length === 1 ? "" : "s"}`}
        </Button>
      </div>

      {scanError && (
        <Card>
          <p className="text-sm text-danger">{scanError}</p>
        </Card>
      )}

      {!results && !scanning && scannable.length === 0 && (
        <EmptyState
          title="No passwords to scan"
          description="Add a login item with a password to enable breach scanning."
          icon={
            <svg
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          }
        />
      )}

      {!results && !scanning && scannable.length > 0 && (
        <EmptyState
          title="Ready to scan"
          description={`${scannable.length} saved password${scannable.length === 1 ? "" : "s"} will be checked against HIBP. Your passwords never leave this browser in cleartext.`}
          icon={
            <svg
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
      )}

      {results && (
        <>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">
                  Scanned {results.length} password
                  {results.length === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {breachedCount === 0
                    ? "No matches in the HIBP corpus."
                    : `${breachedCount} match${breachedCount === 1 ? "" : "es"} found.`}
                  {erroredCount > 0
                    ? ` ${erroredCount} check${erroredCount === 1 ? "" : "s"} failed.`
                    : ""}
                </p>
              </div>
              {breachedCount > 0 ? (
                <Badge variant="danger">Action required</Badge>
              ) : (
                <Badge variant="success">Clean</Badge>
              )}
            </div>
          </Card>

          <div className="space-y-3">
            {results.map((r) => (
              <Card key={r.itemId}>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      r.error
                        ? "text-text-muted"
                        : r.pwned
                          ? "text-danger"
                          : "text-success"
                    }
                  >
                    {r.error ? (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    ) : r.pwned ? (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {r.itemName}
                    </p>
                    <p
                      className={
                        r.error
                          ? "text-xs text-text-muted"
                          : r.pwned
                            ? "text-xs text-danger"
                            : "text-xs text-text-muted"
                      }
                    >
                      {r.error
                        ? `Check failed: ${r.error}`
                        : r.pwned
                          ? `Seen ${r.count.toLocaleString()} time${r.count === 1 ? "" : "s"} in breaches — rotate this password.`
                          : "Not found in any known breach."}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
