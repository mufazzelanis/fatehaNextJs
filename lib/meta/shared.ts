// Client-safe Meta tracking types and constants.

export const EVENT_NAMES = ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"] as const;
export type EventName = (typeof EVENT_NAMES)[number];

export type PurchaseTrigger = "placed" | "confirmed" | "delivered";

/** What the browser is allowed to know — no tokens. */
export type PublicPixelConfig = {
  pixelIds: string[];
  browser: boolean;
  capi: boolean;
  serverPageView: boolean;
  purchaseTrigger: PurchaseTrigger;
  events: Record<EventName, boolean>;
};

export const EVENT_INFO: Record<EventName, string> = {
  PageView: "Every public page",
  ViewContent: "Landing page with product & price",
  AddToCart: "Quantity increased in the order form",
  InitiateCheckout: "First click in the order form",
  Purchase: "Order — value, order ID, hashed phone & name",
};
