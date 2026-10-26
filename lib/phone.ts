// Client-safe Bangladeshi mobile number helpers.

const BN_TO_EN: Record<string, string> = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
};

/** Accepts "+880 1712-345678", "8801712345678", "০১৭১২৩৪৫৬৭৮" → "01712345678" (or null) */
export function normalizePhone(input: string): string | null {
  const digits = input
    .replace(/[০-৯]/g, (d) => BN_TO_EN[d])
    .replace(/\D/g, "")
    .replace(/^(?:00)?880/, "0")
    .replace(/^88(?=01)/, "");
  return /^01[3-9]\d{8}$/.test(digits) ? digits : null;
}
