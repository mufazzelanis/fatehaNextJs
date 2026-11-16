// Business info (Admin → Business Info): the one place for the business name, phones, WhatsApp, email,
// address, hours and social links. Every page reads it from here. Client-safe (types, validation, helpers).

export type BusinessProfile = {
  name: string;
  tagline: string;
  phone: string;
  phone2: string;
  /** Digits with country code, e.g. 8801XXXXXXXXX. */
  whatsapp: string;
  email: string;
  address: string;
  hours: string;
  facebook: string;
  messenger: string;
  instagram: string;
  youtube: string;
  tiktok: string;
  website: string;
};

export const EMPTY_BUSINESS: BusinessProfile = {
  name: "Fatehabd", tagline: "", phone: "", phone2: "", whatsapp: "", email: "", address: "", hours: "",
  facebook: "", messenger: "", instagram: "", youtube: "", tiktok: "", website: "",
};

export const SOCIAL_KEYS = ["facebook", "messenger", "instagram", "youtube", "tiktok", "website"] as const;
export const SOCIAL_LABEL: Record<(typeof SOCIAL_KEYS)[number], string> = {
  facebook: "Facebook", messenger: "Messenger", instagram: "Instagram", youtube: "YouTube", tiktok: "TikTok", website: "Website",
};

/** Placeholder numbers from the first setup — never shown to customers. */
const PLACEHOLDER = /^(\+?88)?01700000000$/;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
/** "+880 1712-345678" → "01712345678" (Bangladesh mobile / landline digits, + kept for foreign numbers). */
export const cleanPhone = (v: unknown) => {
  const raw = str(v, 30).replace(/[^\d+]/g, "");
  const local = raw.replace(/^\+?880/, "0");
  return PLACEHOLDER.test(local) ? "" : local;
};
/** WhatsApp needs the country code: "01712345678" → "8801712345678". */
export const waNumber = (v: unknown) => {
  const d = str(v, 30).replace(/\D/g, "");
  if (!d) return "";
  const full = d.startsWith("880") ? d : d.startsWith("0") ? `88${d}` : d;
  return PLACEHOLDER.test(full) ? "" : full;
};
const url = (v: unknown) => {
  const u = str(v, 300);
  if (!u) return "";
  const withScheme = /^https?:\/\//i.test(u) ? u : `https://${u}`;
  try {
    const parsed = new URL(withScheme);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "";
  } catch {
    return "";
  }
};
const email = (v: unknown) => {
  const e = str(v, 120);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : "";
};

export function normalizeBusiness(raw: unknown): BusinessProfile {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    name: str(r.name, 80) || EMPTY_BUSINESS.name,
    tagline: str(r.tagline, 200),
    phone: cleanPhone(r.phone),
    phone2: cleanPhone(r.phone2),
    whatsapp: waNumber(r.whatsapp),
    email: email(r.email),
    address: str(r.address, 300),
    hours: str(r.hours, 120),
    facebook: url(r.facebook),
    messenger: url(r.messenger),
    instagram: url(r.instagram),
    youtube: url(r.youtube),
    tiktok: url(r.tiktok),
    website: url(r.website),
  };
}

/** Field problems to show in the admin form (empty = fine). */
export function businessErrors(raw: Record<string, unknown>): Record<string, string> {
  const e: Record<string, string> = {};
  if (!str(raw.name, 80)) e.name = "Business name is required";
  for (const k of ["phone", "phone2"] as const) {
    const v = str(raw[k], 30);
    if (v && !/^(\+?\d{6,15}|0\d{9,10})$/.test(v.replace(/[\s()-]/g, "").replace(/^\+?880/, "0"))) e[k] = "Enter a phone number like 01712345678";
  }
  if (str(raw.whatsapp, 30) && waNumber(raw.whatsapp).length < 11) e.whatsapp = "Enter a WhatsApp number like 01712345678";
  if (str(raw.email, 120) && !email(raw.email)) e.email = "Enter a valid email address";
  for (const k of SOCIAL_KEYS) if (str(raw[k], 300) && !url(raw[k])) e[k] = "Enter a valid link";
  return e;
}

/** Social / web links that are set, in display order. */
export const socialLinks = (b: BusinessProfile) =>
  SOCIAL_KEYS.filter((k) => b[k]).map((k) => ({ key: k, label: SOCIAL_LABEL[k], url: b[k] }));
