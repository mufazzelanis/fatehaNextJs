import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdmin, type AdminUser } from "@/lib/auth";
import { hasPermission, PAGE_PERMISSION } from "@/lib/permissions";
import { adminLogout } from "@/app/actions/auth";
import { AdminSidebar, MobileNav, SectionTitle, SidebarToggle } from "@/components/admin/sidebar";
import { LogoutIcon } from "@/components/icons";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false } };

/** Admin pages this staff member may open. */
function allowedPages(admin: AdminUser | null) {
  if (!admin) return [];
  return Object.entries(PAGE_PERMISSION).filter(([, perm]) => hasPermission(admin.permissions, perm)).map(([href]) => href);
}

const SIDEBAR_BOOT = `try{if(localStorage.getItem("fb_sb")==="1")document.documentElement.dataset.sb="collapsed"}catch(e){}`;

const logout = (
  <form action={adminLogout}>
    <button type="submit" title="Sign out" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-100/70 transition hover:bg-rose-500/10 hover:text-rose-200 sb-mini:justify-center sb-mini:px-0">
      <LogoutIcon className="size-5 shrink-0" /> <span className="truncate sb-mini:hidden">Sign out</span>
    </button>
  </form>
);

async function Sidebar() {
  return <AdminSidebar footer={logout} allowed={allowedPages(await getAdmin())} />;
}

async function Mobile() {
  return <MobileNav footer={logout} allowed={allowedPages(await getAdmin())} />;
}

async function AdminBadge() {
  const admin = await getAdmin();
  if (!admin) return null;
  return (
    <Link href="/admin/account" className="flex items-center gap-3 rounded-xl p-1 transition hover:bg-slate-100">
      <div className="hidden text-right font-ui leading-tight sm:block">
        <p className="text-sm font-medium text-slate-900">{admin.name}</p>
        <p className="text-xs text-slate-500">{admin.roleName}</p>
      </div>
      <span className="grid size-9 place-items-center rounded-full bg-linear-to-br from-brand-500 to-brand-700 font-ui text-sm font-semibold text-white">
        {admin.name.slice(0, 1).toUpperCase()}
      </span>
    </Link>
  );
}

export default function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="admin-shell min-h-screen bg-slate-50 font-ui">
      {/* Applies the remembered collapsed sidebar before the first paint (no jump on reload). */}
      <script dangerouslySetInnerHTML={{ __html: SIDEBAR_BOOT }} />
      <Suspense fallback={<aside className="sb-rail fixed inset-y-0 left-0 z-30 hidden bg-brand-950 lg:block" />}>
        <Sidebar />
      </Suspense>
      <div className="admin-main">
        <header className="no-print sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Suspense fallback={<span className="size-10 rounded-xl border border-slate-200 bg-white lg:hidden" />}>
              <Mobile />
            </Suspense>
            <span className="min-w-0 lg:hidden">
              <Suspense fallback={<span className="text-[15px] font-semibold text-slate-900">Admin</span>}><SectionTitle /></Suspense>
            </span>
            <Suspense fallback={<span className="hidden size-9 lg:block" />}><SidebarToggle /></Suspense>
            <p className="hidden text-sm text-slate-500 lg:block">Welcome back 👋</p>
          </div>
          <Suspense fallback={<span className="size-9 animate-pulse rounded-full bg-slate-200" />}>
            <AdminBadge />
          </Suspense>
        </header>
        <main className="px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">{children}</main>
      </div>
    </div>
  );
}
