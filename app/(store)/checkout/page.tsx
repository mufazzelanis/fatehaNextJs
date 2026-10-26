import type { Metadata } from "next";
import { Suspense } from "react";
import { getCustomer } from "@/lib/auth";
import { getPaymentConfig, getStoreConfig } from "@/lib/data/catalog";
import { getDistricts } from "@/lib/data/locations";
import { enabledMethods } from "@/lib/payments";
import { StoreCheckout } from "@/components/store/checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Checkout</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-white" />}>
        <Checkout />
      </Suspense>
    </div>
  );
}

async function Checkout() {
  const [districts, store, payments, customer] = await Promise.all([getDistricts(), getStoreConfig(), getPaymentConfig(), getCustomer()]);
  return (
    <StoreCheckout districts={districts} store={store} payments={payments} methods={enabledMethods(payments)}
      prefill={customer ? { name: customer.name, phone: customer.phone, address: customer.address ?? "" } : null} />
  );
}
