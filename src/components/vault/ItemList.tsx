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

export function ItemList({ filterType, onSelectItem }: ItemListProps) {
  const { items, searchItems, toggleFavorite, saveVault } = useVault();

  const [activeType, setActiveType] = useState<string>(filterType ?? "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAscending, setSortAscending] = useState(true);

  const filtered = useMemo(() => {
    let result: VaultItem[];
    if (searchQuery.trim()) {
      const type = activeType !== "all" ? (activeType as ItemType) : undefined;
      result = searchItems(searchQuery, type);
    } else if (activeType !== "all") {
      result = items.filter((item) => item.type === activeType);
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
  }, [items, activeType, searchQuery, sortKey, sortAscending, searchItems]);

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

  return (
    <div className="space-y-4">
      <Tabs
        tabs={filterTabs}
        activeTab={activeType}
        onChange={setActiveType}
      />

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SearchInput
            onSearch={setSearchQuery}
            placeholder={`Search ${activeType !== "all" ? activeType + "s" : "vault"}...`}
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
          title={searchQuery ? "No matches" : "No items yet"}
          description={
            searchQuery
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
