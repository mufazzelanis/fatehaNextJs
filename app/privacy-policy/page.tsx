import type { Metadata } from "next";
import { PolicyPage } from "@/components/landing/policy-page";

export const metadata: Metadata = { title: "Privacy policy" };

export default function Page() {
  return <PolicyPage title="Privacy policy" settingKey="privacy_policy" />;
}
