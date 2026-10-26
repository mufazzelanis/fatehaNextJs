import type { Metadata } from "next";
import { Suspense } from "react";
import { getCustomer } from "@/lib/auth";
import { customerLogout } from "@/app/actions/auth";
import { PublicShell } from "@/components/landing/public-shell";
import { LogoutIcon } from "@/components/icons";
import { AccountTabs } from "./tabs";

export const metadata: Metadata = { title: "আমার অ্যাকাউন্ট", robots: { index: false } };

async function Greeting() {
  const customer = await getCustomer();
  if (!customer) return null;
  return (
    <div className="flex items-center gap-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl sm:size-14 bg-linear-to-br from-brand-500 to-brand-700 font-display text-2xl font-bold text-white shadow-lg shadow-brand-700/25">
        {customer.name.slice(0, 1)}
      </span>
      <div>
        <p className="text-sm text-slate-500">স্বাগতম,</p>
        <p className="font-display text-xl font-bold text-slate-900 sm:text-2xl">{customer.name}</p>
        <p className="text-sm text-slate-500">{customer.phone}</p>
      </div>
    </div>
  );
}

export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <PublicShell>
      <div className="container-x max-w-4xl py-6 sm:py-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Suspense fallback={<div className="h-14 w-56 animate-pulse rounded-2xl bg-slate-200" />}>
            <Greeting />
          </Suspense>
          <form action={customerLogout}>
            <button type="submit" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-rose-200 hover:text-rose-600">
              <LogoutIcon className="size-4" /> লগআউট
            </button>
          </form>
        </div>
        <Suspense fallback={<div className="mt-8 h-12 rounded-2xl bg-slate-100" />}>
          <AccountTabs />
        </Suspense>
        <div className="mt-6">{children}</div>
      </div>
    </PublicShell>
  );
}
