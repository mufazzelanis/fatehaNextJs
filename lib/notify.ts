import "server-only";
import nodemailer from "nodemailer";
import { execute, queryOne } from "./db";
import { open } from "./secret-box";
import { normalizeNotify, fillTemplate, type NotifyConfig } from "./notify-config";

/** Uncached: secrets stay server-side and changes apply at once. */
export async function readNotifyConfig(): Promise<NotifyConfig> {
  const row = await queryOne<{ value: string | null }>("SELECT `value` FROM settings WHERE `key` = 'notify_config'");
  try { return normalizeNotify(row?.value ? JSON.parse(row.value) : {}); } catch { return normalizeNotify({}); }
}

async function log(channel: "email" | "sms", recipient: string, subject: string | null, purpose: string, status: "sent" | "failed", error?: string) {
  try {
    await execute("INSERT INTO message_log (channel, recipient, subject, purpose, status, error) VALUES (?, ?, ?, ?, ?, ?)",
      // One-time codes never reach the log.
      [channel, recipient.slice(0, 190), subject?.replace(/\b\d{6}\b/g, "••••••").slice(0, 200) ?? null, purpose.slice(0, 40), status, error?.slice(0, 500) ?? null]);
  } catch {}
}

export type SendResult = { ok: true } | { ok: false; error: string };

// ───────────── email

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Branded, table-based HTML that renders in Gmail/Outlook. `body` must already be escaped. */
export function emailLayout(title: string, body: string, opts: { action?: { label: string; url: string }; footer?: string } = {}) {
  const site = (process.env.SITE_URL || "https://fatehabd.com").replace(/\/$/, "");
  return `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Segoe UI,Arial,sans-serif;color:#2d2e32">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#12b3b8;padding:18px 24px;color:#fff;font-size:20px;font-weight:700">FatehaBD</td></tr>
<tr><td style="padding:28px 24px">
<h1 style="margin:0 0 14px;font-size:20px;color:#0f172a">${esc(title)}</h1>
<div style="font-size:15px;line-height:1.6">${body}</div>
${opts.action ? `<p style="margin:26px 0 6px"><a href="${esc(opts.action.url)}" style="display:inline-block;background:#12b3b8;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px">${esc(opts.action.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:16px 24px;background:#f8fafc;color:#64748b;font-size:12px">${opts.footer ? `${esc(opts.footer)}<br>` : ""}<a href="${esc(site)}" style="color:#0f7279">${esc(site.replace(/^https?:\/\//, ""))}</a></td></tr>
</table></td></tr></table></body></html>`;
}
export { esc as escapeHtml };

function transport(c: NotifyConfig["email"]) {
  return nodemailer.createTransport({
    host: c.host, port: c.port, secure: c.security === "ssl", requireTLS: c.security === "starttls", ignoreTLS: c.security === "none",
    auth: c.user ? { user: c.user, pass: open(c.pass) } : undefined,
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000,
  });
}

/** Sends one email. `cfgOverride` lets the admin test unsaved-to-live settings. Never throws. */
export async function sendEmail(msg: { to: string | string[]; subject: string; html: string; text: string; purpose: string }, cfgOverride?: NotifyConfig["email"]): Promise<SendResult> {
  const cfg = cfgOverride ?? (await readNotifyConfig()).email;
  const to = (Array.isArray(msg.to) ? msg.to : [msg.to]).filter(Boolean);
  const label = to.join(", ");
  if (!cfgOverride && !cfg.enabled) return { ok: false, error: "Email sending is turned off (Admin → Notifications)" };
  if (!cfg.host || !cfg.fromEmail || !to.length) {
    await log("email", label || "-", msg.subject, msg.purpose, "failed", "SMTP host / from address / recipient missing");
    return { ok: false, error: "SMTP host, from address or recipient is missing" };
  }
  try {
    await transport(cfg).sendMail({
      from: { name: cfg.fromName, address: cfg.fromEmail }, to, subject: msg.subject, html: msg.html, text: msg.text,
    });
    await log("email", label, msg.subject, msg.purpose, "sent");
    return { ok: true };
  } catch (e) {
    const error = (e as Error).message?.replace(/\s+/g, " ").slice(0, 300) || "Unknown SMTP error";
    await log("email", label, msg.subject, msg.purpose, "failed", error);
    return { ok: false, error };
  }
}

// ───────────── SMS

/** 01XXXXXXXXX → 8801XXXXXXXXX */
export const smsNumber = (phone: string) => (phone.startsWith("880") ? phone : `88${phone.replace(/^\+?88/, "")}`);

export async function sendSms(msg: { to: string; text: string; purpose: string }, cfgOverride?: NotifyConfig["sms"]): Promise<SendResult> {
  const cfg = cfgOverride ?? (await readNotifyConfig()).sms;
  const to = smsNumber(msg.to);
  if (!cfgOverride && !cfg.enabled) return { ok: false, error: "SMS sending is turned off (Admin → Notifications)" };
  const apiKey = open(cfg.apiKey);
  try {
    let res: Response;
    let ok: (body: string) => boolean;
    const signal = AbortSignal.timeout(15_000);
    if (cfg.provider === "bulksmsbd") {
      const q = new URLSearchParams({ api_key: apiKey, type: "text", number: to, senderid: cfg.senderId, message: msg.text });
      res = await fetch(`https://bulksmsbd.net/api/smsapi?${q}`, { signal });
      ok = (b) => { try { return Number(JSON.parse(b).response_code) === 202; } catch { return false; } };
    } else if (cfg.provider === "smsnetbd") {
      const body = new URLSearchParams({ api_key: apiKey, msg: msg.text, to, ...(cfg.senderId ? { sender_id: cfg.senderId } : {}) });
      res = await fetch("https://api.sms.net.bd/sendsms", { method: "POST", body, signal });
      ok = (b) => { try { return Number(JSON.parse(b).error) === 0; } catch { return false; } };
    } else {
      if (!cfg.customUrl) throw new Error("Custom SMS URL is missing");
      const url = cfg.customUrl
        .replaceAll("{to}", encodeURIComponent(to)).replaceAll("{message}", encodeURIComponent(msg.text))
        .replaceAll("{api_key}", encodeURIComponent(apiKey)).replaceAll("{sender}", encodeURIComponent(cfg.senderId));
      res = await fetch(url, { signal });
      ok = (b) => !cfg.customSuccess || b.includes(cfg.customSuccess);
    }
    const body = (await res.text()).slice(0, 400);
    if (!res.ok || !ok(body)) throw new Error(`Gateway replied ${res.status}: ${body || "(empty)"}`);
    await log("sms", to, msg.text.slice(0, 60), msg.purpose, "sent");
    return { ok: true };
  } catch (e) {
    const error = (e as Error).message?.replace(/\s+/g, " ").slice(0, 300) || "Unknown SMS error";
    await log("sms", to, msg.text.slice(0, 60), msg.purpose, "failed", error);
    return { ok: false, error };
  }
}

// ───────────── alerts (called with after(): never slow down or break an order)

type OrderForAlert = { id: number; order_no: string; customer_name: string; phone: string; address: string; total: number; source: string; payment_method: string; landing_name: string | null; items: string | null };

export async function alertNewOrder(orderId: number) {
  const cfg = await readNotifyConfig();
  const o = await queryOne<OrderForAlert>(
    `SELECT o.id, o.order_no, o.customer_name, o.phone, o.address, o.total, o.source, o.payment_method, l.name AS landing_name,
       (SELECT GROUP_CONCAT(CONCAT(product_name, ' × ', quantity) SEPARATOR '\n') FROM order_items WHERE order_id = o.id) AS items
     FROM orders o LEFT JOIN landing_pages l ON l.id = o.landing_id WHERE o.id = ?`,
    [orderId],
  );
  if (!o) return;
  const total = Math.round(Number(o.total)).toLocaleString("en-IN");
  if (cfg.email.enabled && cfg.alerts.newOrder && cfg.alerts.adminEmails.length) {
    const site = (process.env.SITE_URL || "https://fatehabd.com").replace(/\/$/, "");
    const from = o.source === "store" ? "Main site (shop)" : `Landing: ${o.landing_name ?? "—"}`;
    const rows = [["Customer", o.customer_name], ["Phone", o.phone], ["Address", o.address], ["Items", o.items ?? ""], ["Total", `৳${total}`], ["Payment", o.payment_method.toUpperCase()], ["From", from]];
    await sendEmail({
      to: cfg.alerts.adminEmails, purpose: "alert.new_order",
      subject: `New order #${o.order_no} · ৳${total} · ${o.customer_name}`,
      text: rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
      html: emailLayout(`New order #${o.order_no}`,
        `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows.map(([k, v]) =>
          `<tr><td style="padding:6px 0;color:#64748b;width:90px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;white-space:pre-line">${esc(v)}</td></tr>`).join("")}</table>`,
        { action: { label: "Open order", url: `${site}/admin/orders/${o.id}` } }),
    });
  }
  if (cfg.sms.enabled && cfg.alerts.orderSms) {
    await sendSms({ to: o.phone, purpose: "order.confirmation", text: fillTemplate(cfg.templates.orderSms, { name: o.customer_name.split(" ")[0], order: o.order_no, total }) });
  }
}

export async function alertDealerApplication(dealerId: number) {
  const cfg = await readNotifyConfig();
  if (!cfg.email.enabled || !cfg.alerts.dealerApplication || !cfg.alerts.adminEmails.length) return;
  const d = await queryOne<{ name: string; phone: string; applied_level: string; district: string; thana: string }>(
    `SELECT dl.name, dl.phone, dl.applied_level, d.name AS district, t.name AS thana FROM dealers dl
     JOIN districts d ON d.id = dl.district_id JOIN thanas t ON t.id = dl.thana_id WHERE dl.id = ?`,
    [dealerId],
  );
  if (!d) return;
  const site = (process.env.SITE_URL || "https://fatehabd.com").replace(/\/$/, "");
  await sendEmail({
    to: cfg.alerts.adminEmails, purpose: "alert.dealer_application",
    subject: `New dealer application: ${d.name} (${d.applied_level}, ${d.district})`,
    text: `${d.name} · ${d.phone} · ${d.applied_level} dealer · ${d.thana}, ${d.district}`,
    html: emailLayout("New dealer application", `<p><b>${esc(d.name)}</b> · ${esc(d.phone)}<br>${esc(d.applied_level)} dealer · ${esc(d.thana)}, ${esc(d.district)}</p>`,
      { action: { label: "Review application", url: `${site}/admin/dealers/${dealerId}` } }),
  });
}

/** Customer phone verification is available only when an admin turned it on with a working SMS gateway. */
export async function customerOtpOn() {
  const c = await readNotifyConfig();
  return c.security.customerOtp && c.sms.enabled;
}
