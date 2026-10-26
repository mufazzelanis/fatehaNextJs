import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getDistricts } from "@/lib/data/locations";
import { DealerRegisterForm } from "@/components/business/register-form";
import { BriefcaseIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Become a dealer", description: "Apply to become a FatehaBD district, thana or union dealer." };

export default function RegisterDealerPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <span className="inline-flex items-center gap-2 rounded-full bg-fb-50 px-3 py-1 text-xs font-semibold text-fb-700 ring-1 ring-fb-200"><BriefcaseIcon className="size-4" /> FatehaBD Business</span>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">Become a dealer</h1>
      <p className="mt-2 text-ink-soft">
        Fill in the form below. Already applied? <Link href="/business" className="font-semibold text-fb-700 hover:underline">Sign in</Link> to see your status.
      </p>
      <div className="mt-8 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-8">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-100" />}>
          <Form />
        </Suspense>
      </div>
    </div>
  );
}

async function Form() {
  return <DealerRegisterForm districts={await getDistricts()} />;
}
