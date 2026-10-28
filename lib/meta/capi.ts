import "server-only";
import { createHash } from "node:crypto";
import { execute, query, queryOne } from "../db";
import { getMarketingConfig, type MarketingConfig, type PixelEntry } from "./config";
import type { EventName } from "./shared";

/** Hashed and raw user parameters accepted by the Conversions API. */
export type UserData = {
  ph?: string[];
  fn?: string[];
  ln?: string[];
  country?: string[];
  external_id?: string[];
  client_ip_address?: string;
  client_user_agent?: string;
  fbp?: string;
  fbc?: string;
};

export type ServerEvent = {
  event_name: EventName | string;
  event_id: string;
  event_time?: number;
  event_source_url?: string;
  action_source?: "website";
  user_data: UserData;
  custom_data?: Record<string, unknown>;
};

export type SendResult = { ok: boolean; status: number | null; message: string };

export function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/** "01712345678" → "8801712345678" (E.164 without +), as Meta expects before hashing. */
export function phoneForMeta(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("880") ? digits : `88${digits}`;
}

/** Builds hashed customer parameters. Bangla names are kept as-is (lower-cased) before hashing. */
export function customerUserData(input: { phone?: string | null; name?: string | null }): UserData {
  const data: UserData = { country: [sha256("bd")] };
  if (input.phone) {
    const ph = phoneForMeta(input.phone);
    data.ph = [sha256(ph)];
    data.external_id = [sha256(ph)];
  }
  const parts = (input.name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length) {
    data.fn = [sha256(parts[0])];
    if (parts.length > 1) data.ln = [sha256(parts[parts.length - 1])];
  }
  return data;
}

type GraphError = { message?: string; error_user_msg?: string; code?: number };

/** One POST to one pixel. Retries once on network errors and 5xx/429 responses. */
async function postToPixel(config: MarketingConfig, pixel: PixelEntry, data: object[], testCode: string): Promise<SendResult> {
  const body: Record<string, unknown> = { data };
  if (testCode) body.test_event_code = testCode;
  const url = `https://graph.facebook.com/${config.apiVersion}/${pixel.id}/events?access_token=${encodeURIComponent(pixel.token)}`;

  let last: SendResult = { ok: false, status: null, message: "Not sent" };
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 800));
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as { events_received?: number; fbtrace_id?: string; error?: GraphError };
      last = res.ok
        ? { ok: true, status: res.status, message: `Received: ${json.events_received ?? 0}${json.fbtrace_id ? ` · trace ${json.fbtrace_id}` : ""}` }
        : { ok: false, status: res.status, message: json.error?.error_user_msg || json.error?.message || `HTTP ${res.status}` };
      if (res.ok || (res.status < 500 && res.status !== 429)) return last;
    } catch (error) {
      last = { ok: false, status: null, message: error instanceof Error ? error.message : "Network error" };
    }
  }
  return last;
}

async function logEvent(e: ServerEvent, pixelId: string, result: SendResult, opts: { orderId?: number; isTest: boolean }) {
  try {
    await execute(
      `INSERT INTO pixel_event_log (event_name, event_id, order_id, pixel_id, success, http_status, is_test, response, payload, client_ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [e.event_name, e.event_id.slice(0, 100), opts.orderId ?? null, pixelId, result.ok ? 1 : 0, result.status,
       opts.isTest ? 1 : 0, result.message.slice(0, 1000), result.ok ? null : JSON.stringify(e), e.user_data?.client_ip_address?.slice(0, 64) ?? null],
    );
  } catch (error) {
    console.error("pixel log failed", error);
  }
}

/** Sends events to every configured pixel and logs each delivery. Never throws. */
export async function sendServerEvents(events: ServerEvent[], opts: { orderId?: number; testCode?: string } = {}): Promise<SendResult> {
  const config = await getMarketingConfig();
  const pixels = config.pixels.filter((p) => p.token);
  const wanted = events.filter((e) => config.events[e.event_name as EventName] !== false);
  if (!config.capiEnabled || !pixels.length || !wanted.length) {
    return { ok: false, status: null, message: "Conversions API is disabled for this event" };
  }

  const testCode = opts.testCode ?? config.testEventCode;
  const now = Math.floor(Date.now() / 1000);
  const data: ServerEvent[] = wanted.map((e) => ({ action_source: "website" as const, event_time: now, ...e }));

  const results = await Promise.all(pixels.map((pixel) => postToPixel(config, pixel, data, testCode)));
  for (const [i, pixel] of pixels.entries()) {
    for (const e of data) await logEvent(e, pixel.id, results[i], { orderId: opts.orderId, isTest: !!testCode });
  }
  if (Math.random() < 0.02) {
    await execute("DELETE FROM pixel_event_log WHERE created_at < NOW() - INTERVAL 30 DAY").catch(() => {});
  }

  const failed = results.filter((r) => !r.ok);
  for (const r of failed) console.warn(`[meta capi] ${wanted.map((e) => e.event_name).join(",")} failed: ${r.message}`);
  if (!failed.length) return results[0];
  return {
    ok: false,
    status: failed[0].status,
    message: pixels.length > 1 ? `${pixels.length - failed.length}/${pixels.length} pixels accepted · ${failed[0].message}` : failed[0].message,
  };
}

/** Re-sends failed events (last 7 days — Meta rejects older event times) with their original payload. */
export async function retryFailedEvents(): Promise<{ retried: number; succeeded: number }> {
  const config = await getMarketingConfig();
  if (!config.capiEnabled) return { retried: 0, succeeded: 0 };
  const rows = await query<{ id: number; pixel_id: string; payload: string; order_id: number | null; is_test: number }>(
    `SELECT id, pixel_id, payload, order_id, is_test FROM pixel_event_log
     WHERE success = 0 AND retried = 0 AND payload IS NOT NULL AND created_at >= NOW() - INTERVAL 7 DAY
     ORDER BY id LIMIT 200`,
  );
  let succeeded = 0;
  for (const row of rows) {
    const pixel = config.pixels.find((p) => p.id === row.pixel_id && p.token);
    await execute("UPDATE pixel_event_log SET retried = 1 WHERE id = ?", [row.id]);
    if (!pixel) continue;
    let event: ServerEvent;
    try {
      event = JSON.parse(row.payload);
    } catch {
      continue;
    }
    const testCode = row.is_test ? config.testEventCode : "";
    const result = await postToPixel(config, pixel, [event], testCode);
    await logEvent(event, pixel.id, result, { orderId: row.order_id ?? undefined, isTest: !!testCode });
    if (result.ok) {
      succeeded++;
      if (event.event_name === "Purchase" && row.order_id) {
        await execute("UPDATE orders SET pixel_purchase_sent_at = NOW() WHERE id = ? AND pixel_purchase_sent_at IS NULL", [row.order_id]);
      }
    }
  }
  return { retried: rows.length, succeeded };
}

export type PixelCheck = { id: string; label: string; ok: boolean; name?: string; lastFired?: string | null; message: string };

/** Asks the Graph API whether each pixel + token pair works, and when the pixel last received an event. */
export async function verifyPixels(): Promise<PixelCheck[]> {
  const config = await getMarketingConfig();
  return Promise.all(
    config.pixels.map(async (pixel): Promise<PixelCheck> => {
      if (!pixel.token) return { id: pixel.id, label: pixel.label, ok: false, message: "No access token — browser pixel only" };
      try {
        const res = await fetch(
          `https://graph.facebook.com/${config.apiVersion}/${pixel.id}?fields=name,last_fired_time,is_unavailable&access_token=${encodeURIComponent(pixel.token)}`,
          { signal: AbortSignal.timeout(10_000), cache: "no-store" },
        );
        const json = (await res.json().catch(() => ({}))) as { name?: string; last_fired_time?: string; is_unavailable?: boolean; error?: GraphError };
        if (!res.ok) return { id: pixel.id, label: pixel.label, ok: false, message: json.error?.error_user_msg || json.error?.message || `HTTP ${res.status}` };
        if (json.is_unavailable) return { id: pixel.id, label: pixel.label, ok: false, name: json.name, message: "Pixel is unavailable (disabled in Business Manager)" };
        return { id: pixel.id, label: pixel.label, ok: true, name: json.name, lastFired: json.last_fired_time ?? null, message: "Connected" };
      } catch (error) {
        return { id: pixel.id, label: pixel.label, ok: false, message: error instanceof Error ? error.message : "Network error" };
      }
    }),
  );
}

type OrderForPixel = {
  id: number;
  order_no: string;
  customer_name: string;
  phone: string;
  subtotal: number;
  total: number;
  ip_address: string | null;
  user_agent: string | null;
  fbp: string | null;
  fbc: string | null;
  event_source_url: string | null;
  pixel_purchase_sent_at: Date | null;
};

export const purchaseEventId = (orderNo: string) => `purchase_${orderNo}`;

/** Sends the Purchase event for an order (once, unless forced). Uses the browser data captured at checkout. */
export async function sendPurchaseForOrder(orderId: number, { force = false } = {}): Promise<SendResult> {
  const config = await getMarketingConfig();
  if (!config.events.Purchase) return { ok: false, status: null, message: "Purchase event is turned off" };
  const order = await queryOne<OrderForPixel>(
    `SELECT id, order_no, customer_name, phone, subtotal, total, ip_address, user_agent, fbp, fbc, event_source_url, pixel_purchase_sent_at
     FROM orders WHERE id = ?`,
    [orderId],
  );
  if (!order) return { ok: false, status: null, message: "Order not found" };
  if (order.pixel_purchase_sent_at && !force) return { ok: true, status: null, message: "Already sent" };

  const items = await query<{ product_id: number | null; quantity: number; unit_price: number; product_name: string }>(
    "SELECT product_id, quantity, unit_price, product_name FROM order_items WHERE order_id = ?",
    [orderId],
  );
  const user = customerUserData({ phone: order.phone, name: order.customer_name });
  if (order.ip_address) user.client_ip_address = order.ip_address;
  if (order.user_agent) user.client_user_agent = order.user_agent;
  if (order.fbp) user.fbp = order.fbp;
  if (order.fbc) user.fbc = order.fbc;

  const result = await sendServerEvents(
    [
      {
        event_name: "Purchase",
        event_id: purchaseEventId(order.order_no),
        event_source_url: order.event_source_url ?? undefined,
        user_data: user,
        custom_data: {
          currency: "BDT",
          value: Number(config.purchaseValue === "subtotal" ? order.subtotal : order.total),
          order_id: order.order_no,
          content_type: "product",
          content_ids: items.map((i) => String(i.product_id ?? i.product_name)),
          contents: items.map((i) => ({ id: String(i.product_id ?? i.product_name), quantity: i.quantity, item_price: Number(i.unit_price) })),
          num_items: items.reduce((s, i) => s + i.quantity, 0),
        },
      },
    ],
    { orderId },
  );
  if (result.ok) await execute("UPDATE orders SET pixel_purchase_sent_at = NOW() WHERE id = ?", [orderId]);
  return result;
}
