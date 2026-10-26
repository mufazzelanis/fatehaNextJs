import type { Metadata } from "next";
import { PolicyPage } from "@/components/landing/policy-page";

export const metadata: Metadata = { title: "Terms of service" };

export default function Page() {
  return <PolicyPage title="Terms of service" settingKey="terms_of_service" />;
}
