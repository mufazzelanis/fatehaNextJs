import Link from "next/link";

export const metadata = { title: "Page not found", robots: { index: false } };

/** Site-wide 404 (also used by missing products, landing pages and orders). */
export default function NotFound() {
  return (
    <main className="grid min-h-[70vh] flex-1 place-items-center bg-[#f4f6f8] px-4 py-16 font-ui text-ink">
      <div className="max-w-md text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/fatehabd-logo.webp" alt="FatehaBD" width={729} height={121} className="mx-auto h-9 w-auto" />
        <p className="mt-10 text-7xl font-extrabold tracking-tight text-fb-500">404</p>
        <h1 className="mt-3 text-2xl font-bold">This page could not be found</h1>
        <p className="mt-2 text-slate-500">দুঃখিত, এই পেজটি পাওয়া যায়নি। লিংকটি হয়তো বদলে গেছে বা মুছে ফেলা হয়েছে।</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex h-11 items-center rounded-xl bg-fb-500 px-6 font-semibold text-white transition hover:bg-fb-600">Go to homepage</Link>
          <Link href="/shop" className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-6 font-semibold text-ink transition hover:border-fb-300">Browse products</Link>
          <Link href="/track" className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-6 font-semibold text-ink transition hover:border-fb-300">Track order</Link>
        </div>
      </div>
    </main>
  );
}
