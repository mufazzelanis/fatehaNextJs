import { getSettings, type Settings } from "@/lib/data/store";
import { PublicShell } from "./public-shell";

type PolicyKey = Extract<keyof Settings, "refund_policy" | "privacy_policy" | "terms_of_service">;

export async function PolicyPage({ title, settingKey }: { title: string; settingKey: PolicyKey }) {
  const settings = await getSettings();
  const body = settings[settingKey].trim();
  return (
    <PublicShell>
      <article className="container-x max-w-3xl py-12 sm:py-16">
        <h1 className="font-display text-3xl font-bold text-slate-900">{title}</h1>
        {body ? (
          <div className="mt-6 whitespace-pre-line rounded-3xl border border-slate-200/80 bg-white p-6 leading-relaxed text-slate-700 shadow-sm sm:p-8">
            {body}
          </div>
        ) : (
          <p className="mt-6 text-slate-500">এই পেজের তথ্য শীঘ্রই যুক্ত করা হবে।</p>
        )}
      </article>
    </PublicShell>
  );
}
