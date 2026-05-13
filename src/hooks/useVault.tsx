"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  VaultItem,
  VaultSettings,
  VaultState,
  ViewRoute,
  ItemType,
  GeneratorConfig,
} from "@/types";
import {
  createVault as vmCreateVault,
  openVault as vmOpenVault,
  lockVault as vmLockVault,
  saveVault as vmSaveVault,
  addItem as vmAddItem,
  updateItem as vmUpdateItem,
  deleteItem as vmDeleteItem,
  toggleFavorite as vmToggleFavorite,
  getItem as vmGetItem,
  searchItems as vmSearchItems,
  getItemsByType as vmGetItemsByType,
  getFavorites as vmGetFavorites,
  getItemCount as vmGetItemCount,
  getAllTags as vmGetAllTags,
  getItemsByTag as vmGetItemsByTag,
  getCountByType as vmGetCountByType,
  getSettings as vmGetSettings,
  updateSettings as vmUpdateSettings,
  isUnlocked,
  getVaultFilePath,
  VaultLockedError,
  VaultCorruptedError,
} from "@/lib/vault/vault-manager";
import { DecryptionError } from "@/lib/crypto";
import {
  startLockTimer,
  resetLockTimer as vmResetLockTimer,
  clearLockTimer,
} from "@/lib/vault/lock";
import { generatePassword } from "@/lib/generator";

// ── Context Shape ───────────────────────────────────────────────

export interface VaultContextValue {
  // State
  vaultState: VaultState;
  activeView: ViewRoute;
  items: VaultItem[];
  settings: VaultSettings | null;
  error: string | null;
  vaultFilePath: string | null;

  // Navigation
  setActiveView: (view: ViewRoute) => void;

  // Vault lifecycle
  createVault: (masterPassword: string, hint?: string) => Promise<void>;
  openVault: (masterPassword: string) => Promise<void>;
  lockVault: () => void;
  saveVault: () => Promise<void>;

  // Item CRUD
  addItem: (item: VaultItem) => VaultItem;
  updateItem: (id: string, updates: Partial<VaultItem>) => VaultItem;
  deleteItem: (id: string) => boolean;
  toggleFavorite: (id: string) => VaultItem | null;

  // Queries
  getItem: (id: string) => VaultItem | undefined;
  searchItems: (query: string, type?: ItemType, tag?: string, favoritesOnly?: boolean) => VaultItem[];
  getItemsByType: (type: ItemType) => VaultItem[];
  getFavorites: () => VaultItem[];
  getItemCount: () => number;
  getAllTags: () => Array<{ tag: string; count: number }>;
  getItemsByTag: (tag: string) => VaultItem[];
  getCountByType: (type: ItemType) => number;

  // Settings
  updateSettings: (updates: Partial<VaultSettings>) => void;

  // Utilities
  generatePassword: (config?: Partial<GeneratorConfig>) => string;
  resetLockTimer: () => void;

  // Refresh items from vault (after mutations)
  refreshItems: () => void;

  // Sidebar filter state
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (show: boolean) => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

// ── Provider ────────────────────────────────────────────────────

export function VaultProvider({ children }: { children: ReactNode }) {
  const [vaultState, setVaultState] = useState<VaultState>("uninitialized");
  const [activeView, setActiveView] = useState<ViewRoute>("dashboard");
  const [items, setItems] = useState<VaultItem[]>([]);
  const [settings, setSettings] = useState<VaultSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vaultFilePath, setVaultFilePath] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Keep a ref to avoid stale closures in the lock timer callback
  const stateRef = useRef({ vaultState, error });
  stateRef.current = { vaultState, error };

  const refreshItems = useCallback(() => {
    try {
      if (!isUnlocked()) return;
      const vault = vmGetSettings(); // just to check unlocked
      setItems(vault ? [] : []); // dummy: we directly use getItems below
      // Actually, let's get all items directly
      try {
        const allItems = vmGetItemsByType("login")
          .concat(vmGetItemsByType("note"))
          .concat(vmGetItemsByType("card"))
          .concat(vmGetItemsByType("identity"))
          .concat(vmGetItemsByType("secure-note"))
          .concat(vmGetItemsByType("cryptocurrency"));
        setItems(allItems);
        setSettings(vmGetSettings());
        setVaultFilePath(getVaultFilePath());
      } catch {
        // vault might be locked
      }
    } catch {
      // vault locked
    }
  }, []);

  const handleLock = useCallback(() => {
    vmLockVault();
    setVaultState("locked");
    setItems([]);
    setSettings(null);
    setError(null);
    setActiveView("dashboard");
    clearLockTimer();
  }, []);

  const createVault = useCallback(
    async (masterPassword: string, hint?: string) => {
      setVaultState("unlocking");
      setError(null);
      try {
        await vmCreateVault(masterPassword, hint ? { masterPasswordHint: hint } : undefined);
        const allItems = vmGetItemsByType("login")
          .concat(vmGetItemsByType("note"))
          .concat(vmGetItemsByType("card"))
          .concat(vmGetItemsByType("identity"))
          .concat(vmGetItemsByType("secure-note"))
          .concat(vmGetItemsByType("cryptocurrency"));
        setItems(allItems);
        const s = vmGetSettings();
        setSettings(s);
        setVaultFilePath(getVaultFilePath());
        setVaultState("unlocked");
        setActiveView("dashboard");
        startLockTimer(s.lockTimeoutMinutes, handleLock);
      } catch (err) {
        setVaultState("error");
        setError(err instanceof Error ? err.message : "Failed to create vault");
      }
    },
    [handleLock],
  );

  const openVault = useCallback(
    async (masterPassword: string) => {
      setVaultState("unlocking");
      setError(null);
      try {
        await vmOpenVault(masterPassword);
        const allItems = vmGetItemsByType("login")
          .concat(vmGetItemsByType("note"))
          .concat(vmGetItemsByType("card"))
          .concat(vmGetItemsByType("identity"))
          .concat(vmGetItemsByType("secure-note"))
          .concat(vmGetItemsByType("cryptocurrency"));
        setItems(allItems);
        const s = vmGetSettings();
        setSettings(s);
        setVaultFilePath(getVaultFilePath());
        setVaultState("unlocked");
        setActiveView("dashboard");
        startLockTimer(s.lockTimeoutMinutes, handleLock);
      } catch (err) {
        setVaultState("error");
        if (err instanceof DecryptionError) {
          setError("Incorrect master password. Please try again.");
        } else if (err instanceof VaultCorruptedError) {
          setError(err.message);
        } else {
          setError(err instanceof Error ? err.message : "Failed to open vault");
        }
      }
    },
    [handleLock],
  );

  const lockVault = useCallback(() => {
    handleLock();
  }, [handleLock]);

  const saveVault = useCallback(async () => {
    try {
      await vmSaveVault();
      refreshItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save vault");
    }
  }, [refreshItems]);

  const addItem = useCallback(
    (item: VaultItem): VaultItem => {
      try {
        const result = vmAddItem(item);
        setItems((prev) => [...prev, result.item]);
        return result.item;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add item");
        throw err;
      }
    },
    [],
  );

  const updateItem = useCallback(
    (id: string, updates: Partial<VaultItem>): VaultItem => {
      try {
        const result = vmUpdateItem(id, updates);
        setItems((prev) => prev.map((i) => (i.id === id ? result : i)));
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update item");
        throw err;
      }
    },
    [],
  );

  const deleteItem = useCallback((id: string): boolean => {
    try {
      const result = vmDeleteItem(id);
      if (result) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
      return false;
    }
  }, []);

  const toggleFavorite = useCallback((id: string): VaultItem | null => {
    try {
      const result = vmToggleFavorite(id);
      if (result) {
        setItems((prev) => prev.map((i) => (i.id === id ? result : i)));
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle favorite");
      return null;
    }
  }, []);

  const getItem = useCallback((id: string): VaultItem | undefined => {
    try {
      return vmGetItem(id);
    } catch {
      return undefined;
    }
  }, []);

  const searchItems = useCallback((query: string, type?: ItemType, tag?: string, favoritesOnly?: boolean): VaultItem[] => {
    try {
      return vmSearchItems(query, type, tag, favoritesOnly);
    } catch {
      return [];
    }
  }, []);

  const getItemsByType = useCallback((type: ItemType): VaultItem[] => {
    try {
      return vmGetItemsByType(type);
    } catch {
      return [];
    }
  }, []);

  const getFavorites = useCallback((): VaultItem[] => {
    try {
      return vmGetFavorites();
    } catch {
      return [];
    }
  }, []);

  const getItemCount = useCallback((): number => {
    try {
      return vmGetItemCount();
    } catch {
      return 0;
    }
  }, []);

  const getAllTags = useCallback((): Array<{ tag: string; count: number }> => {
    try {
      return vmGetAllTags();
    } catch {
      return [];
    }
  }, []);

  const getItemsByTag = useCallback((tag: string): VaultItem[] => {
    try {
      return vmGetItemsByTag(tag);
    } catch {
      return [];
    }
  }, []);

  const getCountByType = useCallback((type: ItemType): number => {
    try {
      return vmGetCountByType(type);
    } catch {
      return 0;
    }
  }, []);

  const updateSettingsFn = useCallback((updates: Partial<VaultSettings>) => {
    try {
      vmUpdateSettings(updates);
      setSettings(vmGetSettings());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update settings");
    }
  }, []);

  const resetLockTimer = useCallback(() => {
    vmResetLockTimer();
  }, []);

  const genPassword = useCallback((config?: Partial<GeneratorConfig>): string => {
    return generatePassword(config ?? {});
  }, []);

  // Activity listener resets lock timer
  useEffect(() => {
    const onActivity = () => {
      if (stateRef.current.vaultState === "unlocked") {
        vmResetLockTimer();
      }
    };

    const events: Array<keyof HTMLElementEventMap> = [
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];
    events.forEach((evt) => document.addEventListener(evt, onActivity, { passive: true }));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        onActivity();
      }
    });

    return () => {
      events.forEach((evt) => document.removeEventListener(evt, onActivity));
      document.removeEventListener("visibilitychange", onActivity);
    };
  }, []);

  const value = useMemo<VaultContextValue>(
    () => ({
      vaultState,
      activeView,
      items,
      settings,
      error,
      vaultFilePath,
      setActiveView,
      createVault,
      openVault,
      lockVault,
      saveVault,
      addItem,
      updateItem,
      deleteItem,
      toggleFavorite,
      getItem,
      searchItems,
      getItemsByType,
      getFavorites,
      getItemCount,
      getAllTags,
      getItemsByTag,
      getCountByType,
      updateSettings: updateSettingsFn,
      generatePassword: genPassword,
      resetLockTimer,
      refreshItems,
      selectedTag,
      setSelectedTag,
      showFavoritesOnly,
      setShowFavoritesOnly,
    }),
    [
      vaultState,
      activeView,
      items,
      settings,
      error,
      vaultFilePath,
      createVault,
      openVault,
      lockVault,
      saveVault,
      addItem,
      updateItem,
      deleteItem,
      toggleFavorite,
      getItem,
      searchItems,
      getItemsByType,
      getFavorites,
      getItemCount,
      getAllTags,
      getItemsByTag,
      getCountByType,
      updateSettingsFn,
      genPassword,
      resetLockTimer,
      refreshItems,
      selectedTag,
      showFavoritesOnly,
    ],
  );

  return (
    <VaultContext.Provider value={value}>
      {children}
    </VaultContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────────

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) {
    throw new Error("useVault must be used within a VaultProvider");
  }
  return ctx;
}

export default useVault;
