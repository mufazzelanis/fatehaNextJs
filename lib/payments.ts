// Client-safe payment configuration (settings.payment_config).

export const PAYMENT_METHODS = ["cod", "bkash", "nagad", "rocket", "bank"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentStatus = "unpaid" | "pending_verification" | "paid" | "refunded";

export type WalletConfig = { enabled: boolean; number: string; accountType: "personal" | "merchant" | "agent"; instructions: string };
export type PaymentConfig = {
  cod: { enabled: boolean; instructions: string };
  bkash: WalletConfig;
  nagad: WalletConfig;
  rocket: WalletConfig;
  bank: { enabled: boolean; bankName: string; accountName: string; accountNumber: string; branch: string; routing: string; instructions: string };
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cod: "Cash on Delivery",
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  bank: "Bank Transfer",
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; className: string }> = {
  unpaid: { label: "Unpaid (COD)", className: "bg-slate-100 text-slate-700 ring-slate-500/20" },
  pending_verification: { label: "Verify payment", className: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  paid: { label: "Paid", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  refunded: { label: "Refunded", className: "bg-rose-50 text-rose-700 ring-rose-600/20" },
};

export const isPaymentMethod = (v: unknown): v is PaymentMethod => typeof v === "string" && (PAYMENT_METHODS as readonly string[]).includes(v);
export const isWallet = (m: PaymentMethod): m is "bkash" | "nagad" | "rocket" => m === "bkash" || m === "nagad" || m === "rocket";

const wallet = (name: string): WalletConfig => ({
  enabled: false,
  number: "",
  accountType: "personal",
  instructions: `Send the total to our ${name} number using “Send Money”, then enter the number you sent from and the Transaction ID.`,
});

export const DEFAULT_PAYMENTS: PaymentConfig = {
  cod: { enabled: true, instructions: "Pay in cash when the parcel reaches you." },
  bkash: wallet("bKash"),
  nagad: wallet("Nagad"),
  rocket: wallet("Rocket"),
  bank: {
    enabled: false, bankName: "", accountName: "", accountNumber: "", branch: "", routing: "",
    instructions: "Transfer the total to the account below and enter the transaction / reference number.",
  },
};

const str = (v: unknown, d: string, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : d);
const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

function normWallet(raw: unknown, d: WalletConfig): WalletConfig {
  const r = obj(raw);
  const type = r.accountType === "merchant" || r.accountType === "agent" ? r.accountType : "personal";
  const number = str(r.number, d.number, 20).replace(/[^\d+]/g, "");
  return { enabled: r.enabled === true && number.length >= 11, number, accountType: type, instructions: str(r.instructions, d.instructions, 500) };
}

/** Validates stored/submitted config; a wallet without a number can never be enabled. */
export function normalizePayments(raw: unknown): PaymentConfig {
  const r = obj(raw);
  const d = DEFAULT_PAYMENTS;
  const cod = obj(r.cod);
  const bank = obj(r.bank);
  const accountNumber = str(bank.accountNumber, "", 40);
  const config: PaymentConfig = {
    cod: { enabled: cod.enabled !== false, instructions: str(cod.instructions, d.cod.instructions, 300) },
    bkash: normWallet(r.bkash, d.bkash),
    nagad: normWallet(r.nagad, d.nagad),
    rocket: normWallet(r.rocket, d.rocket),
    bank: {
      enabled: bank.enabled === true && accountNumber.length > 3,
      bankName: str(bank.bankName, "", 80), accountName: str(bank.accountName, "", 80), accountNumber,
      branch: str(bank.branch, "", 80), routing: str(bank.routing, "", 20), instructions: str(bank.instructions, d.bank.instructions, 500),
    },
  };
  // At least one way to pay must stay available.
  if (!PAYMENT_METHODS.some((m) => config[m].enabled)) config.cod.enabled = true;
  return config;
}

export function enabledMethods(c: PaymentConfig): PaymentMethod[] {
  return PAYMENT_METHODS.filter((m) => c[m].enabled);
}
