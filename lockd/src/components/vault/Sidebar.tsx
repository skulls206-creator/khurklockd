"use client";

import { useState, useMemo, useEffect } from "react";
import { useVault } from "@/hooks/useVault";
import type { ViewRoute, ItemType } from "@/types";

// ── Build Info ⚡ ───────────────────────────────────────────────
// Auto-generated on each build via scripts/generate-build-info.mjs
// Displays commit short hash at the bottom of the sidebar.

interface BuildData {
  build: string;
  commit: string;
  date: string;
  builtAt: string;
}

function BuildInfo() {
  const [info, setInfo] = useState<BuildData | null>(null);

  useEffect(() => {
    fetch("/build.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setInfo(d))
      .catch(() => {});
  }, []);

  if (!info) return null;

  return (
    <p
      className="text-[10px] text-text-muted/40 text-center select-none"
      title={`commit ${info.commit} · ${info.date}`}
    >
      build {info.build}
    </p>
  );
}

interface NavItem {
  id: ViewRoute | "favorites";
  label: string;
  icon: React.ReactNode;
  separator?: boolean;
  count?: number;
  active?: boolean;
}

const typeIcons: Record<string, React.ReactNode> = {
  all: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  favorites: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  ),
  login: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  ),
  note: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  card: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  ),
  identity: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
    </svg>
  ),
  tag: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  ),
  wallet: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
    </svg>
  ),
  breached: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
};

export function Sidebar() {
  const {
    activeView,
    setActiveView,
    lockVault,
    vaultFilePath,
    items,
    getFavorites,
    getItemCount,
    getCountByType,
    getAllTags,
    selectedTag,
    setSelectedTag,
    showFavoritesOnly,
    setShowFavoritesOnly,
  } = useVault();
  const [collapsed, setCollapsed] = useState(true);

  const favCount = useMemo(() => getFavorites().length, [getFavorites, items]);
  const totalCount = useMemo(() => getItemCount(), [getItemCount, items]);
  const typeCounts = useMemo(
    () => ({
      login: getCountByType("login"),
      note: getCountByType("note"),
      card: getCountByType("card"),
      identity: getCountByType("identity"),
      wallet: getCountByType("cryptocurrency"),
    }),
    [getCountByType, items],
  );
  const sidebarTypes = ["login", "note", "card", "identity", "wallet"] as const;
  const tags = useMemo(() => getAllTags(), [getAllTags, items]);

  const handleNav = (item: NavItem) => {
    setSelectedTag(null);
    setShowFavoritesOnly(false);

    if (item.id === "favorites") {
      setActiveView("dashboard");
      setShowFavoritesOnly(true);
    } else {
      setActiveView(item.id as ViewRoute);
    }
    setCollapsed(true);
  };

  const handleTagClick = (tag: string) => {
    setActiveView("dashboard");
    setSelectedTag(selectedTag === tag ? null : tag);
    setShowFavoritesOnly(false);
    setCollapsed(true);
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="md:hidden fixed top-[max(env(safe-area-inset-top),1rem)] left-[max(env(safe-area-inset-left),1rem)] z-40 inline-flex items-center justify-center rounded-md bg-surface border border-border text-text-secondary hover:text-text-primary"
        aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          {collapsed ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          )}
        </svg>
      </button>

      {/* Backdrop */}
      {!collapsed && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed md:sticky top-0 left-0 z-30 h-screen w-64 max-w-full",
          "bg-bg-secondary border-r border-border",
          "flex flex-col",
          "transition-transform duration-200",
          "pl-[env(safe-area-inset-left)]",
          collapsed ? "-translate-x-full md:translate-x-0" : "translate-x-0",
        ].join(" ")}
      >
        {/* Vault name */}
        <div className="px-5 py-4 pt-[max(env(safe-area-inset-top),1rem)] border-b border-border">
          <h1 className="text-sm font-semibold text-text-primary truncate">
            {vaultFilePath ?? "Khurklockd"}
          </h1>
          <p className="text-xs text-text-muted mt-0.5">Encrypted Vault</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {/* ── All Items ── */}
          <button
            onClick={() => {
              setActiveView("dashboard");
              setSelectedTag(null);
              setShowFavoritesOnly(false);
              setCollapsed(true);
            }}
            className={[
              "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-inset",
              activeView === "dashboard" && !selectedTag && !showFavoritesOnly
                ? "bg-accent-muted text-accent"
                : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
            ].join(" ")}
          >
            {typeIcons.all}
            <span className="flex-1 text-left">All Items</span>
            <span className="text-xs text-text-muted tabular-nums">{totalCount}</span>
          </button>

          {/* ── Favorites ── */}
          <button
            onClick={() => handleNav({ id: "favorites", label: "Favorites", icon: typeIcons.favorites })}
            className={[
              "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-inset",
              showFavoritesOnly
                ? "bg-accent-muted text-accent"
                : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
            ].join(" ")}
          >
            {typeIcons.favorites}
            <span className="flex-1 text-left">Favorites</span>
            <span className="text-xs text-text-muted tabular-nums">{favCount}</span>
          </button>

          <div className="my-2 border-t border-border" />

          {/* ── Type Sections ── */}
          {sidebarTypes.map((type) => {
            const isActive = activeView === type && !selectedTag && !showFavoritesOnly;
            return (
              <button
                key={type}
                onClick={() => handleNav({ id: type, label: type, icon: typeIcons[type] })}
                className={[
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm",
                  "transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-inset",
                  isActive
                    ? "bg-accent-muted text-accent"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
                ].join(" ")}
              >
                {typeIcons[type]}
                <span className="flex-1 text-left capitalize">{type}s</span>
                <span className="text-xs text-text-muted tabular-nums">
                  {typeCounts[type]}
                </span>
              </button>
            );
          })}

          {/* ── Tags Section ── */}
          {tags.length > 0 && (
            <>
              <div className="my-2 border-t border-border" />
              <div className="px-3 py-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Tags
                </span>
              </div>
              {tags.map(({ tag, count }) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={[
                    "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm",
                    "transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-inset",
                    selectedTag === tag
                      ? "bg-accent-muted text-accent"
                      : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
                  ].join(" ")}
                >
                  {typeIcons.tag}
                  <span className="flex-1 text-left truncate">{tag}</span>
                  <span className="text-xs text-text-muted tabular-nums">{count}</span>
                </button>
              ))}
            </>
          )}

          <div className="my-2 border-t border-border" />

          {/* ── Tools ── */}
          {(["generator", "totp", "breach"] as const).map((id) => {
            const labels: Record<string, string> = {
              generator: "Generator",
              totp: "TOTP Codes",
              breach: "Breach Monitor",
            };
            const isActive = activeView === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setActiveView(id);
                  setSelectedTag(null);
                  setShowFavoritesOnly(false);
                  setCollapsed(true);
                }}
                className={[
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm",
                  "transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-inset",
                  isActive
                    ? "bg-accent-muted text-accent"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
                ].join(" ")}
              >
                {typeIcons[id] ?? typeIcons.all}
                <span className="flex-1 text-left">{labels[id]}</span>
              </button>
            );
          })}

          <div className="my-2 border-t border-border" />

          {/* ── Settings & Import ── */}
          {(["settings", "emergency", "import"] as const).map((id) => {
            const labels: Record<string, string> = {
              settings: "Settings",
              emergency: "Emergency",
              import: "Import",
            };
            const iconMap: Record<string, React.ReactNode> = {
              settings: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ),
              emergency: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              ),
              import: (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              ),
            };
            const isActive = activeView === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setActiveView(id);
                  setSelectedTag(null);
                  setShowFavoritesOnly(false);
                  setCollapsed(true);
                }}
                className={[
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm",
                  "transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-inset",
                  isActive
                    ? "bg-accent-muted text-accent"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
                ].join(" ")}
              >
                {iconMap[id]}
                <span className="flex-1 text-left">{labels[id]}</span>
              </button>
            );
          })}
        </nav>

        {/* Lock button + build info */}
        <div className="p-3 border-t border-border space-y-1">
          <button
            onClick={lockVault}
            className={[
              "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm",
              "text-text-muted hover:bg-danger-muted hover:text-danger",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-inset",
            ].join(" ")}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span>Lock Vault</span>
          </button>
          <BuildInfo />
        </div>
      </aside>
    </>
  );
}

export default Sidebar;