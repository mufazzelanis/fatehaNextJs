import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { readChallenge } from "@/lib/otp";
import { DealerVerifyForm } from "@/components/business/dealer-reset";

export const metadata: Metadata = { title: "Dealer — enter code", robots: { index: false } };

export default function DealerVerifyPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <h1 className="text-center text-2xl font-bold text-ink">Choose a new password</h1>
      <div className="mt-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-900/[0.04] sm:p-8">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-slate-100" />}>
          <Verify />
        </Suspense>
      </div>
    </div>
  );
}

async function Verify() {
  const c = await readChallenge("dealer_reset");
  if (!c) redirect("/business/forgot");
  return <DealerVerifyForm masked={c.masked} wait={c.wait} />;
}
