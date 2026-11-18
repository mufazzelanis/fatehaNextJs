// Customer reviews (/reviews) — the form's questions and choices (from FatehaBD's review form document),
// and the publishing rules. Client-safe.

export const AGE_RANGES = ["১৮–২৫ বছর", "২৬–৩৫ বছর", "৩৬–৪৫ বছর", "৪৬–৫৫ বছর", "৫৬ বছর বা তার বেশি"] as const;
export const USED = [["yes", "হ্যাঁ"], ["no", "না"]] as const;
export const DURATIONS = ["১ সপ্তাহের কম", "১–২ সপ্তাহ", "২–৪ সপ্তাহ", "১–৩ মাস", "৩ মাসের বেশি"] as const;
export const EXPERIENCES = [["very_good", "খুব ভালো", 5], ["good", "ভালো", 4], ["ok", "মোটামুটি", 3], ["unhappy", "সন্তুষ্ট নই", 2]] as const;
export const LIKED = ["ব্যবহার করার পদ্ধতি", "উপাদান সম্পর্কে তথ্য", "স্বাদ ও অনুভূতি", "প্যাকেজিং", "অন্য কিছু"] as const;
export const MEDIA_CHOICES = [["photo", "ছবি আপলোড"], ["video", "ভিডিও আপলোড"], ["none", "শেয়ার করতে চাই না"]] as const;
/** Q11: may we publish? name = with my name, anon = without my name, internal = never publish. */
export const PUBLISH = [
  ["name", "হ্যাঁ, আমার নামসহ প্রকাশ করতে পারেন।"],
  ["anon", "হ্যাঁ, তবে আমার নাম প্রকাশ না করে প্রকাশ করতে পারেন।"],
  ["internal", "না, আমার অভিজ্ঞতা শুধু অভ্যন্তরীণ মতামত হিসেবে রাখুন।"],
] as const;
export const MEDIA_PERMIT = [["yes", "হ্যাঁ, প্রকাশের অনুমতি দিচ্ছি।"], ["no", "না, প্রকাশের অনুমতি দিচ্ছি না।"]] as const;

export type ReviewStatus = "pending" | "approved" | "hidden";
export const REVIEW_STATUSES: ReviewStatus[] = ["pending", "approved", "hidden"];
export const MAX_PHOTOS = 4;
export const MAX_PHOTO_MB = 5;
export const MAX_VIDEO_MB = 60;

/** Uploaded review file names (images and videos). */
export const REVIEW_FILE = /^rv-[a-z0-9]{8,40}\.(jpg|png|webp|mp4|webm|mov)$/;
export const isVideo = (f: string) => /\.(mp4|webm|mov)$/.test(f);

export const experienceLabel = (v: string | null) => EXPERIENCES.find((e) => e[0] === v)?.[1] ?? "";
export const ratingFor = (experience: string | null) => EXPERIENCES.find((e) => e[0] === experience)?.[2] ?? 5;

/** What a published review shows (the admin's edited name / text win; "anon" hides the name). */
export type PublicReview = {
  id: number; name: string; district: string; rating: number; text: string; duration: string;
  experience: string; liked: string[]; photos: string[]; video: string | null; date: string; featured: boolean;
};

export function toPublic(r: {
  id: number; name: string; district: string | null; duration: string | null; experience: string | null; liked: string | null;
  story: string | null; media: string | null; publish: string; media_ok: number; rating: number; featured: number;
  display_name: string | null; display_text: string | null; approved_at: Date | string | null; created_at: Date | string;
}): PublicReview {
  let media: string[] = [];
  try { media = (JSON.parse(r.media || "[]") as unknown[]).filter((x): x is string => typeof x === "string" && REVIEW_FILE.test(x)); } catch {}
  const showMedia = r.media_ok === 1;
  const name = r.publish === "anon" ? "একজন গ্রাহক" : (r.display_name?.trim() || r.name);
  return {
    id: r.id, name, district: r.district ?? "", rating: Math.min(Math.max(Number(r.rating) || 5, 1), 5),
    text: (r.display_text?.trim() || r.story || "").trim(),
    duration: r.duration ?? "", experience: experienceLabel(r.experience),
    liked: (r.liked ?? "").split("|").filter(Boolean),
    photos: showMedia ? media.filter((f) => !isVideo(f)) : [],
    video: showMedia ? media.find(isVideo) ?? null : null,
    date: new Date(r.approved_at ?? r.created_at).toISOString(), featured: r.featured === 1,
  };
}
