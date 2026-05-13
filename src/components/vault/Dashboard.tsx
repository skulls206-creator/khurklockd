"use client";

import { useMemo, useState } from "react";
import { useVault } from "@/hooks/useVault";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { ItemCard } from "@/components/vault/ItemCard";
import type { VaultItem, ItemType } from "@/types";

export interface DashboardProps {
  onSelectItem: (id: string) => void;
  onCreateItem: (type?: ItemType) => void;
}

export function Dashboard({ onSelectItem, onCreateItem }: DashboardProps) {
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

  const breacheCount = 0; // placeholder — would integrate with breach module

  const handleToggleFav = async (id: string) => {
    toggleFavorite(id);
    await saveVault();
  };

  const handleSearch = (val: string) => {
    setSearchQuery(val);
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

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <SearchInput
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
              />
              <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-lg border border-border bg-bg-elevated shadow-xl py-1">
                {newItemTypes.map(({ type, label, icon }) => (
                  <button
                    key={type}
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

      {/* Quick stats */}
      {!searchQuery && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <div className="text-center py-2">
              <p className="text-2xl font-bold text-text-primary">
                {items.length}
              </p>
              <p className="text-xs text-text-muted mt-1">Total Items</p>
            </div>
          </Card>
          <Card>
            <div className="text-center py-2">
              <p className="text-2xl font-bold text-warning">
                {favorites.length}
              </p>
              <p className="text-xs text-text-muted mt-1">Favorites</p>
            </div>
          </Card>
          <Card>
            <div className="text-center py-2">
              <p className="text-2xl font-bold text-danger">
                {breacheCount}
              </p>
              <p className="text-xs text-text-muted mt-1">Breached</p>
            </div>
          </Card>
        </div>
      )}

      {/* Search results */}
      {searchQuery && (
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
      )}

      {/* Favorites grid */}
      {!searchQuery && favorites.length > 0 && (
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

      {/* Recent items */}
      {!searchQuery && recent.length > 0 && (
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
    </div>
  );
}

export default Dashboard;
