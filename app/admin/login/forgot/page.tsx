import type { Metadata } from "next";
import { ForgotForm } from "../login-form";
import { AuthShell } from "../shell";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPage() {
  return (
    <AuthShell title="Forgot your password?" subtitle="We'll email you a link to choose a new one">
      <ForgotForm />
    </AuthShell>
  );
}
