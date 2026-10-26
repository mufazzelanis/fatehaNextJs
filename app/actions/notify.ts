"use server";

import { refresh } from "next/cache";
import { execute } from "@/lib/db";
import { adminWith, DENIED } from "@/lib/auth";
import { logActivity, type Change } from "@/lib/activity";
import { seal } from "@/lib/secret-box";
import { normalizeNotify, type NotifyConfig } from "@/lib/notify-config";
import { emailLayout, escapeHtml, readNotifyConfig, sendEmail, sendSms } from "@/lib/notify";
import { normalizePhone } from "@/lib/phone";
import type { ActionState } from "@/lib/action-state";

async function store(cfg: NotifyConfig) {
  await execute("INSERT INTO settings (`key`, `value`) VALUES ('notify_config', ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)", [JSON.stringify(cfg)]);
}
const now = () => new Date().toISOString();

function testEmail(to: string) {
  return {
    to, purpose: "test.email", subject: "FatehaBD test email ✔",
    text: "Your SMTP settings work. Emails from the FatehaBD admin panel will be delivered.",
    html: emailLayout("Your email settings work ✔", `<p>This test was sent from the FatehaBD admin panel at ${escapeHtml(new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka" }))}.</p><p>Sign-in codes, password resets and order alerts will now be delivered.</p>`),
  };
}

/**
 * Saves SMTP settings. Every save sends a test email with the NEW settings first:
 * if admin sign-in codes are on, broken settings are refused so nobody gets locked out.
 */
export async function saveEmailSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("settings.manage");
  if (!admin) return DENIED;
  const cur = await readNotifyConfig();
  const g = (k: string) => String(formData.get(k) ?? "").trim();
  const newPass = String(formData.get("pass") ?? "");
  const next = normalizeNotify({
    ...cur,
    email: {
      ...cur.email, enabled: formData.get("enabled") === "on", host: g("host"), port: Number(g("port")), security: g("security"), user: g("user"),
      pass: newPass ? seal(newPass) : cur.email.pass, fromName: g("fromName"), fromEmail: g("fromEmail"),
    },
  }).email;
  const fieldErrors: Record<string, string> = {};
  if (next.enabled || next.host) {
    if (!next.host) fieldErrors.host = "SMTP host is required";
    if (!next.fromEmail) fieldErrors.fromEmail = "Enter a valid sender email";
  }
  if (Object.keys(fieldErrors).length) return { error: "Please fix the highlighted fields", fieldErrors };

  const testTo = (g("testTo") || admin.email || "").toLowerCase();
  let tested: Awaited<ReturnType<typeof sendEmail>> | null = null;
  if (next.host && next.fromEmail && testTo) tested = await sendEmail(testEmail(testTo), next);
  if (tested && !tested.ok && cur.security.adminOtp && next.enabled) {
    return { error: `Not saved — the test email failed (${tested.error}). Admin sign-in codes are on, so working email settings are required.` };
  }
  next.verifiedAt = tested?.ok ? now() : "";
  if (!next.enabled && cur.security.adminOtp) return { error: "Turn off “Email code at admin sign-in” (Security) before turning email off." };
  await store({ ...cur, email: next });

  const changes: Change[] = (["enabled", "host", "port", "security", "user", "fromName", "fromEmail"] as const)
    .filter((k) => cur.email[k] !== next[k]).map((k) => ({ field: `smtp ${k}`, from: cur.email[k], to: next[k] }));
  if (newPass) changes.push({ field: "smtp password", from: "••••", to: "changed" });
  if (changes.length) await logActivity({ actor: admin, action: "notify.email_saved", module: "settings", description: `Changed email (SMTP) settings`, changes });
  refresh();
  if (tested?.ok) return { ok: true, message: `Saved — a test email was delivered to ${testTo}` };
  if (tested) return { ok: true, message: `Saved, but the test email failed: ${tested.error}` };
  return { ok: true, message: "Saved" };
}

export async function sendTestEmailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("settings.manage");
  if (!admin) return DENIED;
  const to = String(formData.get("testTo") ?? "").trim().toLowerCase() || admin.email;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to ?? "")) return { error: "Enter an email address to send the test to" };
  const cfg = await readNotifyConfig();
  if (!cfg.email.host) return { error: "Save the SMTP settings first" };
  const r = await sendEmail(testEmail(to!), cfg.email);
  if (r.ok) {
    await store({ ...cfg, email: { ...cfg.email, verifiedAt: now() } });
    refresh();
    return { ok: true, message: `Test email delivered to ${to}` };
  }
  return { error: `Test failed: ${r.error}` };
}

export async function saveSmsSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("settings.manage");
  if (!admin) return DENIED;
  const cur = await readNotifyConfig();
  const g = (k: string) => String(formData.get(k) ?? "").trim();
  const newKey = g("apiKey");
  const next = normalizeNotify({
    ...cur,
    sms: { ...cur.sms, enabled: formData.get("enabled") === "on", provider: g("provider"), apiKey: newKey ? seal(newKey) : cur.sms.apiKey,
      senderId: g("senderId"), customUrl: g("customUrl"), customSuccess: g("customSuccess") },
  }).sms;
  if (next.provider === "custom" && !next.customUrl) return { fieldErrors: { customUrl: "Paste the full https:// send URL" } };
  if (next.enabled && !next.apiKey && next.provider !== "custom") return { fieldErrors: { apiKey: "Enter the API key" } };
  if (!next.enabled && cur.security.customerOtp) return { error: "Turn off customer phone verification (Security) before turning SMS off." };
  const changed = (["provider", "senderId", "customUrl", "customSuccess"] as const).some((k) => cur.sms[k] !== next[k]) || !!newKey;
  if (changed) next.verifiedAt = "";
  if (changed && cur.security.customerOtp) return { error: "Customer phone verification is on. Turn it off, change the gateway, send a test SMS, then turn it on again." };
  await store({ ...cur, sms: next });
  const changes: Change[] = (["enabled", "provider", "senderId", "customUrl"] as const)
    .filter((k) => cur.sms[k] !== next[k]).map((k) => ({ field: `sms ${k}`, from: cur.sms[k], to: next[k] }));
  if (newKey) changes.push({ field: "sms api key", from: "••••", to: "changed" });
  if (changes.length) await logActivity({ actor: admin, action: "notify.sms_saved", module: "settings", description: "Changed SMS gateway settings", changes });
  refresh();
  return { ok: true, message: changed ? "Saved — now send a test SMS to confirm it works" : "Saved" };
}

export async function sendTestSmsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("settings.manage");
  if (!admin) return DENIED;
  const to = normalizePhone(String(formData.get("testPhone") ?? ""));
  if (!to) return { error: "Enter a valid 11-digit mobile number" };
  const cfg = await readNotifyConfig();
  const r = await sendSms({ to, purpose: "test.sms", text: "FatehaBD test SMS: your SMS gateway works." }, cfg.sms);
  if (r.ok) {
    await store({ ...cfg, sms: { ...cfg.sms, verifiedAt: now() } });
    refresh();
    return { ok: true, message: `Test SMS sent to ${to}` };
  }
  return { error: `Test failed: ${r.error}` };
}

export async function saveSecuritySettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("settings.manage");
  if (!admin) return DENIED;
  const cur = await readNotifyConfig();
  const adminOtp = formData.get("adminOtp") === "on";
  const customerOtp = formData.get("customerOtp") === "on";
  const trustDays = Number(formData.get("trustDays"));
  if (adminOtp && !(cur.email.enabled && cur.email.verifiedAt)) return { error: "Turn on email and send a successful test email first — otherwise nobody could receive the sign-in code." };
  if (customerOtp && !(cur.sms.enabled && cur.sms.verifiedAt)) return { error: "Turn on SMS and send a successful test SMS first." };
  const next = normalizeNotify({ ...cur, security: { adminOtp, customerOtp, trustDays } });
  await store(next);
  const changes: Change[] = (["adminOtp", "customerOtp", "trustDays"] as const)
    .filter((k) => cur.security[k] !== next.security[k]).map((k) => ({ field: k, from: cur.security[k], to: next.security[k] }));
  if (changes.length) await logActivity({ actor: admin, action: "notify.security", module: "settings", description: `Changed sign-in security: ${changes.map((c) => `${c.field} → ${c.to}`).join(", ")}`, changes });
  refresh();
  return { ok: true, message: "Security settings saved" };
}

export async function saveAlertSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("settings.manage");
  if (!admin) return DENIED;
  const cur = await readNotifyConfig();
  const next = normalizeNotify({
    ...cur,
    alerts: { adminEmails: String(formData.get("adminEmails") ?? ""), newOrder: formData.get("newOrder") === "on", dealerApplication: formData.get("dealerApplication") === "on", orderSms: formData.get("orderSms") === "on" },
    templates: { otpSms: String(formData.get("otpSms") ?? ""), orderSms: String(formData.get("orderSms_t") ?? "") },
  });
  if (!String(formData.get("otpSms") ?? "").includes("{code}")) return { fieldErrors: { otpSms: "The code template must contain {code}" } };
  await store(next);
  await logActivity({ actor: admin, action: "notify.alerts", module: "settings", description: "Changed notification alerts / message templates" });
  refresh();
  const bad = String(formData.get("adminEmails") ?? "").split(/[\s,;]+/).filter(Boolean).length - next.alerts.adminEmails.length;
  return { ok: true, message: bad > 0 ? `Saved — ${bad} invalid email address${bad === 1 ? " was" : "es were"} ignored` : "Saved" };
}
