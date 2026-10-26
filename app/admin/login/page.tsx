import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { AdminLoginForm } from "./login-form";
import { AuthShell } from "./shell";

export const metadata: Metadata = { title: "Admin login", robots: { index: false } };

export default function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <AuthShell title="Admin Console" subtitle="Sign in to manage orders and the store">
      <Suspense>
        <AdminLoginFormWithNext searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function AdminLoginFormWithNext({ searchParams }: Pick<PageProps<"/admin/login">, "searchParams">) {
  const [sp, admin] = await Promise.all([searchParams, getAdmin()]);
  // Only a session that is still valid in the database skips the form.
  if (admin) redirect("/admin");
  const notice = sp.reset === "1" ? "Password changed — sign in with your new password." : sp.expired === "1" ? "That sign-in code expired. Please sign in again." : null;
  return <AdminLoginForm next={typeof sp.next === "string" ? sp.next : "/admin"} notice={notice} />;
}
