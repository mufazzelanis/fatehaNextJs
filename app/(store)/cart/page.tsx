import type { Metadata } from "next";
import { getStoreConfig } from "@/lib/data/catalog";
import { CartView } from "@/components/store/cart-page";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };

export default async function CartPage() {
  const cfg = await getStoreConfig();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Shopping cart</h1>
      <CartView freeDeliveryOver={cfg.freeDeliveryOver} />
    </div>
  );
}
