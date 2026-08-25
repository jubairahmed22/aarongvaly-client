"use client";

import * as React from "react";
import Link from "next/link";
import { Facebook, Instagram, Youtube } from "lucide-react";
import { COMPANY } from "@/lib/entity/company";
import { usePublicSiteSettings } from "@/hooks/useSiteSettings";
import { cn } from "@/lib/utils/cn";

/**
 * Global storefront footer — three centred link columns, a social cluster on
 * the right, then a baseline row carrying the copyright and the accepted
 * payment methods.
 *
 * Every href here resolves to a route that exists. The reference design this
 * follows lists "About", "Store Locator", "Blogs and News", "Privacy Policy",
 * "Safety Advisory" and "Community Guidelines"; none of those pages exist in
 * this app, and the previous footer already shipped a dead /privacy link, so
 * the columns are filled with the closest real destinations instead. Add the
 * routes and these lists can grow to match one-for-one.
 */

interface FooterLink {
  label: string;
  href: string;
}

const COLUMNS: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: "Information",
    links: [
      { label: "New Arrivals", href: "/all-products?sort=newest" },
      { label: "All Products", href: "/all-products" },
      { label: "Brands", href: "/brands" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    title: "Policies",
    links: [
      { label: "Delivery Policy", href: "/shipping" },
      { label: "Return & Exchange", href: "/returns" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "FAQ", href: "/faq" },
    ],
  },
];

/**
 * Human labels for the payment method keys stored in
 * `siteSettings.enabledPaymentMethods`. Unknown keys fall back to a
 * title-cased version of the key itself, so a method added server-side
 * still renders something sensible instead of disappearing.
 */
const PAYMENT_LABELS: Record<string, string> = {
  cod: "Cash on Delivery",
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  sslcommerz: "SSLCOMMERZ",
  stripe: "Stripe",
  paypal: "PayPal",
  card: "Card",
  bank_transfer: "Bank Transfer",
};

function paymentLabel(key: string): string {
  return (
    PAYMENT_LABELS[key] ??
    key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function Footer() {
  const { data: settings } = usePublicSiteSettings();
  const contact = settings?.contact;

  const companyName = settings?.companyName?.trim() || COMPANY.name;
  const phone = contact?.phone?.trim();
  const email = contact?.email?.trim() || COMPANY.email;
  const paymentMethods = settings?.enabledPaymentMethods ?? [];

  // Only render a social circle when there's a real URL behind it — an icon
  // that links nowhere is worse than a missing icon.
  const socials = [
    { href: contact?.facebook?.trim(), label: "Facebook", Icon: Facebook },
    { href: contact?.instagram?.trim(), label: "Instagram", Icon: Instagram },
    { href: contact?.youtube?.trim(), label: "YouTube", Icon: Youtube },
  ].filter((s): s is { href: string; label: string; Icon: typeof Facebook } => !!s.href);

  // Fall back to the hard-coded company profile when Site Settings has no
  // social URLs configured yet.
  const resolvedSocials =
    socials.length > 0
      ? socials
      : COMPANY.sameAs.map((href) => ({
          href,
          label: href.includes("instagram")
            ? "Instagram"
            : href.includes("youtube")
              ? "YouTube"
              : "Facebook",
          Icon: href.includes("instagram")
            ? Instagram
            : href.includes("youtube")
              ? Youtube
              : Facebook,
        }));

  return (
    <footer className="mt-[48px] border-t border-neutral-300 bg-paper text-ink">
      <div className="mx-auto w-full px-[16px] pb-[28px] pt-[40px] lg:w-[92%] lg:px-0 xl:w-[86%]">
        {/* ── Link columns + socials ── */}
        <div className="grid gap-y-[36px] sm:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title} className="text-center">
              <FooterHeading>{col.title}</FooterHeading>
              <ul className="mt-[20px] space-y-[14px]">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[15px] text-ink transition-colors hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Customer service — contact details rather than navigation. */}
          <section aria-label="Customer service" className="text-center">
            <FooterHeading>Customer Service</FooterHeading>
            <ul className="mt-[20px] space-y-[14px] text-[15px] text-ink">
              {phone ? (
                <li>
                  <a href={`tel:${phone.replace(/\s+/g, "")}`} className="transition-colors hover:text-accent">
                    {phone}
                  </a>
                </li>
              ) : null}
              <li className="uppercase">{COMPANY.supportHours}</li>
              {email ? (
                <li>
                  <a href={`mailto:${email}`} className="break-all transition-colors hover:text-accent">
                    {email}
                  </a>
                </li>
              ) : null}
            </ul>
          </section>

          {/* Socials sit in the fourth column on wide screens, centred with
              the link columns below that. */}
          {resolvedSocials.length > 0 ? (
            <div className="flex items-start justify-center gap-[12px] sm:col-span-2 lg:col-span-1 lg:justify-end">
              {resolvedSocials.map(({ href, label, Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className={cn(
                    "flex h-[38px] w-[38px] items-center justify-center rounded-full border border-neutral-400 text-ink",
                    "transition-colors hover:border-ink hover:bg-ink hover:text-paper",
                  )}
                >
                  <Icon className="h-[16px] w-[16px]" aria-hidden />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        {/* ── Baseline: copyright + accepted payments ── */}
        <div className="mt-[40px] flex flex-col items-center gap-[24px] lg:flex-row lg:items-end lg:justify-between">
          <p className="order-2 text-[14px] text-ink lg:order-1">
            © {new Date().getFullYear()} {companyName} | All Rights Reserved.
          </p>

          {paymentMethods.length > 0 ? (
            <div className="order-1 flex items-center gap-[12px] lg:order-2">
              <span className="shrink-0 text-[11px] text-neutral-500">Pay With</span>
              {/* The reference shows a grid of payment-brand logos. No logo
                  assets ship with this repo, so the enabled methods render as
                  labelled chips — same block, real data, nothing invented.
                  Drop logo files into /public and these can become images. */}
              <ul className="flex max-w-[420px] flex-wrap justify-center gap-[6px] border border-neutral-200 p-[8px]">
                {paymentMethods.map((method) => (
                  <li
                    key={method}
                    className="border border-neutral-200 bg-neutral-50 px-[8px] py-[4px] text-[10px] font-medium uppercase tracking-[0.06em] text-neutral-600"
                  >
                    {paymentLabel(method)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  );
}

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[15px] font-bold uppercase tracking-[0.04em] text-ink">{children}</h2>
  );
}
