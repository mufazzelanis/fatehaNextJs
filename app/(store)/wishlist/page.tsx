import type { Metadata } from "next";
import { WishlistView } from "@/components/store/cart-page";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

export default function WishlistPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-ink sm:text-3xl">My wishlist</h1>
      <WishlistView />
    </div>
  );
}
