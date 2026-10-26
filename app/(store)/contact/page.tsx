import type { Metadata } from "next";
import { getStoreConfig } from "@/lib/data/catalog";
import { getSettings } from "@/lib/data/store";
import { MapPinIcon, PhoneIcon, WhatsappIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Contact us" };

export default async function ContactPage() {
  const [cfg, settings] = await Promise.all([getStoreConfig(), getSettings()]);
  const phone = cfg.supportPhone || settings.contact_phone;
  const wa = settings.whatsapp_number.replace(/\D/g, "");
  const card = "flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 transition hover:border-fb-300 hover:shadow-md";
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Contact us</h1>
      <p className="mt-2 text-ink-soft">We usually reply within a few hours, every day.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {phone && (
          <a href={`tel:${phone}`} className={card}>
            <span className="grid size-12 place-items-center rounded-xl bg-fb-50 text-fb-700"><PhoneIcon className="size-6" /></span>
            <span><span className="block text-sm text-slate-600">Call us</span><span className="font-semibold text-ink">{phone}</span></span>
          </a>
        )}
        {wa && (
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={card}>
            <span className="grid size-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><WhatsappIcon className="size-6" /></span>
            <span><span className="block text-sm text-slate-600">WhatsApp</span><span className="font-semibold text-ink">Chat with us</span></span>
          </a>
        )}
        {cfg.supportEmail && (
          <a href={`mailto:${cfg.supportEmail}`} className={card}>
            <span className="grid size-12 place-items-center rounded-xl bg-fb-50 text-lg font-bold text-fb-700">@</span>
            <span><span className="block text-sm text-slate-600">Email</span><span className="font-semibold text-ink">{cfg.supportEmail}</span></span>
          </a>
        )}
        {cfg.supportAddress && (
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5">
            <span className="grid size-12 place-items-center rounded-xl bg-fb-50 text-fb-700"><MapPinIcon className="size-6" /></span>
            <span><span className="block text-sm text-slate-600">Address</span><span className="font-semibold text-ink">{cfg.supportAddress}</span></span>
          </div>
        )}
      </div>
      {!phone && !wa && !cfg.supportEmail && (
        <p className="mt-6 rounded-2xl bg-white p-5 text-sm text-slate-600">Contact details will appear here once they are added in the admin panel.</p>
      )}
    </div>
  );
}
