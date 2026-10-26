"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { initPixel, track, type PixelSetup } from "@/lib/meta/pixel-client";

/** Loads the pixel once and sends a PageView (browser + server) on every public page navigation. */
export function MetaPixel({ config }: { config: PixelSetup }) {
  const pathname = usePathname();
  const last = useRef<string | null>(null);
  const tracked = !pathname.startsWith("/admin");

  useEffect(() => {
    if (!tracked || last.current === pathname) return;
    initPixel(config);
    last.current = pathname;
    track("PageView");
  }, [pathname, tracked, config]);

  return null;
}

/** Fires ViewContent once when the product landing page is shown. */
export function ViewContentEvent({ product }: { product: { id: number; name: string; price: number } }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track("ViewContent", {
      content_ids: [String(product.id)],
      content_name: product.name,
      content_type: "product",
      value: product.price,
      currency: "BDT",
    }, { items: [{ id: product.id, qty: 1 }] });
  }, [product]);
  return null;
}

/**
 * Browser Purchase on the thank-you page. Uses the same event ID as the server Purchase
 * (sent when the order is saved), so Meta deduplicates the pair. Fires once per order per browser.
 */
export function PurchaseEvent({ order }: {
  order: { orderNo: string; value: number; contentIds: string[]; numItems: number; eventId: string };
}) {
  useEffect(() => {
    const key = `fb_purchase_${order.orderNo}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {}
    track(
      "Purchase",
      { value: order.value, currency: "BDT", content_ids: order.contentIds, content_type: "product", num_items: order.numItems, order_id: order.orderNo },
      { eventId: order.eventId, serverSide: false },
    );
  }, [order]);
  return null;
}
