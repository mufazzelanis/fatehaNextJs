import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { cacheLife } from "next/cache";
import { getCategories, getStoreConfig } from "@/lib/data/catalog";
import { getBusinessProfile } from "@/lib/data/business";
import { socialLinks } from "@/lib/business";
import { StoreHeader } from "./store-header";
import { CartDrawer } from "./cart-drawer";
import { StoreBottomNav } from "./store-bottom-nav";
import { StoreUIProvider } from "./store-ui";
import { CashIcon, PhoneIcon, ShieldIcon, TruckIcon } from "../icons";

async function Year() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

/** Header, category bar, footer, cart drawer and mobile tab bar shared by every storefront page. */
export async function StoreShell({ children }: { children: ReactNode }) {
  const [categories, cfg, biz] = await Promise.all([getCategories(), getStoreConfig(), getBusinessProfile()]);
  const socials = socialLinks(biz);
  return (
    <StoreUIProvider buttons={cfg.buttons} className="flex min-h-screen flex-col bg-[#f4f6f8] font-ui text-ink">
      <Suspense fallback={<div className="h-[148px] bg-white" />}>
        <StoreHeader categories={categories.map((c) => ({ name: c.name, slug: c.slug, products: c.products }))} announcement={cfg.announcement} />
      </Suspense>
      <main className="flex-1">{children}</main>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 lg:grid-cols-4">
          {[
            [CashIcon, "Cash on Delivery", "Pay when it arrives"],
            [TruckIcon, "Nationwide delivery", cfg.deliveryDays],
            [ShieldIcon, "100% authentic", "Imported & sealed"],
            [PhoneIcon, "Friendly support", biz.phone || "We're here to help"],
          ].map(([I, t, s]) => {
            const Icon = I as typeof CashIcon;
            return (
              <div key={t as string} className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-fb-50 text-fb-700"><Icon className="size-5" /></span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{t as string}</p>
                  <p className="truncate text-xs text-slate-600">{s as string}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="bg-ink pb-[calc(4.5rem+env(safe-area-inset-bottom))] text-white/70 lg:pb-0">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <span className="inline-block rounded-lg bg-white px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/fatehabd-logo.webp" alt="FatehaBD" width={729} height={121} className="h-7 w-auto" />
            </span>
            <p className="mt-4 max-w-xs text-sm leading-relaxed">{biz.tagline || "Your one-stop shop for authentic baby food and baby care — delivered across Bangladesh."}</p>
            {socials.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {socials.map((x) => (
                  <a key={x.key} href={x.url} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 transition hover:bg-white/20 hover:text-white">{x.label}</a>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Shop</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/shop" className="hover:text-white">All products</Link></li>
              {categories.map((c) => <li key={c.slug}><Link href={`/shop/category/${c.slug}`} className="hover:text-white">{c.name}</Link></li>)}
              <li><Link href="/wishlist" className="hover:text-white">Wishlist</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Help</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/track" className="hover:text-white">Track order</Link></li>
              <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-white">Contact us</Link></li>
              <li><Link href="/refund-policy" className="hover:text-white">Return & refund</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-white">Privacy policy</Link></li>
              <li><Link href="/terms-of-service" className="hover:text-white">Terms of service</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Business</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/business" className="hover:text-white">Dealer login</Link></li>
              <li><Link href="/business/register" className="hover:text-white">Become a dealer</Link></li>
              <li><Link href="/account" className="hover:text-white">My account</Link></li>
            </ul>
            {(biz.phone || biz.email || biz.address || biz.whatsapp) && (
              <div className="mt-5 space-y-1 text-sm">
                {biz.phone && <a href={`tel:${biz.phone}`} className="block tabular-nums hover:text-white">📞 {biz.phone}</a>}
                {biz.whatsapp && <a href={`https://wa.me/${biz.whatsapp}`} target="_blank" rel="noopener noreferrer" className="block hover:text-white">💬 WhatsApp</a>}
                {biz.email && <a href={`mailto:${biz.email}`} className="block break-all hover:text-white">✉️ {biz.email}</a>}
                {biz.address && <p className="text-white/60">📍 {biz.address}</p>}
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs sm:flex-row">
            <p>© <Year /> {biz.name}. All rights reserved.</p>
            <p className="flex items-center gap-2">We accept <span className="rounded bg-white/10 px-1.5 py-0.5">COD</span><span className="rounded bg-[#d1105f] px-1.5 py-0.5 text-white">bKash</span><span className="rounded bg-[#f6921e] px-1.5 py-0.5 text-ink">Nagad</span><span className="rounded bg-[#8c3494] px-1.5 py-0.5 text-white">Rocket</span></p>
          </div>
        </div>
      </footer>

      <CartDrawer freeDeliveryOver={cfg.freeDeliveryOver} />
      <Suspense><StoreBottomNav /></Suspense>
    </StoreUIProvider>
  );
}
