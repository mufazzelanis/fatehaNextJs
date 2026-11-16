import type { Metadata } from "next";
import { getBusinessProfile } from "@/lib/data/business";
import { socialLinks } from "@/lib/business";
import { MapPinIcon, PhoneIcon, WhatsappIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Contact us" };

/** Contact details from Admin → Business Info. */
export default async function ContactPage() {
  const b = await getBusinessProfile();
  const socials = socialLinks(b);
  const card = "flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 transition hover:border-fb-300 hover:shadow-md";
  const has = b.phone || b.phone2 || b.whatsapp || b.email || b.address;
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Contact us</h1>
      <p className="mt-2 text-ink-soft">{b.hours ? `We're available ${b.hours}.` : "We usually reply within a few hours, every day."}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {[b.phone, b.phone2].filter(Boolean).map((p) => (
          <a key={p} href={`tel:${p}`} className={card}>
            <span className="grid size-12 place-items-center rounded-xl bg-fb-50 text-fb-700"><PhoneIcon className="size-6" /></span>
            <span><span className="block text-sm text-slate-600">Call us</span><span className="font-semibold tabular-nums text-ink">{p}</span></span>
          </a>
        ))}
        {b.whatsapp && (
          <a href={`https://wa.me/${b.whatsapp}`} target="_blank" rel="noopener noreferrer" className={card}>
            <span className="grid size-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><WhatsappIcon className="size-6" /></span>
            <span><span className="block text-sm text-slate-600">WhatsApp</span><span className="font-semibold text-ink">Chat with us</span></span>
          </a>
        )}
        {b.email && (
          <a href={`mailto:${b.email}`} className={card}>
            <span className="grid size-12 place-items-center rounded-xl bg-fb-50 text-lg font-bold text-fb-700">@</span>
            <span className="min-w-0"><span className="block text-sm text-slate-600">Email</span><span className="block truncate font-semibold text-ink">{b.email}</span></span>
          </a>
        )}
        {b.address && (
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:col-span-2">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-fb-50 text-fb-700"><MapPinIcon className="size-6" /></span>
            <span><span className="block text-sm text-slate-600">Address</span><span className="font-semibold text-ink">{b.address}</span></span>
          </div>
        )}
      </div>
      {socials.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {socials.map((s) => (
            <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-fb-300 hover:text-fb-700">{s.label} →</a>
          ))}
        </div>
      )}
      {!has && (
        <p className="mt-6 rounded-2xl bg-white p-5 text-sm text-slate-600">Contact details will appear here once they are added in the admin panel.</p>
      )}
    </div>
  );
}
