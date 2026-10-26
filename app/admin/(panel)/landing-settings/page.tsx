import { Suspense } from "react";
import { requirePermission } from "@/lib/auth";
import { readLandingSettings } from "@/lib/data/landings";
import { PageHeader, PanelSkeleton } from "@/components/admin/ui";
import { LandingSettingsForm } from "./landing-settings-form";

export const metadata = { title: "Landing Settings" };

export default function LandingSettingsPage() {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <View />
    </Suspense>
  );
}

async function View() {
  await requirePermission("settings.manage");
  return (
    <>
      <PageHeader title="Landing Settings" description="Defaults shared by every landing page. Each page can override its own name, footer and order prefix." />
      <LandingSettingsForm initial={await readLandingSettings()} />
    </>
  );
}
