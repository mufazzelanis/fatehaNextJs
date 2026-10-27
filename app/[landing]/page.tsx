import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { productImageUrl } from "@/lib/data/store";
import { getLandingBySlug, getLandingProduct, getLandingSettings, landingBannerUrl, type Landing } from "@/lib/data/landings";
import { readSession } from "@/lib/session";
import { mediaUrl } from "@/lib/data/catalog";
import { LandingExtras } from "@/components/landing/landing-extras";
import { bn } from "@/lib/format";
import { CheckoutForm } from "@/components/landing/checkout-form";
import { LandingFooter } from "@/components/landing/landing-footer";
import { RichText } from "@/components/rich-text";
import { responsive } from "@/lib/media";
import { readableButton } from "@/lib/store-config";
import { mediaSize } from "@/lib/uploads";
import { ViewContentEvent } from "@/components/meta/meta-pixel";

/** Large, thumb-friendly order button: full width on phones, with a soft moving shine so it is easy to spot. */
function OrderButton({ color, text }: { color: string; text: string }) {
  return (
    <a href="#order"
      className="group relative mx-auto flex w-full max-w-[380px] items-center justify-center gap-2.5 overflow-hidden rounded-2xl px-6 py-4 text-[20px] font-bold leading-tight shadow-[0_8px_20px_-6px_rgb(0_0_0/0.35)] ring-4 ring-white/70 transition duration-200 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98] sm:inline-flex sm:w-auto sm:rounded-[14px] sm:px-8 sm:py-3.5 sm:text-[18px]"
      style={readableButton(color)}>
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shine bg-linear-to-r from-transparent via-white/35 to-transparent motion-reduce:hidden" />
      <CartIcon />
      <span className="relative">{text}</span>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="relative shrink-0 transition group-hover:translate-x-1"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    </a>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="relative shrink-0">
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6.2" /><circle cx="10" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" />
    </svg>
  );
}

function HandIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true" className="shrink-0 text-[#1d6b4a] sm:size-5">
      <path d="M2.5 10.5h3.5v9H2.5z" />
      <path d="M6 11l3.2-5.6c.6-1 2.2-.7 2.2.5V9.4h8.6a1.5 1.5 0 0 1 0 3h-5" />
      <path d="M15.5 12.4h.6a1.5 1.5 0 0 1 0 3h-1.2" />
      <path d="M14.9 15.4h.5a1.4 1.4 0 0 1 0 2.8h-1" />
      <path d="M14.4 18.2a1.3 1.3 0 0 1 0 2.6H9.5L6 19.3" />
    </svg>
  );
}

/** Pairs benefits two per card, as in the original design. */
function pairs<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += 2) out.push(items.slice(i, i + 2));
  return out;
}

export async function generateMetadata({ params }: PageProps<"/[landing]">): Promise<Metadata> {
  const l = await getLandingBySlug((await params).landing);
  if (!l) return {};
  const product = await getLandingProduct(l.product_id);
  const title = l.seo_title || l.name;
  const description = l.seo_description || `${product?.name ?? l.name} — অরিজিনাল পণ্য, সারা বাংলাদেশে ক্যাশ অন ডেলিভারি। এখনই অর্ডার করুন।`;
  const image = product?.image ? mediaUrl(product.image) : undefined;
  return {
    title: { absolute: title }, description,
    openGraph: { title, description, images: image ? [image] : undefined },
    robots: l.status === "published" ? undefined : { index: false },
  };
}

export default function LandingRoute({ params, searchParams }: PageProps<"/[landing]">) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f3f6f9]" />}>
      <LandingResolver params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function LandingResolver({ params, searchParams }: Pick<PageProps<"/[landing]">, "params" | "searchParams">) {
  const slug = (await params).landing;
  const landing = await getLandingBySlug(slug);
  if (!landing) notFound();
  let preview = false;
  if (landing.status !== "published") {
    // Drafts and archived pages are only visible to signed-in staff using the admin "Preview" link.
    const sp = await searchParams;
    if (sp.preview !== "1" || !(await readSession("admin"))) notFound();
    preview = true;
  }
  return <LandingPage landing={landing} preview={preview} />;
}

async function LandingPage({ landing: l, preview }: { landing: Landing; preview: boolean }) {
  const [product, ls, bannerSize] = await Promise.all([
    getLandingProduct(l.product_id), getLandingSettings(),
    l.banner_image ? mediaSize(l.banner_image) : { width: 1060, height: 300 },
  ]);
  const c = l.content;
  const checkout = l.checkout;
  const image = productImageUrl(product);
  const priceBn = bn(Math.round(product?.price ?? 750));
  const productName = product?.name ?? "মাশরুম ডেন্টোকেয়ার প্লাস";
  const btn = c.orderButtonText;

  return (
    <div className="bg-white font-sans text-[#111]">
      {/* ===== HERO: product photo + label banner ===== */}
      <section className="bg-linear-to-b from-[#8df28d] via-[#c9f7c9] to-[#f3f6f9] pb-6 pt-4 sm:pt-6">
        <div className="mx-auto grid max-w-[940px] items-start gap-4 px-4 sm:grid-cols-[230px_1fr] sm:gap-4">
          <div className="mx-auto w-[82%] max-w-[320px] sm:mx-0 sm:w-auto">
            <div className="grid aspect-[230/215] place-items-center rounded-2xl bg-white p-3 shadow-md sm:rounded-none sm:p-2 sm:shadow-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img {...responsive(image, "(min-width: 640px) 214px, 300px", [256, 384, 512, 640])} alt={productName} width={400} height={400} className="size-full object-contain" fetchPriority="high" />
            </div>
            {c.doctorCaption.trim() && (
              <p className="mt-3 whitespace-pre-line text-center text-[16px] font-bold leading-[1.4] text-[#1a1a1a] sm:text-[12px] sm:leading-[1.25]">
                <RichText text={c.doctorCaption} price={priceBn} />
              </p>
            )}
          </div>
          <div className="overflow-hidden rounded-xl border-[3px] border-[#1d6b4a] bg-white shadow-sm sm:rounded-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img {...responsive(landingBannerUrl(l), "(min-width: 640px) 680px, calc(100vw - 32px)", [384, 512, 640, 828])} alt={`${productName} লেবেল`} {...bannerSize} className="block h-auto w-full" />
          </div>
        </div>
      </section>

      {/* ===== APPROVAL + INTRO + BENEFITS ===== */}
      <section className="bg-[#f3f6f9] pb-14 pt-2">
        <div className="mx-auto max-w-[940px] px-4">
          <h1 className="text-center text-[27px] font-bold leading-[1.35] sm:text-[28px] sm:leading-snug"><RichText text={c.approvalHeading} price={priceBn} /></h1>
          <div className="mt-6 text-center"><OrderButton color={c.colors.topButton} text={btn} /></div>

          {c.introText.trim() && (
            <div className="mt-9 whitespace-pre-line rounded-2xl px-5 py-6 text-[19px] font-bold leading-[1.8] shadow-sm sm:rounded-none sm:px-7 sm:text-[16.5px] sm:leading-[1.75] sm:shadow-none"
              style={{ backgroundColor: c.colors.introBox }}>
              <RichText text={c.introText} price={priceBn} />
            </div>
          )}

          {c.showBenefits && c.benefits.length > 0 && (
            <>
              <div className="mt-14 text-center">
                <h2 className="inline-block rounded-[8px] bg-[#b6f20f] px-2.5 py-1 text-[30px] font-bold text-[#e8232a] sm:text-[30px]">{c.benefitsTitle}</h2>
              </div>
              <div className="mt-10 grid gap-4 md:mt-12 md:grid-cols-2 md:items-start md:gap-2">
                {pairs(c.benefits).map((card, ci) => (
                  <div key={ci}
                    className={`rounded-[22px] px-5 py-6 text-[19px] font-bold leading-[1.5] shadow-lg sm:py-5 sm:text-[15px] sm:leading-snug transition duration-300 hover:-translate-y-1 sm:px-6 ${
                      ci % 3 === 1 ? "md:mt-1.5" : ""} ${ci % 3 === 2 ? "md:mx-1.5" : ""}`}
                    style={{ backgroundColor: c.colors.benefitCard, color: c.colors.benefitText }}>
                    {card.map((line, li) => (
                      <p key={li} className={li ? "mt-5 sm:mt-4" : ""}>{bn(ci * 2 + li + 1)}/ <RichText text={line} price={priceBn} /></p>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="bg-[#f3f6f9] px-4 pb-8 pt-2 text-center">
        <OrderButton color={c.colors.ctaButton} text={btn} />
      </section>

      {/* ===== PRICE ===== */}
      {c.showPrice && (
        <section className="bg-[#efefef] py-7">
          <div className="mx-auto grid max-w-[940px] items-center gap-6 px-4 md:grid-cols-2">
            <div className="mx-auto grid aspect-square w-full max-w-90 place-items-center rounded-2xl bg-white p-6 shadow-md sm:rounded-none sm:shadow-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img {...responsive(image, "(min-width: 768px) 312px, calc(100vw - 80px)", [256, 384, 512, 640])} alt={productName} width={400} height={400} className="size-full object-contain transition duration-500 hover:scale-105" loading="lazy" decoding="async" />
            </div>
            <div className="text-center">
              <p className="text-[26px] font-extrabold leading-snug text-[#e11d1d] sm:text-[20px] sm:font-bold"><RichText text={c.priceTitle} price={priceBn} /></p>
              <p className="mt-2 text-[18px] font-bold leading-relaxed sm:text-[14px]"><RichText text={c.priceSubtitle} price={priceBn} /></p>
              <div className="mt-6 sm:mt-5"><OrderButton color={c.colors.priceButton} text={btn} /></div>
            </div>
          </div>
        </section>
      )}

      {/* ===== FAQ ===== */}
      {c.showFaq && c.faqs.length > 0 && (
        <section className="bg-[#f3f6f9] py-8">
          <div className="mx-auto max-w-[940px] px-4 text-[18px] leading-[1.75] text-[#222] sm:text-[14px] sm:leading-[1.6]">
            <h2 className="text-center text-[29px] font-bold text-[#111] sm:text-[28px]">{c.faqTitle}</h2>
            {c.faqs.map((f, i) => (
              <div key={i} className={`rounded-2xl bg-white p-4 shadow-sm sm:rounded-none sm:bg-transparent sm:p-0 sm:shadow-none ${i ? "mt-5 sm:mt-8" : "mt-6"}`}>
                <p className="whitespace-pre-line font-bold text-[#0f5132] sm:font-normal sm:text-inherit"><b>{bn(i + 1)}/</b> <RichText text={f.q} price={priceBn} /></p>
                <p className="mt-3 whitespace-pre-line sm:mt-5"><b>উত্তর:</b> <RichText text={f.a} price={priceBn} /></p>
              </div>
            ))}
            <div className="mt-10 text-center"><OrderButton color={c.colors.faqButton} text={btn} /></div>
          </div>
        </section>
      )}

      {/* ===== INGREDIENTS / USAGE / ADVICE ===== */}
      {c.showIngredients && (
        <section className="bg-[#efefef] py-6">
          <div className="mx-auto grid max-w-[940px] gap-8 px-4 md:grid-cols-2 md:gap-5">
            <div>
              <h2 className="text-[25px] font-bold text-[#1e293b] sm:text-[20px]">{c.ingredientsTitle}</h2>
              <ul className="mt-2">
                {c.ingredients.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 border-b border-dashed border-[#8a8f98] py-3 text-[18px] font-semibold text-[#2f343b] last:border-b-0 sm:py-[6px] sm:text-[14px]">
                    <HandIcon /> <span><RichText text={item} price={priceBn} /></span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 text-center sm:mt-3"><OrderButton color={c.colors.ingredientsButton} text={btn} /></div>
            </div>
            <div>
              {c.usageText.trim() && (
                <>
                  <h2 className="text-[25px] font-bold text-[#1e293b] sm:text-[20px]">{c.usageTitle}</h2>
                  <p className="mt-3 flex items-start gap-2 text-[18px] font-bold leading-[1.7] sm:items-center sm:text-[14px] sm:leading-[1.6]">
                    <HandIcon /> <span className="whitespace-pre-line"><RichText text={c.usageText} price={priceBn} /></span>
                  </p>
                </>
              )}
              {c.adviceText.trim() && (
                <>
                  <h2 className="mt-6 text-[25px] font-bold text-[#1e293b] sm:mt-5 sm:text-[20px]">{c.adviceTitle}</h2>
                  <p className="mt-3 flex items-start gap-2 text-[18px] font-bold leading-[1.7] sm:items-center sm:text-[14px] sm:leading-[1.6]">
                    <HandIcon /> <span className="whitespace-pre-line"><RichText text={c.adviceText} price={priceBn} /></span>
                  </p>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===== CHECKOUT ===== */}
      <section id="order" className="scroll-mt-4 bg-[#f3f6f9]">
        <div className="mx-auto max-w-[940px] px-0 sm:px-4">
          <div className="border-t-[3px] border-[#5b62f4] bg-white px-4 pb-12 pt-8 shadow-[0_6px_0_-1px_#e3e6fb] sm:px-7">
            <h2 className="text-center text-[26px] font-bold leading-snug text-[#333] sm:text-[30px] sm:text-[#555]">{c.checkoutTitle}</h2>
            <div className="mt-6">
              {product ? (
                <CheckoutForm product={{ id: product.id, name: product.name, weight: product.weight, price: product.price, image, stock: product.stock }} config={checkout} landingId={l.id} />
              ) : (
                <p className="py-10 text-center text-[#555]">পণ্যটি এই মুহূর্তে পাওয়া যাচ্ছে না।</p>
              )}
            </div>
          </div>
        </div>
        <div className="h-10" />
      </section>

      <LandingFooter name={l.footer_name || ls.footerName} />
      <LandingExtras landingId={l.id} preview={preview} phone={ls.floatingButtons ? ls.contactPhone : ""} whatsapp={ls.floatingButtons ? ls.whatsapp : ""}
        orderBar={product ? { text: btn, price: `৳${priceBn}`, ...readableButton(c.colors.topButton) } : undefined} />
      {product && <ViewContentEvent product={{ id: product.id, name: product.name, price: Number(product.price) }} />}
    </div>
  );
}
