import { Suspense } from "react";
import { requirePermission } from "@/lib/auth";
import { readBusinessProfile } from "@/lib/data/business";
import { PageHeader, PanelSkeleton } from "@/components/admin/ui";
import { BusinessForm } from "./business-form";

export const metadata = { title: "Business Info" };

export default function BusinessPage() {
  return (
    <Suspense fallback={<PanelSkeleton rows={8} />}>
      <Business />
    </Suspense>
  );
}

async function Business() {
  await requirePermission("settings.manage");
  const profile = await readBusinessProfile();
  return (
    <>
      <PageHeader title="Business Info"
        description="Your business name, phone, WhatsApp, email, address and social links — set once here, shown on the main site, every landing page, the combo page, guide pages, thank-you page and invoices." />
      <BusinessForm initial={profile} />
    </>
  );
}
