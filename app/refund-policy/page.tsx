import type { Metadata } from "next";
import { PolicyPage } from "@/components/landing/policy-page";

export const metadata: Metadata = { title: "Refund policy" };

export default function Page() {
  return <PolicyPage title="Refund policy" settingKey="refund_policy" />;
}
