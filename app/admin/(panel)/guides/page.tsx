import { Suspense } from "react";
import { requirePermission } from "@/lib/auth";
import { getGuideContent } from "@/lib/data/guides";
import { enabledGuides } from "@/lib/guides";
import { PageHeader, PanelSkeleton } from "@/components/admin/ui";
import { GuidesEditor } from "./guides-editor";

export const metadata = { title: "Guide Pages" };

export default function GuidesPage() {
  return (
    <Suspense fallback={<PanelSkeleton rows={8} />}>
      <Guides />
    </Suspense>
  );
}

async function Guides() {
  await requirePermission("content.manage");
  const content = await getGuideContent();
  const live = enabledGuides(content);
  return (
    <>
      <PageHeader title="Guide Pages" description="How to use, ingredients and dental care tips — public pages for customers, also linked from the order thank-you page." actions={
        <div className="flex flex-wrap gap-2">
          {live.map((g) => (
            <a key={g.href} href={g.href} target="_blank" className="a-btn-outline">{g.icon} {g.short} ↗</a>
          ))}
        </div>
      } />
      <GuidesEditor initial={content} />
    </>
  );
}
