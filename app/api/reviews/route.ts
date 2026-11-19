import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { after } from "next/server";
import { pixelsForUrl } from "@/lib/meta/config";
import { customerUserData, sendServerEvents } from "@/lib/meta/capi";
import { requestUserData } from "@/lib/meta/request";
import { execute, queryOne } from "@/lib/db";
import { clientIpFrom } from "@/lib/client-ip";
import { normalizePhone } from "@/lib/phone";
import { UPLOAD_DIR, uploadPath } from "@/lib/uploads";
import {
  AGE_RANGES, DURATIONS, EXPERIENCES, LIKED, MAX_PHOTO_MB, MAX_PHOTOS, MAX_VIDEO_MB, PUBLISH, ratingFor,
} from "@/lib/reviews";

type Result = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };
const reply = (body: Result, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const str = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().replace(/\s+\n/g, "\n").slice(0, max);
const oneOf = <T extends string>(v: string, list: readonly T[]) => (list as readonly string[]).includes(v) ? (v as T) : null;

/** What kind of video the bytes really are (the file name and browser type can lie). */
function videoExt(head: Uint8Array): "mp4" | "mov" | "webm" | null {
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return "webm";
  if (String.fromCharCode(...head.slice(4, 8)) !== "ftyp") return null;
  return String.fromCharCode(...head.slice(8, 10)) === "qt" ? "mov" : "mp4";
}

const newName = (ext: string) => `rv-${randomBytes(12).toString("hex")}.${ext}`;

/** A customer's review from /reviews (form + optional photos or one video). Saved as "pending" for the admin to approve. */
export async function POST(request: Request) {
  // Same-site form only.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return reply({ error: "Not allowed" }, 403);

  let fd: FormData;
  try { fd = await request.formData(); } catch {
    return reply({ error: "ফাইলটি অনেক বড় অথবা আপলোড অসম্পূর্ণ — আবার চেষ্টা করুন।" }, 400);
  }
  // Bots fill every field — people never see this one.
  if (str(fd, "website", 100)) return reply({ ok: true });
  const ua = (request.headers.get("user-agent") ?? "").slice(0, 300);
  if (/bot|crawler|spider|facebookexternalhit|preview/i.test(ua)) return reply({ ok: true });

  const errors: Record<string, string> = {};
  const name = str(fd, "name", 80);
  const rawPhone = str(fd, "phone", 20);
  const phone = rawPhone ? normalizePhone(rawPhone) : null;
  const district = str(fd, "district", 60);
  const age = oneOf(str(fd, "age", 30), AGE_RANGES);
  const used = oneOf(str(fd, "used", 5), ["yes", "no"] as const);
  const duration = oneOf(str(fd, "duration", 30), DURATIONS);
  const experience = oneOf(str(fd, "experience", 20), EXPERIENCES.map((e) => e[0]));
  const liked = fd.getAll("liked").map(String).filter((v) => (LIKED as readonly string[]).includes(v));
  const story = str(fd, "story", 3000);
  const suggestion = str(fd, "suggestion", 2000);
  const publish = oneOf(str(fd, "publish", 10), PUBLISH.map((p) => p[0]));
  const mediaOk = str(fd, "media_ok", 5) === "yes";

  if (name.length < 2) errors.name = "আপনার নাম লিখুন";
  if (rawPhone && !phone) errors.phone = "সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)";
  if (district.length < 2) errors.district = "আপনার জেলা লিখুন";
  if (!age) errors.age = "বয়সের পরিসর বেছে নিন";
  if (!used) errors.used = "হ্যাঁ অথবা না বেছে নিন";
  if (used === "yes") {
    if (!duration) errors.duration = "কতদিন ব্যবহার করছেন বেছে নিন";
    if (!experience) errors.experience = "আপনার অভিজ্ঞতা কেমন বেছে নিন";
  }
  if (story.length < 10) errors.story = "আপনার অভিজ্ঞতা অন্তত এক লাইনে লিখুন";
  if (!publish) errors.publish = "প্রকাশের অনুমতি বেছে নিন";

  // Files: up to MAX_PHOTOS photos, or one video.
  const photos = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  const video = [fd.get("video")].find((f): f is File => f instanceof File && f.size > 0) ?? null;
  if (photos.length > MAX_PHOTOS) errors.media = `সর্বোচ্চ ${MAX_PHOTOS}টি ছবি দিতে পারবেন`;
  if (photos.some((p) => p.size > MAX_PHOTO_MB * 1024 * 1024)) errors.media = `প্রতিটি ছবি ${MAX_PHOTO_MB}MB-এর কম হতে হবে`;
  if (video && video.size > MAX_VIDEO_MB * 1024 * 1024) errors.media = `ভিডিও ${MAX_VIDEO_MB}MB-এর কম হতে হবে`;
  if ((photos.length || video) && !["yes", "no"].includes(str(fd, "media_ok", 5))) errors.media_ok = "ছবি/ভিডিও প্রকাশের অনুমতি বেছে নিন";
  if (Object.keys(errors).length) return reply({ error: "লাল চিহ্নিত ঘরগুলো ঠিক করুন", fieldErrors: errors }, 400);

  const ip = clientIpFrom(request.headers);
  if (ip) {
    const recent = await queryOne<{ n: number }>("SELECT COUNT(*) n FROM reviews WHERE ip = ? AND created_at >= NOW() - INTERVAL 1 DAY", [ip]);
    if (Number(recent?.n ?? 0) >= 5) return reply({ error: "আপনি আজ অনেকবার রিভিউ পাঠিয়েছেন — আগামীকাল আবার চেষ্টা করুন।" }, 429);
  }

  // Save files. Photos are re-encoded (drops GPS / camera data, shrinks big phone photos).
  const saved: string[] = [];
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    for (const p of photos) {
      const out = await sharp(Buffer.from(await p.arrayBuffer()), { failOn: "error" })
        .rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
        .catch(() => null);
      if (!out) throw new Error("photo");
      const file = newName("webp");
      await writeFile(uploadPath(file), out);
      saved.push(file);
    }
    if (video) {
      const buf = new Uint8Array(await video.arrayBuffer());
      const ext = videoExt(buf.subarray(0, 12));
      if (!ext) throw new Error("video");
      const file = newName(ext);
      await writeFile(uploadPath(file), buf);
      saved.push(file);
    }
  } catch (e) {
    await Promise.all(saved.map((f) => unlink(uploadPath(f)).catch(() => {})));
    const which = e instanceof Error ? e.message : "";
    return reply({
      error: which === "video" ? "ভিডিওটি চেনা যায়নি — MP4 বা WebM ভিডিও দিন।" : which === "photo" ? "একটি ছবি খোলা যায়নি — JPG বা PNG ছবি দিন।" : "ফাইল সেভ করা যায়নি — আবার চেষ্টা করুন।",
      fieldErrors: { media: "ফাইলটি পরিবর্তন করুন" },
    }, 400);
  }

  const res = await execute(
    `INSERT INTO reviews (name, phone, district, age_range, used, duration, experience, liked, story, suggestion, media, publish, media_ok, rating, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, phone, district, age, used, used === "yes" ? duration : null, used === "yes" ? experience : null, liked.join("|") || null,
      story, suggestion || null, saved.length ? JSON.stringify(saved) : null, publish, saved.length && mediaOk ? 1 : 0,
      used === "yes" ? ratingFor(experience) : 5, ip, ua || null],
  );

  // Facebook: "ReviewSubmitted" through the Conversions API, same event ID as the browser pixel (Meta counts it once).
  // Goes to the pixels of /reviews (its own pixel if set in Admin → Reviews → Pixel & CAPI, else the main site pixel).
  const eventId = str(fd, "event_id", 80);
  if (/^[\w-]{8,80}$/.test(eventId)) {
    const referer = request.headers.get("referer") ?? "";
    const pageUrl = origin && referer.startsWith(origin + "/reviews") ? referer.split("#")[0].slice(0, 500) : `${origin ?? (process.env.SITE_URL || "https://fatehabd.com")}/reviews`;
    const [user, pixels] = await Promise.all([requestUserData(), pixelsForUrl(pageUrl)]);
    after(() => sendServerEvents([{
      event_name: "ReviewSubmitted", event_id: eventId, event_source_url: pageUrl,
      user_data: { ...customerUserData({ phone, name }), ...user },
      custom_data: { rating: used === "yes" ? ratingFor(experience) : 5, content_category: "review", review_id: String(res.insertId) },
    }], { pixels }));
  }
  return reply({ ok: true });
}
