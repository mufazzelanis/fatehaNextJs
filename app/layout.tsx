import type { Metadata, Viewport } from "next";
import { Anek_Bangla, Geist, Hind_Siliguri } from "next/font/google";
import { Suspense } from "react";
import { getPublicPixelConfig } from "@/lib/meta/config";
import { MetaPixel } from "@/components/meta/meta-pixel";
import "./globals.css";

const hind = Hind_Siliguri({
  variable: "--font-hind",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  // Bangla fonts are big — the browser fetches them only on pages that show Bangla text (unicode-range), not on every page.
  preload: false,
});

const anek = Anek_Bangla({
  variable: "--font-anek",
  subsets: ["bengali", "latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
  preload: false,
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const pixel = await getPublicPixelConfig();
  return (
    <html lang="bn" suppressHydrationWarning className={`${hind.variable} ${anek.variable} ${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        {pixel && (
          <Suspense>
            <MetaPixel config={{ pixelIds: pixel.pixelIds, browser: pixel.browser, capi: pixel.capi, serverPageView: pixel.serverPageView, events: pixel.events }} />
          </Suspense>
        )}
        {pixel?.browser && (
          <noscript>
            {pixel.pixelIds.map((id) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={id} height="1" width="1" style={{ display: "none" }} alt=""
                src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`} />
            ))}
          </noscript>
        )}
      </body>
    </html>
  );
}
