// Client-safe constants for live landing-page visitors (heartbeat API + admin live card).

/** A visitor counts as "here now" while their last heartbeat is newer than this. Landing pages beat every 15s. */
export const LIVE_WINDOW_SECONDS = 40;
export const HEARTBEAT_MS = 15_000;

export const LIVE_SECTIONS = ["top", "content", "form"] as const;
export const LIVE_SOURCES = ["facebook", "google", "other", "direct"] as const;
export const LIVE_DEVICES = ["phone", "tablet", "desktop"] as const;
export type LiveSection = (typeof LIVE_SECTIONS)[number];
export type LiveSource = (typeof LIVE_SOURCES)[number];
export type LiveDevice = (typeof LIVE_DEVICES)[number];

export const SECTION_LABEL: Record<LiveSection, string> = { top: "Top of page", content: "Reading", form: "On order form" };
export const SOURCE_LABEL: Record<LiveSource, string> = { facebook: "Facebook / Instagram", google: "Google", other: "Other sites", direct: "Direct / unknown" };
export const DEVICE_LABEL: Record<LiveDevice, string> = { phone: "Phone", tablet: "Tablet", desktop: "Computer" };

export type LiveEvent = { kind: "arrived" | "left"; at: string; landing: string; source: LiveSource; device: LiveDevice; ip: string | null };

/** One person on a landing page right now (Live Visitors table). */
export type LiveVisitor = {
  id: number; ip: string | null; ipVisits: number; userAgent: string | null; source: LiveSource; device: LiveDevice;
  landing: string; section: LiveSection; reachedForm: boolean; clicks: number; startedAt: string; ordered: boolean;
};

export type LiveStats = {
  /** Server time the numbers were taken (ISO). */
  now: string;
  total: number;
  landings: { id: number; name: string; slug: string; count: number; form: number }[];
  sections: Record<LiveSection, number>;
  sources: Record<LiveSource, number>;
  devices: Record<LiveDevice, number>;
  /** Visits that started / ended in the last 5 minutes. */
  arrived5: number;
  left5: number;
  /** Visits today (Bangladesh time). */
  today: number;
  /** People here at each of the last 30 minutes (oldest first). */
  series: number[];
  feed: LiveEvent[];
  /** Everyone here now, longest visit first (up to 100). */
  active: LiveVisitor[];
};

/** "7m 05s" style duration. */
export function duration(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ${String(sec % 60).padStart(2, "0")}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// ───────────── main site (landing_id 0)

/** landing_visits.landing_id for visits to the main website (shop, products, cart, checkout, guide pages). */
export const MAIN_SITE_ID = 0;
export const MAIN_SITE_LABEL = "Main website";

/** First path segments that belong to the main website. Anything else with one segment is a landing page. */
const MAIN_SITE_ROOTS = new Set([
  "", "cart", "categories", "checkout", "contact", "faq", "products", "shop", "wishlist", "track",
  "how-to-use", "ingredients", "dental-care", "privacy-policy", "refund-policy", "terms-of-service", "order",
]);

/** Is this a public main-website page (tracked as landing 0)? The landing thank-you page (?l=slug) belongs to its landing. */
export function isMainSitePath(pathname: string, search: string) {
  const root = pathname.split("/")[1] ?? "";
  if (!MAIN_SITE_ROOTS.has(root)) return false;
  if (root === "order") return !new URLSearchParams(search).get("l");
  return true;
}

/** Where on the main site: home = "top", checkout = "form" (about to order), everything else = "content". */
export function mainSiteSection(pathname: string): LiveSection {
  if (pathname === "/") return "top";
  return pathname.startsWith("/checkout") && !pathname.startsWith("/checkout/success") ? "form" : "content";
}
