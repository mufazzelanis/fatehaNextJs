"use server";

import { after } from "next/server";
import { getCustomer } from "@/lib/auth";
import { getMarketingConfig } from "@/lib/meta/config";
import { customerUserData, sendServerEvents, type UserData } from "@/lib/meta/capi";
import { requestUserData } from "@/lib/meta/request";
import { query } from "@/lib/db";

const ALLOWED = ["PageView", "ViewContent", "InitiateCheckout", "AddToCart"] as const;
type BrowserEvent = (typeof ALLOWED)[number];

/**
 * Server half of a browser event: the browser fires the pixel with `eventId`, this sends the same
 * event through the Conversions API so Meta can deduplicate them. Values come from the database,
 * never from the browser.
 */
export async function trackServerEvent(input: { name: string; eventId: string; url: string; quantity?: number; items?: { id: number; qty: number }[] }) {
  if (!(ALLOWED as readonly string[]).includes(input.name)) return;
  if (!/^[\w-]{8,80}$/.test(input.eventId)) return;
  const config = await getMarketingConfig();
  const name = input.name as BrowserEvent;
  if (!config.capiEnabled || !config.events[name]) return;
  if (name === "PageView" && !config.serverPageView) return;

  let url: string | undefined;
  try {
    const parsed = new URL(input.url);
    url = `${parsed.origin}${parsed.pathname}${parsed.search}`.slice(0, 500);
  } catch {}

  const [user, customer] = await Promise.all([requestUserData(), getCustomer()]);
  // Logged-in customers get advanced matching too.
  const userData: UserData = customer ? { ...customerUserData({ phone: customer.phone, name: customer.name }), ...user } : user;

  let customData: Record<string, unknown> | undefined;
  const requested = (input.items ?? [])
    .map((i) => ({ id: Math.trunc(Number(i.id)), qty: Math.min(Math.max(Math.trunc(Number(i.qty) || 1), 1), 20) }))
    .filter((i) => i.id > 0)
    .slice(0, 50);
  if (name !== "PageView" && requested.length) {
    // Storefront: values for exactly the products/quantities in the event, priced from the database.
    const rows = await query<{ id: number; name: string; price: number }>(
      `SELECT id, name, price FROM products WHERE is_active = 1 AND id IN (${requested.map(() => "?").join(",")})`,
      requested.map((i) => i.id),
    );
    const lines = requested.flatMap((r) => {
      const p = rows.find((x) => x.id === r.id);
      return p ? [{ id: String(p.id), quantity: r.qty, item_price: Number(p.price), name: p.name }] : [];
    });
    if (lines.length) {
      customData = {
        currency: "BDT",
        value: lines.reduce((s, l) => s + l.item_price * l.quantity, 0),
        content_type: "product",
        content_ids: lines.map((l) => l.id),
        content_name: lines.length === 1 ? lines[0].name : undefined,
        contents: lines.map(({ id, quantity, item_price }) => ({ id, quantity, item_price })),
        num_items: lines.reduce((s, l) => s + l.quantity, 0),
      };
    }
  }

  // Respond to the browser immediately; talk to Meta afterwards.
  after(() =>
    sendServerEvents([{ event_name: name, event_id: input.eventId, event_source_url: url, user_data: userData, custom_data: customData }]),
  );
}
