import type { Metadata, Viewport } from "next";
// Fonts ship with the app (@fontsource) instead of being fetched from Google at build time, so a build never
// depends on Google's response format. Each font is split by script (Bengali / Latin) with unicode-range,
// so a page downloads only the parts it actually shows.
import "@fontsource/hind-siliguri/400.css";
import "@fontsource/hind-siliguri/500.css";
import "@fontsource/hind-siliguri/600.css";
import "@fontsource/hind-siliguri/700.css";
import "@fontsource/anek-bangla/500.css";
import "@fontsource/anek-bangla/600.css";
import "@fontsource/anek-bangla/700.css";
import "@fontsource/anek-bangla/800.css";
import "@fontsource-variable/geist/wght.css";
import { Suspense } from "react";
import { getPublicPixelConfig } from "@/lib/meta/config";
import { MetaPixel } from "@/components/meta/meta-pixel";
import { AttributionTracker } from "@/components/attribution-tracker";
import { SiteLiveTracker } from "@/components/site-live-tracker";
import "./globals.css";

export const metadata: Metadata = {
  // Absolute links for Facebook/Google previews (set SITE_URL in production, e.g. https://fatehabd.com).
  metadataBase: new URL(process.env.SITE_URL || "https://fatehabd.com"),
  title: {
    default: "FatehaBD — Authentic baby food & baby care in Bangladesh",
    template: "%s | FatehaBD",
  },
  description: "Authentic imported baby food and baby care with Cash on Delivery all over Bangladesh.",
};

export const viewport: Viewport = {
  themeColor: "#12b3b8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="bn" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Suspense><AttributionTracker /></Suspense>
        <Suspense><SiteLiveTracker /></Suspense>
        {/* Always the same boundary: adding/removing it with the pixel settings made cached page shells
            stop matching ("Couldn't find all resumable slots") and React re-rendered the whole page in the browser. */}
        <Suspense><PixelLoader /></Suspense>
      </body>
    </html>
  );
}

/** Facebook pixel for the whole site (cached config); renders nothing when no pixel is set up. */
async function PixelLoader() {
  const pixel = await getPublicPixelConfig();
  if (!pixel) return null;
  return (
    <>
      <MetaPixel config={{ pixelIds: pixel.pixelIds, scopes: pixel.scopes, browser: pixel.browser, capi: pixel.capi, serverPageView: pixel.serverPageView, events: pixel.events }} />
      {pixel.browser && (
        <noscript>
          {pixel.pixelIds.map((id) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={id} height="1" width="1" style={{ display: "none" }} alt=""
              src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`} />
          ))}
        </noscript>
      )}
    </>
  );
}
