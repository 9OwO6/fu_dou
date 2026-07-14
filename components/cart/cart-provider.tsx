"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  CART_SCHEMA_VERSION,
  CART_STORAGE_KEY,
  MAX_ITEM_QUANTITY,
  parseStoredCart,
  type StoredCartItem,
} from "@/lib/cart/schema";

type CartContextValue = {
  items: StoredCartItem[];
  itemCount: number;
  hydrated: boolean;
  recoveredFromInvalidStorage: boolean;
  addItem: (variantId: string, quantity?: number) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  saveValidatedPrice: (variantId: string, priceCad: number) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<StoredCartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [recoveredFromInvalidStorage, setRecovered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const parsed = parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY));
        setItems(parsed.cart.items);
        setRecovered(parsed.recovered);
      } catch {
        setItems([]);
        setRecovered(true);
      }
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: CART_SCHEMA_VERSION, items }));
    } catch {
      // Storage may be blocked or full; keep the in-memory cart usable for this page session.
    }
  }, [hydrated, items]);

  const addItem = useCallback((variantId: string, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((item) => item.variantId === variantId);
      if (!existing) return [...current, { variantId, quantity: Math.min(Math.max(1, quantity), MAX_ITEM_QUANTITY) }];
      return current.map((item) => item.variantId === variantId
        ? { ...item, quantity: Math.min(item.quantity + Math.max(1, quantity), MAX_ITEM_QUANTITY) }
        : item);
    });
  }, []);

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity < 1) return;
    setItems((current) => current.map((item) => item.variantId === variantId
      ? { ...item, quantity: Math.min(quantity, MAX_ITEM_QUANTITY) }
      : item));
  }, []);
  const removeItem = useCallback((variantId: string) => setItems((current) => current.filter((item) => item.variantId !== variantId)), []);
  const clearCart = useCallback(() => setItems([]), []);
  const saveValidatedPrice = useCallback((variantId: string, priceCad: number) => {
    setItems((current) => current.map((item) => item.variantId === variantId && item.lastValidatedPriceCad !== priceCad
      ? { ...item, lastValidatedPriceCad: priceCad }
      : item));
  }, []);

  const value = useMemo(() => ({
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    hydrated,
    recoveredFromInvalidStorage,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    saveValidatedPrice,
  }), [items, hydrated, recoveredFromInvalidStorage, addItem, updateQuantity, removeItem, clearCart, saveValidatedPrice]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart 必须在 CartProvider 内使用。");
  return context;
}
