"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import { useVault } from "@/hooks/useVault";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordField } from "@/components/vault/PasswordField";
import type {
  VaultItem,
  LoginItem,
  NoteItem,
  CardItem,
  IdentityItem,
  WalletItem,
  ItemType,
  GeneratorConfig,
} from "@/types";

export interface ItemEditorProps {
  item?: VaultItem;
  onSave: (item: VaultItem) => void;
  onCancel: () => void;
}

// ── Login Editor ─────────────────────────────────────────────────

function LoginEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: LoginItem;
  onSave: (item: VaultItem) => void;
  onCancel: () => void;
}) {
  const { generatePassword } = useVault();
  const [name, setName] = useState(initial?.name ?? "");
  const [uri, setUri] = useState(initial?.uri ?? "");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState(initial?.password ?? "");
  const [totpSecret, setTotpSecret] = useState(initial?.totpSecret ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");
  const [favorite, setFavorite] = useState(initial?.favorite ?? false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    const defaults = (initial as unknown) ? undefined : undefined;
    // Use default generator config
    const pw = generatePassword();
    setPassword(pw);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!username.trim()) {
      setError("Username is required");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }

    const now = new Date().toISOString();
    const item: LoginItem = {
      id: initial?.id ?? "",
      type: "login",
      name: name.trim(),
      uri: uri.trim() || undefined,
      username: username.trim(),
      password,
      totpSecret: totpSecret.trim() || undefined,
      notes: notes.trim() || undefined,
      favorite,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(item);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div role="alert" className="p-3 rounded-lg bg-danger-muted border border-danger/20 text-sm text-danger">
          {error}
        </div>
      )}
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Google" autoFocus autoComplete="off" enterKeyHint="next" />
      <Input label="Website URL" value={uri} onChange={(e) => setUri(e.target.value)} placeholder="https://example.com" type="text" inputMode="url" autoCapitalize="off" autoComplete="url" autoCorrect="off" spellCheck={false} enterKeyHint="next" />
      <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="user@example.com" type="text" autoCapitalize="off" autoComplete="username" autoCorrect="off" spellCheck={false} enterKeyHint="next" />
      <div>
        <label className="text-sm font-medium text-text-primary block mb-1">
          Password
        </label>
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter or generate a password"
            />
          </div>
          <Button type="button" variant="secondary" size="md" onClick={handleGenerate}>
            Generate
          </Button>
        </div>
        {password && <PasswordField value={password} autoHideMs={0} showStrength />}
      </div>
      <Input label="TOTP Secret (optional)" value={totpSecret} onChange={(e) => setTotpSecret(e.target.value)} placeholder="Base32-encoded secret" autoCapitalize="off" autoCorrect="off" spellCheck={false} autoComplete="off" />
      <div className="space-y-1">
        <label className="text-sm font-medium text-text-primary">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes..."
          rows={3}
          className={[
            "w-full rounded-md border border-border px-3 py-2 text-sm",
            "bg-surface text-text-primary placeholder:text-text-muted",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent",
            "resize-none",
          ].join(" ")}
        />
      </div>
      <Input label="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="work, email, production" />
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={favorite}
          onChange={(e) => setFavorite(e.target.checked)}
          className="rounded border-border bg-surface text-accent focus:ring-border-focus"
        />
        <span className="text-sm text-text-secondary">Favorite</span>
      </label>
      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" className="flex-1">
          Save
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ── Note Editor ──────────────────────────────────────────────────

function NoteEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: NoteItem;
  onSave: (item: VaultItem) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");
  const [favorite, setFavorite] = useState(initial?.favorite ?? false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    const now = new Date().toISOString();
    const item: NoteItem = {
      id: initial?.id ?? "",
      type: "note",
      name: name.trim(),
      content,
      favorite,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(item);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div role="alert" className="p-3 rounded-lg bg-danger-muted border border-danger/20 text-sm text-danger">
          {error}
        </div>
      )}
      <Input label="Title" value={name} onChange={(e) => setName(e.target.value)} placeholder="Note title" autoFocus />
      <div className="space-y-1">
        <label className="text-sm font-medium text-text-primary">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note..."
          rows={8}
          className={[
            "w-full rounded-md border border-border px-3 py-2 text-sm",
            "bg-surface text-text-primary placeholder:text-text-muted",
            "transition-colors duration-150 resize-none",
            "focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent",
          ].join(" ")}
        />
      </div>
      <Input label="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="personal, ideas" />
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} className="rounded border-border bg-surface text-accent focus:ring-border-focus" />
        <span className="text-sm text-text-secondary">Favorite</span>
      </label>
      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" className="flex-1">Save</Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">Cancel</Button>
      </div>
    </form>
  );
}

// ── Card Editor ──────────────────────────────────────────────────

function CardEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: CardItem;
  onSave: (item: VaultItem) => void;
  onCancel: () => void;
}) {
  const { generatePassword } = useVault();
  const [name, setName] = useState(initial?.name ?? "");
  const [cardholderName, setCardholderName] = useState(initial?.cardholderName ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [number, setNumber] = useState(initial?.number ?? "");
  const [expiryMonth, setExpiryMonth] = useState(initial?.expiryMonth ?? "");
  const [expiryYear, setExpiryYear] = useState(initial?.expiryYear ?? "");
  const [cvv, setCvv] = useState(initial?.cvv ?? "");
  const [pin, setPin] = useState(initial?.pin ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");
  const [favorite, setFavorite] = useState(initial?.favorite ?? false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    if (!cardholderName.trim()) { setError("Cardholder name is required"); return; }
    if (!number.trim()) { setError("Card number is required"); return; }
    const now = new Date().toISOString();
    const item: CardItem = {
      id: initial?.id ?? "",
      type: "card",
      name: name.trim(),
      cardholderName: cardholderName.trim(),
      brand: brand.trim() || undefined,
      number: number.trim(),
      expiryMonth: expiryMonth.trim(),
      expiryYear: expiryYear.trim(),
      cvv: cvv.trim(),
      pin: pin.trim() || undefined,
      notes: notes.trim() || undefined,
      favorite,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(item);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div role="alert" className="p-3 rounded-lg bg-danger-muted border border-danger/20 text-sm text-danger">{error}</div>
      )}
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chase Sapphire" autoFocus />
      <Input label="Cardholder Name" value={cardholderName} onChange={(e) => setCardholderName(e.target.value)} placeholder="Name on card" />
      <Input label="Brand (optional)" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Visa, Mastercard, Amex..." />
      <Input label="Card Number" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="1234 5678 9012 3456" type="text" inputMode="numeric" autoComplete="cc-number" autoCorrect="off" spellCheck={false} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Expiry Month" value={expiryMonth} onChange={(e) => setExpiryMonth(e.target.value)} placeholder="MM" inputMode="numeric" autoComplete="cc-exp-month" />
        <Input label="Expiry Year" value={expiryYear} onChange={(e) => setExpiryYear(e.target.value)} placeholder="YYYY" inputMode="numeric" autoComplete="cc-exp-year" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="CVV" type="password" value={cvv} onChange={(e) => setCvv(e.target.value)} placeholder="***" inputMode="numeric" autoComplete="cc-csc" />
        <Input label="PIN (optional)" type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="****" inputMode="numeric" autoComplete="off" />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-text-primary">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." rows={2} className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface text-text-primary placeholder:text-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent resize-none" />
      </div>
      <Input label="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="finance, credit" />
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} className="rounded border-border bg-surface text-accent focus:ring-border-focus" />
        <span className="text-sm text-text-secondary">Favorite</span>
      </label>
      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" className="flex-1">Save</Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">Cancel</Button>
      </div>
    </form>
  );
}

// ── Identity Editor ──────────────────────────────────────────────

function IdentityEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: IdentityItem;
  onSave: (item: VaultItem) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [middleName, setMiddleName] = useState(initial?.middleName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [state_, setState] = useState(initial?.state ?? "");
  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? "");
  const [country, setCountry] = useState(initial?.country ?? "");
  const [idNumber, setIdNumber] = useState(initial?.idNumber ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");
  const [favorite, setFavorite] = useState(initial?.favorite ?? false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    if (!firstName.trim()) { setError("First name is required"); return; }
    if (!lastName.trim()) { setError("Last name is required"); return; }
    const now = new Date().toISOString();
    const item: IdentityItem = {
      id: initial?.id ?? "",
      type: "identity",
      name: name.trim(),
      title: title.trim() || undefined,
      firstName: firstName.trim(),
      middleName: middleName.trim() || undefined,
      lastName: lastName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      state: state_.trim() || undefined,
      postalCode: postalCode.trim() || undefined,
      country: country.trim() || undefined,
      idNumber: idNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      favorite,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(item);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div role="alert" className="p-3 rounded-lg bg-danger-muted border border-danger/20 text-sm text-danger">{error}</div>}
      <Input label="Item Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Personal ID" autoFocus />
      <Input label="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mr, Mrs, Dr..." />
      <div className="grid grid-cols-2 gap-4">
        <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" />
        <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
      </div>
      <Input label="Middle Name (optional)" value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="Middle name" />
      <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" inputMode="email" autoCapitalize="off" autoComplete="email" autoCorrect="off" spellCheck={false} />
      <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" inputMode="tel" autoComplete="tel" />
      <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" />
      <div className="grid grid-cols-2 gap-4">
        <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
        <Input label="State" value={state_} onChange={(e) => setState(e.target.value)} placeholder="State" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Postal Code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="12345" />
        <Input label="Country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="United States" />
      </div>
      <Input label="ID Number (optional)" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="Passport, SSN, etc." />
      <div className="space-y-1">
        <label className="text-sm font-medium text-text-primary">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." rows={2} className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface text-text-primary placeholder:text-text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent resize-none" />
      </div>
      <Input label="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="personal, government" />
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} className="rounded border-border bg-surface text-accent focus:ring-border-focus" />
        <span className="text-sm text-text-secondary">Favorite</span>
      </label>
      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" className="flex-1">Save</Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">Cancel</Button>
      </div>
    </form>
  );
}

// ── Cryptocurrency Wallet Editor ──────────────────────────────────

function CryptocurrencyEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: WalletItem;
  onSave: (item: VaultItem) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [cryptoType, setCryptoType] = useState(initial?.cryptoType ?? "");
  const [walletAddress, setWalletAddress] = useState(initial?.walletAddress ?? "");
  const [derivationPath, setDerivationPath] = useState(initial?.derivationPath ?? "");
  const [privateKey, setPrivateKey] = useState(initial?.privateKey ?? "");
  const [seedPhraseBackedUp, setSeedPhraseBackedUp] = useState(initial?.seedPhraseBackedUp ?? false);
  const [balance, setBalance] = useState(initial?.balance ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");
  const [favorite, setFavorite] = useState(initial?.favorite ?? false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!cryptoType.trim()) {
      setError("Cryptocurrency type is required");
      return;
    }
    if (!walletAddress.trim()) {
      setError("Wallet address is required");
      return;
    }
    const now = new Date().toISOString();
    const item: WalletItem = {
      id: initial?.id ?? "",
      type: "cryptocurrency",
      name: name.trim(),
      cryptoType: cryptoType.trim(),
      walletAddress: walletAddress.trim(),
      derivationPath: derivationPath.trim() || undefined,
      privateKey: privateKey.trim() || undefined,
      seedPhraseBackedUp,
      balance: balance.trim() || undefined,
      notes: notes.trim() || undefined,
      favorite,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(item);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div role="alert" className="p-3 rounded-lg bg-danger-muted border border-danger/20 text-sm text-danger">
          {error}
        </div>
      )}
      <Input label="Wallet Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My Bitcoin Wallet" autoFocus />
      <Input label="Cryptocurrency" value={cryptoType} onChange={(e) => setCryptoType(e.target.value)} placeholder="e.g. Bitcoin, Monero, TRON, Ethereum" />
      <Input label="Wallet Address" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} placeholder="Public wallet address" />
      <Input label="Derivation Path (optional)" value={derivationPath} onChange={(e) => setDerivationPath(e.target.value)} placeholder="e.g. m/44'/0'/0'/0/0" />
      <div className="space-y-1">
        <label className="text-sm font-medium text-text-primary block mb-1">
          Private Key (optional)
        </label>
        <Input
          type="password"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          placeholder="Encrypted private key or seed phrase"
        />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={seedPhraseBackedUp}
          onChange={(e) => setSeedPhraseBackedUp(e.target.checked)}
          className="rounded border-border bg-surface text-accent focus:ring-border-focus"
        />
        <span className="text-sm text-text-secondary">Seed phrase backed up</span>
      </label>
      <Input label="Balance (optional)" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="e.g. 0.5 BTC or $5,000" />
      <div className="space-y-1">
        <label className="text-sm font-medium text-text-primary">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes..."
          rows={2}
          className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface text-text-primary placeholder:text-text-muted transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent resize-none"
        />
      </div>
      <Input label="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="cold-storage, exchange" />
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} className="rounded border-border bg-surface text-accent focus:ring-border-focus" />
        <span className="text-sm text-text-secondary">Favorite</span>
      </label>
      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="primary" className="flex-1">Save Wallet</Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">Cancel</Button>
      </div>
    </form>
  );
}

// ── Main Editor Router ─────────────────────────────────────────

export function ItemEditor({ item, onSave, onCancel }: ItemEditorProps) {
  const editorType = item?.type ?? null;

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-lg font-semibold text-text-primary mb-6">
        {item ? `Edit ${editorType ? editorType.charAt(0).toUpperCase() + editorType.slice(1) : "Item"}` : "New Item"}
      </h2>

      {editorType === "login" && (
        <LoginEditor
          initial={item as LoginItem | undefined}
          onSave={onSave}
          onCancel={onCancel}
        />
      )}
      {editorType === "note" && (
        <NoteEditor
          initial={item as NoteItem | undefined}
          onSave={onSave}
          onCancel={onCancel}
        />
      )}
      {editorType === "card" && (
        <CardEditor
          initial={item as CardItem | undefined}
          onSave={onSave}
          onCancel={onCancel}
        />
      )}
      {editorType === "identity" && (
        <IdentityEditor
          initial={item as IdentityItem | undefined}
          onSave={onSave}
          onCancel={onCancel}
        />
      )}
      {editorType === "cryptocurrency" && (
        <CryptocurrencyEditor
          initial={item as WalletItem | undefined}
          onSave={onSave}
          onCancel={onCancel}
        />
      )}
    </div>
  );
}

export default ItemEditor;
