"use client";

import { useCallback, useMemo, useState } from "react";
import { useVault } from "@/hooks/useVault";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { checkBreach, scanVault } from "@/lib/breach";
import type { BreachResult, BreachDetail, LoginItem } from "@/types";

export default function BreachPage() {
  const { items } = useVault();
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<Map<string, BreachResult[]> | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Find login items with email/usernames to check
  const scannableItems = useMemo(
    () =>
      items.filter((item): item is LoginItem => {
        if (item.type !== "login") return false;
        // Check if username looks like an email
        return item.username.includes("@") || item.username.length > 0;
      }),
    [items],
  );

  const emails = useMemo(
    () =>
      [
        ...new Set(scannableItems.map((i) => i.username).filter(Boolean)),
      ] as string[],
    [scannableItems],
  );

  const handleScan = useCallback(async () => {
    setScanning(true);
    setResults(null);
    try {
      const map = await scanVault(emails);
      setResults(map);
    } catch {
      setResults(new Map());
    } finally {
      setScanning(false);
    }
  }, [emails]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Breach Monitor
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Check if your accounts have been compromised.
          </p>
        </div>
        <Button
          variant={results ? "secondary" : "primary"}
          onClick={handleScan}
          loading={scanning}
        >
          {scanning ? "Scanning..." : results ? "Scan Again" : "Scan Now"}
        </Button>
      </div>

      {!results && !scanning && (
        <EmptyState
          title="No breach data"
          description={`Run a scan to check ${emails.length} email${emails.length !== 1 ? "s" : ""} against the HaveIBeenPwned database.`}
          icon={
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          }
        />
      )}

      {results && (
        <div className="space-y-3">
          {emails.map((email) => {
            const resultList = results.get(email);
            const result = resultList?.[0];
            if (!result || !result.found) {
              return (
                <Card key={email}>
                  <div className="flex items-center gap-3">
                    <span className="text-success">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {email}
                      </p>
                      <p className="text-xs text-text-muted">
                        No breaches found — good!
                      </p>
                    </div>
                  </div>
                </Card>
              );
            }

            const isExpanded = expanded === email;
            return (
              <Card key={email}>
                <div
                  className="cursor-pointer"
                  onClick={() =>
                    setExpanded(isExpanded ? null : email)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpanded(isExpanded ? null : email);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-danger">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        {email}
                      </p>
                      <p className="text-xs text-danger">
                        Found in {result.breaches.length} breach
                        {result.breaches.length !== 1 ? "es" : ""}
                      </p>
                    </div>
                    <svg
                      className={[
                        "h-4 w-4 text-text-muted transition-transform",
                        isExpanded ? "rotate-180" : "",
                      ].join(" ")}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-3 border-t border-border pt-3">
                    {result.breaches.map((b) => (
                      <div
                        key={b.name}
                        className="p-3 rounded-lg bg-bg-primary"
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-medium text-text-primary">
                            {b.name}
                          </h4>
                          <div className="flex gap-1">
                            {b.isVerified && <Badge variant="success">Verified</Badge>}
                            {b.isSensitive && <Badge variant="danger">Sensitive</Badge>}
                          </div>
                        </div>
                        <p className="text-xs text-text-muted mt-1">
                          {b.domain}
                        </p>
                        <p className="text-xs text-text-secondary mt-1">
                          {b.description}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {b.dataClasses.map((dc) => (
                            <Badge key={dc} variant="default">
                              {dc}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
                          <span>
                            Breach date: {b.breachDate}
                          </span>
                          <span>
                            {b.pwnCount.toLocaleString()} accounts
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
