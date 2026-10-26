"use client";

import { useSyncExternalStore } from "react";

// Cart, wishlist and drawer state live in localStorage and stay in sync across tabs.
// Prices here are only for display — checkout re-reads every price and stock from the database.

export type CartItem = { id: number; slug: string; name: string; price: number; image: string; stock: number; qty: number };
export type WishItem = Omit<CartItem, "qty" | "stock">;

const CART_KEY = "fb_cart_v1";
const WISH_KEY = "fb_wish_v1";
const MAX_QTY = 20;

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());
function subscribe(l: Listener) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === CART_KEY || e.key === WISH_KEY) { cache.clear(); l(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
}

const cache = new Map<string, unknown>();
function read<T>(key: string): T[] {
  if (cache.has(key)) return cache.get(key) as T[];
  let value: T[] = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (Array.isArray(parsed)) value = parsed;
  } catch {}
  cache.set(key, value);
  return value;
}
function write<T>(key: string, value: T[]) {
  cache.set(key, value);
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  emit();
}

const EMPTY: never[] = [];

export function useCart() {
  const items = useSyncExternalStore(subscribe, () => read<CartItem>(CART_KEY), () => EMPTY as CartItem[]);
  return {
    items,
    count: items.reduce((s, i) => s + i.qty, 0),
    subtotal: items.reduce((s, i) => s + i.qty * i.price, 0),
  };
}

export function addToCart(item: Omit<CartItem, "qty">, qty = 1) {
  const items = read<CartItem>(CART_KEY);
  const existing = items.find((i) => i.id === item.id);
  const limit = Math.max(Math.min(item.stock, MAX_QTY), 1);
  const next = existing
    ? items.map((i) => (i.id === item.id ? { ...i, ...item, qty: Math.min(i.qty + qty, limit) } : i))
    : [...items, { ...item, qty: Math.min(qty, limit) }];
  write(CART_KEY, next);
  openDrawer();
}

export function setQty(id: number, qty: number) {
  const items = read<CartItem>(CART_KEY);
  write(CART_KEY, items.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(qty, Math.max(Math.min(i.stock, MAX_QTY), 1))) } : i)));
}

export function removeFromCart(id: number) {
  write(CART_KEY, read<CartItem>(CART_KEY).filter((i) => i.id !== id));
}

/** Replace prices/stock with fresh server values (after a quote). Drops items no longer sold. */
export function syncCart(fresh: { id: number; price: number; stock: number; name: string }[]) {
  const map = new Map(fresh.map((f) => [f.id, f]));
  write(CART_KEY, read<CartItem>(CART_KEY).filter((i) => map.has(i.id)).map((i) => {
    const f = map.get(i.id)!;
    return { ...i, price: f.price, stock: f.stock, name: f.name, qty: Math.max(1, Math.min(i.qty, Math.max(f.stock, 1))) };
  }));
}

export function clearCart() {
  write(CART_KEY, []);
}

export function useWishlist() {
  return useSyncExternalStore(subscribe, () => read<WishItem>(WISH_KEY), () => EMPTY as WishItem[]);
}

export function toggleWish(item: WishItem) {
  const list = read<WishItem>(WISH_KEY);
  write(WISH_KEY, list.some((w) => w.id === item.id) ? list.filter((w) => w.id !== item.id) : [item, ...list].slice(0, 100));
}

// Cart drawer open/closed (not persisted)
let drawerOpen = false;
const drawerListeners = new Set<Listener>();
export function openDrawer() { drawerOpen = true; drawerListeners.forEach((l) => l()); }
export function closeDrawer() { drawerOpen = false; drawerListeners.forEach((l) => l()); }
export function useDrawer() {
  return useSyncExternalStore(
    (l) => { drawerListeners.add(l); return () => drawerListeners.delete(l); },
    () => drawerOpen,
    () => false,
  );
}
