import Link from "next/link";
import { Suspense } from "react";
import { getAdmin } from "@/lib/auth";
import { PERMISSION_LABEL } from "@/lib/permissions";
import { LockIcon } from "@/components/icons";

export const metadata = { title: "No access" };

export default function NoAccessPage({ searchParams }: PageProps<"/admin/no-access">) {
  return (
    <Suspense fallback={null}>
      <NoAccess searchParams={searchParams} />
    </Suspense>
  );
}

async function NoAccess({ searchParams }: Pick<PageProps<"/admin/no-access">, "searchParams">) {
  const [{ need }, admin] = await Promise.all([searchParams, getAdmin()]);
  const label = typeof need === "string" ? PERMISSION_LABEL[need] : undefined;
  return (
    <div className="mx-auto grid max-w-md place-items-center py-16 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-200">
        <LockIcon className="size-8" />
      </span>
      <h1 className="mt-5 text-xl font-semibold text-slate-900">You don&apos;t have access to this page</h1>
      <p className="mt-2 text-sm text-slate-500">
        Your role <strong className="text-slate-700">{admin?.roleName ?? "—"}</strong> doesn&apos;t include
        {label ? <> <strong className="text-slate-700">{label}</strong></> : " this permission"}. Ask a Super Admin to update your role.
      </p>
      <Link href="/admin" className="a-btn mt-6">Back to dashboard</Link>
    </div>
  );
}
