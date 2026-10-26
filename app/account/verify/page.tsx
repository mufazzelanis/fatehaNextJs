import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { readChallenge } from "@/lib/otp";
import { PublicShell } from "@/components/landing/public-shell";
import { CustomerVerifyForm } from "../auth-forms";

export const metadata: Metadata = { title: "কোড যাচাই", robots: { index: false } };

const TITLE = {
  customer_register: "মোবাইল নাম্বার যাচাই করুন",
  customer_login: "কোড দিয়ে লগইন",
  customer_reset: "নতুন পাসওয়ার্ড সেট করুন",
} as const;

export default function VerifyPage() {
  return (
    <PublicShell>
      <div className="container-x grid max-w-md py-12 sm:py-20">
        <Suspense fallback={<div className="h-72 animate-pulse rounded-3xl bg-white" />}>
          <Verify />
        </Suspense>
      </div>
    </PublicShell>
  );
}

async function Verify() {
  const c = await readChallenge(["customer_register", "customer_login", "customer_reset"]);
  if (!c) redirect("/account/login?expired=1");
  const purpose = c.purpose as keyof typeof TITLE;
  return (
    <>
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-slate-900">{TITLE[purpose]}</h1>
        <p className="mt-2 text-slate-600">নিরাপত্তার জন্য আপনার মোবাইলে একটি কোড পাঠানো হয়েছে।</p>
      </div>
      <div className="mt-8 animate-slide-up rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-brand-900/5 sm:p-8">
        <CustomerVerifyForm masked={c.masked} purpose={purpose} wait={c.wait} />
        <p className="mt-5 text-center text-sm text-slate-500">ভুল নাম্বার? <Link href={purpose === "customer_register" ? "/account/register" : "/account/login"} className="font-semibold text-brand-700 hover:underline">আবার শুরু করুন</Link></p>
      </div>
    </>
  );
}
