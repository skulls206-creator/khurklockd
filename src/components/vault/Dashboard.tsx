"use client";

import { useMemo, useState } from "react";
import { useVault } from "@/hooks/useVault";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { ItemCard } from "@/components/vault/ItemCard";
import { calculateStrength } from "@/lib/generator";
import type { VaultItem, LoginItem, ItemType } from "@/types";

export interface DashboardProps {
  onSelectItem: (id: string) => void;
  onCreateItem: (type?: ItemType) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

// ── Helpers ──────────────────────────────────────────────────

function isLoginItem(item: VaultItem): item is LoginItem {
  return item.type === "login";
}

interface HealthStats {
  totalItems: number;
  loginCount: number;
  weakCount: number;
  reusedCount: number;
  breachCount: number;
  healthScore: number;
  byType: Record<string, number>;
}

function computeHealthStats(items: VaultItem[]): HealthStats {
  const logins = items.filter(isLoginItem);
  const totalItems = items.length;
  const loginCount = logins.length;

  // Per-type counts
  const byType: Record<string, number> = {};
  for (const item of items) {
    byType[item.type] = (byType[item.type] || 0) + 1;
  }

  // Weak passwords (strength <= 1)
  let weakCount = 0;
  for (const login of logins) {
    if (login.password) {
      const result = calculateStrength(login.password);
      if (result.score <= 1) weakCount++;
    }
  }

  // Reused passwords
  const passwordMap = new Map<string, number>();
  for (const login of logins) {
    if (login.password) {
      passwordMap.set(login.password, (passwordMap.get(login.password) || 0) + 1);
    }
  }
  let reusedCount = 0;
  for (const count of passwordMap.values()) {
    if (count > 1) reusedCount += count;
  }

  // Breached items
  const breachCount = logins.filter((l) => l.breachStatus === "breached").length;

  // Health score: 0-100 composite
  let healthScore = 100;
  if (loginCount > 0) {
    const weakPenalty = Math.round((weakCount / loginCount) * 40);
    const reusePenalty = Math.round((reusedCount / loginCount) * 30);
    const breachPenalty = Math.round((breachCount / loginCount) * 30);
    healthScore = Math.max(0, 100 - (weakPenalty + reusePenalty + breachPenalty));
  }

  return {
    totalItems,
    loginCount,
    weakCount,
    reusedCount,
    breachCount,
    healthScore,
    byType,
  };
}

// ── Progress Ring ────────────────────────────────────────────

function ProgressRing({
  value,
  size = 80,
  strokeWidth = 6,
}: {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  let strokeColor: string;
  if (value >= 80) strokeColor = "#22c55e"; // success
  else if (value >= 50) strokeColor = "#f59e0b"; // warning
  else strokeColor = "#ef4444"; // danger

  return (
    <svg
      width={size}
      height={size}
      className="transform -rotate-90"
      aria-label={`Vault health: ${value}%`}
      role="img"
    >
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-border"
        opacity={0.3}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

// ── Stat Card ────────────────────────────────────────────────

function StatCard({
  label,
  value,
  colorClass = "text-text-primary",
  children,
}: {
  label: string;
  value: string | number;
  colorClass?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <div className="text-center py-3 px-2">
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
        <p className="text-xs text-text-muted mt-1">{label}</p>
        {children}
      </div>
    </Card>
  );
}

// ── Quick Action Button ──────────────────────────────────────

function QuickAction({
  label,
  icon,
  onClick,
  variant = "secondary" as const,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <Button variant={variant} size="sm" onClick={onClick}>
      {icon}
      {label}
    </Button>
  );
}

// ── Dashboard Component ──────────────────────────────────────

export function Dashboard({ onSelectItem, onCreateItem, searchInputRef }: DashboardProps) {
  const {
    items,
    vaultFilePath,
    searchItems,
    toggleFavorite,
    saveVault,
    activeView,
    setActiveView,
  } = useVault();

  const [searchQuery, setSearchQuery] = useState("");
  const [showNewDropdown, setShowNewDropdown] = useState(false);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    return searchItems(searchQuery);
  }, [items, searchQuery, searchItems]);

  const healthStats = useMemo(() => computeHealthStats(items), [items]);

  const favorites = useMemo(
    () => filteredItems.filter((i) => i.favorite),
    [filteredItems],
  );

  const recent = useMemo(
    () =>
      [...filteredItems]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, 5),
    [filteredItems],
  );

  const handleToggleFav = async (id: string) => {
    toggleFavorite(id);
    await saveVault();
  };

  const handleSearch = (val: string) => {
    setSearchQuery(val);
  };

  const navigateTo = (view: string) => {
    setActiveView(view as typeof activeView);
  };

  const newItemTypes: { type: ItemType; label: string; icon: React.ReactNode }[] = [
    {
      type: "login",
      label: "Login",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3" />
        </svg>
      ),
    },
    {
      type: "note",
      label: "Note",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25" />
        </svg>
      ),
    },
    {
      type: "card",
      label: "Card",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5" />
        </svg>
      ),
    },
    {
      type: "identity",
      label: "Identity",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5" />
        </svg>
      ),
    },
  ];

  // Empty vault state
  if (items.length === 0 && !searchQuery) {
    return (
      <EmptyState
        title="Your vault is empty"
        description="Start by adding your first login, note, card, or identity."
        action={{
          label: "Add Your First Item",
          onClick: () => onCreateItem(),
        }}
      />
    );
  }

  // Health score label
  let healthLabel = "Good";
  let healthColorClass = "text-success";
  if (healthStats.healthScore < 50) {
    healthLabel = "Poor";
    healthColorClass = "text-danger";
  } else if (healthStats.healthScore < 80) {
    healthLabel = "Fair";
    healthColorClass = "text-warning";
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <SearchInput
            ref={searchInputRef}
            onSearch={handleSearch}
            placeholder="Search vault..."
          />
        </div>

        <div className="relative">
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowNewDropdown(!showNewDropdown)}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Item
          </Button>

          {showNewDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowNewDropdown(false)}
                aria-hidden="true"
              />
              <div
                className="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg border border-border bg-bg-elevated shadow-xl py-1"
                role="menu"
              >
                {newItemTypes.map(({ type, label, icon }) => (
                  <button
                    key={type}
                    role="menuitem"
                    onClick={() => {
                      setShowNewDropdown(false);
                      onCreateItem(type);
                    }}
                    className={[
                      "w-full flex items-center gap-3 px-3 py-2 text-sm",
                      "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
                      "transition-colors duration-100",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-inset",
                    ].join(" ")}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Search results */}
      {searchQuery ? (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            Search Results ({filteredItems.length})
          </h3>
          {filteredItems.length === 0 ? (
            <p className="text-sm text-text-muted">No items found.</p>
          ) : (
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
              {filteredItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onClick={onSelectItem}
                  onToggleFavorite={(id) => {
                    handleToggleFav(id);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ── Vault Health Stats ────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Vault Health
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Weak passwords */}
              <StatCard
                label="Weak"
                value={healthStats.weakCount}
                colorClass={healthStats.weakCount > 0 ? "text-danger" : "text-success"}
              />

              {/* Reused passwords */}
              <StatCard
                label="Reused"
                value={healthStats.reusedCount}
                colorClass={healthStats.reusedCount > 0 ? "text-warning" : "text-success"}
              />

              {/* Breached passwords */}
              <StatCard
                label="Breached"
                value={healthStats.breachCount}
                colorClass={healthStats.breachCount > 0 ? "text-danger" : "text-success"}
              />

              {/* Total items with type breakdown */}
              <StatCard
                label="Total Items"
                value={healthStats.totalItems}
              >
                {healthStats.totalItems > 0 && (
                  <div className="flex flex-wrap justify-center gap-1 mt-1.5">
                    {Object.entries(healthStats.byType).map(([type, count]) => (
                      <Badge key={type} variant="default">
                        {type}: {count}
                      </Badge>
                    ))}
                  </div>
                )}
              </StatCard>

              {/* Health score ring */}
              <div className="col-span-2 sm:col-span-1 lg:col-span-2">
                <Card>
                  <div className="flex items-center justify-center gap-4 py-2">
                    <ProgressRing value={healthStats.healthScore} size={64} strokeWidth={5} />
                    <div>
                      <p className={`text-xl font-bold ${healthColorClass}`}>
                        {healthStats.healthScore}%
                      </p>
                      <p className="text-xs text-text-muted">{healthLabel}</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          {/* ── Quick Actions ─────────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Quick Actions
            </h3>
            <div className="flex flex-wrap gap-2">
              <QuickAction
                label="Generate Password"
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                }
                onClick={() => navigateTo("generator")}
              />
              <QuickAction
                label="Scan Breaches"
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                }
                onClick={() => navigateTo("breach")}
                variant="secondary"
              />
              <QuickAction
                label="Import Data"
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                }
                onClick={() => navigateTo("import")}
                variant="ghost"
              />
            </div>
          </div>

          {/* ── Favorites ─────────────────────────────────── */}
          {favorites.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                Favorites
              </h3>
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {favorites.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onClick={onSelectItem}
                    onToggleFavorite={(id) => {
                      handleToggleFav(id);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Recent Items ──────────────────────────────── */}
          {recent.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                Recent
              </h3>
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                {recent.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onClick={onSelectItem}
                    onToggleFavorite={(id) => {
                      handleToggleFav(id);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Dashboard;
