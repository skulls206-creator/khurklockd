"use client";

import { useMemo, useState } from "react";
import { useVault } from "@/hooks/useVault";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { ItemCard } from "@/components/vault/ItemCard";
import type { ItemType, VaultItem } from "@/types";

export interface ItemListProps {
  filterType?: ItemType;
  onSelectItem: (id: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

type SortKey = "name" | "created" | "updated";

const typeLabels: Record<string, string> = {
  all: "Vault",
  login: "Logins",
  note: "Notes",
  card: "Cards",
  identity: "Identities",
  "secure-note": "Secure Notes",
  cryptocurrency: "Wallets",
};

const filterTabs: (TabItem & { type?: string })[] = [
  { id: "all", label: "All" },
  { id: "login", label: "Logins" },
  { id: "note", label: "Notes" },
  { id: "card", label: "Cards" },
  { id: "identity", label: "Identities" },
  { id: "secure-note", label: "Secure Notes" },
  { id: "cryptocurrency", label: "Wallets" },
];

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "created", label: "Date Created" },
  { key: "updated", label: "Date Modified" },
];

const emptyStateMessages: Record<string, { title: string; description: string }> = {
  all: { title: "No items found", description: "Add your first login, note, or card to get started." },
  login: { title: "No logins", description: "Add your first login credential to get started." },
  note: { title: "No notes", description: "Add your first secure note." },
  card: { title: "No cards", description: "Add your first payment card." },
  identity: { title: "No identities", description: "Add your first identity profile." },
  "secure-note": { title: "No secure notes", description: "Add your first secure note." },
  cryptocurrency: { title: "No wallets", description: "Add your first cryptocurrency wallet." },
};

export function ItemList({ filterType, onSelectItem, searchInputRef }: ItemListProps) {
  const {
    items,
    searchItems,
    toggleFavorite,
    selectedTag,
    setSelectedTag,
    showFavoritesOnly,
    setShowFavoritesOnly,
    getCountByType,
  } = useVault();

  const [activeType, setActiveType] = useState<string>(filterType ?? "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAscending, setSortAscending] = useState(true);

  // Build tab items with live counts
  const tabsWithCounts: TabItem[] = useMemo(
    () =>
      filterTabs.map((tab) => ({
        id: tab.id,
        label: tab.label,
        count: tab.id === "all" ? items.length : getCountByType(tab.id as ItemType),
      })),
    [items.length, getCountByType],
  );

  const filtered = useMemo(() => {
    const effectiveType = activeType !== "all" ? (activeType as ItemType) : undefined;

    let result: VaultItem[];
    if (searchQuery.trim() || selectedTag || showFavoritesOnly) {
      result = searchItems(searchQuery, effectiveType, selectedTag ?? undefined, showFavoritesOnly);
    } else if (effectiveType) {
      result = searchItems("", effectiveType, undefined, false);
    } else {
      result = [...items];
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "created":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "updated":
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }
      return sortAscending ? cmp : -cmp;
    });

    return result;
  }, [activeType, searchQuery, selectedTag, showFavoritesOnly, items, sortKey, sortAscending, searchItems]);

  const handleTabChange = (tabId: string) => {
    setActiveType(tabId);
    if (tabId !== "all") {
      setSelectedTag(null);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAscending((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAscending(true);
    }
  };

  const searchPlaceholder =
    searchQuery.trim()
      ? `Search ${(typeLabels[activeType] ?? "vault").toLowerCase()}...`
      : `Search ${(typeLabels[activeType] ?? "vault").toLowerCase()}...`;

  return (
    <div className="flex flex-col h-full">
      {/* Search + Sort bar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
        <div className="flex-1">
          <SearchInput
            ref={searchInputRef}
            onSearch={setSearchQuery}
            placeholder={searchPlaceholder}
            aria-label={`Search ${typeLabels[activeType] ?? "vault"}`}
          />
        </div>

        {searchQuery.trim() === "" && (
          <div className="flex items-center gap-1" role="group" aria-label="Sort options">
            {sortOptions.map((opt) => {
              const isActive = sortKey === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => toggleSort(opt.key)}
                  aria-label={`Sort by ${opt.label}${isActive ? ` (${sortAscending ? "ascending" : "descending"})` : ""}`}
                  aria-pressed={isActive}
                  className={[
                    "px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                    isActive
                      ? "bg-accent-muted text-accent"
                      : "text-text-muted hover:text-text-secondary hover:bg-surface-hover",
                  ].join(" ")}
                >
                  {opt.label}
                  {isActive && (
                    <span className="ml-1 inline-block" aria-hidden="true">
                      {sortAscending ? "\u2191" : "\u2193"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {(selectedTag || showFavoritesOnly) && (
          <button
            type="button"
            onClick={() => {
              setSelectedTag(null);
              setShowFavoritesOnly(false);
            }}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
            aria-label="Clear filters"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Type filter tabs */}
      <Tabs tabs={tabsWithCounts} activeTab={activeType} onChange={handleTabChange} />

      {/* Item list */}
      <div className="flex-1 overflow-y-auto" role="list" aria-label={`${typeLabels[activeType] ?? "Vault"} items`}>
        {filtered.length === 0 ? (
          <div className="px-5">
            {(() => {
              const msg = emptyStateMessages[activeType] ?? emptyStateMessages.all;
              return (
                <EmptyState
                  title={
                    searchQuery.trim()
                      ? `No results for "${searchQuery}"`
                      : selectedTag
                        ? `No items tagged "${selectedTag}"`
                        : msg.title
                  }
                  description={
                    searchQuery.trim()
                      ? "Try a different search term or clear filters."
                      : msg.description
                  }
                />
              );
            })()}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-5">
            {filtered.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onClick={onSelectItem}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}

        {/* End of list indicator */}
        {filtered.length > 0 && (
          <p className="text-center text-xs text-text-muted pb-5 px-5" role="status">
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}

export default ItemList;
