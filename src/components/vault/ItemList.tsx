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

const filterTabs: TabItem[] = [
  { id: "all", label: "All" },
  { id: "login", label: "Logins" },
  { id: "note", label: "Notes" },
  { id: "card", label: "Cards" },
  { id: "identity", label: "Identities" },
];

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "created", label: "Date Created" },
  { key: "updated", label: "Date Modified" },
];

export function ItemList({ filterType, onSelectItem, searchInputRef }: ItemListProps) {
  const {
    items,
    searchItems,
    toggleFavorite,
    saveVault,
    selectedTag,
    setSelectedTag,
    showFavoritesOnly,
    setShowFavoritesOnly,
  } = useVault();

  const [activeType, setActiveType] = useState<string>(filterType ?? "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAscending, setSortAscending] = useState(true);

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
  }, [items, activeType, searchQuery, sortKey, sortAscending, searchItems, selectedTag, showFavoritesOnly]);

  const handleToggleFav = async (id: string) => {
    toggleFavorite(id);
    await saveVault();
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAscending(!sortAscending);
    } else {
      setSortKey(key);
      setSortAscending(true);
    }
  };

  // Build a description of the active filter for empty state
  const activeFilters: string[] = [];
  if (searchQuery) activeFilters.push(`"${searchQuery}"`);
  if (selectedTag) activeFilters.push(`tag: ${selectedTag}`);
  if (showFavoritesOnly) activeFilters.push("favorites");

  return (
    <div className="space-y-4">
      {/* Active filter indicator */}
      {(selectedTag || showFavoritesOnly) && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-text-muted">Filtered by:</span>
          {showFavoritesOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-muted text-warning text-xs font-medium">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
              Favorites
              <button
                onClick={() => setShowFavoritesOnly(false)}
                className="ml-0.5 hover:text-text-primary"
                aria-label="Remove favorites filter"
              >
                x
              </button>
            </span>
          )}
          {selectedTag && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-muted text-accent text-xs font-medium">
              {selectedTag}
              <button
                onClick={() => setSelectedTag(null)}
                className="ml-0.5 hover:text-text-primary"
                aria-label="Remove tag filter"
              >
                x
              </button>
            </span>
          )}
        </div>
      )}

      {!selectedTag && !showFavoritesOnly && (
        <Tabs
          tabs={filterTabs}
          activeTab={activeType}
          onChange={setActiveType}
        />
      )}

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SearchInput
            onSearch={setSearchQuery}
            placeholder={
              showFavoritesOnly
                ? "Search favorites..."
                : selectedTag
                  ? `Search in "${selectedTag}"...`
                  : `Search ${activeType !== "all" ? activeType + "s" : "vault"}...`
            }
          />
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-text-muted mr-1">Sort:</span>
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => toggleSort(opt.key)}
              className={[
                "px-2 py-1 rounded-md transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                sortKey === opt.key
                  ? "bg-accent-muted text-accent"
                  : "text-text-muted hover:text-text-secondary",
              ].join(" ")}
            >
              {opt.label}
              {sortKey === opt.key && (
                <span className="ml-0.5">
                  {sortAscending ? "\u2191" : "\u2193"}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={searchQuery || activeFilters.length > 0 ? "No matches" : "No items yet"}
          description={
            activeFilters.length > 0
              ? `No items match ${activeFilters.join(", ")}. Try removing some filters.`
              : searchQuery
                ? "Try a different search term or clear the filter."
                : `No ${activeType !== "all" ? activeType + "s" : "items"} in your vault yet.`
          }
        />
      ) : (
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={onSelectItem}
              onToggleFavorite={handleToggleFav}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ItemList;
