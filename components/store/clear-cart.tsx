"use client";

import { useEffect } from "react";
import { clearCart } from "./cart-store";

/** Empties the cart once an order has been placed. */
export function ClearCart() {
  useEffect(() => { clearCart(); }, []);
  return null;
}
