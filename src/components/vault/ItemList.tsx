"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useVault } from "@/hooks/useVault";
import type { ItemType, VaultItem } from "@/types";

// ── Types ───────────────────────────────────────────────────────────

export interface ItemListProps {
  filterType?: ItemType;
  onSelectItem: (id: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

type SortKey = "name" | "created" | "updated";

interface FilterTab {
  id: string;
  label: string;
}

// ── Tab Configuration ───────────────────────────────────────────────

const filterTabs: FilterTab[] = [
  { id: "all", label: "All" },
  { id: "login", label: "Logins" },
  { id: "note", label: "Notes" },
  { id: "crypto", label: "Crypto" },
];

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "created", label: "Date Created" },
  { key: "updated", label: "Date Modified" },
];

const emptyStateMessages: Record<string, { title: string; description: string }> = {
  all: { title: "No items found", description: "Add your first login, note, or crypto wallet to get started." },
  login: { title: "No logins", description: "Add your first login credential." },
  note: { title: "No notes", description: "Add your first secure note." },
  crypto: { title: "No crypto wallets", description: "Add your first cryptocurrency wallet." },
};

const typeIcons: Record<string, React.ReactNode> = {
  login: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  note: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  card: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  ),
  identity: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
    </svg>
  ),
  crypto: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  ),
};

// ── Helpers ─────────────────────────────────────────────────────────

function getItemIcon(type: string): React.ReactNode {
  return typeIcons[type] ?? typeIcons.note;
}

function getItemSubtitle(item: VaultItem): string {
  switch (item.type) {
    case "login":
      return item.username || "";
    case "note":
      return item.content.length > 80 ? item.content.slice(0, 80) + "..." : item.content;
    case "card":
      return `•••• ${item.number.slice(-4)}`;
    case "identity":
      return [item.firstName, item.lastName].filter(Boolean).join(" ") || "";
    default:
      return "";
  }
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ── Component ───────────────────────────────────────────────────────

export function ItemList({ filterType, onSelectItem, searchInputRef }: ItemListProps) {
  const {
    items,
    searchItems,
    toggleFavorite,
    selectedTag,
    setSelectedTag,
    showFavoritesOnly,
    setShowFavoritesOnly,
  } = useVault();

  const [activeType, setActiveType] = useState<string>(filterType ?? "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAscending, setSortAscending] = useState(true);

  // Sync activeType when filterType prop changes (sidebar navigation)
  useEffect(() => {
    if (filterType) setActiveType(filterType);
  }, [filterType]);

  const tabListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // ── Filtering & Sorting ─────────────────────────────────────────

  const filtered = useMemo(() => {
    let result: VaultItem[];

    // Determine if we have active cross-cutting filters
    const hasFilters = !!(searchQuery.trim() || selectedTag || showFavoritesOnly);

    if (hasFilters) {
      // Use vault's searchItems for text/tag/favorite filtering
      const effectiveType = activeType !== "all" ? (activeType as ItemType) : undefined;
      result = searchItems(searchQuery, effectiveType, selectedTag ?? undefined, showFavoritesOnly);
    } else if (activeType !== "all") {
      // Just filter by type
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
  }, [items, activeType, searchQuery, sortKey, sortAscending, searchItems, selectedTag, showFavoritesOnly]);

  // ── Keyboard Navigation (WAI-ARIA Tabs Pattern) ─────────────────

  const getTabIds = useCallback((): string[] => filterTabs.map((t) => t.id), []);

  const focusTab = useCallback(
    (tabId: string) => {
      const btn = tabRefs.current.get(tabId);
      btn?.focus();
    },
    [],
  );

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, currentId: string) => {
      const tabIds = getTabIds();
      const idx = tabIds.indexOf(currentId);
      let nextIdx: number | null = null;

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          nextIdx = idx + 1 >= tabIds.length ? 0 : idx + 1;
          break;
        case "ArrowLeft":
          e.preventDefault();
          nextIdx = idx - 1 < 0 ? tabIds.length - 1 : idx - 1;
          break;
        case "Home":
          e.preventDefault();
          nextIdx = 0;
          break;
        case "End":
          e.preventDefault();
          nextIdx = tabIds.length - 1;
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          setActiveType(currentId);
          if (currentId !== "all") {
            setSelectedTag(null);
          }
          return;
        default:
          return;
      }

      if (nextIdx !== null) {
        focusTab(tabIds[nextIdx]);
      }
    },
    [getTabIds, focusTab, setSelectedTag],
  );

  const handleTabClick = useCallback(
    (tabId: string) => {
      setActiveType(tabId);
      if (tabId !== "all") {
        setSelectedTag(null);
      }
    },
    [setSelectedTag],
  );

  // ── Handlers ────────────────────────────────────────────────────

  const handleToggleFav = useCallback(
    async (id: string) => {
      toggleFavorite(id);
      // saveVault is called by the parent or via the hook internally
    },
    [toggleFavorite],
  );

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortAscending((a) => !a);
        return prev;
      }
      setSortAscending(true);
      return key;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedTag(null);
    setShowFavoritesOnly(false);
  }, [setSelectedTag, setShowFavoritesOnly]);

  // ── Derived values ──────────────────────────────────────────────

  const searchPlaceholder =
    activeType === "all"
      ? "Search vault..."
      : activeType === "crypto"
        ? "Search crypto..."
        : `Search ${activeType}s...`;

  const activeFilters: string[] = [];
  if (searchQuery) activeFilters.push(`"${searchQuery}"`);
  if (selectedTag) activeFilters.push(`tag: ${selectedTag}`);
  if (showFavoritesOnly) activeFilters.push("favorites");

  const isEmpty = filtered.length === 0;

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* ── Search + Sort bar ─────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
        {/* Search */}
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className={[
              "w-full pl-9 pr-3 py-2 rounded-lg text-sm",
              "bg-bg-elevated text-text-primary placeholder-text-muted",
              "border border-border focus:border-accent focus:ring-1 focus:ring-accent",
              "transition-colors duration-150 outline-none",
            ].join(" ")}
          />
        </div>

        {/* Sort controls — hidden when searching */}
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
                    "inline-flex items-center justify-center px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-150",
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

        {/* Clear filters button */}
        {(selectedTag || showFavoritesOnly) && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center px-2 text-xs text-text-muted hover:text-text-primary transition-colors whitespace-nowrap"
            aria-label="Clear filters"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Filter tabs ────────────────────────────────────────── */}
      {!selectedTag && !showFavoritesOnly && (
        <div className="px-5 pt-3">
          <div
            ref={tabListRef}
            role="tablist"
            aria-label="Filter by item type"
            className="flex gap-0.5 p-0.5 rounded-lg bg-surface border border-border"
          >
            {filterTabs.map((tab) => {
              const isActive = activeType === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    if (el) {
                      tabRefs.current.set(tab.id, el);
                    } else {
                      tabRefs.current.delete(tab.id);
                    }
                  }}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`tabpanel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => handleTabClick(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                  className={[
                    "flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-inset",
                    isActive
                      ? "bg-accent-muted text-accent shadow-sm"
                      : "text-text-muted hover:text-text-secondary hover:bg-surface-hover",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Active filter indicator ────────────────────────────── */}
      {(selectedTag || showFavoritesOnly) && (
        <div className="flex items-center gap-2 px-5 pt-3 text-sm">
          <span className="text-text-muted">Filtered by:</span>
          {showFavoritesOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-muted text-warning text-xs font-medium">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
              Favorites
              <button
                onClick={() => setShowFavoritesOnly(false)}
                className="inline-flex items-center justify-center ml-0.5 hover:text-text-primary"
                aria-label="Remove favorites filter"
              >
                &times;
              </button>
            </span>
          )}
          {selectedTag && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-muted text-accent text-xs font-medium">
              {selectedTag}
              <button
                onClick={() => setSelectedTag(null)}
                className="inline-flex items-center justify-center ml-0.5 hover:text-text-primary"
                aria-label="Remove tag filter"
              >
                &times;
              </button>
            </span>
          )}
        </div>
      )}

      {/* ── Item List ──────────────────────────────────────────── */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeType}`}
        aria-labelledby={`tab-${activeType}`}
        className="flex-1 overflow-y-auto"
        aria-label={`${activeType === "all" ? "All" : activeType.charAt(0).toUpperCase() + activeType.slice(1)} items`}
      >
        {isEmpty ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full px-5 py-16 text-center">
            <div className="mb-4 p-4 rounded-full bg-bg-elevated">
              <svg
                className="h-8 w-8 text-text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                {searchQuery.trim() || selectedTag ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                )}
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-1">
              {searchQuery.trim()
                ? `No results for "${searchQuery}"`
                : selectedTag
                  ? `No items tagged "${selectedTag}"`
                  : (emptyStateMessages[activeType] ?? emptyStateMessages.all).title}
            </h3>
            <p className="text-sm text-text-muted max-w-xs">
              {activeFilters.length > 0
                ? `No items match ${activeFilters.join(", ")}. Try removing some filters.`
                : (emptyStateMessages[activeType] ?? emptyStateMessages.all).description}
            </p>
          </div>
        ) : (
          /* Item grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-5">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectItem(item.id)}
                className={[
                  "group flex items-start gap-3 p-4 rounded-xl text-left w-full",
                  "bg-bg-elevated border border-border",
                  "hover:border-accent/40 hover:bg-surface-hover",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                  "transition-all duration-150",
                ].join(" ")}
              >
                {/* Type icon */}
                <div className="mt-0.5 flex-shrink-0 p-2 rounded-lg bg-surface text-text-muted group-hover:text-accent transition-colors">
                  {getItemIcon(item.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">{item.name}</span>
                    {item.favorite && (
                      <svg className="h-3.5 w-3.5 flex-shrink-0 text-warning" fill="currentColor" viewBox="0 0 24 24" aria-label="Favorite">
                        <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5 truncate">{getItemSubtitle(item)}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] text-text-muted">{formatDate(item.updatedAt)}</span>
                    {item.tags.length > 0 && (
                      <span className="text-[10px] text-text-muted">&middot;</span>
                    )}
                    {item.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                    {item.tags.length > 2 && (
                      <span className="text-[10px] text-text-muted">+{item.tags.length - 2}</span>
                    )}
                  </div>
                </div>

                {/* Favorite toggle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFav(item.id);
                  }}
                  aria-label={item.favorite ? "Remove from favorites" : "Add to favorites"}
                  className={[
                    "inline-flex items-center justify-center flex-shrink-0 p-1 rounded-md transition-colors",
                    item.favorite
                      ? "text-warning hover:text-warning/80"
                      : "text-text-muted hover:text-warning opacity-0 group-hover:opacity-100",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:opacity-100",
                  ].join(" ")}
                >
                  <svg className="h-4 w-4" fill={item.favorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                </button>
              </button>
            ))}
          </div>
        )}

        {/* End of list indicator */}
        {!isEmpty && (
          <p className="text-center text-xs text-text-muted pb-5 px-5" role="status">
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}

export default ItemList;
