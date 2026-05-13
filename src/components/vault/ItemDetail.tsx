"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useVault } from "@/hooks/useVault";
import { useClipboard } from "@/hooks/useClipboard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PasswordField } from "@/components/vault/PasswordField";
import { ItemEditor } from "@/components/vault/ItemEditor";
import {
  generateTOTPFromConfig,
  getRemainingSeconds,
} from "@/lib/totp";
import type { ParsedOTPAuthURL } from "@/lib/totp";
import type { VaultItem, LoginItem, NoteItem, CardItem, IdentityItem, TOTPConfig } from "@/types";

export interface ItemDetailProps {
  itemId: string;
  onBack: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Field renderer helpers ──────────────────────────────────────

function Field({
  label,
  value,
  copyable,
  monospace,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  monospace?: boolean;
}) {
  const { copy, copied } = useClipboard({ clearAfterMs: 30_000 });
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <p
          className={[
            "text-sm text-text-primary flex-1 break-all",
            monospace ? "font-password" : "",
          ].join(" ")}
        >
          {value || <span className="text-text-muted italic">None</span>}
        </p>
        {copyable && value && (
          <button
            type="button"
            onClick={() => copy(value)}
            aria-label={`Copy ${label}`}
            className={[
              "p-1.5 rounded-md transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
              copied
                ? "text-success bg-success-muted"
                : "text-text-muted hover:text-text-primary",
            ].join(" ")}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              {copied ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              )}
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {children}
    </div>
  );
}

// ── TOTP Display ────────────────────────────────────────────────

function TOTPDisplay({ config }: { config: TOTPConfig }) {
  const [code, setCode] = useState("");
  const [remaining, setRemaining] = useState(0);
  const { copy, copied } = useClipboard({ clearAfterMs: 30_000 });

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const c = await generateTOTPFromConfig(config);
        if (!cancelled) {
          setCode(c);
          setRemaining(getRemainingSeconds(config.period ?? 30));
        }
      } catch {
        if (!cancelled) {
          setCode("ERROR");
          setRemaining(0);
        }
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [config]);

  const progress = ((config.period ?? 30) - remaining) / (config.period ?? 30);

  return (
    <div className="space-y-2 p-4 rounded-lg bg-info-muted border border-info/20">
      <p className="text-xs font-medium text-info uppercase tracking-wider">
        Two-Factor Code
      </p>
      <div className="flex items-center gap-3">
        <p className="text-2xl font-password font-bold text-text-primary">
          {code}
        </p>
        <button
          type="button"
          onClick={() => copy(code)}
          aria-label="Copy TOTP code"
          className={[
            "p-1.5 rounded-md transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
            copied
              ? "text-success bg-success-muted"
              : "text-text-muted hover:text-text-primary",
          ].join(" ")}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
        </button>
      </div>
      {/* Countdown ring */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-info rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <span className="text-xs text-text-muted tabular-nums w-8 text-right">
          {remaining}s
        </span>
      </div>
    </div>
  );
}

// ── Login Fields ─────────────────────────────────────────────────

function LoginFields({ item }: { item: LoginItem }) {
  const config = useMemo<TOTPConfig | null>(() => {
    if (!item.totpSecret) return null;
    return {
      secret: item.totpSecret,
      algorithm: "SHA-1",
      digits: 6,
      period: 30,
      label: item.name,
    };
  }, [item]);

  return (
    <div className="space-y-4">
      <Field label="Username" value={item.username} copyable />
      <PasswordField value={item.password} />
      {item.uri && <Field label="Website" value={item.uri} copyable monospace />}
      {config && <TOTPDisplay config={config} />}
      {item.notes && <Field label="Notes" value={item.notes} />}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function NoteFields({ item }: { item: NoteItem }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-primary whitespace-pre-wrap break-words leading-relaxed">
        {item.content || (
          <span className="text-text-muted italic">No content</span>
        )}
      </p>
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function CardFields({ item }: { item: CardItem }) {
  return (
    <div className="space-y-4">
      <Field label="Cardholder Name" value={item.cardholderName} copyable />
      <PasswordField value={item.number} label="Card Number" />
      <FieldGrid>
        {item.brand && <Field label="Brand" value={item.brand} />}
        <Field
          label="Expiry"
          value={`${item.expiryMonth}/${item.expiryYear}`}
        />
        <PasswordField value={item.cvv} label="CVV" autoHideMs={15_000} />
        {item.pin && <PasswordField value={item.pin} label="PIN" />}
      </FieldGrid>
      {item.notes && <Field label="Notes" value={item.notes} />}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.map((t) => <Badge key={t}>{t}</Badge>)}
        </div>
      )}
    </div>
  );
}

function IdentityFields({ item }: { item: IdentityItem }) {
  return (
    <div className="space-y-4">
      <FieldGrid>
        {item.title && <Field label="Title" value={item.title} />}
        <Field label="First Name" value={item.firstName} />
        {item.middleName && <Field label="Middle Name" value={item.middleName} />}
        <Field label="Last Name" value={item.lastName} />
      </FieldGrid>
      <FieldGrid>
        {item.email && <Field label="Email" value={item.email} copyable />}
        {item.phone && <Field label="Phone" value={item.phone} copyable />}
        {item.address && <Field label="Address" value={item.address} />}
        {item.city && <Field label="City" value={item.city} />}
        {item.state && <Field label="State" value={item.state} />}
        {item.postalCode && <Field label="Postal Code" value={item.postalCode} />}
        {item.country && <Field label="Country" value={item.country} />}
        {item.idNumber && (
          <Field label="ID Number" value={item.idNumber} copyable />
        )}
      </FieldGrid>
      {item.notes && <Field label="Notes" value={item.notes} />}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tags.map((t) => <Badge key={t}>{t}</Badge>)}
        </div>
      )}
    </div>
  );
}

// ── ItemDetail ──────────────────────────────────────────────────

export function ItemDetail({ itemId, onBack }: ItemDetailProps) {
  const { getItem, updateItem, deleteItem, saveVault, toggleFavorite } =
    useVault();
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const item = getItem(itemId);

  const handleSave = async (updated: VaultItem) => {
    updateItem(itemId, updated);
    await saveVault();
    setEditing(false);
  };

  const handleDelete = async () => {
    deleteItem(itemId);
    await saveVault();
    setShowDeleteConfirm(false);
    onBack();
  };

  const handleToggleFav = async () => {
    toggleFavorite(itemId);
    await saveVault();
  };

  if (!item) {
    return (
      <div className="py-16 text-center">
        <p className="text-text-muted">Item not found</p>
        <Button variant="ghost" onClick={onBack} className="mt-3">
          Back
        </Button>
      </div>
    );
  }

  if (editing) {
    return (
      <ItemEditor
        item={item}
        onSave={handleSave}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const typeLabel = {
    login: "Login",
    note: "Note",
    card: "Card",
    identity: "Identity",
    "secure-note": "Secure Note",
    cryptocurrency: "Wallet",
  }[item.type];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={onBack}
            className="text-text-muted hover:text-text-primary transition-colors mb-2 flex items-center gap-1 text-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-text-primary">
              {item.name}
            </h1>
            <Badge variant="default">{typeLabel}</Badge>
            {item.favorite && <Badge variant="warning">Favorite</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleFav}
            aria-label={item.favorite ? "Remove from favorites" : "Add to favorites"}
            className={[
              "p-2 rounded-md transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
              item.favorite ? "text-warning" : "text-text-muted hover:text-warning",
            ].join(" ")}
          >
            <svg className="h-5 w-5" fill={item.favorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.563 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </button>
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
            Delete
          </Button>
        </div>
      </div>

      {/* Type-specific fields */}
      {item.type === "login" && <LoginFields item={item} />}
      {item.type === "note" && <NoteFields item={item} />}
      {item.type === "card" && <CardFields item={item} />}
      {item.type === "identity" && <IdentityFields item={item} />}

      {/* Timestamps */}
      <div className="pt-4 border-t border-border">
        <p className="text-xs text-text-muted">
          Created {formatDate(item.createdAt)} {"\u00B7"} Modified{" "}
          {formatDate(item.updatedAt)}
        </p>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Item"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p>
          Are you sure you want to delete <strong>{item.name}</strong>? This
          action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

export default ItemDetail;
