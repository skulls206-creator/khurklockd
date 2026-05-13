"use client";

import { useCallback, useState } from "react";
import { VaultProvider, useVault } from "@/hooks/useVault";
import { UnlockScreen } from "@/components/vault/UnlockScreen";
import { Sidebar } from "@/components/vault/Sidebar";
import { Dashboard } from "@/components/vault/Dashboard";
import { ItemList } from "@/components/vault/ItemList";
import { ItemDetail } from "@/components/vault/ItemDetail";
import { ItemEditor } from "@/components/vault/ItemEditor";
import { ToastContainer } from "@/components/ui/Toast";
import { ImportPage } from "@/components/vault/ImportPage";
import SettingsPage from "./settings/page";
import EmergencyPage from "./emergency/page";
import GeneratorPage from "./generator/page";
import BreachPage from "./breach/page";
import TOTPPage from "./totp/page";
import type { VaultItem, ItemType, ViewRoute } from "@/types";

function VaultShell() {
  const {
    vaultState,
    activeView,
    setActiveView,
    addItem,
    saveVault,
    items,
  } = useVault();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [creatingType, setCreatingType] = useState<ItemType | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

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
    },
    [addItem, saveVault],
  );

  const handleCancelNew = useCallback(() => {
    setCreatingType(null);
  }, []);

  // Determine what to render in the main content area
  const renderContent = () => {
    // If locked/uninitialized, UnlockScreen is rendered at layout level
    if (vaultState !== "unlocked") return null;

    // Creating a new item
    if (creatingType) {
      const emptyItem: VaultItem = {
        id: "",
        type: creatingType,
        name: "",
        favorite: false,
        tags: [],
        createdAt: "",
        updatedAt: "",
      } as unknown as VaultItem;

      // Fill in type-specific defaults
      if (creatingType === "login") {
        const li = emptyItem as unknown as { username: string; password: string };
        li.username = "";
        li.password = "";
      } else if (creatingType === "note") {
        const ni = emptyItem as unknown as { content: string };
        ni.content = "";
      } else if (creatingType === "card") {
        Object.assign(emptyItem as unknown as Record<string, string>, {
          cardholderName: "",
          number: "",
          expiryMonth: "",
          expiryYear: "",
          cvv: "",
        });
      } else if (creatingType === "identity") {
        Object.assign(emptyItem as unknown as Record<string, string>, {
          firstName: "",
          lastName: "",
        });
      }

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
                  onClick={handleCreateItem("cryptocurrency")}
                  className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors"
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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-bg-primary">
        {renderContent()}
      </main>
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
