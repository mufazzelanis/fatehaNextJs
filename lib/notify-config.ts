// Client-safe shape of settings.notify_config (email/SMS gateways, OTP security, alerts, templates).
// Secrets are stored sealed ("enc:v1:…") and never sent to the browser — see publicNotifyConfig().

export type EmailSecurity = "ssl" | "starttls" | "none";
export type SmsProvider = "bulksmsbd" | "smsnetbd" | "custom";

export type NotifyConfig = {
  email: {
    enabled: boolean; host: string; port: number; security: EmailSecurity; user: string; pass: string;
    fromName: string; fromEmail: string; verifiedAt: string;
  };
  sms: {
    enabled: boolean; provider: SmsProvider; apiKey: string; senderId: string; customUrl: string; customSuccess: string; verifiedAt: string;
  };
  security: {
    /** Admin sign-in needs a code from email. */
    adminOtp: boolean;
    /** Days a browser can skip the admin code after "trust this device". */
    trustDays: number;
    /** Customers verify their phone by SMS (registration, forgot password, login with code). */
    customerOtp: boolean;
  };
  alerts: { adminEmails: string[]; newOrder: boolean; dealerApplication: boolean; orderSms: boolean };
  templates: { otpSms: string; orderSms: string };
};

// Bangla SMS fit 70 characters per message — both defaults stay inside one SMS (half the cost).
export const DEFAULT_TEMPLATES = {
  otpSms: "{code} আপনার FatehaBD যাচাই কোড। কাউকে দেবেন না।",
  orderSms: "{name}, আপনার অর্ডার #{order} গৃহীত। মোট {total} টাকা। -FatehaBD",
};

export const DEFAULT_NOTIFY: NotifyConfig = {
  email: { enabled: false, host: "", port: 465, security: "ssl", user: "", pass: "", fromName: "FatehaBD", fromEmail: "", verifiedAt: "" },
  sms: { enabled: false, provider: "bulksmsbd", apiKey: "", senderId: "", customUrl: "", customSuccess: "", verifiedAt: "" },
  security: { adminOtp: false, trustDays: 30, customerOtp: false },
  alerts: { adminEmails: [], newOrder: true, dealerApplication: true, orderSms: false },
  templates: DEFAULT_TEMPLATES,
};

const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const str = (v: unknown, d: string, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : d);
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const isEmail = (s: string) => /^[^\s@<>()";,]+@[^\s@<>()";,]+\.[a-z]{2,}$/i.test(s);

export function normalizeNotify(raw: unknown): NotifyConfig {
  const r = obj(raw); const d = DEFAULT_NOTIFY;
  const e = obj(r.email); const s = obj(r.sms); const sec = obj(r.security); const a = obj(r.alerts); const t = obj(r.templates);
  const port = Math.round(Number(e.port));
  const fromEmail = str(e.fromEmail, "", 190);
  return {
    email: {
      enabled: bool(e.enabled, false), host: str(e.host, "", 190).replace(/[^\w.-]/g, ""), port: port > 0 && port < 65536 ? port : d.email.port,
      security: e.security === "starttls" || e.security === "none" ? e.security : "ssl", user: str(e.user, "", 190), pass: str(e.pass, "", 2000),
      fromName: str(e.fromName, d.email.fromName, 80).replace(/["<>\r\n]/g, "") || d.email.fromName, fromEmail: isEmail(fromEmail) ? fromEmail : "",
      verifiedAt: str(e.verifiedAt, "", 40),
    },
    sms: {
      enabled: bool(s.enabled, false), provider: s.provider === "smsnetbd" || s.provider === "custom" ? s.provider : "bulksmsbd",
      apiKey: str(s.apiKey, "", 2000), senderId: str(s.senderId, "", 30), customUrl: /^https?:\/\//.test(str(s.customUrl, "", 600)) ? str(s.customUrl, "", 600) : "",
      customSuccess: str(s.customSuccess, "", 100), verifiedAt: str(s.verifiedAt, "", 40),
    },
    security: {
      adminOtp: bool(sec.adminOtp, false), trustDays: Math.min(Math.max(Math.round(Number(sec.trustDays ?? d.security.trustDays)) || 0, 0), 90),
      customerOtp: bool(sec.customerOtp, false),
    },
    alerts: {
      adminEmails: (Array.isArray(a.adminEmails) ? a.adminEmails : String(a.adminEmails ?? "").split(/[\s,;]+/))
        .map((x) => String(x).trim().toLowerCase()).filter(isEmail).slice(0, 10),
      newOrder: bool(a.newOrder, d.alerts.newOrder), dealerApplication: bool(a.dealerApplication, d.alerts.dealerApplication), orderSms: bool(a.orderSms, false),
    },
    templates: {
      otpSms: str(t.otpSms, d.templates.otpSms, 300).includes("{code}") ? str(t.otpSms, d.templates.otpSms, 300) : d.templates.otpSms,
      orderSms: str(t.orderSms, d.templates.orderSms, 400) || d.templates.orderSms,
    },
  };
}

/** What the admin page may see: secrets replaced by "has a value" flags. */
export type PublicNotifyConfig = Omit<NotifyConfig, "email" | "sms"> & {
  email: Omit<NotifyConfig["email"], "pass"> & { hasPass: boolean };
  sms: Omit<NotifyConfig["sms"], "apiKey"> & { hasApiKey: boolean };
};
export function publicNotifyConfig(c: NotifyConfig): PublicNotifyConfig {
  const { pass, ...email } = c.email;
  const { apiKey, ...sms } = c.sms;
  return { ...c, email: { ...email, hasPass: !!pass }, sms: { ...sms, hasApiKey: !!apiKey } };
}

export const SMS_PROVIDERS: Record<SmsProvider, { name: string; help: string }> = {
  bulksmsbd: { name: "BulkSMSBD", help: "bulksmsbd.net → API key and approved Sender ID" },
  smsnetbd: { name: "Alpha SMS (sms.net.bd)", help: "sms.net.bd → API key; Sender ID optional" },
  custom: { name: "Other company (custom URL)", help: "Paste the send URL with {to}, {message}, {api_key}, {sender}" },
};

/** "Ok {code}" → "Ok 123456" (values are plain text, never markup). */
export function fillTemplate(t: string, vars: Record<string, string | number>) {
  return t.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** GSM-7 vs Unicode SMS parts, so admins see how many SMS a template costs. */
export function smsParts(text: string) {
  const unicode = /[^\x00-\x7F]/.test(text);
  const len = [...text].length;
  const single = unicode ? 70 : 160; const multi = unicode ? 67 : 153;
  return { unicode, length: len, parts: len <= single ? 1 : Math.ceil(len / multi) };
}
