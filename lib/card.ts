// Shapes a catalog product for client product cards (client-safe).
import type { CardProduct } from "@/components/store/product-card";

type Source = {
  id: number; slug: string; name: string; price: number; regular_price: number | null;
  image: string | null; stock: number; brand: string | null; category_name: string | null;
};

export function toCard(p: Source): CardProduct {
  return {
    id: p.id, slug: p.slug, name: p.name, price: Number(p.price), regular_price: p.regular_price === null ? null : Number(p.regular_price),
    image: p.image ? `/media/${p.image}` : "/product-jar.svg", stock: p.stock, brand: p.brand, category_name: p.category_name,
  };
}
