import { Suspense } from "react";
import { requirePermission } from "@/lib/auth";
import { readInvoiceConfig } from "@/lib/data/landings";
import { PageHeader, PanelSkeleton } from "@/components/admin/ui";
import type { InvoiceData } from "@/components/invoice/invoice-document";
import { InvoiceDesigner } from "./invoice-designer";

export const metadata = { title: "Invoice Settings" };

const sample = (source: string, landing: boolean): InvoiceData => ({
  orderNo: landing ? "DC10025" : "FB10024",
  date: "26 Oct 2026, 11:30",
  customer: landing ? "রহিম উদ্দিন" : "Rahim Uddin",
  phone: "01712345678",
  address: landing ? "বাড়ি ১২, রোড ৩, মিরপুর" : "House 12, Road 3, Block B",
  area: landing ? null : "Dhanmondi, Dhaka",
  items: landing
    ? [{ name: "মাশরুম ডেন্টোকেয়ার প্লাস (100 gm)", price: 750, qty: 2, total: 1500 }]
    : [{ name: "Aptamil 2 Follow On Milk 800g", price: 3250, qty: 1, total: 3250 }, { name: "Aveeno Baby Daily Moisture Lotion", price: 3450, qty: 1, total: 3450 }],
  subtotal: landing ? 1500 : 6700, shipping: landing ? 100 : 60, shippingLabel: landing ? "ঢাকার বাইরে" : "Dhaka (inside)", discount: 0, total: landing ? 1600 : 6760,
  payment: landing
    ? { method: "ক্যাশ অন ডেলিভারি", status: "অপরিশোধিত", paid: false, trx: null, sender: null }
    : { method: "bKash", status: "Paid", paid: true, trx: "BK7Q2X9LM4", sender: "01811111111" },
  note: landing ? "সন্ধ্যার পরে কল করবেন" : "Please call before delivery",
  extra: [],
  source,
});

export default function InvoiceSettingsPage() {
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
      <PageHeader title="Invoice Settings" description="Separate invoice designs for main-site orders and landing-page orders. Invoices pick the right one automatically." />
      <InvoiceDesigner initial={await readInvoiceConfig()} samples={{ store: sample("Website", false), landing: sample("মাশরুম ডেন্টোকেয়ার প্লাস", true) }} />
    </>
  );
}
