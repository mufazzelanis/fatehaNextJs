import type { Metadata } from "next";
import { PublicShell } from "@/components/landing/public-shell";
import { CheckCircleIcon } from "@/components/icons";
import { RegisterForm } from "../auth-forms";

export const metadata: Metadata = { title: "নতুন অ্যাকাউন্ট" };

export default function RegisterPage() {
  return (
    <PublicShell>
      <div className="container-x grid max-w-lg py-12 sm:py-16">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-slate-900">নতুন অ্যাকাউন্ট খুলুন</h1>
          <ul className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-slate-600">
            {["সব অর্ডার এক জায়গায়", "লাইভ ডেলিভারি ট্র্যাকিং", "দ্রুত পুনরায় অর্ডার"].map((t) => (
              <li key={t} className="flex items-center gap-1.5"><CheckCircleIcon className="size-4 text-brand-600" />{t}</li>
            ))}
          </ul>
        </div>
        <div className="mt-8 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-brand-900/5 sm:p-8 animate-slide-up">
          <RegisterForm />
        </div>
      </div>
    </PublicShell>
  );
}
