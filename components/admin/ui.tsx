import Link from "next/link";
import type { ReactNode } from "react";
import { STATUS_META, type OrderStatus } from "@/lib/format";
import { ChevronLeftIcon, ChevronRightIcon } from "../icons";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6 sm:gap-4">
      <div>
        <h1 className="font-ui text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.className}`}>
      <span className={`size-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function Pagination({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  if (pages <= 1) return null;
  const nums: (number | "…")[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }
  const cls = "grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm font-medium transition";
  return (
    <nav className="flex items-center gap-1" aria-label="Pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} className={`${cls} text-slate-600 hover:bg-slate-100`} aria-label="Previous"><ChevronLeftIcon className="size-4" /></Link>
      ) : <span className={`${cls} text-slate-300`}><ChevronLeftIcon className="size-4" /></span>}
      {nums.map((n, i) =>
        n === "…" ? <span key={`e${i}`} className="px-1 text-slate-400">…</span> : (
          <Link key={n} href={href(n)} aria-current={n === page ? "page" : undefined}
            className={`${cls} ${n === page ? "bg-brand-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>{n}</Link>
        ),
      )}
      {page < pages ? (
        <Link href={href(page + 1)} className={`${cls} text-slate-600 hover:bg-slate-100`} aria-label="Next"><ChevronRightIcon className="size-4" /></Link>
      ) : <span className={`${cls} text-slate-300`}><ChevronRightIcon className="size-4" /></span>}
    </nav>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center px-6 py-16 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-slate-100 text-2xl">📭</div>
      <p className="mt-4 font-medium text-slate-900">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PanelSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-56 rounded-lg bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-slate-200/70" />)}
      </div>
      <div className="a-card space-y-3 p-5">
        {Array.from({ length: rows }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-slate-100" />)}
      </div>
    </div>
  );
}
