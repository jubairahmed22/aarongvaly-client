import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/seo";
import { GoogleTagManager } from "@/components/analytics/GoogleTagManager";
import { TrackingPixels } from "@/components/analytics/TrackingPixels";
import { FloatingWidgets, RouteProgress } from "@/components/layout";
import { Suspense } from "react";
import { COMPANY } from "@/lib/entity/company";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${COMPANY.name} - Online Shopping for Everything, Delivered Fast`,
    template: `%s · ${COMPANY.name}`,
  },
  description:
    "Shop electronics, fashion, home & living, beauty and more - all in one place. Genuine products, great prices and fast delivery nationwide.",
  keywords: [
    "online shopping bangladesh",
    "ecommerce bangladesh",
    "buy electronics online",
    "fashion online bd",
    "home essentials",
    "beauty products online",
    "aarongvaly",
    "all in one marketplace",
  ],
  applicationName: COMPANY.name,
  authors: [{ name: COMPANY.name }],
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "en_BD",
    url: siteUrl,
    siteName: COMPANY.name,
    title: `${COMPANY.name} - Online Shopping for Everything, Delivered Fast`,
    description:
      "Everything you need, all in one place - electronics, fashion, home & living, beauty and more.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: COMPANY.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: COMPANY.name,
    description: "Everything you need, all in one place.",
    images: ["/og-image.png"],
  },
  icons: {
    // SVG first so the tab icon stays sharp at any density; the PNG is the
    // fallback for Safari and the Android/iOS home-screen icon.
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#EC7024",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body>
        <GoogleTagManager />
        <TrackingPixels />
        <Providers>
          {/* Top loading bar for route transitions. Suspense-wrapped because it
              reads useSearchParams(), which would otherwise opt every page into
              dynamic rendering. */}
          <Suspense fallback={null}>
            <RouteProgress />
          </Suspense>
          {children}
          <FloatingWidgets />
        </Providers>
        <OrganizationJsonLd
          url={siteUrl}
          logo={`${siteUrl}/logo.png`}
          sameAs={[...COMPANY.sameAs]}
          contact={{ contactType: "customer service", areaServed: "BD" }}
        />
        <WebsiteJsonLd url={siteUrl} />
      </body>
    </html>
  );
}
