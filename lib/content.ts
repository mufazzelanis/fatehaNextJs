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
};

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
};

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
  };
}
