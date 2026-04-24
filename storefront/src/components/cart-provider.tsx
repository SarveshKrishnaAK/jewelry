'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';

import { formatCurrency } from '@/lib/currency';
import type { CartEntry, Product } from '@/lib/types';

type CartLineItem = {
  product: Product;
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
  addItem: (productId: string, quantity?: number) => void;
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

function readStoredCart() {
  if (typeof window === 'undefined') {
    return emptyCart;
  }

  try {
    const storedCart = window.localStorage.getItem(STORAGE_KEY);
    return storedCart ? (JSON.parse(storedCart) as CartEntry[]) : emptyCart;
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

export function CartProvider({ children, initialProducts }: { children: ReactNode; initialProducts: Product[] }) {
  const productMap = useMemo(() => Object.fromEntries(initialProducts.map((product) => [product.id, product])), [initialProducts]);
  const items = useSyncExternalStore(subscribeToCart, getCartSnapshot, getServerCartSnapshot);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isCartOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isCartOpen]);

  const addItem = useCallback((productId: string, quantity = 1) => {
    updateStoredCart((currentItems) => {
      const safeQuantity = Math.max(1, Math.floor(quantity));
      const existingItem = currentItems.find((item) => item.productId === productId);

      if (existingItem) {
        return currentItems.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + safeQuantity } : item,
        );
      }

      return [...currentItems, { productId, quantity: safeQuantity }];
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
        const product = productMap[item.productId];
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
  }, [items, productMap]);

  const subtotal = useMemo(
    () => detailedItems.reduce((runningTotal, item) => runningTotal + item.lineTotal, 0),
    [detailedItems],
  );

  const itemCount = useMemo(
    () => detailedItems.reduce((runningTotal, item) => runningTotal + item.quantity, 0),
    [detailedItems],
  );

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
