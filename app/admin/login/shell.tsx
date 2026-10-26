import type { ReactNode } from "react";

/** Shared frame for the admin sign-in, code, forgot-password and reset pages. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-brand-950 px-4 py-12 font-ui">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-32 -top-32 size-120 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 size-136 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.06)_1px,transparent_0)] bg-size-[24px_24px]" />
      </div>
      <div className="relative w-full max-w-sm animate-slide-up">
        <div className="mb-8 text-center">
          <span className="mx-auto grid size-14 place-items-center overflow-hidden rounded-2xl bg-white shadow-xl shadow-black/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/icon.webp" alt="FatehaBD" className="size-11 object-contain" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold text-white">{title}</h1>
          <p className="mt-1 text-sm text-brand-100/60">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white p-6 shadow-2xl shadow-black/30 sm:p-7">{children}</div>
      </div>
    </div>
  );
}
