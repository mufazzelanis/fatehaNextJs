// Client-safe Meta tracking types and constants.

export const EVENT_NAMES = ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase", "OrderDelivered", "OrderCancelled", "ReviewSubmitted"] as const;
export type EventName = (typeof EVENT_NAMES)[number];
/** Not one of Meta's standard events — sent with trackSingleCustom in the browser. */
export const CUSTOM_EVENTS: readonly EventName[] = ["OrderDelivered", "OrderCancelled", "ReviewSubmitted"];

export type PurchaseTrigger = "placed" | "confirmed" | "delivered";

/** What the browser is allowed to know — no tokens. */
export type PublicPixelConfig = {
  pixelIds: string[];
  /** Landing slug → the pixel IDs that page uses instead of the main site ones. */
  scopes: Record<string, string[]>;
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
  OrderDelivered: "Server only — when an order is marked Delivered (for audiences of real buyers)",
  OrderCancelled: "Server only — when an order is marked Cancelled (exclude fake / cancelled buyers)",
  ReviewSubmitted: "Custom — a customer sent a review on /reviews (browser + server, hashed phone & name; audiences of happy customers)",
};
