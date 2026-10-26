import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/auth";
import { customerOtpOn } from "@/lib/notify";
import { PublicShell } from "@/components/landing/public-shell";
import { LoginForm } from "../auth-forms";

export const metadata: Metadata = { title: "লগইন" };

export default function LoginPage({ searchParams }: PageProps<"/account/login">) {
  return (
    <PublicShell>
      <div className="container-x grid max-w-md py-12 sm:py-20">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-slate-900">আপনার অ্যাকাউন্টে লগইন করুন</h1>
          <p className="mt-2 text-slate-600">আপনার সব অর্ডার ও ডেলিভারির অবস্থা এক জায়গায় দেখুন।</p>
        </div>
        <div className="mt-8 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-brand-900/5 sm:p-8 animate-slide-up">
          <Suspense><LoginFormWithNext searchParams={searchParams} /></Suspense>
        </div>
      </div>
    </PublicShell>
  );
}

async function LoginFormWithNext({ searchParams }: Pick<PageProps<"/account/login">, "searchParams">) {
  const [sp, customer, otp] = await Promise.all([searchParams, getCustomer(), customerOtpOn()]);
  if (customer) redirect("/account");
  const notice = sp.expired === "1" ? "কোডের মেয়াদ শেষ হয়ে গেছে। আবার চেষ্টা করুন।" : null;
  return <LoginForm next={typeof sp.next === "string" ? sp.next : "/account"} otp={otp} notice={notice} />;
}
