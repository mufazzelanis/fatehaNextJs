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

export type LiveEvent = { kind: "arrived" | "left"; at: string; landing: string; source: LiveSource; device: LiveDevice };

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
  /** Unique visits today (Bangladesh time). */
  today: number;
  /** People here at each of the last 30 minutes (oldest first). */
  series: number[];
  feed: LiveEvent[];
};
