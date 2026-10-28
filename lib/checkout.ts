// Client-safe checkout configuration (stored as JSON in settings.checkout_config).

export type FieldConfig = { label: string; placeholder: string };
export type ShippingZone = { id: string; label: string; charge: number };
export type CustomField = {
  id: string;
  label: string;
  placeholder: string;
  type: "text" | "textarea" | "select";
  options: string[];
  required: boolean;
};

export type CheckoutConfig = {
  billingTitle: string;
  fields: { name: FieldConfig; address: FieldConfig; phone: FieldConfig; note: FieldConfig & { enabled: boolean } };
  customFields: CustomField[];
  shippingTitle: string;
  zones: ShippingZone[];
  defaultZone: string;
  productsTitle: string;
  allowQuantity: boolean;
  maxQuantity: number;
  orderTitle: string;
  paymentTitle: string;
  paymentText: string;
  privacyText: string;
  buttonText: string;
  buttonColor: string;
  showTotalOnButton: boolean;
};

export const MAX_ZONES = 10;
export const MAX_CUSTOM_FIELDS = 8;

export function defaultCheckout(legacy?: { inside?: number; outside?: number }): CheckoutConfig {
  return {
    billingTitle: "Billing details",
    fields: {
      name: { label: "আপনার নাম", placeholder: "আপনার নাম লিখুন *" },
      address: { label: "ঠিকানা", placeholder: "আপনার গ্রাম ইউনিয়ন, থানা/উপজেলা ও জেলা লিখুন *" },
      phone: { label: "মোবাইল নাম্বার", placeholder: "আপনার মোবাইল নাম্বার লিখুন *" },
      note: { label: "Order notes", placeholder: "Notes about your order, e.g. special notes for delivery.", enabled: true },
    },
    customFields: [],
    shippingTitle: "Shipping",
    zones: [
      { id: "outside", label: "Outside Dhaka", charge: legacy?.outside ?? 100 },
      { id: "inside", label: "Inside Dhaka", charge: legacy?.inside ?? 50 },
    ],
    defaultZone: "outside",
    productsTitle: "Your Products",
    allowQuantity: true,
    maxQuantity: 10,
    orderTitle: "Your order",
    paymentTitle: "Cash on delivery",
    paymentText: "Pay with cash upon delivery.",
    privacyText:
      "Your personal data will be used to process your order, support your experience throughout this website, and for other purposes described in our privacy policy.",
    buttonText: "অর্ডার কনফার্ম করুন",
    buttonColor: "#4a5bff",
    showTotalOnButton: true,
  };
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const s = (v: unknown, fallback: string, max = 300) => (typeof v === "string" ? v.slice(0, max) : fallback);
const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);

function field(raw: unknown, d: FieldConfig): FieldConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return { label: s(r.label, d.label, 80), placeholder: s(r.placeholder, d.placeholder, 160) };
}

/** Validates stored or submitted config and fills anything missing from the defaults. */
export function normalizeCheckout(raw: unknown, legacy?: { inside?: number; outside?: number }): CheckoutConfig {
  const d = defaultCheckout(legacy);
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const f = (r.fields && typeof r.fields === "object" ? r.fields : {}) as Record<string, unknown>;
  const noteRaw = (f.note && typeof f.note === "object" ? f.note : {}) as Record<string, unknown>;

  const seen = new Set<string>();
  const zones: ShippingZone[] = Array.isArray(r.zones)
    ? r.zones
        .map((z) => (z && typeof z === "object" ? (z as Record<string, unknown>) : {}))
        .map((z, i) => ({
          id: slug(String(z.id ?? "")) || `zone-${i + 1}`,
          label: s(z.label, "", 80).trim(),
          charge: Math.max(0, Math.round(Number(z.charge) || 0)),
        }))
        .filter((z) => z.label && !seen.has(z.id) && seen.add(z.id))
        .slice(0, MAX_ZONES)
    : d.zones;

  const ids = new Set<string>();
  const customFields: CustomField[] = Array.isArray(r.customFields)
    ? r.customFields
        .map((c) => (c && typeof c === "object" ? (c as Record<string, unknown>) : {}))
        .map((c, i): CustomField => {
          const type = c.type === "textarea" || c.type === "select" ? c.type : "text";
          return {
            id: slug(String(c.id ?? "")) || `field-${i + 1}`,
            label: s(c.label, "", 80).trim(),
            placeholder: s(c.placeholder, "", 160),
            type,
            options: type === "select" && Array.isArray(c.options)
              ? c.options.filter((o): o is string => typeof o === "string").map((o) => o.trim().slice(0, 80)).filter(Boolean).slice(0, 20)
              : [],
            required: c.required === true,
          };
        })
        .filter((c) => c.label && !ids.has(c.id) && ids.add(c.id) && (c.type !== "select" || c.options.length > 0))
        .slice(0, MAX_CUSTOM_FIELDS)
    : d.customFields;

  const finalZones = zones.length ? zones : d.zones;
  const defaultZone = typeof r.defaultZone === "string" && finalZones.some((z) => z.id === r.defaultZone) ? r.defaultZone : finalZones[0].id;

  return {
    billingTitle: s(r.billingTitle, d.billingTitle, 80),
    fields: {
      name: field(f.name, d.fields.name),
      address: field(f.address, d.fields.address),
      phone: field(f.phone, d.fields.phone),
      note: { ...field(f.note, d.fields.note), enabled: noteRaw.enabled !== false },
    },
    customFields,
    shippingTitle: s(r.shippingTitle, d.shippingTitle, 80),
    zones: finalZones,
    defaultZone,
    productsTitle: s(r.productsTitle, d.productsTitle, 80),
    allowQuantity: r.allowQuantity !== false,
    maxQuantity: Math.min(Math.max(Math.trunc(Number(r.maxQuantity) || d.maxQuantity), 1), 50),
    orderTitle: s(r.orderTitle, d.orderTitle, 80),
    paymentTitle: s(r.paymentTitle, d.paymentTitle, 80),
    paymentText: s(r.paymentText, d.paymentText, 300),
    privacyText: s(r.privacyText, d.privacyText, 600),
    buttonText: s(r.buttonText, d.buttonText, 60).trim() || d.buttonText,
    buttonColor: typeof r.buttonColor === "string" && HEX.test(r.buttonColor) ? r.buttonColor : d.buttonColor,
    showTotalOnButton: r.showTotalOnButton !== false,
  };
}

/** Seconds sent by <CheckoutTimer> (time on page, time filling the form); anything odd becomes null. */
export function readCheckoutTiming(formData: FormData) {
  const sec = (k: string) => {
    const n = Number(formData.get(k));
    return Number.isFinite(n) && n > 0 && n <= 86_400 ? Math.round(n) : null;
  };
  return { page: sec("t_page"), checkout: sec("t_form") };
}
