// Client-safe invoice designs (settings.invoice_config): one for main-site orders, one for landing-page orders.
import { parseColor } from "./store-config";

export type InvoicePaper = "a4" | "a5" | "pos80";
export type InvoiceLang = "en" | "bn";

export type InvoiceProfile = {
  companyName: string;
  tagline: string;
  /** Uploaded logo file in storage/uploads, or "" to use the default brand logo / none. */
  logo: string;
  showLogo: boolean;
  address: string;
  phone: string;
  email: string;
  website: string;
  accent: string;
  title: string;
  lang: InvoiceLang;
  paper: InvoicePaper;
  showPaymentInfo: boolean;
  showCustomerNote: boolean;
  showExtraFields: boolean;
  showOrderSource: boolean;
  showSignature: boolean;
  footerNote: string;
  terms: string;
};

export type InvoiceConfig = { store: InvoiceProfile; landing: InvoiceProfile };

const base: Omit<InvoiceProfile, "companyName" | "tagline" | "accent" | "website"> = {
  logo: "", showLogo: true, address: "", phone: "", email: "", title: "Invoice", lang: "en", paper: "a4",
  showPaymentInfo: true, showCustomerNote: true, showExtraFields: true, showOrderSource: false, showSignature: false,
  footerNote: "Thank you for your order!", terms: "",
};

export const DEFAULT_INVOICE: InvoiceConfig = {
  store: { ...base, companyName: "FatehaBD", tagline: "Authentic baby food & baby care", accent: "#12b3b8", website: "fatehabd.com" },
  landing: { ...base, companyName: "Fateha BD", tagline: "", accent: "#087848", website: "fatehabd.com", lang: "bn", title: "চালান", footerNote: "আমাদের থেকে কেনার জন্য ধন্যবাদ!" },
};

function normProfile(raw: unknown, d: InvoiceProfile): InvoiceProfile {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const s = (k: keyof InvoiceProfile, max: number) => (typeof r[k] === "string" ? (r[k] as string).trim().slice(0, max) : (d[k] as string));
  const b = (k: keyof InvoiceProfile) => (typeof r[k] === "boolean" ? (r[k] as boolean) : (d[k] as boolean));
  return {
    companyName: s("companyName", 120) || d.companyName,
    tagline: s("tagline", 160),
    logo: s("logo", 200).replace(/[^\w.-]/g, ""),
    showLogo: b("showLogo"),
    address: s("address", 300),
    phone: s("phone", 40),
    email: s("email", 120),
    website: s("website", 120),
    accent: parseColor(r.accent) ?? d.accent,
    title: s("title", 40) || d.title,
    lang: r.lang === "bn" || r.lang === "en" ? r.lang : d.lang,
    paper: r.paper === "a5" || r.paper === "pos80" || r.paper === "a4" ? r.paper : d.paper,
    showPaymentInfo: b("showPaymentInfo"),
    showCustomerNote: b("showCustomerNote"),
    showExtraFields: b("showExtraFields"),
    showOrderSource: b("showOrderSource"),
    showSignature: b("showSignature"),
    footerNote: s("footerNote", 300),
    terms: s("terms", 1000),
  };
}

export function normalizeInvoice(raw: unknown): InvoiceConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return { store: normProfile(r.store, DEFAULT_INVOICE.store), landing: normProfile(r.landing, DEFAULT_INVOICE.landing) };
}

/** Invoice labels in English or Bangla. */
export const INVOICE_LABELS = {
  en: {
    invoiceNo: "Invoice no", date: "Date", billTo: "Bill to", payment: "Payment", method: "Method", status: "Status", trx: "Transaction ID",
    item: "Item", price: "Price", qty: "Qty", total: "Total", subtotal: "Subtotal", delivery: "Delivery", discount: "Discount",
    collect: "Amount to collect", paid: "Paid", note: "Customer note", source: "Order from", signature: "Authorised signature", area: "Area",
  },
  bn: {
    invoiceNo: "চালান নং", date: "তারিখ", billTo: "প্রাপক", payment: "পেমেন্ট", method: "পদ্ধতি", status: "অবস্থা", trx: "ট্রানজেকশন আইডি",
    item: "পণ্য", price: "দাম", qty: "পরিমাণ", total: "মোট", subtotal: "সাবটোটাল", delivery: "ডেলিভারি চার্জ", discount: "ছাড়",
    collect: "আদায়যোগ্য টাকা", paid: "পরিশোধিত", note: "গ্রাহকের নোট", source: "অর্ডার এসেছে", signature: "অনুমোদিত স্বাক্ষর", area: "এলাকা",
  },
} as const;
