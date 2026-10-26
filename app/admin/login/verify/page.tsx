import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { readChallenge } from "@/lib/otp";
import { readNotifyConfig } from "@/lib/notify";
import { AdminVerifyForm } from "../login-form";
import { AuthShell } from "../shell";

export const metadata: Metadata = { title: "Enter your code", robots: { index: false } };

export default function VerifyPage() {
  return (
    <AuthShell title="Check your email" subtitle="One more step to keep your admin account safe">
      <Suspense fallback={<div className="h-56 animate-pulse rounded-xl bg-slate-100" />}>
        <Verify />
      </Suspense>
    </AuthShell>
  );
}

async function Verify() {
  const challenge = await readChallenge("admin_login");
  if (!challenge) redirect("/admin/login?expired=1");
  const cfg = await readNotifyConfig();
  return <AdminVerifyForm masked={challenge.masked} trustDays={cfg.security.trustDays} wait={challenge.wait} />;
}
