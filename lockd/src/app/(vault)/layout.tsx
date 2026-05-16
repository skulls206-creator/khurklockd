"use client";

import { useCallback, useEffect, useState } from "react";
import { VaultProvider, useVault } from "@/hooks/useVault";
import { UnlockScreen } from "@/components/vault/UnlockScreen";
import { Sidebar } from "@/components/vault/Sidebar";
import { Dashboard } from "@/components/vault/Dashboard";
import { ItemList } from "@/components/vault/ItemList";
import { ItemDetail } from "@/components/vault/ItemDetail";
import { ItemEditor } from "@/components/vault/ItemEditor";
import { ToastContainer } from "@/components/ui/Toast";
import { ImportPage } from "@/components/vault/ImportPage";
import { BottomTabBar } from "@/components/vault/BottomTabBar";
import SettingsPage from "./settings/page";
import EmergencyPage from "./emergency/page";
import GeneratorPage from "./generator/page";
import BreachPage from "./breach/page";
import TOTPPage from "./totp/page";
import {
  loginItemSchema,
  noteItemSchema,
  cardItemSchema,
  identityItemSchema,
  walletItemSchema,
} from "@/lib/vault/schema";
import type { VaultItem, ItemType, ViewRoute } from "@/types";

function VaultShell() {
  const {
    vaultState,
    activeView,
    setActiveView,
    addItem,
    saveVault,
    items,
    lockVault,
  } = useVault();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [creatingType, setCreatingType] = useState<ItemType | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [shareDefaults, setShareDefaults] = useState<{
    name?: string;
    url?: string;
    notes?: string;
  } | null>(null);

  function createEmptyItem(type: ItemType, defaults?: { name?: string; url?: string; notes?: string }): VaultItem {
    const base = { id: "", name: defaults?.name ?? "", favorite: false, tags: [], createdAt: "", updatedAt: "" };
    switch (type) {
      case "login":
        return loginItemSchema
          .partial({ id: true, name: true, username: true, password: true, createdAt: true, updatedAt: true })
          .parse({ ...base, type: "login", username: "", password: "", uri: defaults?.url ?? "", notes: defaults?.notes ?? "" }) as VaultItem;
      case "note":
        return noteItemSchema
          .partial({ id: true, name: true, createdAt: true, updatedAt: true })
          .parse({ ...base, type: "note", content: "" }) as VaultItem;
      case "card":
        return cardItemSchema
          .partial({ id: true, name: true, cardholderName: true, number: true, expiryMonth: true, expiryYear: true, cvv: true, createdAt: true, updatedAt: true })
          .parse({ ...base, type: "card", cardholderName: "", number: "", expiryMonth: "", expiryYear: "", cvv: "" }) as VaultItem;
      case "identity":
        return identityItemSchema
          .partial({ id: true, name: true, firstName: true, lastName: true, createdAt: true, updatedAt: true })
          .parse({ ...base, type: "identity", firstName: "", lastName: "" }) as VaultItem;
      case "cryptocurrency":
        return walletItemSchema
          .partial({ id: true, name: true, cryptoType: true, walletAddress: true, seedPhraseBackedUp: true, createdAt: true, updatedAt: true })
          .parse({ ...base, type: "cryptocurrency", cryptoType: "", walletAddress: "", seedPhraseBackedUp: false }) as VaultItem;
      default:
        return noteItemSchema
          .partial({ id: true, name: true, createdAt: true, updatedAt: true })
          .parse({ ...base, type: "note", content: "" }) as VaultItem;
    }
  }

  const handleSelectItem = useCallback((id: string) => {
    setSelectedItemId(id);
    setCreatingType(null);
    setEditingItemId(null);
  }, []);

  const handleCreateItem = useCallback((type?: ItemType) => {
    setCreatingType(type ?? "login");
    setSelectedItemId(null);
    setEditingItemId(null);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedItemId(null);
    setCreatingType(null);
    setEditingItemId(null);
  }, []);

  const handleSaveNew = useCallback(
    async (item: VaultItem) => {
      addItem(item);
      await saveVault();
      setCreatingType(null);
      setShareDefaults(null);
    },
    [addItem, saveVault],
  );

  const handleCancelNew = useCallback(() => {
    setCreatingType(null);
    setShareDefaults(null);
  }, []);

  // Handle PWA shortcut + share_target query params on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (vaultState !== "unlocked") return;
    const params = new URLSearchParams(window.location.search);
    if (params.toString() === "") return;

    const action = params.get("action");
    const isShare = params.get("share-target");

    if (isShare) {
      const title = params.get("title") ?? "";
      const text = params.get("text") ?? "";
      const url = params.get("url") ?? "";
      setShareDefaults({ name: title || url, url, notes: text });
      setCreatingType("login");
      setSelectedItemId(null);
    } else if (action === "new-login") {
      setCreatingType("login");
      setSelectedItemId(null);
    } else if (action === "search") {
      setActiveView("dashboard");
      setSelectedItemId(null);
      setCreatingType(null);
      window.setTimeout(() => {
        const el = document.querySelector<HTMLInputElement>(
          'input[type="search"], input[role="searchbox"], input[aria-label*="earch" i], input[placeholder*="earch" i]',
        );
        if (el) {
          el.focus();
          el.select?.();
        } else {
          console.warn("[PWA] action=search: no search input found");
        }
      }, 120);
    } else if (action === "lock") {
      lockVault();
    } else if (action === "generator") {
      setActiveView("generator");
    } else if (action === "totp") {
      setActiveView("totp");
    }

    // Strip params
    const url = new URL(window.location.href);
    [
      "action",
      "share-target",
      "title",
      "text",
      "url",
      "source",
    ].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState(
      {},
      "",
      url.pathname + (url.search ? url.search : "") + url.hash,
    );
  }, [vaultState, lockVault, setActiveView]);

  // Determine what to render in the main content area
  const renderContent = () => {
    // If locked/uninitialized, UnlockScreen is rendered at layout level
    if (vaultState !== "unlocked") return null;

    // Creating a new item
    if (creatingType) {
      const emptyItem = createEmptyItem(creatingType, shareDefaults ?? undefined);

      return (
        <div className="p-6">
          <button
            onClick={handleBack}
            className="text-text-muted hover:text-text-primary transition-colors mb-4 flex items-center gap-1 text-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back
          </button>
          <ItemEditor
            item={emptyItem}
            onSave={handleSaveNew}
            onCancel={handleCancelNew}
          />
        </div>
      );
    }

    // Viewing item detail
    if (selectedItemId) {
      return (
        <div className="p-6">
          <ItemDetail itemId={selectedItemId} onBack={handleBack} />
        </div>
      );
    }

    // View-specific pages
    switch (activeView) {
      case "dashboard":
        return (
          <div className="p-6">
            <Dashboard
              onSelectItem={handleSelectItem}
              onCreateItem={handleCreateItem}
            />
          </div>
        );
      case "login":
        return (
          <div className="p-6">
            <ItemList
              filterType="login"
              onSelectItem={handleSelectItem}
            />
          </div>
        );
      case "note":
        return (
          <div className="p-6">
            <ItemList
              filterType="note"
              onSelectItem={handleSelectItem}
            />
          </div>
        );
      case "card":
        return (
          <div className="p-6">
            <ItemList
              filterType="card"
              onSelectItem={handleSelectItem}
            />
          </div>
        );
      case "identity":
        return (
          <div className="p-6">
            <ItemList
              filterType="identity"
              onSelectItem={handleSelectItem}
            />
          </div>
        );
      case "import":
        return <ImportPage />;
      case "settings":
        return <SettingsPage />;
      case "emergency":
        return <EmergencyPage />;
      case "generator":
        return <GeneratorPage />;
      case "breach":
        return <BreachPage />;
      case "totp":
        return <TOTPPage />;
      case "wallet":
        return (
          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              <h1 className="text-2xl font-bold text-text-primary">Crypto Wallets</h1>
              <p className="text-sm text-text-muted mt-1">
                Manage your cryptocurrency wallet entries.
              </p>
              <div className="mt-8">
                <button
                  onClick={() => handleCreateItem("cryptocurrency")}
                  className="px-4 py-2 rounded-lg bg-accent text-text-inverse text-sm font-medium hover:bg-accent-hover transition-colors"
                >
                  Add Wallet Entry
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="p-6">
            <Dashboard
              onSelectItem={handleSelectItem}
              onCreateItem={handleCreateItem}
            />
          </div>
        );
    }
  };

  if (vaultState === "uninitialized" || vaultState === "locked" || vaultState === "unlocking" || vaultState === "error") {
    return (
      <main className="flex-1">
        <UnlockScreen />
      </main>
    );
  }

  const isInDetailMode = !!(selectedItemId || creatingType);

  return (
    <div className="flex min-h-dvh max-h-dvh overflow-hidden">
      <Sidebar />
      <main
        className={[
          "flex-1 overflow-y-auto bg-bg-primary",
          "px-[env(safe-area-inset-left)]",
          "pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-[env(safe-area-inset-bottom)]",
        ].join(" ")}
      >
        {renderContent()}
      </main>
      <BottomTabBar hidden={isInDetailMode} />
      <ToastContainer />
    </div>
  );
}

export default function VaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <VaultProvider>
      <VaultShell />
    </VaultProvider>
  );
}