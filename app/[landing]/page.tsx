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
import { VideoEmbed } from "@/components/landing/video-embed";
import { videoEmbed, type Block, type SectionKey } from "@/lib/content";

/** Large, thumb-friendly order button: full width on phones, with a soft moving shine so it is easy to spot. */
function OrderButton({ color, text }: { color: string; text: string }) {
  return (
    <a href="#order" data-track="order"
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
  const t = c.theme;
  const checkout = l.checkout;
  const image = productImageUrl(product);
  const priceBn = bn(Math.round(product?.price ?? 750));
  const productName = product?.name ?? "মাশরুম ডেন্টোকেয়ার প্লাস";
  const btn = c.orderButtonText;
  const blocks = new Map(c.blocks.map((b) => [`b:${b.id}`, b]));

  /** One movable section (built-in or custom block), or null when it is hidden / empty. */
  const renderSection = (key: SectionKey) => {
    switch (key) {
      case "approval":
        return (
          <section key={key} className="pb-3 pt-2" style={{ backgroundColor: t.pageBg }}>
            <div className="mx-auto max-w-[940px] px-4">
              <h1 className="text-center text-[27px] font-bold leading-[1.35] sm:text-[28px] sm:leading-snug" style={{ color: t.headingColor }}><RichText text={c.approvalHeading} price={priceBn} /></h1>
              <div className="mt-6 text-center"><OrderButton color={c.colors.topButton} text={btn} /></div>
            </div>
          </section>
        );
      case "intro":
        if (!c.introText.trim()) return null;
        return (
          <section key={key} className="pb-3 pt-6" style={{ backgroundColor: t.pageBg }}>
            <div className="mx-auto max-w-[940px] px-4">
              <div className="whitespace-pre-line rounded-2xl px-5 py-6 text-[19px] font-bold leading-[1.8] shadow-sm sm:rounded-none sm:px-7 sm:text-[16.5px] sm:leading-[1.75] sm:shadow-none"
                style={{ backgroundColor: c.colors.introBox }}>
                <RichText text={c.introText} price={priceBn} />
              </div>
            </div>
          </section>
        );
      case "benefits":
        if (!c.showBenefits || !c.benefits.length) return null;
        return (
          <section key={key} className="pb-14 pt-11" style={{ backgroundColor: t.pageBg }}>
            <div className="mx-auto max-w-[940px] px-4">
              <div className="text-center">
                <h2 className="inline-block rounded-[8px] px-2.5 py-1 text-[30px] font-bold" style={{ backgroundColor: t.benefitsTitleBg, color: t.benefitsTitleText }}>{c.benefitsTitle}</h2>
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
            </div>
          </section>
        );
      case "cta":
        return (
          <section key={key} className="px-4 pb-8 pt-2 text-center" style={{ backgroundColor: t.pageBg }}>
            <OrderButton color={c.colors.ctaButton} text={btn} />
          </section>
        );
      case "price":
        if (!c.showPrice) return null;
        return (
          <section key={key} className="py-7" style={{ backgroundColor: t.altBg }}>
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
        );
      case "faq":
        if (!c.showFaq || !c.faqs.length) return null;
        return (
          <section key={key} className="py-8" style={{ backgroundColor: t.pageBg }}>
            <div className="mx-auto max-w-[940px] px-4 text-[18px] leading-[1.75] text-[#222] sm:text-[14px] sm:leading-[1.6]">
              <h2 className="text-center text-[29px] font-bold sm:text-[28px]" style={{ color: t.headingColor }}>{c.faqTitle}</h2>
              {c.faqs.map((f, i) => (
                <div key={i} className={`rounded-2xl bg-white p-4 shadow-sm sm:rounded-none sm:bg-transparent sm:p-0 sm:shadow-none ${i ? "mt-5 sm:mt-8" : "mt-6"}`}>
                  <p className="whitespace-pre-line font-bold text-[#0f5132] sm:font-normal sm:text-inherit"><b>{bn(i + 1)}/</b> <RichText text={f.q} price={priceBn} /></p>
                  <p className="mt-3 whitespace-pre-line sm:mt-5"><b>উত্তর:</b> <RichText text={f.a} price={priceBn} /></p>
                </div>
              ))}
              <div className="mt-10 text-center"><OrderButton color={c.colors.faqButton} text={btn} /></div>
            </div>
          </section>
        );
      case "ingredients":
        if (!c.showIngredients) return null;
        return (
          <section key={key} className="py-6" style={{ backgroundColor: t.altBg }}>
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
        );
      default: {
        const b = blocks.get(key);
        return b ? <CustomBlock key={key} block={b} btn={btn} priceBn={priceBn} /> : null;
      }
    }
  };

  return (
    <div className="bg-white font-sans text-[#111] wrap-anywhere">
      {/* ===== HERO: product photo + label banner (always first) ===== */}
      <section className="pb-6 pt-4 sm:pt-6"
        style={{ backgroundImage: `linear-gradient(to bottom, ${t.heroFrom}, color-mix(in srgb, ${t.heroFrom} 50%, white), ${t.heroTo})` }}>
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

      {/* ===== Sections in the order chosen in the admin editor ===== */}
      {c.layout.map(renderSection)}

      {/* ===== CHECKOUT (always last) ===== */}
      <section id="order" className="scroll-mt-4" style={{ backgroundColor: t.pageBg }}>
        <div className="mx-auto max-w-[940px] px-0 sm:px-4">
          <div className="border-t-[3px] bg-white px-4 pb-12 pt-8 sm:px-7"
            style={{ borderTopColor: t.formAccent, boxShadow: `0 6px 0 -1px color-mix(in srgb, ${t.formAccent} 15%, white)` }}>
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

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5 text-[#f5a623]" aria-label={`${n} / 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" width="20" height="20" fill={i < n ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
        </svg>
      ))}
    </span>
  );
}

/** A section the admin added: text box, photos, video or customer reviews. */
function CustomBlock({ block: b, btn, priceBn }: { block: Block; btn: string; priceBn: string }) {
  if (!b.show) return null;
  const video = b.type === "video" ? videoEmbed(b.videoUrl) : null;
  const reviews = b.type === "reviews" ? b.reviews.filter((r) => r.text.trim() || r.image) : [];
  const empty = (b.type === "text" && !b.title.trim() && !b.text.trim()) || (b.type === "image" && !b.images.length)
    || (b.type === "video" && !video) || (b.type === "reviews" && !reviews.length);
  if (empty) return null;

  return (
    <section className="py-8" style={{ backgroundColor: b.bg, color: b.textColor }}>
      <div className="mx-auto max-w-[940px] px-4">
        {b.title.trim() && <h2 className="text-center text-[28px] font-bold leading-snug sm:text-[26px]"><RichText text={b.title} price={priceBn} /></h2>}
        {b.text.trim() && b.type !== "image" && (
          <div className={`whitespace-pre-line text-[19px] font-semibold leading-[1.8] sm:text-[16px] sm:leading-[1.75] ${b.title.trim() ? "mt-4" : ""} ${b.type === "text" ? "" : "text-center"}`}>
            <RichText text={b.text} price={priceBn} />
          </div>
        )}

        {b.type === "image" && (
          <div className={`grid gap-4 ${b.title.trim() ? "mt-5" : ""} ${b.images.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {b.images.map((f) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={f} {...responsive(`/media/${f}`, b.images.length > 1 ? "(min-width: 640px) 450px, calc(100vw - 32px)" : "(min-width: 940px) 908px, calc(100vw - 32px)", [384, 512, 640, 828])}
                alt={b.title || "ছবি"} loading="lazy" decoding="async" className="mx-auto h-auto w-full rounded-2xl shadow-md sm:rounded-xl" />
            ))}
          </div>
        )}
        {b.type === "image" && b.text.trim() && (
          <p className="mt-4 whitespace-pre-line text-center text-[18px] font-semibold leading-relaxed sm:text-[15px]"><RichText text={b.text} price={priceBn} /></p>
        )}

        {video && (
          <div className={`mx-auto max-w-[760px] ${b.title.trim() || b.text.trim() ? "mt-5" : ""}`}>
            <VideoEmbed embed={video.embed} thumb={video.thumb} title={b.title} />
          </div>
        )}

        {reviews.length > 0 && (
          <div className={`grid gap-4 sm:grid-cols-2 ${b.title.trim() || b.text.trim() ? "mt-6" : ""}`}>
            {reviews.map((r, i) => (
              <figure key={i} className="rounded-2xl bg-white p-5 text-[#1f2937] shadow-md ring-1 ring-black/5">
                <Stars n={r.stars} />
                {r.text.trim() && <blockquote className="mt-3 whitespace-pre-line text-[18px] font-semibold leading-[1.7] sm:text-[15px]">“<RichText text={r.text} price={priceBn} />”</blockquote>}
                {r.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img {...responsive(`/media/${r.image}`, "(min-width: 640px) 420px, calc(100vw - 72px)", [384, 512, 640, 828])} alt={r.name ? `${r.name} — রিভিউ` : "কাস্টমার রিভিউ"}
                    loading="lazy" decoding="async" className="mt-3 h-auto w-full rounded-xl ring-1 ring-black/5" />
                )}
                {r.name.trim() && <figcaption className="mt-3 text-[16px] font-bold text-[#0f5132] sm:text-[14px]">— {r.name}</figcaption>}
              </figure>
            ))}
          </div>
        )}

        {b.button && <div className="mt-7 text-center"><OrderButton color={b.buttonColor} text={btn} /></div>}
      </div>
    </section>
  );
}
