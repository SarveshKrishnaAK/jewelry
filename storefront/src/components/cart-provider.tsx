'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';

import { formatCurrency } from '@/lib/currency';
import type { CartEntry, CartProductSnapshot } from '@/lib/types';

type CartLineItem = {
  product: CartProductSnapshot;
  quantity: number;
  lineTotal: number;
};

type CartContextValue = {
  items: CartEntry[];
  detailedItems: CartLineItem[];
  itemCount: number;
  subtotal: number;
  subtotalLabel: string;
  isCartOpen: boolean;
  addItem: (product: CartProductSnapshot, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
};

const STORAGE_KEY = 'aurum-coverings-cart';
const emptyCart: CartEntry[] = [];
const CartContext = createContext<CartContextValue | null>(null);

let cartSnapshot: CartEntry[] = emptyCart;
const cartListeners = new Set<() => void>();

function normalizeStoredCart(payload: unknown): CartEntry[] {
  if (!Array.isArray(payload)) {
    return emptyCart;
  }

  return payload.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const cartEntry = entry as Partial<CartEntry>;
    const quantity = Number(cartEntry.quantity ?? 0);

    if (typeof cartEntry.productId !== 'string' || !Number.isFinite(quantity) || quantity <= 0) {
      return [];
    }

    const productSnapshot =
      cartEntry.productSnapshot && typeof cartEntry.productSnapshot === 'object'
        ? (cartEntry.productSnapshot as CartProductSnapshot)
        : undefined;

    return [
      {
        productId: cartEntry.productId,
        quantity: Math.min(10, Math.floor(quantity)),
        productSnapshot,
      } satisfies CartEntry,
    ];
  });
}

function readStoredCart() {
  if (typeof window === 'undefined') {
    return emptyCart;
  }

  try {
    const storedCart = window.localStorage.getItem(STORAGE_KEY);
    return storedCart ? normalizeStoredCart(JSON.parse(storedCart)) : emptyCart;
  } catch {
    return emptyCart;
  }
}

function emitCartChange() {
  for (const listener of cartListeners) {
    listener();
  }
}

function getCartSnapshot() {
  if (typeof window === 'undefined') {
    return emptyCart;
  }

  if (cartSnapshot === emptyCart) {
    cartSnapshot = readStoredCart();
  }

  return cartSnapshot;
}

function getServerCartSnapshot() {
  return emptyCart;
}

function subscribeToCart(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  cartListeners.add(callback);

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) {
      return;
    }

    cartSnapshot = readStoredCart();
    callback();
  };

  window.addEventListener('storage', handleStorage);

  return () => {
    cartListeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
  };
}

function updateStoredCart(updater: (items: CartEntry[]) => CartEntry[]) {
  const nextItems = updater(getCartSnapshot());
  cartSnapshot = nextItems;

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
  }

  emitCartChange();
}

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribeToCart, getCartSnapshot, getServerCartSnapshot);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [productSnapshots, setProductSnapshots] = useState<Record<string, CartProductSnapshot>>({});

  useEffect(() => {
    document.body.style.overflow = isCartOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isCartOpen]);

  useEffect(() => {
    const nextSnapshots = items.reduce<Record<string, CartProductSnapshot>>((accumulator, item) => {
      if (item.productSnapshot) {
        accumulator[item.productId] = item.productSnapshot;
      }

      return accumulator;
    }, {});

    if (Object.keys(nextSnapshots).length === 0) {
      return;
    }

    setProductSnapshots((currentSnapshots) => ({ ...currentSnapshots, ...nextSnapshots }));
  }, [items]);

  const missingProductIds = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .filter((item) => !item.productSnapshot && !productSnapshots[item.productId])
            .map((item) => item.productId),
        ),
      ),
    [items, productSnapshots],
  );

  useEffect(() => {
    if (missingProductIds.length === 0) {
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams();

    for (const id of missingProductIds) {
      params.append('ids', id);
    }

    void (async () => {
      try {
        const response = await fetch(`/api/cart/products?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { products?: CartProductSnapshot[] };
        const fetchedProducts = data.products ?? [];

        if (cancelled || fetchedProducts.length === 0) {
          return;
        }

        const snapshotMap = Object.fromEntries(fetchedProducts.map((product) => [product.id, product]));
        setProductSnapshots((currentSnapshots) => ({ ...currentSnapshots, ...snapshotMap }));

        updateStoredCart((currentItems) =>
          currentItems.map((item) => ({
            ...item,
            productSnapshot: item.productSnapshot ?? snapshotMap[item.productId],
          })),
        );
      } catch {
        // Ignore cart product hydration errors and keep the cart usable with future snapshots.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [missingProductIds]);

  const addItem = useCallback((product: CartProductSnapshot, quantity = 1) => {
    updateStoredCart((currentItems) => {
      const safeQuantity = Math.max(1, Math.floor(quantity));
      const existingItem = currentItems.find((item) => item.productId === product.id);

      if (existingItem) {
        return currentItems.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                productSnapshot: item.productSnapshot ?? product,
                quantity: Math.min(10, item.quantity + safeQuantity),
              }
            : item,
        );
      }

      return [
        ...currentItems,
        {
          productId: product.id,
          quantity: Math.min(10, safeQuantity),
          productSnapshot: product,
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    updateStoredCart((currentItems) => {
      if (quantity <= 0) {
        return currentItems.filter((item) => item.productId !== productId);
      }

      return currentItems.map((item) =>
        item.productId === productId ? { ...item, quantity: Math.min(10, Math.floor(quantity)) } : item,
      );
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    updateStoredCart((currentItems) => currentItems.filter((item) => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    updateStoredCart(() => []);
  }, []);

  const detailedItems = useMemo(() => {
    return items
      .map((item) => {
        const product = item.productSnapshot ?? productSnapshots[item.productId];
        if (!product) {
          return null;
        }

        return {
          product,
          quantity: item.quantity,
          lineTotal: product.price * item.quantity,
        } satisfies CartLineItem;
      })
      .filter((item): item is CartLineItem => item !== null);
  }, [items, productSnapshots]);

  const subtotal = useMemo(
    () => detailedItems.reduce((runningTotal, item) => runningTotal + item.lineTotal, 0),
    [detailedItems],
  );

  const itemCount = useMemo(() => items.reduce((runningTotal, item) => runningTotal + item.quantity, 0), [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      detailedItems,
      itemCount,
      subtotal,
      subtotalLabel: formatCurrency(subtotal),
      isCartOpen,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      openCart: () => setIsCartOpen(true),
      closeCart: () => setIsCartOpen(false),
    }),
    [addItem, clearCart, detailedItems, isCartOpen, itemCount, items, removeItem, subtotal, updateQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within a CartProvider.');
  }

  return context;
}
