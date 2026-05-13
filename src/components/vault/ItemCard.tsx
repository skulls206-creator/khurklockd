"use client";

import type { VaultItem } from "@/types";
import { Badge } from "@/components/ui/Badge";

export interface ItemCardProps {
  item: VaultItem;
  onClick: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
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
};

function getItemSubtitle(item: VaultItem): string {
  switch (item.type) {
    case "login":
      return item.username || item.uri || "";
    case "note":
      return item.content.slice(0, 80) + (item.content.length > 80 ? "..." : "");
    case "card":
      return `**** ${item.number.slice(-4)}`;
    case "identity":
      return [item.firstName, item.lastName].filter(Boolean).join(" ") || item.email || "";
    default:
      return "";
  }
}

export function ItemCard({ item, onClick, onToggleFavorite }: ItemCardProps) {
  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(item.id);
  };

  return (
    <div
      onClick={() => onClick(item.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(item.id);
        }
      }}
      role="button"
      tabIndex={0}
      className={[
        "flex items-start gap-3 p-4 rounded-xl border border-border bg-surface",
        "transition-all duration-150 hover:border-border-strong hover:bg-surface-hover",
        "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
      ].join(" ")}
    >
      {/* Type icon */}
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-accent-muted text-accent flex items-center justify-center mt-0.5">
        {typeIcons[item.type] ?? typeIcons.login}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <h4 className="text-sm font-medium text-text-primary truncate">
            {item.name}
          </h4>
          {item.type === "login" && ("totpSecret" in item) && item.totpSecret && (
            <Badge variant="info">2FA</Badge>
          )}
        </div>

        <p className="text-xs text-text-muted mt-0.5 truncate">
          {getItemSubtitle(item)}
        </p>

        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="default">
                {tag}
              </Badge>
            ))}
            {item.tags.length > 3 && (
              <span className="text-xs text-text-muted">
                +{item.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Favorite toggle */}
      <button
        onClick={handleFavorite}
        aria-label={item.favorite ? "Remove from favorites" : "Add to favorites"}
        className={[
          "flex-shrink-0 p-1 rounded-md transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
          item.favorite
            ? "text-warning"
            : "text-text-muted hover:text-warning",
        ].join(" ")}
      >
        <svg
          className="h-4 w-4"
          fill={item.favorite ? "currentColor" : "none"}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      </button>
    </div>
  );
}

export default ItemCard;
