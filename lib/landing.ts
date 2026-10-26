// Client-safe landing-page helpers (slugs, statuses, global landing settings).

export const LANDING_STATUSES = ["draft", "published", "archived"] as const;
export type LandingStatus = (typeof LANDING_STATUSES)[number];
export const LANDING_STATUS_META: Record<LandingStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  published: { label: "Live", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  archived: { label: "Archived", className: "bg-slate-100 text-slate-600 ring-slate-500/20" },
};

/** First URL segments that belong to the main site and can never be a landing page. */
export const RESERVED_SLUGS = new Set([
  "admin", "api", "account", "business", "media", "order", "track", "track-order", "shop", "products", "product", "cart", "checkout",
  "wishlist", "categories", "category", "contact", "faq", "login", "register", "logout", "privacy-policy", "refund-policy",
  "terms-of-service", "pages", "search", "_next", "favicon.ico", "robots.txt", "sitemap.xml", "brand", "static", "assets", "invoice",
]);

export function slugifyLanding(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

/** Returns an error message, or null when the slug can be used as fatehabd.com/<slug>. */
export function landingSlugError(slug: string) {
  if (!slug) return "Enter a URL";
  if (slug.length < 3) return "Use at least 3 characters";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return "Use only English letters, numbers and dashes";
  if (RESERVED_SLUGS.has(slug)) return "This URL is used by the main site — choose another";
  return null;
}

export const isOrderPrefix = (v: string) => /^[A-Z]{1,5}$/.test(v);

export type LandingSettings = {
  /** "© … All rights reserved." in landing footers when a landing has no own name. */
  footerName: string;
  /** Order-number prefix suggested for new landing pages. */
  defaultPrefix: string;
  contactPhone: string;
  /** WhatsApp number with country code, e.g. 8801XXXXXXXXX. */
  whatsapp: string;
  /** Floating call / WhatsApp buttons on landing pages. */
  floatingButtons: boolean;
  /** Minutes a phone must wait before a 2nd pending landing order (0 = off). */
  duplicateMinutes: number;
};

export const DEFAULT_LANDING_SETTINGS: LandingSettings = {
  footerName: "Fateha BD",
  defaultPrefix: "DC",
  contactPhone: "",
  whatsapp: "",
  floatingButtons: false,
  duplicateMinutes: 30,
};

export function normalizeLandingSettings(raw: unknown, legacy: Partial<LandingSettings> = {}): LandingSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = { ...DEFAULT_LANDING_SETTINGS, ...legacy };
  const str = (v: unknown, def: string, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : def);
  const prefix = str(r.defaultPrefix, d.defaultPrefix, 5).toUpperCase();
  const minutes = Math.round(Number(r.duplicateMinutes ?? d.duplicateMinutes));
  return {
    footerName: str(r.footerName, d.footerName, 120) || DEFAULT_LANDING_SETTINGS.footerName,
    defaultPrefix: isOrderPrefix(prefix) ? prefix : d.defaultPrefix,
    contactPhone: str(r.contactPhone, d.contactPhone, 20).replace(/[^\d+]/g, ""),
    whatsapp: str(r.whatsapp, d.whatsapp, 20).replace(/\D/g, ""),
    floatingButtons: typeof r.floatingButtons === "boolean" ? r.floatingButtons : d.floatingButtons,
    duplicateMinutes: Number.isFinite(minutes) ? Math.min(Math.max(minutes, 0), 1440) : d.duplicateMinutes,
  };
}
