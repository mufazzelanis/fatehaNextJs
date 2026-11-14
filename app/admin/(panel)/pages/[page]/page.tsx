import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { can, requirePermission } from "@/lib/auth";
import { getGuideContent } from "@/lib/data/guides";
import { getPageStats } from "@/lib/data/pages";
import { getMarketingConfig, MAX_PIXELS, readPagePixels } from "@/lib/meta/config";
import { GUIDE_HREF, guideKeyFromSlug } from "@/lib/guides";
import { savePagePixels } from "@/app/actions/landing-pixels";
import { PageHeader, PanelSkeleton } from "@/components/admin/ui";
import { ChevronLeftIcon, ExternalIcon } from "@/components/icons";
import { PixelScopeForm } from "@/components/admin/pixel-scope-form";
import { GuidesEditor } from "../guides-editor";

export const metadata = { title: "Edit page" };

export default function PageEditorRoute(props: PageProps<"/admin/pages/[page]">) {
  return (
    <Suspense fallback={<PanelSkeleton rows={10} />}>
      <PageEditor {...props} />
    </Suspense>
  );
}

async function PageEditor({ params, searchParams }: PageProps<"/admin/pages/[page]">) {
  const admin = await requirePermission("content.manage");
  const key = guideKeyFromSlug((await params).page);
  if (!key) notFound();
  const href = GUIDE_HREF[key];
  const canPixel = can(admin, "marketing.manage");
  const sp = await searchParams;
  const tab = sp.tab === "pixel" && canPixel ? "pixel" : "content";
  const [content, stats] = await Promise.all([getGuideContent(), getPageStats([href])]);
  const p = content.pages[key];
  const st = stats[href];
  const tabs = [{ key: "content", label: "Content" }, ...(canPixel ? [{ key: "pixel", label: "Pixel & CAPI" }] : [])];

  return (
    <>
      <Link href="/admin/pages" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><ChevronLeftIcon className="size-4" /> All pages</Link>
      <PageHeader title={`${p.icon} ${p.label}`}
        description={`${st.now} here now · ${st.today.toLocaleString("en-IN")} views today · ${st.week.toLocaleString("en-IN")} in 7 days · ${st.month.toLocaleString("en-IN")} in 30 days`}
        actions={<>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${p.enabled ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-slate-100 text-slate-500 ring-slate-300"}`}>{p.enabled ? "Live" : "Hidden"}</span>
          <a href={href} target="_blank" className="a-btn"><ExternalIcon className="size-4" /> Open page</a>
        </>} />
      <p className="-mt-3 mb-4 font-mono text-xs text-brand-700">{href}</p>

      <div className="mb-5 flex w-max gap-1 rounded-xl bg-white p-1 shadow-xs ring-1 ring-slate-200/80">
        {tabs.map((t) => (
          <Link key={t.key} href={`/admin/pages${href}${t.key === "content" ? "" : `?tab=${t.key}`}`} scroll={false}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${tab === t.key ? "bg-brand-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>{t.label}</Link>
        ))}
      </div>

      {tab === "content" ? <GuidesEditor key={key} initial={content} only={key} /> : <PixelTab pageKey={key} />}
    </>
  );
}

/** Pixel ids, labels and whether a token is saved — tokens never leave the server. */
async function PixelTab({ pageKey }: { pageKey: ReturnType<typeof guideKeyFromSlug> & string }) {
  const [all, config] = await Promise.all([readPagePixels(), getMarketingConfig()]);
  const s = all[pageKey];
  return (
    <PixelScopeForm save={savePagePixels} target={{ name: "page", value: pageKey }} kind="page" mode={s.mode}
      pixels={s.pixels.map((x) => ({ id: x.id, label: x.label, hasToken: !!x.token, tokenHint: x.token ? `••••${x.token.slice(-4)}` : "" }))}
      mainPixels={config.pixels.map((x) => x.id)} maxPixels={MAX_PIXELS} capiOn={config.capiSwitch} />
  );
}
