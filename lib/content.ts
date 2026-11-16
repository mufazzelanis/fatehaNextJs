// Editable landing-page content (client-safe). Stored as JSON in settings.landing_content.
// Text supports **bold** and keeps line breaks; {price} is replaced with the current price.

export type Faq = { q: string; a: string };

export type LandingContent = {
  doctorCaption: string;
  approvalHeading: string;
  orderButtonText: string;
  introText: string;
  showBenefits: boolean;
  benefitsTitle: string;
  benefits: string[];
  showPrice: boolean;
  priceTitle: string;
  priceSubtitle: string;
  showFaq: boolean;
  faqTitle: string;
  faqs: Faq[];
  showIngredients: boolean;
  ingredientsTitle: string;
  ingredients: string[];
  usageTitle: string;
  usageText: string;
  adviceTitle: string;
  adviceText: string;
  checkoutTitle: string;
  thankyouTitle: string;
  thankyouSubtitle: string;
  colors: {
    topButton: string;
    ctaButton: string;
    priceButton: string;
    faqButton: string;
    ingredientsButton: string;
    introBox: string;
    benefitCard: string;
    benefitText: string;
  };
  /** Page background colors (hero gradient, section backgrounds, headings). */
  theme: LandingTheme;
  /** Order of the sections between the hero (always first) and the order form (always last). */
  layout: SectionKey[];
  /** Extra sections the admin adds: text, image, video, customer reviews. Placed via `layout` ("b:<id>"). */
  blocks: Block[];
  /** "full" = the long sales page; "order" = a short quick-order page (product, packages, form). */
  pageType: PageType;
  quick: QuickContent;
};

export type PageType = "full" | "order";
/** Text of the quick-order page (title empty = the product name). */
export type QuickContent = { title: string; subtitle: string; points: string[]; trust: string[]; guidesTitle: string };

export type LandingTheme = {
  heroFrom: string;
  heroTo: string;
  pageBg: string;
  altBg: string;
  headingColor: string;
  benefitsTitleBg: string;
  benefitsTitleText: string;
  formAccent: string;
};

/** Built-in sections that can be moved around. Custom blocks are "b:<id>". */
export const BUILTIN_SECTIONS = ["approval", "intro", "benefits", "cta", "price", "faq", "ingredients"] as const;
export type BuiltinSection = (typeof BUILTIN_SECTIONS)[number];
export type SectionKey = BuiltinSection | `b:${string}`;

export const SECTION_NAMES: Record<BuiltinSection, string> = {
  approval: "Approval heading + 1st order button",
  intro: "Intro text box",
  benefits: "Benefits (কার্যকারীতা)",
  cta: "2nd order button",
  price: "Price section",
  faq: "Questions & answers",
  ingredients: "Ingredients, usage & advice",
};

export const BLOCK_TYPES = ["text", "image", "video", "reviews"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];
export const BLOCK_TYPE_NAMES: Record<BlockType, string> = {
  text: "Text box", image: "Image / photos", video: "Video (YouTube / Facebook)", reviews: "Customer reviews",
};
export type Review = { name: string; text: string; stars: number; image: string };
export type Block = {
  id: string;
  type: BlockType;
  show: boolean;
  title: string;
  text: string;
  /** Uploaded file names (served from /media/<file>). */
  images: string[];
  videoUrl: string;
  reviews: Review[];
  bg: string;
  textColor: string;
  /** Show an order button under the block. */
  button: boolean;
  buttonColor: string;
};

export const MAX_BLOCKS = 20;

export function newBlock(type: BlockType, id: string): Block {
  return {
    id, type, show: true, title: "", text: "", images: [], videoUrl: "", reviews: type === "reviews" ? [{ name: "", text: "", stars: 5, image: "" }] : [],
    bg: "#ffffff", textColor: "#111111", button: true, buttonColor: "#e11d1d",
  };
}

/** YouTube / Facebook link → embeddable player URL (null if it is not a supported video link). */
export function videoEmbed(url: string): { kind: "youtube" | "facebook"; id: string; embed: string; thumb: string | null } | null {
  let u: URL;
  try { u = new URL(url.trim()); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  let yt: string | null = null;
  if (host === "youtu.be") yt = u.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    yt = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)?.[1] ?? null;
  }
  if (yt && /^[\w-]{6,20}$/.test(yt)) {
    return { kind: "youtube", id: yt, embed: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&playsinline=1`, thumb: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` };
  }
  if ((host === "facebook.com" || host === "fb.watch") && u.protocol === "https:") {
    const href = `https://${host === "fb.watch" ? "fb.watch" : "www.facebook.com"}${u.pathname}${u.search}`;
    return { kind: "facebook", id: href, embed: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(href)}&show_text=false&autoplay=true`, thumb: null };
  }
  return null;
}

export const DEFAULT_CONTENT: LandingContent = {
  doctorCaption: "ডা. মোঃ ওমর ফারুক সালমান\nসাঈদ ইষ্টার্ন মেডিক্যাল কলেজ এন্ড হসপিটাল\nসিনিয়র মেডিকেল অফিসার(আরগন ফার্মাসিউটিক্যাল)",
  approvalHeading: "আমাদের প্রোডাক্টি বি এস টি আই ও সাইন্সল্যাব কর্তৃক অনুমোদিত।",
  orderButtonText: "অর্ডার করতে ক্লিক করুন",
  introText: [
    "কেমিক্যাল যুক্ত টুথপেস্ট ব্যবহারে জটিল ও ওরাল ক্যান্সারের ঝুকি রয়েছে।",
    "মাশরুম ডেন্টোকেয়ার প্লাস টুথ পাউডার এটি সাধারণ দাঁতের মাজন নয়, এটি সম্পূর্ন মেডিকেটেড ও প্রাকৃতিক অ্যান্টিবায়োটিক সমৃত একটি দাঁতের মাজন। যাহা শতভাগ আমাদের ওরাল হাইজিন রক্ষা করার পাশাপাশি আমাদের মুখ ও দাঁতের সকল সমস্যা সমাধান করতে সক্ষম।",
    "",
    "ডা. মোঃ ওমর ফারুক সালমান স্যার\n(সাঈদ ইষ্টার্ন মেডিক্যাল কলেজ হাসপাতাল\nসিনিয়র মেডিক্যাল অফিসার, অরগন ফার্মাসিউটিক্যাল)",
    "",
    "তিনি দীর্ঘদিন গবেষনা করে অসংখ্য মানুষের উপর প্রয়োগ করে নিশ্চিত হয়ে এই যুগান্তকারী প্রোডাক্টটি ফর্মুলেশন করেছেন যাহা নিমে সমস্যাগুলো শতভাগ সমাধান দিয়ে থাকে ইনশাআল্লাহ—",
    "",
    "১/ দাঁতের ব্যথা\n২/ দাঁতের মাড়ি ফুলে যাওয়া\n৩/ মুখে দুর্গন্ধ হওয়া\n৪/ মুখে ঘা হওয়া\n৫/ দাঁত দিয়ে রক্ত পড়া\n৬/ দাঁত নড়া ইত্যাদি",
    "",
    "মূলত এই ধরনের সমস্যা হয়ে থাকে খাদ্যাভ্যাসের কারণে, বাজারের অস্বাস্থ্যকর ও ফাস্টফুড জাতীয় খাবার থেকে।",
    "",
    "এতে প্রায় দেশী বিদেশী ৪০টির ও বেশী মূল্যবান ভেষজ উপাদান ব্যাবহার করা হয়েছে যার বাজার মূল্য অনেক বেশী।",
    "",
    "তবে আমাদের সমাজে সকল শ্রেনী পেশার মানুষের অর্থনৈতিক অবস্থা বিবেচনা করে এর দাম নির্ধারন করা হয়েছে {price} টাকা।",
  ].join("\n"),
  showBenefits: true,
  benefitsTitle: "কার্যকারীতা",
  benefits: [
    "দাঁতের ব্যথায় ম্যাজিকের মতো কাজ করবে, ইনশাআল্লাহ কথা দিচ্ছি।",
    "দাঁতের মাড়ি ফুলে যাওয়া এবং গর্ত সৃষ্টি হলে সেই সমস্যায়ও কাজ করবে।",
    "মুখে যেকোনো ধরনের ঘা হলে ম্যাজিকের মতো কাজ করবে।",
    "ক্ষত স্থানে লাগালে ৭২ ঘন্টার মধ্যে শুকিয়ে যাবে, ইনশাআল্লাহ।",
    "দাঁত করবে মুক্তার মতো পরিষ্কার।",
    "দাঁতের দুর্গন্ধ দূর করবে একদম ম্যাজিকের মতো।",
  ],
  showPrice: true,
  priceTitle: "বর্তমান পাচ্ছেন মাত্র {price}/- টাকায় ।",
  priceSubtitle: "আপনি অর্ডার কারার পর প্রোডাক্টটি আপনার বাসায় পৌঁছিয়ে দেওয়া হবে ।",
  showFaq: true,
  faqTitle: "গুরুত্বপূর্ণ কিছু পশ্ন",
  faqs: [
    {
      q: "এতদিন বিশ্বাস করে তো অনেক প্রোডাক্ট ব্যবহার করেছি, কিন্তু কথা আর কাজে মিল পাইনি। আপনারটা ভালো কিভাবে বিশ্বাস করব?",
      a: "আমাদের প্রোডাক্টি বি এস টি আই অনুমোদিত, Science Lab থেকে পরিক্ষিত। আমরা কথা দিচ্ছি **মাশরুম ডেন্টোকেয়ার প্লাস** হবে আপনাদের দাঁত ও মুখের স্থায়িভাবে সমাধান ইনশা-আল্লাহ।",
    },
    {
      q: "সবাই তো একই কথা বলে, কিন্তু পরে দেখা যায় প্রোডাক্টের কোনো কার্যকারিতা নেই।",
      a: "দেখুন, আমরা সবার মতো গতানুগতিকভাবে কথা বলি না। তবে আপনাকে মনে করিয়ে দিতে চাই, এই প্রোডাক্টটি তৈরি করেছেন সাঈদ স্ট্যান্ড মেডিক্যাল কলেজ হসপিটাল সিনিয়র মেডিকেল অফিসার(আরগন ফার্মাসিউটিক্যাল) ডা. মোঃ ওমর ফারুক সালমান স্যার। এই ফর্মুলাটি উনার সিক্রেট একটি ফর্মুলা। তাই গ্যারান্টি দিয়ে বলতে পারি, বিশ্বাস করে নিতে পারেন, ইনশা-আল্লাহ।",
    },
  ],
  showIngredients: true,
  ingredientsTitle: "উপাদান:",
  ingredients: ["মাশরুম", "প্রাকৃতিক জাত ক্যালসিয়াম", "আওবেল", "দারুচিনি", "লবংগ ইত্যাদি আর কিছু গুরুত্বপূর্ণ উপাদান"],
  usageTitle: "ব্যাবহার বিধি :",
  usageText: "সকালে ১ গ্রাম ও রাতে ১ গ্রাম পাউডার দিয়ে ব্রাশ করতে হবে। আর যদি দাঁতে ব্যথা থাকে, রাতে ঘুমানোর সময় ১ গ্রাম পরিমাণ পাউডার ব্যথার স্থানে দিয়ে রাখতে হবে।",
  adviceTitle: "পরামর্শ:",
  adviceText: "বাজারের আজেবাজে ফাস্টফুড খাবার থেকে বিরত থাকুন। নিয়মিত মাশরুম ডেন্টোকেয়ার প্লাস দিয়ে ব্রাশ করুন। নিজের দাঁত ও মুখগহ্বরের বিভিন্ন সমস্যা থেকে সুরক্ষিত থাকুন সারাজীবন, ইনশাআল্লাহ।",
  checkoutTitle: "ফরমটি ফিলাপ করে অর্ডার কনফার্ম করুন",
  thankyouTitle: "আপনার অর্ডারটি সফলভাবে গ্রহন করা হয়েছে।",
  thankyouSubtitle: "কিছুক্ষনের মধ্যে আমাদের একজন প্রতিনিধি আপনাকে কল করে কনফার্ম করবে।",
  colors: {
    topButton: "#ff1414",
    ctaButton: "#b31b1b",
    priceButton: "#ff0000",
    faqButton: "#dde21c",
    ingredientsButton: "#b300ff",
    introBox: "#a4f5e6",
    benefitCard: "#2a1b76",
    benefitText: "#7ff0ea",
  },
  theme: {
    heroFrom: "#8df28d",
    heroTo: "#f3f6f9",
    pageBg: "#f3f6f9",
    altBg: "#efefef",
    headingColor: "#111111",
    benefitsTitleBg: "#b6f20f",
    benefitsTitleText: "#e8232a",
    formAccent: "#5b62f4",
  },
  layout: [...BUILTIN_SECTIONS],
  blocks: [],
  pageType: "full",
  quick: {
    title: "",
    subtitle: "পছন্দের প্যাকেজ বেছে নিয়ে নিচের ফর্মটি পূরণ করুন — পণ্য হাতে পেয়ে টাকা দিন।",
    points: ["১০০% প্রাকৃতিক উপাদানে তৈরি", "বি এস টি আই ও সাইন্সল্যাব অনুমোদিত", "দাঁতের ব্যথা, মাড়ির সমস্যা ও মুখের দুর্গন্ধে কার্যকর", "সকাল-রাত ব্রাশে সহজ ব্যবহার"],
    trust: ["💵 ক্যাশ অন ডেলিভারি", "🚚 সারা বাংলাদেশে ডেলিভারি", "✅ অরিজিনাল পণ্য"],
    guidesTitle: "অর্ডারের আগে জেনে নিন",
  },
};

const FILE = /^[\w.-]{1,120}\.(?:jpe?g|png|webp)$/i;

function normalizeBlock(raw: unknown): Block | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const type = BLOCK_TYPES.find((t) => t === r.type);
  const id = typeof r.id === "string" && /^[a-z0-9]{4,16}$/.test(r.id) ? r.id : null;
  if (!type || !id) return null;
  const d = newBlock(type, id);
  const color = (v: unknown, def: string) => (typeof v === "string" && HEX.test(v) ? v : def);
  const files = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && FILE.test(x)).slice(0, 12) : []);
  const reviews = Array.isArray(r.reviews)
    ? r.reviews.flatMap((x): Review[] => {
        if (!x || typeof x !== "object") return [];
        const v = x as Record<string, unknown>;
        return [{
          name: str(v.name, "", 80), text: str(v.text, "", 2000),
          stars: Math.min(Math.max(Math.round(Number(v.stars) || 5), 1), 5),
          image: typeof v.image === "string" && FILE.test(v.image) ? v.image : "",
        }];
      }).slice(0, 30)
    : d.reviews;
  return {
    id, type, show: bool(r.show, true), title: str(r.title, "", 300), text: str(r.text, "", 10000), images: files(r.images),
    videoUrl: str(r.videoUrl, "", 500), reviews, bg: color(r.bg, d.bg), textColor: color(r.textColor, d.textColor),
    button: bool(r.button, d.button), buttonColor: color(r.buttonColor, d.buttonColor),
  };
}

/** Section order: known keys only, no duplicates; built-in sections missing from an older save are appended. */
function normalizeLayout(raw: unknown, blocks: Block[]): SectionKey[] {
  const ids = new Set(blocks.map((b) => `b:${b.id}`));
  const valid = (k: unknown): k is SectionKey =>
    typeof k === "string" && ((BUILTIN_SECTIONS as readonly string[]).includes(k) || ids.has(k));
  const out: SectionKey[] = [];
  for (const k of Array.isArray(raw) ? raw : []) if (valid(k) && !out.includes(k)) out.push(k);
  for (const k of BUILTIN_SECTIONS) if (!out.includes(k)) out.push(k);
  for (const b of blocks) if (!out.includes(`b:${b.id}`)) out.push(`b:${b.id}`);
  return out;
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const str = (v: unknown, fallback: string, max = 5000) => (typeof v === "string" ? v.slice(0, max) : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const list = (v: unknown, fallback: string[]) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 1000)).slice(0, 50) : fallback;

/** Merges stored (possibly partial or outdated) content over the defaults, discarding anything malformed. */
export function normalizeContent(raw: unknown): LandingContent {
  const d = DEFAULT_CONTENT;
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const c = (r.colors && typeof r.colors === "object" ? r.colors : {}) as Record<string, unknown>;
  const colors = Object.fromEntries(
    Object.entries(d.colors).map(([k, def]) => [k, typeof c[k] === "string" && HEX.test(c[k] as string) ? c[k] : def]),
  ) as LandingContent["colors"];
  const faqs = Array.isArray(r.faqs)
    ? r.faqs
        .filter((f): f is Faq => !!f && typeof f === "object" && typeof (f as Faq).q === "string" && typeof (f as Faq).a === "string")
        .map((f) => ({ q: f.q.slice(0, 1000), a: f.a.slice(0, 5000) }))
        .slice(0, 30)
    : d.faqs;
  const t = (r.theme && typeof r.theme === "object" ? r.theme : {}) as Record<string, unknown>;
  const theme = Object.fromEntries(
    Object.entries(d.theme).map(([k, def]) => [k, typeof t[k] === "string" && HEX.test(t[k] as string) ? t[k] : def]),
  ) as LandingTheme;
  const seen = new Set<string>();
  const blocks = (Array.isArray(r.blocks) ? r.blocks : [])
    .map(normalizeBlock)
    .filter((b): b is Block => !!b && !seen.has(b.id) && !!seen.add(b.id))
    .slice(0, MAX_BLOCKS);

  return {
    doctorCaption: str(r.doctorCaption, d.doctorCaption),
    approvalHeading: str(r.approvalHeading, d.approvalHeading),
    orderButtonText: str(r.orderButtonText, d.orderButtonText, 100),
    introText: str(r.introText, d.introText, 20000),
    showBenefits: bool(r.showBenefits, d.showBenefits),
    benefitsTitle: str(r.benefitsTitle, d.benefitsTitle),
    benefits: list(r.benefits, d.benefits),
    showPrice: bool(r.showPrice, d.showPrice),
    priceTitle: str(r.priceTitle, d.priceTitle),
    priceSubtitle: str(r.priceSubtitle, d.priceSubtitle),
    showFaq: bool(r.showFaq, d.showFaq),
    faqTitle: str(r.faqTitle, d.faqTitle),
    faqs,
    showIngredients: bool(r.showIngredients, d.showIngredients),
    ingredientsTitle: str(r.ingredientsTitle, d.ingredientsTitle),
    ingredients: list(r.ingredients, d.ingredients),
    usageTitle: str(r.usageTitle, d.usageTitle),
    usageText: str(r.usageText, d.usageText),
    adviceTitle: str(r.adviceTitle, d.adviceTitle),
    adviceText: str(r.adviceText, d.adviceText),
    checkoutTitle: str(r.checkoutTitle, d.checkoutTitle),
    thankyouTitle: str(r.thankyouTitle, d.thankyouTitle),
    thankyouSubtitle: str(r.thankyouSubtitle, d.thankyouSubtitle),
    colors,
    theme,
    layout: normalizeLayout(r.layout, blocks),
    blocks,
    pageType: r.pageType === "order" ? "order" : "full",
    quick: (() => {
      const q = (r.quick && typeof r.quick === "object" ? r.quick : {}) as Record<string, unknown>;
      const dq = d.quick;
      return {
        title: str(q.title, dq.title, 160),
        subtitle: str(q.subtitle, dq.subtitle, 400),
        points: Array.isArray(q.points) ? list(q.points, []).map((x) => x.trim()).filter(Boolean).slice(0, 8) : dq.points,
        trust: Array.isArray(q.trust) ? list(q.trust, []).map((x) => x.trim().slice(0, 60)).filter(Boolean).slice(0, 4) : dq.trust,
        guidesTitle: str(q.guidesTitle, dq.guidesTitle, 120),
      };
    })(),
  };
}
