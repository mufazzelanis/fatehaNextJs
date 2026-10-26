import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/auth";
import { customerOtpOn } from "@/lib/notify";
import { PublicShell } from "@/components/landing/public-shell";
import { PhoneCodeForm } from "../auth-forms";

export const metadata: Metadata = { title: "পাসওয়ার্ড ভুলে গেছেন", robots: { index: false } };

export default function ForgotPage({ searchParams }: PageProps<"/account/forgot">) {
  return (
    <PublicShell>
      <div className="container-x grid max-w-md py-12 sm:py-20">
        <Suspense fallback={<div className="h-72 animate-pulse rounded-3xl bg-white" />}>
          <Forgot searchParams={searchParams} />
        </Suspense>
      </div>
    </PublicShell>
  );
}

async function Forgot({ searchParams }: Pick<PageProps<"/account/forgot">, "searchParams">) {
  const [sp, customer, on] = await Promise.all([searchParams, getCustomer(), customerOtpOn()]);
  if (customer) redirect("/account");
  if (!on) redirect("/account/login");
  const mode = sp.mode === "login" ? "login" : "reset";
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : undefined;
  return (
    <>
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-slate-900">{mode === "login" ? "SMS কোড দিয়ে লগইন" : "পাসওয়ার্ড ভুলে গেছেন?"}</h1>
        <p className="mt-2 text-slate-600">{mode === "login" ? "পাসওয়ার্ড ছাড়াই মোবাইলে আসা কোড দিয়ে লগইন করুন।" : "মোবাইলে আসা কোড দিয়ে নতুন পাসওয়ার্ড সেট করুন।"}</p>
      </div>
      <div className="mt-8 animate-slide-up rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-brand-900/5 sm:p-8">
        <PhoneCodeForm mode={mode} next={next} />
      </div>
    </>
  );
}
