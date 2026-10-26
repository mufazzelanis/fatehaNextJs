import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { checkResetLink } from "@/lib/otp";
import { ResetForm } from "../login-form";
import { AuthShell } from "../shell";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false }, referrer: "no-referrer" };

export default function ResetPage({ searchParams }: PageProps<"/admin/login/reset">) {
  return (
    <AuthShell title="Choose a new password" subtitle="At least 8 characters">
      <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-slate-100" />}>
        <Reset searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Reset({ searchParams }: Pick<PageProps<"/admin/login/reset">, "searchParams">) {
  const sp = await searchParams;
  const id = Number(sp.i);
  const token = typeof sp.t === "string" ? sp.t : "";
  const ok = await checkResetLink(id, token);
  if (!ok) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-slate-600">This link has expired or was already used.</p>
        <Link href="/admin/login/forgot" className="a-btn w-full">Get a new link</Link>
      </div>
    );
  }
  return <ResetForm id={id} token={token} />;
}
