// Dashboard periods, computed in Bangladesh time (UTC+6, no DST). Client-safe.

export const RANGE_KEYS = ["today", "yesterday", "this_week", "last_week", "this_month", "last_month", "this_year", "last_year", "all", "custom"] as const;
export type RangeKey = (typeof RANGE_KEYS)[number];

export const RANGE_LABEL: Record<RangeKey, string> = {
  today: "Today", yesterday: "Yesterday", this_week: "This week", last_week: "Last week", this_month: "This month",
  last_month: "Last month", this_year: "This year", last_year: "Last year", all: "All time", custom: "Custom",
};

export const isRangeKey = (v: unknown): v is RangeKey => typeof v === "string" && (RANGE_KEYS as readonly string[]).includes(v);

/** A calendar day in BD time, as a UTC-midnight Date (so date math never touches the server timezone). */
type Day = Date;
const DAY = 86_400_000;
const bdToday = (now = new Date()): Day => { const d = new Date(now.getTime() + 6 * 3600_000); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); };
const addDays = (d: Day, n: number): Day => new Date(d.getTime() + n * DAY);
const ymd = (d: Day) => d.toISOString().slice(0, 10);
const parseYmd = (s: unknown): Day | null => {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};
const monthStart = (y: number, m: number): Day => new Date(Date.UTC(y, m, 1));
const daysBetween = (a: Day, b: Day) => Math.round((b.getTime() - a.getTime()) / DAY);

/** Weeks run Saturday → Friday, as in most Bangladeshi businesses. */
const weekStart = (d: Day): Day => addDays(d, -((d.getUTCDay() + 1) % 7));

export type Bucket = "hour" | "day" | "month";

export type ResolvedRange = {
  key: RangeKey;
  /** inclusive first day, inclusive last day (YYYY-MM-DD) */
  from: string;
  to: string;
  /** SQL bounds: created_at >= start AND created_at < end */
  start: string;
  end: string;
  /** previous comparable period (null for "all time") */
  prev: { from: string; to: string; start: string; end: string; label: string } | null;
  bucket: Bucket;
  /** "1 Oct – 26 Oct 2026" */
  display: string;
  days: number;
};

const fmt = (d: Day, withYear: boolean) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" });

function displayRange(a: Day, b: Day) {
  if (ymd(a) === ymd(b)) return fmt(a, true);
  const sameYear = a.getUTCFullYear() === b.getUTCFullYear();
  return `${fmt(a, !sameYear)} – ${fmt(b, true)}`;
}

/**
 * Resolves a dashboard period. Comparisons use the same elapsed length of the previous period
 * ("this month so far" vs "the same days last month"), so partial periods compare fairly.
 */
export function resolveRange(key: RangeKey, opts: { from?: unknown; to?: unknown; firstOrder?: string | null; now?: Date } = {}): ResolvedRange {
  const today = bdToday(opts.now);
  let a: Day; let b: Day; let pa: Day | null = null; let pb: Day | null = null; let prevLabel = "";
  const y = today.getUTCFullYear(); const m = today.getUTCMonth();

  switch (key) {
    case "yesterday":
      a = b = addDays(today, -1); pa = pb = addDays(today, -2); prevLabel = "the day before";
      break;
    case "this_week": {
      a = weekStart(today); b = today;
      pa = addDays(a, -7); pb = addDays(b, -7); prevLabel = "same days last week";
      break;
    }
    case "last_week": {
      a = addDays(weekStart(today), -7); b = addDays(a, 6);
      pa = addDays(a, -7); pb = addDays(b, -7); prevLabel = "the week before";
      break;
    }
    case "this_month": {
      a = monthStart(y, m); b = today;
      pa = monthStart(y, m - 1);
      const lastOfPrev = addDays(monthStart(y, m), -1);
      pb = addDays(pa, Math.min(daysBetween(a, b), daysBetween(pa, lastOfPrev)));
      prevLabel = "same days last month";
      break;
    }
    case "last_month": {
      a = monthStart(y, m - 1); b = addDays(monthStart(y, m), -1);
      pa = monthStart(y, m - 2); pb = addDays(a, -1); prevLabel = "the month before";
      break;
    }
    case "this_year": {
      a = new Date(Date.UTC(y, 0, 1)); b = today;
      pa = new Date(Date.UTC(y - 1, 0, 1)); pb = addDays(pa, daysBetween(a, b)); prevLabel = "same period last year";
      break;
    }
    case "last_year": {
      a = new Date(Date.UTC(y - 1, 0, 1)); b = new Date(Date.UTC(y - 1, 11, 31));
      pa = new Date(Date.UTC(y - 2, 0, 1)); pb = new Date(Date.UTC(y - 2, 11, 31)); prevLabel = "the year before";
      break;
    }
    case "all": {
      a = parseYmd(opts.firstOrder) ?? today; b = today;
      if (a > b) a = b;
      break;
    }
    case "custom": {
      let f = parseYmd(opts.from) ?? addDays(today, -6);
      let t = parseYmd(opts.to) ?? today;
      if (f > t) [f, t] = [t, f];
      if (daysBetween(f, t) > 3660) f = addDays(t, -3660); // 10 years is plenty
      a = f; b = t;
      const len = daysBetween(a, b) + 1;
      pb = addDays(a, -1); pa = addDays(pb, -(len - 1)); prevLabel = `previous ${len} day${len === 1 ? "" : "s"}`;
      break;
    }
    default: // today
      a = b = today; pa = pb = addDays(today, -1); prevLabel = "yesterday";
  }

  const days = daysBetween(a, b) + 1;
  const bucket: Bucket = days === 1 ? "hour" : days <= 62 ? "day" : "month";
  const bounds = (x: Day, z: Day) => ({ start: `${ymd(x)} 00:00:00`, end: `${ymd(addDays(z, 1))} 00:00:00` });
  return {
    key, from: ymd(a), to: ymd(b), ...bounds(a, b), bucket, days, display: displayRange(a, b),
    prev: pa && pb ? { from: ymd(pa), to: ymd(pb), ...bounds(pa, pb), label: prevLabel } : null,
  };
}

/** Every bucket key in the period, in order, with a short label — so empty days/hours still show on the chart. */
export function bucketKeys(r: ResolvedRange): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  if (r.bucket === "hour") {
    for (let h = 0; h < 24; h++) out.push({ key: String(h).padStart(2, "0"), label: `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}` });
    return out;
  }
  const a = parseYmd(r.from)!; const b = parseYmd(r.to)!;
  if (r.bucket === "day") {
    for (let d = a; d <= b; d = addDays(d, 1)) out.push({ key: ymd(d), label: fmt(d, false) });
    return out;
  }
  for (let d = monthStart(a.getUTCFullYear(), a.getUTCMonth()); d <= b; d = monthStart(d.getUTCFullYear(), d.getUTCMonth() + 1)) {
    out.push({ key: ymd(d).slice(0, 7), label: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }) });
  }
  return out;
}
