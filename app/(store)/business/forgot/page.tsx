import type { Metadata } from "next";
import { DealerForgotForm } from "@/components/business/dealer-reset";

export const metadata: Metadata = { title: "Dealer — forgot password", robots: { index: false } };

export default function DealerForgotPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <h1 className="text-center text-2xl font-bold text-ink">Forgot your password?</h1>
      <p className="mt-2 text-center text-sm text-slate-600">We&apos;ll text a code to your registered number.</p>
      <div className="mt-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-900/[0.04] sm:p-8">
        <DealerForgotForm />
      </div>
    </div>
  );
}
