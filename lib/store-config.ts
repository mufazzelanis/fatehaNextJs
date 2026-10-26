// Client-safe storefront configuration (settings.store_config).

export type HeroSlide = { title: string; subtitle: string; cta: string; link: string; image: string; tone: "teal" | "dark" | "sunset" };

export type ButtonStyle = { label: string; bg: string; text: string };
/** How product cards show their buttons. */
export type ButtonLayout = "icon-order" | "both" | "cart-only" | "order-only";
export type StoreButtons = {
  layout: ButtonLayout;
  shape: "rounded" | "pill" | "square";
  cart: ButtonStyle;
  order: ButtonStyle;
};

export const DEFAULT_BUTTONS: StoreButtons = {
  layout: "icon-order",
  shape: "rounded",
  cart: { label: "Add to cart", bg: "#edfdfd", text: "#0f7279" },
  order: { label: "Order now", bg: "#0f7279", text: "#ffffff" },
};

export type StoreConfig = {
  announcement: string;
  buttons: StoreButtons;
  slides: HeroSlide[];
  deliveryInside: number;
  deliveryOutside: number;
  /** Districts charged the "inside" rate (default: Dhaka). */
  insideDistrictIds: number[];
  freeDeliveryOver: number;
  deliveryDays: string;
  supportPhone: string;
  supportEmail: string;
  supportAddress: string;
  facebookUrl: string;
  returnDays: number;
};

export const DEFAULT_STORE: StoreConfig = {
  announcement: "Cash on Delivery all over Bangladesh · 100% authentic imported products",
  buttons: DEFAULT_BUTTONS,
  slides: [
    {
      title: "Authentic baby food, delivered",
      subtitle: "Aptamil, Enfamil, Similac & Nido — imported, sealed and checked before every delivery.",
      cta: "Shop baby food", link: "/shop/category/babys-food-products", image: "", tone: "teal",
    },
    {
      title: "Gentle care for little skin",
      subtitle: "The complete Aveeno Baby range — lotions, wash, sunscreen and eczema care.",
      cta: "Shop skin care", link: "/shop/category/babys-skin-care", image: "", tone: "dark",
    },
    {
      title: "Pay when it arrives",
      subtitle: "Cash on Delivery everywhere in Bangladesh, or pay with bKash, Nagad, Rocket or bank.",
      cta: "Browse all products", link: "/shop", image: "", tone: "sunset",
    },
  ],
  deliveryInside: 60,
  deliveryOutside: 120,
  insideDistrictIds: [47],
  freeDeliveryOver: 0,
  deliveryDays: "Dhaka 1–2 days · Outside Dhaka 2–4 days",
  supportPhone: "",
  supportEmail: "",
  supportAddress: "",
  facebookUrl: "",
  returnDays: 7,
};

const s = (v: unknown, d: string, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : d);
const n = (v: unknown, d: number, min = 0, max = 1_000_000) => {
  const x = Math.round(Number(v));
  return Number.isFinite(x) ? Math.min(Math.max(x, min), max) : d;
};

export function normalizeStore(raw: unknown): StoreConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_STORE;
  const slides = Array.isArray(r.slides)
    ? r.slides
        .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : {}))
        .map((x): HeroSlide => ({
          title: s(x.title, "", 100), subtitle: s(x.subtitle, "", 240), cta: s(x.cta, "Shop now", 40),
          link: (() => { const l = s(x.link, "/shop", 200); return l.startsWith("/") ? l : "/shop"; })(),
          image: s(x.image, "", 200).replace(/[^\w.-]/g, ""),
          tone: x.tone === "dark" || x.tone === "sunset" ? x.tone : "teal",
        }))
        .filter((x) => x.title)
        .slice(0, 6)
    : d.slides;
  return {
    announcement: s(r.announcement, d.announcement, 200),
    buttons: normalizeButtons(r.buttons),
    slides: slides.length ? slides : d.slides,
    deliveryInside: n(r.deliveryInside, d.deliveryInside, 0, 5000),
    deliveryOutside: n(r.deliveryOutside, d.deliveryOutside, 0, 5000),
    insideDistrictIds: Array.isArray(r.insideDistrictIds)
      ? r.insideDistrictIds.map(Number).filter((x) => Number.isInteger(x) && x > 0).slice(0, 64)
      : d.insideDistrictIds,
    freeDeliveryOver: n(r.freeDeliveryOver, d.freeDeliveryOver, 0, 10_000_000),
    deliveryDays: s(r.deliveryDays, d.deliveryDays, 120),
    supportPhone: s(r.supportPhone, d.supportPhone, 20),
    supportEmail: s(r.supportEmail, d.supportEmail, 120),
    supportAddress: s(r.supportAddress, d.supportAddress, 300),
    facebookUrl: (() => { const u = s(r.facebookUrl, "", 200); return /^https:\/\//.test(u) ? u : ""; })(),
    returnDays: n(r.returnDays, d.returnDays, 0, 90),
  };
}

/**
 * "#0aF", "#12b3b8", "12,179,184" or "rgb(12, 179, 184)" → "#12b3b8"; anything else → null.
 * Colours are only ever stored in this canonical form, so they are safe to put in a style attribute.
 */
export function parseColor(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const v = input.trim().toLowerCase();
  const hex = v.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split("").map((c) => c + c).join("") : hex[1];
    return `#${h}`;
  }
  const rgb = v.match(/^(?:rgba?\()?\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*(?:[,/]\s*[\d.]+%?\s*)?\)?$/);
  if (rgb) {
    const parts = rgb.slice(1, 4).map(Number);
    if (parts.every((n) => n <= 255)) return `#${parts.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  }
  return null;
}

export function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** WCAG contrast ratio between two "#rrggbb" colours (1–21). */
export function contrastRatio(a: string, b: string) {
  const lum = (hex: string) => {
    const { r, g, b: bl } = hexToRgb(hex);
    const f = (c: number) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function normalizeButtons(raw: unknown): StoreButtons {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_BUTTONS;
  const btn = (x: unknown, def: ButtonStyle): ButtonStyle => {
    const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
    return { label: s(o.label, def.label, 24) || def.label, bg: parseColor(o.bg) ?? def.bg, text: parseColor(o.text) ?? def.text };
  };
  const layouts: ButtonLayout[] = ["icon-order", "both", "cart-only", "order-only"];
  return {
    layout: layouts.includes(r.layout as ButtonLayout) ? (r.layout as ButtonLayout) : d.layout,
    shape: r.shape === "pill" || r.shape === "square" ? r.shape : "rounded",
    cart: btn(r.cart, d.cart),
    order: btn(r.order, d.order),
  };
}

/** CSS custom properties consumed by the storefront buttons. */
/**
 * Background + text colour for a button whose background an admin picked (e.g. landing page buttons).
 * White text is kept when it is readable (WCAG 4.5:1); otherwise the colour is deepened a little (bright red stays red),
 * and on light colours (yellow, lime…) the text turns dark instead.
 */
export function readableButton(color: string): { backgroundColor: string; color: string } {
  const bg = parseColor(color);
  if (!bg) return { backgroundColor: color, color: "#ffffff" };
  if (contrastRatio(bg, "#ffffff") >= 4.5) return { backgroundColor: bg, color: "#ffffff" };
  const { r, g, b } = hexToRgb(bg);
  for (let k = 0.95; k >= 0.8; k -= 0.05) {
    const darker = `#${[r, g, b].map((c) => Math.round(c * k).toString(16).padStart(2, "0")).join("")}`;
    if (contrastRatio(darker, "#ffffff") >= 4.5) return { backgroundColor: darker, color: "#ffffff" };
  }
  return { backgroundColor: bg, color: "#111111" };
}

export function buttonVars(b: StoreButtons): Record<string, string> {
  return {
    "--cart-bg": b.cart.bg, "--cart-fg": b.cart.text, "--order-bg": b.order.bg, "--order-fg": b.order.text,
    "--btn-radius": b.shape === "pill" ? "9999px" : b.shape === "square" ? "0.375rem" : "0.75rem",
  };
}

/** Delivery charge for a district, honouring the free-delivery threshold. */
export function deliveryCharge(cfg: StoreConfig, districtId: number | null, subtotal: number) {
  if (cfg.freeDeliveryOver > 0 && subtotal >= cfg.freeDeliveryOver) return 0;
  if (!districtId) return cfg.deliveryOutside;
  return cfg.insideDistrictIds.includes(districtId) ? cfg.deliveryInside : cfg.deliveryOutside;
}

/** "৳3,250" — English digits, like the original fatehabd.com. */
export function bdt(value: number) {
  return `৳${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;
}

/** Whole-number discount when a higher regular price is set, else 0. */
export function discountPercent(price: number, regular: number | null) {
  return regular && regular > price ? Math.round(((regular - price) / regular) * 100) : 0;
}
