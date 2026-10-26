import { Suspense } from "react";
import { requireCustomer } from "@/lib/auth";
import { PasswordForm, ProfileForm } from "./profile-forms";

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-slate-100" />}>
      <Profile />
    </Suspense>
  );
}

async function Profile() {
  const customer = await requireCustomer();
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ProfileForm customer={{ name: customer.name, phone: customer.phone, email: customer.email ?? "", address: customer.address ?? "" }} />
      <PasswordForm />
    </div>
  );
}
