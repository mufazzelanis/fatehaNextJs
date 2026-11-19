// Product guide pages (/how-to-use, /ingredients, /dental-care): content model, defaults (from FatehaBD's
// documents) and validation. Client-safe — the admin editor uses it too. Saved in settings.guide_content.

const GUIDE_PRODUCT = "মাশরুম ডেন্টোকেয়ার প্লাস";
const GUIDE_PHONES = ["01635517977", "01838466823"];
/** "01635517977" → "0163 55 17 977" (as printed on the product material). */
export const prettyPhone = (p: string) => `${p.slice(0, 4)} ${p.slice(4, 6)} ${p.slice(6, 8)} ${p.slice(8)}`;

const GUIDE_LIST = [
  { href: "/how-to-use", label: "ব্যবহারবিধি", short: "ব্যবহারবিধি", icon: "🪥", text: "সকাল, রাত ও বিশেষ ব্যবহারের সঠিক নিয়ম" },
  { href: "/ingredients", label: "উপাদান পরিচিতি", short: "উপাদান", icon: "🌿", text: "১৪টি প্রাকৃতিক উপাদানের পরিচয় ও বৈশিষ্ট্য" },
  { href: "/dental-care", label: "দাঁতের যত্ন গাইড", short: "যত্ন গাইড", icon: "🦷", text: "সুস্থ দাঁত ও মাড়ির জন্য ২৬টি জরুরি পরামর্শ" },
  { href: "/thank-you", label: "ধন্যবাদ", short: "ধন্যবাদ", icon: "💚", text: "পণ্য হাতে পাওয়ার পর — ব্যবহারের গাইড, মতামত ও যোগাযোগ" },
] as const;

// ───────────── ব্যবহারবিধি

const USAGE = {
  title: "সঠিক ব্যবহারের নিয়ম জেনে নিন",
  intro: "আপনার প্রতিদিনের Oral Care Routine-এর জন্য ব্যবহারবিধি ও প্রয়োজনীয় নির্দেশনা।",
  steps: [
    {
      step: "ধাপ ১", title: "সকালে ব্যবহার", icon: "🌅", tone: "amber",
      points: [
        "টুথব্রাশে পরিমাণমতো মাশরুম ডেন্টোকেয়ার প্লাস নিন।",
        "স্বাভাবিক নিয়মে আলতোভাবে দাঁত পরিষ্কার করুন।",
        "ব্যবহারের পর ভালোভাবে কুলি করুন।",
      ],
    },
    {
      step: "ধাপ ২", title: "রাতে ব্যবহার", icon: "🌙", tone: "indigo",
      points: [
        "প্রতিদিন রাতে ঘুমানোর আগে একই নিয়মে দাঁত পরিষ্কার করুন।",
        "দাঁত ও মুখ পরিষ্কার রাখার অভ্যাস বজায় রাখুন।",
      ],
    },
    {
      step: "ধাপ ৩", title: "বিশেষ ব্যবহারের নিয়ম", icon: "⭐", tone: "emerald",
      text: "প্রস্তুতকারকের অনুমোদিত বিশেষ নির্দেশনা অনুযায়ী, নির্দিষ্ট দাঁতে ব্যবহারের ক্ষেত্রে রাতে অল্প পরিমাণ পাউডার লাগিয়ে রাখা এবং সকালে কুসুম গরম পানি দিয়ে কুলি করার নিয়ম রয়েছে।",
    },
  ],
  notesTitle: "আরও কিছু গুরুত্বপূর্ণ নির্দেশনা",
  notes: [
    "পণ্যটি শুধুমাত্র নির্দেশিত নিয়মে ব্যবহার করুন।",
    "অস্বস্তি, জ্বালাপোড়া বা অ্যালার্জি হলে ব্যবহার বন্ধ করুন।",
  ],
} as const;

// ───────────── উপাদান পরিচিতি

export type Ingredient = {
  bn: string; en: string; sciLabel?: string; sci?: string; icon: string;
  intro: string; points: string[]; footnote?: string; note?: { kind: "warning" | "info"; text: string };
};

const INGREDIENTS_INTRO = {
  title: "প্রকৃতির বিভিন্ন উপাদানের পরিচয় জানুন",
  subtitle: "Know Your Ingredients | Fateha BD",
  text: [
    "আমাদের পণ্যে ব্যবহৃত প্রতিটি উপাদানের নিজস্ব পরিচয় ও বৈশিষ্ট্য রয়েছে। আমরা চাই, আপনি যে পণ্যটি ব্যবহার করছেন তার উপাদানগুলো সম্পর্কে বিস্তারিত জানুন।",
    "এই পেজে মাশরুম ডেন্টোকেয়ার প্লাসে ব্যবহৃত উপাদানগুলোর নাম, পরিচিতি, প্রাকৃতিক উৎস এবং সাধারণ বৈশিষ্ট্য তুলে ধরা হয়েছে।",
  ],
  closingTitle: "উপাদান সম্পর্কে জানুন, সচেতন সিদ্ধান্ত নিন",
  closing: [
    "আমরা বিশ্বাস করি, একটি পণ্য সম্পর্কে জানার পাশাপাশি সেই পণ্যের উপাদান সম্পর্কেও জানা জরুরি।",
    "মাশরুম ডেন্টোকেয়ার প্লাসের উপাদানগুলো সম্পর্কে বিস্তারিত জানতে এই পেজটি আপনার জন্য তৈরি করা হয়েছে।",
  ],
  signature: "আপনার সচেতনতা আমাদের কাছে গুরুত্বপূর্ণ।",
};

const INGREDIENTS: (Ingredient & { no: string })[] = [
  {
    no: "০১", bn: "মাশরুম", en: "Shiitake Mushroom", sciLabel: "বৈজ্ঞানিক নাম", sci: "Lentinula edodes", icon: "🍄",
    intro: "Shiitake একটি পরিচিত ভোজ্য মাশরুম। এটি পূর্ব এশিয়ার খাদ্যসংস্কৃতিতে দীর্ঘদিন ধরে ব্যবহৃত হয়ে আসছে।",
    points: ["বৈজ্ঞানিকভাবে শনাক্ত একটি মাশরুম প্রজাতি।", "এর প্রাকৃতিক গঠন ও পুষ্টিগত উপাদান নিয়ে বিভিন্ন গবেষণা রয়েছে।", "এতে Polysaccharides এবং Beta-glucans-এর মতো যৌগ পাওয়া যায়।"],
    footnote: "মাশরুম ডেন্টোকেয়ার প্লাসের উপাদান তালিকায় এই মাশরুম প্রজাতির নাম উল্লেখ রয়েছে।",
  },
  {
    no: "০২", bn: "লবঙ্গ", en: "Clove", sciLabel: "বৈজ্ঞানিক নাম", sci: "Syzygium aromaticum", icon: "🌸",
    intro: "লবঙ্গ একটি সুগন্ধি মসলা, যা লবঙ্গ গাছের শুকনো ফুলের কুঁড়ি থেকে পাওয়া যায়।",
    points: ["এর নিজস্ব সুগন্ধ রয়েছে।", "এতে Eugenol নামের একটি প্রাকৃতিক যৌগ পাওয়া যায়।", "খাদ্য ও সুগন্ধি উপাদান হিসেবে পরিচিত।"],
  },
  {
    no: "০৩", bn: "এলাচ", en: "Cardamom", sciLabel: "বৈজ্ঞানিক নাম", sci: "Elettaria cardamomum", icon: "🫛",
    intro: "এলাচ একটি সুগন্ধি মসলা। এর বীজে প্রাকৃতিক সুগন্ধি উপাদান রয়েছে।",
    points: ["মিষ্টি ও স্বতন্ত্র সুগন্ধের জন্য পরিচিত।", "রান্না ও বিভিন্ন খাদ্যপণ্যে ব্যবহৃত হয়।", "এর মধ্যে বিভিন্ন Volatile Aromatic Compounds রয়েছে।"],
  },
  {
    no: "০৪", bn: "দারুচিনি", en: "Cinnamon", sciLabel: "ইংরেজি নাম", sci: "Cinnamon", icon: "🪵",
    intro: "দারুচিনি একটি সুপরিচিত মসলা, যা দারুচিনি গাছের ছাল থেকে সংগ্রহ করা হয়।",
    points: ["প্রাকৃতিক সুগন্ধযুক্ত উদ্ভিজ্জ উপাদান।", "খাদ্য ও পানীয় তৈরিতে বহুল ব্যবহৃত।", "এতে Cinnamaldehyde-এর মতো সুগন্ধি যৌগ রয়েছে।"],
  },
  {
    no: "০৫", bn: "গোলমরিচ", en: "Black Pepper", sciLabel: "বৈজ্ঞানিক নাম", sci: "Piper nigrum", icon: "⚫",
    intro: "গোলমরিচ একটি পরিচিত মসলা, যা গোলমরিচ গাছের শুকনো ফল থেকে পাওয়া যায়।",
    points: ["স্বতন্ত্র ঝাঁঝালো স্বাদের জন্য পরিচিত।", "এতে Piperine নামের একটি প্রাকৃতিক যৌগ রয়েছে।", "খাদ্য ও মসলা হিসেবে বহুল ব্যবহৃত।"],
  },
  {
    no: "০৬", bn: "যষ্টিমধু", en: "Licorice", sciLabel: "বৈজ্ঞানিক নাম", sci: "Glycyrrhiza glabra", icon: "🌱",
    intro: "যষ্টিমধু একটি পরিচিত ভেষজ উদ্ভিদ। এর মূল বিভিন্ন ঐতিহ্যবাহী ভেষজ প্রস্তুতিতে ব্যবহৃত হয়।",
    points: ["প্রাকৃতিক মিষ্টি স্বাদের জন্য পরিচিত।", "এর মূলে Glycyrrhizin নামের একটি যৌগ রয়েছে।", "উদ্ভিদটির রাসায়নিক বৈশিষ্ট্য নিয়ে বিভিন্ন গবেষণা হয়েছে।"],
  },
  {
    no: "০৭", bn: "পিপুল", en: "Long Pepper", sciLabel: "বৈজ্ঞানিক নাম", sci: "Piper longum", icon: "🌶️",
    intro: "পিপুল একটি সুপরিচিত মসলা ও ভেষজ উদ্ভিদ। এর শুকনো ফল ঐতিহ্যবাহী বিভিন্ন প্রস্তুতিতে ব্যবহৃত হয়।",
    points: ["Piper প্রজাতির একটি উদ্ভিদ।", "এতে Piperine-সহ বিভিন্ন প্রাকৃতিক যৌগ পাওয়া যায়।", "এর স্বাদ ঝাঁঝালো।"],
  },
  {
    no: "০৮", bn: "আদা", en: "Ginger", sciLabel: "বৈজ্ঞানিক নাম", sci: "Zingiber officinale", icon: "🫚",
    intro: "আদা একটি পরিচিত সুগন্ধি উদ্ভিদ। এর ভূগর্ভস্থ কাণ্ড বা Rhizome খাদ্য ও ভেষজ প্রস্তুতিতে ব্যবহৃত হয়।",
    points: ["স্বতন্ত্র ঝাঁঝালো সুগন্ধ ও স্বাদের জন্য পরিচিত।", "এতে Gingerol নামের প্রাকৃতিক যৌগ রয়েছে।", "খাদ্য ও পানীয় তৈরিতে বহুল ব্যবহৃত।"],
  },
  {
    no: "০৯", bn: "আমলকি", en: "Indian Gooseberry", sciLabel: "বৈজ্ঞানিক নাম", sci: "Phyllanthus emblica", icon: "🟢",
    intro: "আমলকি একটি পরিচিত ফল। এটি বিভিন্ন খাদ্য ও ঐতিহ্যবাহী ভেষজ প্রস্তুতিতে ব্যবহৃত হয়।",
    points: ["প্রাকৃতিকভাবে Vitamin C-এর উৎস।", "এতে বিভিন্ন Polyphenolic Compounds রয়েছে।", "ফলটি খাদ্য হিসেবে বহুল পরিচিত।"],
  },
  {
    no: "১০", bn: "সুপারি", en: "Areca Nut", sciLabel: "বৈজ্ঞানিক নাম", sci: "Areca catechu", icon: "🌰",
    intro: "সুপারি একটি পামজাতীয় উদ্ভিদের ফল। এর শুকনো বীজকে সুপারি বলা হয়।",
    points: ["এর মধ্যে বিভিন্ন Alkaloids রয়েছে।", "এতে Arecoline নামের একটি সক্রিয় যৌগ পাওয়া যায়।", "পণ্যের উপাদান তালিকায় সুপারি পাউডারের উল্লেখ রয়েছে।"],
    note: {
      kind: "warning",
      text: "স্বাস্থ্য ও নিরাপত্তা সতর্কতা: সুপারি মানুষের জন্য ক্যানসার সৃষ্টিকারী হিসেবে আন্তর্জাতিকভাবে স্বীকৃত। তাই মুখে ব্যবহারের পণ্যে এর উপস্থিতি একটি গুরুত্বপূর্ণ নিরাপত্তার বিষয়। এর পরিমাণ, প্রস্তুতপ্রণালি ও সম্পূর্ণ ফর্মুলেশনের Oral Safety মূল্যায়ন ছাড়া নিরাপদ ব্যবহারের দাবি করা যাবে না।",
    },
  },
  {
    no: "১১", bn: "সাদা লজ্জাবতী", en: "Sensitive Plant", sciLabel: "সম্ভাব্য বৈজ্ঞানিক পরিচয়", sci: "Mimosa pudica", icon: "🍃",
    intro: "লজ্জাবতী একটি পরিচিত সংবেদনশীল উদ্ভিদ। এর পাতায় স্পর্শ করলে পাতা ভাঁজ হয়ে যায়।",
    points: ["উদ্ভিদটির পাতার বিশেষ সংবেদনশীল বৈশিষ্ট্য রয়েছে।", "বিভিন্ন ঐতিহ্যবাহী ভেষজ ব্যবহারে এর উল্লেখ রয়েছে।", "উদ্ভিদটির বিভিন্ন অংশ নিয়ে গবেষণা হয়েছে।"],
    note: { kind: "info", text: "দ্রষ্টব্য: প্রস্তুতকারকের কাছ থেকে সঠিক প্রজাতি ও ব্যবহৃত অংশ নিশ্চিত করতে হবে।" },
  },
  {
    no: "১২", bn: "পুদিনা পাতা", en: "Mint Leaves", sciLabel: "সম্ভাব্য বৈজ্ঞানিক নাম", sci: "Mentha spp.", icon: "🌿",
    intro: "পুদিনা একটি সুগন্ধি উদ্ভিদ। এর পাতা বিভিন্ন খাদ্য ও সুগন্ধি প্রস্তুতিতে ব্যবহৃত হয়।",
    points: ["সতেজ সুগন্ধের জন্য পরিচিত।", "কিছু প্রজাতিতে Menthol পাওয়া যায়।", "খাদ্য, পানীয় ও সুগন্ধি পণ্যে ব্যবহৃত হয়।"],
  },
  {
    no: "১৩", bn: "জিগা গাছের ছাল", en: "Jiga Tree Bark", sciLabel: "সম্ভাব্য বৈজ্ঞানিক নাম", sci: "Lannea coromandelica", icon: "🌳",
    intro: "জিগা গাছের ছাল একটি উদ্ভিজ্জ উপাদান হিসেবে তালিকায় উল্লেখ রয়েছে।",
    points: ["এটি গাছের কাণ্ডের ছালজাতীয় উপাদান।", "উদ্ভিদটির বিভিন্ন অংশ নিয়ে ঐতিহ্যবাহী ব্যবহার ও গবেষণার উল্লেখ রয়েছে।"],
    note: { kind: "info", text: "দ্রষ্টব্য: স্থানীয় নামের ভিন্নতা থাকতে পারে। প্রস্তুতকারকের Botanical Identification দিয়ে প্রজাতিটি নিশ্চিত করা প্রয়োজন।" },
  },
  {
    no: "১৪", bn: "প্রাকৃতিক ক্যালসিয়াম", en: "Natural Calcium", icon: "🦴",
    intro: "ক্যালসিয়াম একটি গুরুত্বপূর্ণ খনিজ উপাদান।",
    points: ["এটি একটি Essential Mineral।", "দাঁত ও হাড়ের স্বাভাবিক গঠনে ক্যালসিয়ামের ভূমিকা রয়েছে।", "বিভিন্ন প্রাকৃতিক ও খনিজ উৎস থেকে ক্যালসিয়াম পাওয়া যায়।"],
    note: { kind: "info", text: "দ্রষ্টব্য: মাশরুম ডেন্টোকেয়ার প্লাসে ব্যবহৃত ক্যালসিয়ামের নির্দিষ্ট উৎস ও রাসায়নিক রূপ প্রস্তুতকারকের কাছ থেকে নিশ্চিত করতে হবে।" },
  },
];

// ───────────── দাঁতের যত্ন গাইড

export type CareTip = { title: string; icon: string; points: string[]; steps?: boolean };
export type CareGroup = { id: string; title: string; icon: string; tips: CareTip[] };

const CARE_INTRO = {
  title: "সুস্থ দাঁত ও মাড়ির জন্য দাঁতের যত্ন গাইড",
  text: "প্রতিদিনের ছোট ছোট সঠিক অভ্যাসই দাঁত ও মাড়িকে সুস্থ রাখে। নিচের ২৬টি পরামর্শ নিজে মেনে চলুন, পরিবারের সবাইকেও জানান।",
};

const tip = (n: number, icon: string, title: string, points: string[], steps = false) => ({ n, icon, title, points, steps });

const CARE_GROUPS: { id: string; title: string; icon: string; tips: (CareTip & { n: number })[] }[] = [
  {
    id: "brushing", title: "ব্রাশ ও টুথব্রাশ", icon: "🪥",
    tips: [
      tip(1, "⏰", "সুস্থ দাঁতের জন্য দিনে কয়বার এবং কখন ব্রাশ করবেন?", [
        "দিনে অন্তত ২ বার দাঁত ব্রাশ করা উচিত।", "প্রতিবার প্রায় ২ মিনিট ব্রাশ করুন।", "রাতে ঘুমানোর আগে ব্রাশ করা বিশেষ গুরুত্বপূর্ণ।",
        "নরম ব্রাশ ব্যবহার করুন।", "ফ্লোরাইডযুক্ত টুথপেস্ট ব্যবহার করুন।",
      ]),
      tip(2, "🪥", "সঠিকভাবে দাঁত ব্রাশ করার ৫টি নিয়ম", [
        "ব্রাশটি দাঁতের মাড়ির সঙ্গে ৪৫° কোণে ধরুন।", "আলতোভাবে ছোট ছোট বৃত্তাকার গতিতে ব্রাশ করুন।", "দাঁতের বাইরের ও ভেতরের সব অংশ পরিষ্কার করুন।",
        "দাঁতের চিবানোর অংশ ভালোভাবে ব্রাশ করুন।", "জিহ্বা পরিষ্কার করুন এবং মোট ২ মিনিট সময় নিন।",
      ], true),
      tip(3, "⏱️", "কত মিনিট দাঁত ব্রাশ করবেন?", [
        "প্রতিবার দাঁত ব্রাশ করতে অন্তত ২ মিনিট সময় দিন।", "সকালে ২ মিনিট দাঁত ব্রাশ করুন।", "রাতে ঘুমানোর আগে ২ মিনিট ব্রাশ করুন।",
        "মুখের চারটি অংশে সমান সময় দিন।", "দাঁতের বাইরের, ভেতরের ও চিবানোর অংশ পরিষ্কার করুন।", "অতিরিক্ত জোরে বা দ্রুত ব্রাশ করবেন না।",
      ]),
      tip(4, "🔍", "কোন ধরনের Toothbrush ব্যবহার করবেন?", [
        "Soft Bristle বা নরম শলাকাযুক্ত টুথব্রাশ বেছে নিন।", "ছোট বা মাঝারি Brush Head ব্যবহার করুন, যাতে পেছনের দাঁতেও পৌঁছানো যায়।",
        "আরামদায়ক Grip-যুক্ত ব্রাশ নির্বাচন করুন।", "শক্ত শলাকাযুক্ত (Hard Bristle) ব্রাশ এড়িয়ে চলুন।", "প্রতি ৩–৪ মাস পর অথবা ব্রাশের শলাকা ছড়িয়ে গেলে পরিবর্তন করুন।",
      ]),
      tip(5, "🔄", "Toothbrush কতদিন পর পরিবর্তন করবেন?", [
        "সাধারণত প্রতি ৩–৪ মাস পর টুথব্রাশ পরিবর্তন করুন।", "ব্রাশের শলাকা ছড়িয়ে গেলে আগেই পরিবর্তন করুন।", "ব্রাশের শলাকা বাঁকা বা ক্ষতিগ্রস্ত হলে ব্যবহার বন্ধ করুন।",
        "অসুস্থতার পর টুথব্রাশ পরিবর্তনের বিষয়ে চিকিৎসকের পরামর্শ নিন।", "টুথব্রাশ ব্যবহারের পর ভালোভাবে ধুয়ে বাতাস চলাচল করে এমন স্থানে রাখুন।",
      ]),
      tip(26, "🧺", "Toothbrush সংরক্ষণের সঠিক নিয়ম", [
        "প্রতিবার ব্রাশ করার পর পরিষ্কার প্রবাহমান পানি দিয়ে টুথব্রাশ ধুয়ে নিন।", "ব্রাশের শলাকায় লেগে থাকা টুথপেস্ট ও ময়লা পরিষ্কার করুন।",
        "টুথব্রাশ সোজা করে দাঁড় করিয়ে রাখুন।", "খোলা ও বাতাস চলাচল করে এমন স্থানে শুকাতে দিন।", "পরিবারের অন্য সদস্যদের টুথব্রাশ থেকে আলাদা রাখুন।",
        "ভেজা টুথব্রাশ দীর্ঘ সময় বন্ধ কভার বা কন্টেইনারে আটকে রাখবেন না।", "প্রতি ৩–৪ মাস পর অথবা শলাকা নষ্ট হলে আগেই পরিবর্তন করুন।",
      ]),
    ],
  },
  {
    id: "daily", title: "প্রতিদিনের যত্ন", icon: "☀️",
    tips: [
      tip(6, "🛡️", "ফ্লুরাইডযুক্ত টুথপেস্ট কেন গুরুত্বপূর্ণ?", [
        "Fluoride দাঁতের এনামেলকে অ্যাসিডের আক্রমণের বিরুদ্ধে আরও প্রতিরোধী করতে সাহায্য করে।", "দাঁতের ক্ষয় বা Dental Caries প্রতিরোধে সাহায্য করে।",
        "প্রাথমিক পর্যায়ের দাঁতের ক্ষয় পুনরায় খনিজায়নে (Remineralization) সহায়তা করে।", "নিয়মিত ফ্লুরাইডযুক্ত টুথপেস্ট ব্যবহার দাঁতের সুরক্ষায় কার্যকর।",
        "ব্রাশ করার পর অতিরিক্ত টুথপেস্ট থুতু ফেলে দিন, সঙ্গে সঙ্গে পানি দিয়ে কুলি করবেন না।",
      ]),
      tip(7, "👅", "জিহ্বা পরিষ্কার রাখার প্রয়োজনীয়তা", [
        "জিহ্বায় জমে থাকা ব্যাকটেরিয়া ও খাদ্যকণা মুখের দুর্গন্ধের কারণ হতে পারে।", "নিয়মিত জিহ্বা পরিষ্কার করলে মুখের পরিচ্ছন্নতা বজায় রাখতে সাহায্য করে।",
        "জিহ্বা পরিষ্কারের জন্য Tongue Cleaner ব্যবহার করতে পারেন।", "জিহ্বা পরিষ্কারের সময় অতিরিক্ত চাপ প্রয়োগ করবেন না।", "জিহ্বার দুই পাশ ও পেছনের অংশ আলতোভাবে পরিষ্কার করুন।",
      ]),
      tip(8, "🍽️", "খাবারের পর মুখ পরিষ্কার রাখার নিয়ম", [
        "খাবারের পর পরিষ্কার পানি দিয়ে মুখ কুলি করুন।", "দাঁতের ফাঁকে খাবার আটকে থাকলে Dental Floss ব্যবহার করুন।", "প্রতিবার খাবারের পরপরই ব্রাশ করার প্রয়োজন নেই।",
        "মিষ্টি ও চিনিযুক্ত খাবার খাওয়ার পর মুখের পরিচ্ছন্নতার দিকে বিশেষ নজর দিন।", "দিনে দুইবার ফ্লুরাইডযুক্ত টুথপেস্ট দিয়ে ২ মিনিট দাঁত ব্রাশ করুন।",
      ]),
      tip(9, "🧵", "Dental Floss ব্যবহারের নিয়ম", [
        "প্রতিদিন অন্তত একবার Dental Floss ব্যবহারের অভ্যাস করুন।", "প্রায় ১৮ ইঞ্চি ফ্লস নিয়ে দুই হাতের আঙুলে পেঁচিয়ে নিন।", "দুই দাঁতের মাঝখানে আলতোভাবে ফ্লস প্রবেশ করান।",
        "দাঁতের পাশ ঘেঁষে C আকৃতিতে ফ্লস ধরে ওপর-নিচে পরিষ্কার করুন।", "প্রতিটি দাঁতের ফাঁক পরিষ্কারের জন্য ফ্লসের পরিষ্কার অংশ ব্যবহার করুন।", "মাড়িতে জোরে চাপ দেবেন না।",
      ]),
      tip(10, "🩷", "মাড়ির যত্ন নেওয়ার উপায়", [
        "প্রতিদিন দুইবার নরম ব্রাশ দিয়ে দাঁত ও মাড়ির সংযোগস্থল পরিষ্কার করুন।", "দাঁতের ফাঁক পরিষ্কারের জন্য প্রতিদিন Dental Floss ব্যবহার করুন।",
        "ব্রাশ করার সময় মাড়িতে অতিরিক্ত চাপ দেবেন না।", "ধূমপান ও তামাকজাতীয় পণ্য পরিহার করুন।", "মাড়ি থেকে রক্ত পড়া, ফুলে যাওয়া বা ব্যথা হলে ডেন্টিস্টের পরামর্শ নিন।",
      ]),
      tip(14, "💧", "পানি পান ও মুখের পরিচ্ছন্নতা", [
        "পর্যাপ্ত পানি পান মুখের স্বাভাবিক আর্দ্রতা বজায় রাখতে সাহায্য করে।", "পানি মুখের খাদ্যকণা ও কিছু অবশিষ্টাংশ ধুয়ে সরাতে সাহায্য করে।",
        "লালা (Saliva) দাঁতের এনামেল সুরক্ষা ও মুখের স্বাভাবিক ভারসাম্য বজায় রাখতে গুরুত্বপূর্ণ ভূমিকা রাখে।", "মুখ শুকিয়ে যাওয়া বা Dry Mouth হলে দাঁতের ক্ষয়ের ঝুঁকি বাড়তে পারে।",
        "চিনিযুক্ত কোমল পানীয়ের পরিবর্তে সাধারণ পানি পান করার অভ্যাস করুন।", "খাবারের পর পরিষ্কার পানি দিয়ে কুলি করুন।",
      ]),
      tip(18, "🧑", "বড়দের Oral Care Routine", [
        "সকালে ঘুম থেকে উঠে ফ্লুরাইডযুক্ত টুথপেস্ট দিয়ে ২ মিনিট দাঁত ব্রাশ করুন।", "প্রতিদিন অন্তত একবার Dental Floss ব্যবহার করুন।", "জিহ্বা আলতোভাবে পরিষ্কার করুন।",
        "খাবারের পর পানি দিয়ে মুখ কুলি করুন।", "পর্যাপ্ত পানি পান করুন এবং চিনিযুক্ত খাবার কমিয়ে দিন।", "রাতে ঘুমানোর আগে অবশ্যই দাঁত ব্রাশ করুন।",
        "প্রতি ৩–৪ মাস পর টুথব্রাশ পরিবর্তন করুন।", "নিয়মিত ডেন্টিস্টের কাছে দাঁত ও মাড়ি পরীক্ষা করান।",
      ]),
      tip(19, "🌙", "রাতে ঘুমানোর আগে দাঁতের যত্ন", [
        "রাতে ঘুমানোর আগে অবশ্যই ২ মিনিট দাঁত ব্রাশ করুন।", "ফ্লুরাইডযুক্ত টুথপেস্ট ব্যবহার করুন।", "Dental Floss দিয়ে দাঁতের ফাঁকে জমে থাকা খাবার ও প্লাক পরিষ্কার করুন।",
        "জিহ্বা আলতোভাবে পরিষ্কার করুন।", "ব্রাশ করার পর অতিরিক্ত টুথপেস্ট থুতু ফেলে দিন, পানি দিয়ে কুলি করবেন না।",
        "ব্রাশ করার পর আর কোনো খাবার বা চিনিযুক্ত পানীয় গ্রহণ করবেন না। প্রয়োজনে সাধারণ পানি পান করতে পারেন।",
      ]),
    ],
  },
  {
    id: "problems", title: "দাঁত ও মাড়ির সমস্যা", icon: "🩺",
    tips: [
      tip(11, "💎", "দাঁতের এনামেল কী?", [
        "দাঁতের সবচেয়ে বাইরের শক্ত আবরণকে Enamel বা এনামেল বলে।", "এটি মানবদেহের সবচেয়ে শক্ত ও খনিজসমৃদ্ধ টিস্যু।", "এনামেল দাঁতের ভেতরের সংবেদনশীল অংশকে সুরক্ষা দেয়।",
        "অতিরিক্ত অ্যাসিডিক খাবার ও পানীয় এনামেলের ক্ষয় ঘটাতে পারে।", "একবার এনামেল পুরোপুরি নষ্ট হয়ে গেলে শরীর স্বাভাবিকভাবে তা পুনরায় তৈরি করতে পারে না।",
        "ফ্লুরাইডযুক্ত টুথপেস্ট ব্যবহার ও সঠিক Oral Care অভ্যাস এনামেল সুরক্ষায় সাহায্য করে।",
      ]),
      tip(12, "🍬", "চিনি কীভাবে দাঁতের ক্ষতি করে?", [
        "মুখের ব্যাকটেরিয়া চিনিকে ব্যবহার করে অ্যাসিড তৈরি করে।", "এই অ্যাসিড দাঁতের এনামেলের খনিজ পদার্থ ক্ষয় করতে পারে।", "দীর্ঘদিন এমন চলতে থাকলে দাঁতে ক্যাভিটি বা গর্ত তৈরি হতে পারে।",
        "চকলেট, মিষ্টি, কোমল পানীয় ও চিনিযুক্ত খাবার দাঁতের ক্ষয়ের ঝুঁকি বাড়ায়।", "দিনে বারবার চিনিযুক্ত খাবার খাওয়ার অভ্যাস কমিয়ে আনুন।",
        "খাবারের পর পানি দিয়ে মুখ কুলি করুন এবং দিনে দুইবার ফ্লুরাইডযুক্ত টুথপেস্ট দিয়ে ব্রাশ করুন।",
      ]),
      tip(15, "😮‍💨", "মুখের দুর্গন্ধের সাধারণ কারণ", [
        "জিহ্বায় ব্যাকটেরিয়া ও আবরণ জমে থাকা।", "দাঁতের ফাঁকে খাবারের কণা আটকে থাকা।", "নিয়মিত দাঁত ও মুখ পরিষ্কার না করা।", "মুখ শুকিয়ে যাওয়া বা Dry Mouth।",
        "দাঁত ও মাড়ির বিভিন্ন সমস্যা।", "ধূমপান ও তামাকজাতীয় পণ্য ব্যবহার।", "কিছু ক্ষেত্রে সাইনাস, টনসিল বা অন্যান্য শারীরিক সমস্যাও কারণ হতে পারে।",
      ]),
      tip(16, "🦷", "দাঁতের ফাঁকে খাবার আটকে গেলে কী করবেন?", [
        "দাঁতের ফাঁকে খাবার আটকে গেলে প্রথমে পরিষ্কার পানি দিয়ে কুলি করুন।", "Dental Floss ব্যবহার করে আলতোভাবে খাবার বের করুন।",
        "দাঁতের ফাঁক বড় হলে উপযুক্ত মাপের Interdental Brush ব্যবহার করতে পারেন।", "কাঠি, পিন, সুঁই বা ধারালো কোনো বস্তু দিয়ে খাবার বের করার চেষ্টা করবেন না।",
        "মাড়িতে অতিরিক্ত চাপ দেবেন না।", "একই জায়গায় বারবার খাবার আটকে গেলে ডেন্টিস্টের পরামর্শ নিন।",
      ]),
      tip(20, "🧊", "দাঁতের সংবেদনশীলতা সম্পর্কে সচেতনতা", [
        "দাঁতের এনামেল ক্ষয় হলে ভেতরের ডেন্টিন উন্মুক্ত হতে পারে।", "মাড়ি সরে গেলে দাঁতের সংবেদনশীল অংশ উন্মুক্ত হতে পারে।", "অতিরিক্ত জোরে ব্রাশ করার অভ্যাস দাঁতের ও মাড়ির ক্ষতি করতে পারে।",
        "ঠান্ডা, গরম, মিষ্টি বা টক খাবারে দাঁতে শিরশির অনুভূতি হতে পারে।", "Soft Bristle টুথব্রাশ ব্যবহার করুন এবং আলতোভাবে ব্রাশ করুন।",
        "প্রয়োজনে ডেন্টিস্টের পরামর্শে Sensitivity Toothpaste ব্যবহার করুন।", "দীর্ঘস্থায়ী বা নির্দিষ্ট একটি দাঁতে তীব্র সংবেদনশীলতা হলে ডেন্টিস্টের কাছে যান।",
      ]),
      tip(21, "🕳️", "দাঁতের ক্ষয় কীভাবে হয়?", [
        "মুখের ব্যাকটেরিয়া খাবারের চিনি ব্যবহার করে অ্যাসিড তৈরি করে।", "এই অ্যাসিড দাঁতের Enamel থেকে খনিজ পদার্থ কমিয়ে দেয়।", "বারবার অ্যাসিডের আক্রমণে দাঁতের এনামেল দুর্বল হয়ে যায়।",
        "সময়মতো প্রতিরোধ না করলে দাঁতে ছোট গর্ত বা Cavity তৈরি হতে পারে।", "ক্ষয় গভীরে পৌঁছালে Dentin ও দাঁতের Pulp আক্রান্ত হতে পারে।",
        "নিয়মিত ফ্লুরাইডযুক্ত টুথপেস্ট ব্যবহার, দিনে দুইবার ব্রাশ এবং চিনিযুক্ত খাবার কমানো দাঁতের ক্ষয় প্রতিরোধে সাহায্য করে।",
      ], true),
      tip(22, "🩸", "মাড়ি থেকে রক্ত পড়লে কী করবেন?", [
        "দাঁতে প্লাক জমে মাড়িতে প্রদাহ হলে রক্ত পড়তে পারে।", "নিয়মিত দাঁত ও মাড়ি পরিষ্কার না করলে Gingivitis হতে পারে।", "অতিরিক্ত জোরে ব্রাশ করলে মাড়িতে আঘাত লাগতে পারে।",
        "Soft Bristle টুথব্রাশ দিয়ে আলতোভাবে দাঁত ব্রাশ করুন।", "প্রতিদিন Dental Floss দিয়ে দাঁতের ফাঁক পরিষ্কার রাখুন।", "মাড়ি থেকে বারবার রক্ত পড়লে ডেন্টিস্টের পরামর্শ নিন।",
      ]),
      tip(23, "👨‍⚕️", "নিয়মিত Dental Checkup কেন জরুরি?", [
        "দাঁতের ক্ষয় প্রাথমিক পর্যায়ে শনাক্ত করা যায়।", "মাড়ির প্রদাহ ও অন্যান্য সমস্যা পরীক্ষা করা যায়।", "দাঁতে জমে থাকা শক্ত Plaque বা Tartar শনাক্ত করা যায়।",
        "মুখের দুর্গন্ধ ও দাঁতের সংবেদনশীলতার কারণ নির্ণয়ে সাহায্য করে।", "ভবিষ্যতে বড় ধরনের ডেন্টাল সমস্যা প্রতিরোধে পরামর্শ পাওয়া যায়।",
        "নিজের Oral Health অনুযায়ী সঠিক যত্নের পরিকল্পনা তৈরি করা যায়।",
      ]),
      tip(24, "⚠️", "দাঁতের যত্নে সাধারণ ভুলগুলো", [
        "অতিরিক্ত জোরে দাঁত ব্রাশ করা।", "দিনে মাত্র একবার দাঁত ব্রাশ করা।", "দাঁতের ফাঁক পরিষ্কার না করা।", "জিহ্বা পরিষ্কার করতে অবহেলা করা।",
        "দীর্ঘদিন একই টুথব্রাশ ব্যবহার করা।", "অতিরিক্ত চিনিযুক্ত খাবার ও পানীয় গ্রহণ করা।", "দাঁতে সমস্যা হলেও ডেন্টিস্টের কাছে না যাওয়া।",
        "দাঁত সাদা করার জন্য লেবু, কয়লা বা বেকিং সোডার মতো ক্ষতিকর ঘরোয়া পদ্ধতি ব্যবহার করা।",
      ]),
    ],
  },
  {
    id: "food", title: "খাবার ও পানীয়", icon: "🥗",
    tips: [
      tip(13, "☕", "চা-কফি ও দাঁতের যত্ন", [
        "চা ও কফিতে থাকা রঞ্জক পদার্থ দাঁতের উপরিভাগে দাগ সৃষ্টি করতে পারে।", "নিয়মিত অতিরিক্ত চা-কফি পান করলে দাঁতে হলদেটে বা বাদামি দাগ পড়তে পারে।",
        "চিনি মিশিয়ে চা-কফি পান করলে দাঁতের ক্ষয়ের ঝুঁকি বাড়তে পারে।", "চা-কফি পান করার পর পরিষ্কার পানি দিয়ে মুখ কুলি করুন।", "দিনে দুইবার ফ্লুরাইডযুক্ত টুথপেস্ট দিয়ে দাঁত ব্রাশ করুন।",
        "দাঁতের দাগ দূর করতে অতিরিক্ত জোরে ব্রাশ বা ঘরোয়া ক্ষতিকর পদ্ধতি ব্যবহার করবেন না।",
      ]),
      tip(25, "🥕", "Oral Care-এর জন্য ভালো খাদ্যাভ্যাস", [
        "দুধ ও দই: ক্যালসিয়াম ও অন্যান্য পুষ্টি উপাদানের ভালো উৎস।", "শাকসবজি: ভিটামিন ও মিনারেল সরবরাহ করে, যা সামগ্রিক স্বাস্থ্যের জন্য উপকারী।",
        "আপেল ও গাজর: আঁশযুক্ত খাবার, যা চিবানোর সময় লালা নিঃসরণে সহায়তা করতে পারে।", "মাছ ও ডিম: দাঁত ও হাড়ের স্বাস্থ্যের জন্য প্রয়োজনীয় বিভিন্ন পুষ্টি সরবরাহ করে।",
        "বাদাম: বিভিন্ন মিনারেল ও পুষ্টি উপাদানের উৎস।", "পর্যাপ্ত পানি: মুখের স্বাভাবিক আর্দ্রতা বজায় রাখতে সাহায্য করে।", "অতিরিক্ত চিনি ও চিনিযুক্ত পানীয় গ্রহণ কমিয়ে দিন।",
      ]),
    ],
  },
  {
    id: "kids", title: "শিশুদের যত্ন", icon: "👶",
    tips: [
      tip(17, "🧸", "শিশুদের দাঁতের যত্ন", [
        "প্রথম দাঁত ওঠার পর থেকেই শিশুর দাঁতের যত্ন শুরু করুন।", "শিশুর দাঁত দিনে দুইবার নরম ব্রাশ দিয়ে পরিষ্কার করুন।",
        "৩ বছরের কম বয়সী শিশুর জন্য চালের দানার সমান পরিমাণ ফ্লুরাইডযুক্ত টুথপেস্ট ব্যবহার করুন।", "৩–৬ বছর বয়সী শিশুর জন্য মটরদানার সমান পরিমাণ টুথপেস্ট ব্যবহার করুন।",
        "শিশুকে অতিরিক্ত মিষ্টি ও চিনিযুক্ত পানীয় দেওয়া সীমিত করুন।", "শিশুকে বোতলে দুধ বা মিষ্টি পানীয় নিয়ে ঘুমাতে দেবেন না।",
        "প্রথম দাঁত ওঠার পর অথবা শিশুর প্রথম জন্মদিনের মধ্যে ডেন্টিস্টের কাছে প্রথম পরীক্ষা করান।",
      ]),
    ],
  },
];

/** Bangla digits for the tip numbers (১, ২, …). */
export const bnNum = (n: number) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

// ───────────── editable content (admin → Guide Pages)

export const GUIDE_KEYS = ["usage", "ingredients", "care", "thanks"] as const;
export type GuideKey = (typeof GUIDE_KEYS)[number];
export const GUIDE_HREF: Record<GuideKey, "/how-to-use" | "/ingredients" | "/dental-care" | "/thank-you"> = {
  usage: "/how-to-use", ingredients: "/ingredients", care: "/dental-care", thanks: "/thank-you",
};
/** Pages with their own Facebook pixel settings (Pixel & CAPI tab): the guide pages and the reviews page. */
export const PIXEL_PAGE_KEYS = [...GUIDE_KEYS, "reviews"] as const;
export type PixelPageKey = (typeof PIXEL_PAGE_KEYS)[number];
export const PIXEL_PAGE_HREF: Record<PixelPageKey, string> = { ...GUIDE_HREF, reviews: "/reviews" };
/** Pages shown in the guide tabs, "আরও জানুন" cards and the order thank-you cards (not the customer thank-you page itself). */
const GUIDE_TAB_KEYS: GuideKey[] = ["usage", "ingredients", "care"];

// ── Thank-you page for customers who have received the product (QR code / link in the parcel)
export type ThanksButton = { icon: string; label: string; text: string; href: string };
export type ThanksSection = { title: string; text: string; image: string; buttons: ThanksButton[] };
export type ThanksLink = { label: string; url: string };
export type ThanksContent = {
  title: string; subtitle: string; text: string; image: string;
  sections: ThanksSection[];
  feedbackOn: boolean; feedbackTitle: string; feedbackText: string; feedbackButton: string;
  followTitle: string; followText: string; links: ThanksLink[];
  closingTitle: string; closingName: string; closingText: string;
};
export type StepTone = "amber" | "indigo" | "emerald";
export type GuidePageMeta = { enabled: boolean; label: string; short: string; icon: string; text: string };
export type UsageStep = { step: string; title: string; icon: string; tone: StepTone; points: string[]; text: string; image: string };
export type IngredientItem = {
  bn: string; en: string; sciLabel: string; sci: string; icon: string; intro: string; points: string[]; footnote: string;
  noteKind: "" | "warning" | "info"; note: string; image: string;
};
export type CareTipItem = { title: string; icon: string; points: string[]; steps: boolean; image: string };
export type CareGroupItem = { title: string; icon: string; tips: CareTipItem[]; image: string };

export type GuideContent = {
  product: string;
  phones: string[];
  showOnThankYou: boolean;
  pages: Record<GuideKey, GuidePageMeta>;
  // `image` everywhere is optional ("" = none): a built-in /guides/… picture or an uploaded file name.
  usage: { title: string; intro: string; image: string; steps: UsageStep[]; notesTitle: string; notes: string[] };
  ingredients: { title: string; subtitle: string; image: string; text: string[]; items: IngredientItem[]; closingTitle: string; closing: string[]; signature: string };
  care: { title: string; text: string; image: string; groups: CareGroupItem[] };
  thanks: ThanksContent;
};

const metaFor = (href: string): GuidePageMeta => {
  const g = GUIDE_LIST.find((x) => x.href === href)!;
  return { enabled: true, label: g.label, short: g.short, icon: g.icon, text: g.text };
};

/** Built-in pictures (public/guides, each also as -540.webp for phones). */
const USAGE_IMAGES = ["/guides/usage-morning.webp", "/guides/usage-night.webp", "/guides/usage-special.webp"];
const INGREDIENT_IMAGES: Record<string, string> = {
  "মাশরুম": "mushroom", "লবঙ্গ": "clove", "এলাচ": "cardamom", "দারুচিনি": "cinnamon", "গোলমরিচ": "black-pepper",
  "যষ্টিমধু": "licorice", "পিপুল": "long-pepper", "আদা": "ginger", "আমলকি": "amla",
};
const careImage = (n: number) => (n >= 1 && n <= 26 ? `/guides/care-${String(n).padStart(2, "0")}.webp` : "");

export const DEFAULT_GUIDES: GuideContent = {
  product: GUIDE_PRODUCT,
  phones: [...GUIDE_PHONES],
  showOnThankYou: true,
  pages: { usage: metaFor("/how-to-use"), ingredients: metaFor("/ingredients"), care: metaFor("/dental-care"), thanks: metaFor("/thank-you") },
  thanks: {
    title: "ধন্যবাদ!", subtitle: "আপনার আস্থার জন্য কৃতজ্ঞতা",
    text: "Fateha BD-এর সঙ্গে থাকার জন্য আপনাকে আন্তরিক ধন্যবাদ। আপনার হাতে আমাদের পণ্য পৌঁছেছে, এটাই আমাদের আনন্দ।",
    image: "/guides/thanks-1.webp",
    sections: [
      {
        title: "আপনার যত্নের যাত্রা শুরু হোক আজ থেকেই",
        text: "মাশরুম ডেন্টোকেয়ার প্লাস কেনার জন্য ধন্যবাদ। পণ্যটি ব্যবহারের আগে এর নির্দেশনা ভালোভাবে পড়ে নিন।",
        image: "/guides/thanks-2.webp", buttons: [],
      },
      {
        title: "মাশরুম ডেন্টোকেয়ার প্লাস",
        text: "পণ্যের ব্যবহারবিধি, সংরক্ষণ পদ্ধতি এবং প্রয়োজনীয় সতর্কতা জেনে নিন।",
        image: "/guides/thanks-3.webp",
        buttons: [
          { icon: "🪥", label: "সঠিক ব্যবহারের নিয়ম জানুন", text: "ধাপে ধাপে পণ্য ব্যবহারের নির্দেশনা দেখতে আমাদের গাইডটি পড়ুন।", href: "/how-to-use" },
          { icon: "🦷", label: "প্রতিদিনের Oral Care Tips", text: "সুস্থ দাঁত ও মাড়ির জন্য প্রতিদিনের জরুরি পরামর্শ।", href: "/dental-care" },
        ],
      },
    ],
    feedbackOn: true, feedbackTitle: "আপনার মতামত দিন",
    feedbackText: "মাশরুম ডেন্টোকেয়ার প্লাস ব্যবহারের অভিজ্ঞতা আমাদের সঙ্গে শেয়ার করুন। আপনার মতামত আমাদের সেবার মান উন্নত করতে সাহায্য করবে।",
    feedbackButton: "মতামত পাঠান",
    followTitle: "Fateha BD-এর সঙ্গে থাকুন",
    followText: "দাঁতের যত্ন, Oral Hygiene এবং দৈনন্দিন স্বাস্থ্য সচেতনতামূলক তথ্য পেতে আমাদের সঙ্গে যুক্ত থাকুন।",
    links: [],
    closingTitle: "Thank You for Being With Us", closingName: "Fateha BD", closingText: "আপনার আস্থা, আমাদের অনুপ্রেরণা।",
  },
  usage: {
    title: USAGE.title, intro: USAGE.intro, image: "/guides/usage-header.webp", notesTitle: USAGE.notesTitle, notes: [...USAGE.notes],
    steps: USAGE.steps.map((s, i) => ({
      step: s.step, title: s.title, icon: s.icon, tone: s.tone,
      points: "points" in s ? [...s.points] : [], text: "text" in s ? s.text : "", image: USAGE_IMAGES[i] ?? "",
    })),
  },
  ingredients: {
    title: INGREDIENTS_INTRO.title, subtitle: INGREDIENTS_INTRO.subtitle, image: "", text: [...INGREDIENTS_INTRO.text],
    closingTitle: INGREDIENTS_INTRO.closingTitle, closing: [...INGREDIENTS_INTRO.closing], signature: INGREDIENTS_INTRO.signature,
    items: INGREDIENTS.map((g) => ({
      bn: g.bn, en: g.en, sciLabel: g.sciLabel ?? "", sci: g.sci ?? "", icon: g.icon, intro: g.intro, points: [...g.points],
      footnote: g.footnote ?? "", noteKind: g.note?.kind ?? "", note: g.note?.text ?? "",
      image: INGREDIENT_IMAGES[g.bn] ? `/guides/ing-${INGREDIENT_IMAGES[g.bn]}.webp` : "",
    })),
  },
  care: {
    title: CARE_INTRO.title, text: CARE_INTRO.text, image: "",
    groups: CARE_GROUPS.map((g) => ({
      title: g.title, icon: g.icon, image: "",
      tips: g.tips.map((t) => ({ title: t.title, icon: t.icon, points: [...t.points], steps: !!t.steps, image: careImage(t.n) })),
    })),
  },
};

// ── validation (anything saved from the admin goes through this)
const o = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const str = (v: unknown, d = "", max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : d);
const arr = (v: unknown, max: number) => (Array.isArray(v) ? v.slice(0, max) : []);
const lines = (v: unknown, max = 20, len = 500) =>
  (Array.isArray(v) ? v : typeof v === "string" ? v.split(/\r?\n/) : []).map((x) => str(x, "", len)).filter(Boolean).slice(0, max);
const icon = (v: unknown, d: string) => str(v, d, 16) || d;
/** A built-in picture (/guides/x.webp) or an uploaded file name; anything else is dropped. */
const GUIDE_IMAGE = /^(?:\/guides\/[\w-]{1,80}\.webp|[\w.-]{1,120}\.(?:jpe?g|png|webp))$/i;
const img = (v: unknown) => (typeof v === "string" && GUIDE_IMAGE.test(v) && !v.includes("..") ? v : "");
/** Content saved before pictures existed has no `image` key: give it the matching built-in picture.
 *  An explicit "" (the admin removed the picture) stays empty. */
const imgOr = (v: unknown, fallback: string | undefined) => (v === undefined ? fallback ?? "" : img(v));

export function normalizeGuides(raw: unknown): GuideContent {
  const r = o(raw);
  if (!Object.keys(r).length) return DEFAULT_GUIDES;
  const d = DEFAULT_GUIDES;
  const pagesIn = o(r.pages);
  const pages = Object.fromEntries(GUIDE_KEYS.map((k) => {
    const p = o(pagesIn[k]);
    const def = d.pages[k];
    return [k, {
      enabled: p.enabled === undefined ? true : p.enabled === true,
      label: str(p.label, def.label, 60) || def.label, short: str(p.short, def.short, 30) || def.short,
      icon: icon(p.icon, def.icon), text: str(p.text, def.text, 160),
    }];
  })) as Record<GuideKey, GuidePageMeta>;
  const phones = lines(r.phones, 4, 20).map((p) => p.replace(/[^\d+]/g, "")).filter((p) => p.length >= 6);

  const u = o(r.usage);
  const usage = {
    title: str(u.title, d.usage.title, 160) || d.usage.title, intro: str(u.intro, "", 600), image: imgOr(u.image, d.usage.image),
    notesTitle: str(u.notesTitle, d.usage.notesTitle, 120), notes: lines(u.notes),
    steps: arr(u.steps, 12).map((x) => {
      const s = o(x);
      return {
        step: str(s.step, "", 30), title: str(s.title, "", 120), icon: icon(s.icon, "✅"),
        tone: (["amber", "indigo", "emerald"].includes(s.tone as string) ? s.tone : "emerald") as StepTone,
        points: lines(s.points), text: str(s.text, "", 1500),
        image: imgOr(s.image, d.usage.steps.find((x) => x.title === s.title)?.image),
      };
    }).filter((s) => s.title || s.image || s.text || s.points.length), // every field is optional — a picture alone is fine
  };

  const ing = o(r.ingredients);
  const ingredients = {
    title: str(ing.title, d.ingredients.title, 160) || d.ingredients.title, subtitle: str(ing.subtitle, "", 120), image: imgOr(ing.image, d.ingredients.image),
    text: lines(ing.text, 6, 1000), closingTitle: str(ing.closingTitle, "", 160), closing: lines(ing.closing, 6, 1000),
    signature: str(ing.signature, "", 200),
    items: arr(ing.items, 40).map((x) => {
      const g = o(x);
      return {
        bn: str(g.bn, "", 80), en: str(g.en, "", 80), sciLabel: str(g.sciLabel, "", 60), sci: str(g.sci, "", 80), icon: icon(g.icon, "🌿"),
        intro: str(g.intro, "", 1000), points: lines(g.points), footnote: str(g.footnote, "", 600),
        noteKind: (g.noteKind === "warning" || g.noteKind === "info" ? g.noteKind : "") as IngredientItem["noteKind"], note: str(g.note, "", 1500),
        image: imgOr(g.image, d.ingredients.items.find((x) => x.bn === g.bn)?.image),
      };
    }).filter((g) => g.bn || g.en || g.image || g.intro || g.points.length),
  };

  const c = o(r.care);
  const care = {
    title: str(c.title, d.care.title, 160) || d.care.title, text: str(c.text, "", 600), image: imgOr(c.image, d.care.image),
    groups: arr(c.groups, 12).map((x) => {
      const g = o(x);
      return {
        title: str(g.title, "", 80), icon: icon(g.icon, "🦷"), image: imgOr(g.image, ""),
        tips: arr(g.tips, 40).map((y) => {
          const t = o(y);
          return { title: str(t.title, "", 160), icon: icon(t.icon, "✅"), points: lines(t.points, 20, 600), steps: t.steps === true,
            image: imgOr(t.image, d.care.groups.flatMap((x) => x.tips).find((x) => x.title === t.title)?.image) };
        }).filter((t) => t.title || t.image || t.points.length),
      };
    }).filter((g) => g.title || g.image || g.tips.length),
  };

  return {
    product: str(r.product, d.product, 80) || d.product,
    phones: phones.length ? phones : [],
    showOnThankYou: r.showOnThankYou === undefined ? true : r.showOnThankYou === true,
    pages, usage, ingredients, care, thanks: normalizeThanks(r.thanks, d.thanks),
  };
}

/** Enabled guide pages, in menu order (nav tabs, thank-you cards, sitemap). */
export function enabledGuides(c: GuideContent) {
  return GUIDE_TAB_KEYS.filter((k) => c.pages[k].enabled).map((k) => ({ key: k, href: GUIDE_HREF[k], ...c.pages[k] }));
}

/** Every enabled page incl. the customer thank-you page (sitemap). */
export function enabledPages(c: GuideContent) {
  return GUIDE_KEYS.filter((k) => c.pages[k].enabled).map((k) => ({ key: k, href: GUIDE_HREF[k], ...c.pages[k] }));
}

/** A button / link target: a page on this site, an https link, a phone number or WhatsApp. */
const LINK = /^(?:\/[\w\-/.#?=&%]*|https:\/\/[^\s"<>]{3,400}|tel:\+?\d{6,15})$/;
export const safeLink = (v: unknown) => (typeof v === "string" && LINK.test(v.trim()) ? v.trim() : "");

function normalizeThanks(raw: unknown, d: ThanksContent): ThanksContent {
  const t = o(raw);
  if (!Object.keys(t).length) return d;
  return {
    title: str(t.title, d.title, 160), subtitle: str(t.subtitle, "", 160), text: str(t.text, "", 1500), image: imgOr(t.image, d.image),
    sections: arr(t.sections, 12).map((x) => {
      const sc = o(x);
      return {
        title: str(sc.title, "", 160), text: str(sc.text, "", 2000),
        image: imgOr(sc.image, d.sections.find((ds) => ds.title === sc.title)?.image),
        buttons: arr(sc.buttons, 6).map((y) => {
          const b = o(y);
          return { icon: icon(b.icon, "👉"), label: str(b.label, "", 80), text: str(b.text, "", 200), href: safeLink(b.href) };
        }).filter((b) => b.label && b.href),
      };
    }).filter((sc) => sc.title || sc.text || sc.image || sc.buttons.length),
    feedbackOn: t.feedbackOn === undefined ? d.feedbackOn : t.feedbackOn === true,
    feedbackTitle: str(t.feedbackTitle, d.feedbackTitle, 120), feedbackText: str(t.feedbackText, "", 800),
    feedbackButton: str(t.feedbackButton, d.feedbackButton, 40) || d.feedbackButton,
    followTitle: str(t.followTitle, "", 120), followText: str(t.followText, "", 800),
    links: arr(t.links, 8).map((y) => { const l = o(y); return { label: str(l.label, "", 40), url: safeLink(l.url) }; }).filter((l) => l.label && l.url),
    closingTitle: str(t.closingTitle, "", 120), closingName: str(t.closingName, "", 80), closingText: str(t.closingText, "", 200),
  };
}

/** URL slug ↔ page key (Admin → Pages → /admin/pages/<slug>). */
export function guideKeyFromSlug(slug: string): GuideKey | null {
  return GUIDE_KEYS.find((k) => GUIDE_HREF[k] === `/${slug}`) ?? null;
}

/** <img> attributes for a guide picture: built-in ones have a 540px copy for phones, uploads go through /media resizing. */
export function guideImage(src: string, sizes: string) {
  if (src.startsWith("/guides/")) {
    const small = src.replace(/\.webp$/, "-540.webp");
    const mid = src.replace(/\.webp$/, "-720.webp");
    // 720 fits most phones (≈ 360-412 px wide × 1.75-2× pixel density) — before, they had to take the 1080 copy.
    return { src: mid, srcSet: `${small} 540w, ${mid} 720w, ${src} 1080w`, sizes };
  }
  const url = `/media/${src}`;
  return { src: `${url}?w=640`, srcSet: [384, 640, 828].map((w) => `${url}?w=${w} ${w}w`).join(", "), sizes };
}
