// Client-safe formatting helpers and shared constants.

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function bn(value: number | string): string {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

/** ৳750 → "৭৫০" with thousands separators */
export function taka(value: number, { bangla = true }: { bangla?: boolean } = {}): string {
  const formatted = Math.round(value).toLocaleString("en-IN");
  return `৳${bangla ? bn(formatted) : formatted}`;
}

export function money(value: number): string {
  return `৳${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function dateTime(value: Date | string): string {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Dhaka",
  });
}

export function shortDate(value: Date | string): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  });
}

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_META: Record<OrderStatus, { label: string; bn: string; className: string; dot: string }> = {
  pending: { label: "Pending", bn: "অপেক্ষমাণ", className: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500" },
  confirmed: { label: "Confirmed", bn: "কনফার্মড", className: "bg-sky-50 text-sky-700 ring-sky-600/20", dot: "bg-sky-500" },
  processing: { label: "Processing", bn: "প্রস্তুত হচ্ছে", className: "bg-indigo-50 text-indigo-700 ring-indigo-600/20", dot: "bg-indigo-500" },
  shipped: { label: "Shipped", bn: "পাঠানো হয়েছে", className: "bg-violet-50 text-violet-700 ring-violet-600/20", dot: "bg-violet-500" },
  delivered: { label: "Delivered", bn: "ডেলিভারি সম্পন্ন", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled", bn: "বাতিল", className: "bg-rose-50 text-rose-700 ring-rose-600/20", dot: "bg-rose-500" },
  returned: { label: "Returned", bn: "ফেরত", className: "bg-slate-100 text-slate-700 ring-slate-600/20", dot: "bg-slate-500" },
};

/** The happy-path steps shown on tracking timelines */
export const TRACK_STEPS: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered"];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export function maskPhone(phone: string): string {
  return phone.length > 6 ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone;
}

export function isWithinHours(value: Date | string, hours: number): boolean {
  return Date.now() - new Date(value).getTime() < hours * 60 * 60 * 1000;
}
