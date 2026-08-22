"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Facebook, Instagram, Youtube } from "lucide-react";
import { COMPANY } from "@/lib/entity/company";
import { catalogApi } from "@/lib/api/catalog";
import { catalogKeys } from "@/hooks/useCatalog";

/**
 * Real district/division towns of Bangladesh (all 64 districts) - not a
 * fabricated placeholder list. Mirrors the storefront's own "Fast Delivery
 * Nationwide" messaging and the insideDhaka/outsideDhaka delivery pricing
 * tiers already in SiteSettings - both already imply nationwide coverage, so
 * this footer block is consistent with what the site already claims
 * elsewhere, not a new promise.
 */
const CITIES = [
  "Bagerhat", "Bandarban", "Barguna", "Barishal", "Bhola", "Bogura",
  "Brahmanbaria", "Chandpur", "Chapainawabganj", "Chattogram", "Chuadanga",
  "Cox's Bazar", "Cumilla", "Dhaka", "Dinajpur", "Faridpur", "Feni",
  "Gaibandha", "Gazipur", "Gopalganj", "Habiganj", "Jamalpur", "Jashore",
  "Jhalokati", "Jhenaidah", "Joypurhat", "Khagrachari", "Khulna",
  "Kishoreganj", "Kurigram", "Kushtia", "Lakshmipur", "Lalmonirhat",
  "Madaripur", "Magura", "Manikganj", "Meherpur", "Moulvibazar",
  "Munshiganj", "Mymensingh", "Naogaon", "Narail", "Narayanganj",
  "Narsingdi", "Natore", "Netrokona", "Nilphamari", "Noakhali",
  "Pabna", "Panchagarh", "Patuakhali", "Pirojpur", "Rajbari", "Rajshahi",
  "Rangamati", "Rangpur", "Satkhira", "Shariatpur", "Sherpur", "Sirajganj",
  "Sunamganj", "Sylhet", "Tangail", "Thakurgaon",
];

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { label: "New Arrivals", href: "/all-products?sort=newest" },
      { label: "All Products", href: "/all-products" },
      { label: "Sale", href: "/offers" },
      { label: "Brands", href: "/brands" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign In", href: "/login" },
      { label: "Join Now", href: "/register" },
      { label: "My Orders", href: "/account/orders" },
      { label: "Wishlist", href: "/wishlist" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "FAQ", href: "/faq" },
      { label: "Shipping", href: "/shipping" },
      { label: "Returns", href: "/returns" },
    ],
  },
] as const;

/**
 * Global storefront footer. Categories are fetched client-side (same
 * `useCategories` react-query hook the Navbar uses) rather than server-side,
 * since Footer is imported directly into both Server and Client page
 * components across the app - an async Server Component can't be rendered
 * from inside a "use client" file, but a plain client-fetch works uniformly
 * everywhere.
 */
export function Footer() {
  const { data: categories } = useQuery({
    queryKey: catalogKeys.categories({ shape: "tree", isActive: true }),
    queryFn: () => catalogApi.listCategories({ shape: "tree", isActive: true }),
    staleTime: 5 * 60_000,
  });
  const topCategories = categories ?? [];

  return (
    <footer className="mt-8 bg-paper text-ink">
      {/* Same gutters as the navbar/header at every size: 12px below lg
          (matches the mobile home header), 82% width on lg+ (matches the
          desktop navbar rows) - container-screen's 32px mobile padding
          left the footer visibly narrower than the header. */}
      <div className="mx-auto w-full px-[12px] py-8 md:py-12 lg:w-[82%] lg:max-w-none lg:px-0">
        {/* ── Shop by category — real category tree, Zepto-style grid ── */}
        {topCategories.length > 0 ? (
          <div>
            <h2 className="text-[15px] font-bold text-ink">Categories</h2>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 md:grid-cols-5">
              {topCategories.map((c) => (
                <Link
                  key={c._id}
                  href={`/category/${c.path}`}
                  className="text-[14px] font-semibold text-ink transition-colors hover:text-accent"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── Cities — real Bangladesh districts, plain SEO text (no per-city pages exist) ── */}
        <div className={topCategories.length > 0 ? "mt-8 md:mt-10" : undefined}>
          <h2 className="text-[15px] font-bold text-ink">Cities</h2>
          <p className="mt-3 text-[13px] leading-relaxed text-neutral-500">
            {CITIES.join(" | ")}
          </p>
        </div>

        <div className="my-8 h-px w-full bg-neutral-200 md:my-10" />

        {/* ── Brand + nav columns ── */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 md:grid-cols-5 md:gap-x-6">
          <div className="col-span-2 flex flex-col gap-3 md:col-span-2">
            <Link
              href="/"
              aria-label={`${COMPANY.name} home`}
              className="inline-flex w-fit transition-opacity hover:opacity-80"
            >
              <Image
                src="/logo-wordmark.png"
                alt={COMPANY.name}
                width={190}
                height={36}
                className="h-9 w-auto sm:h-10"
              />
            </Link>
            <p className="max-w-[320px] text-sm leading-relaxed text-neutral-500">
              Everything you need, all in one place — genuine products, fast delivery.
            </p>
            <div className="mt-2 flex items-center gap-3">
              {COMPANY.sameAs.map((href) => {
                const Icon = href.includes("instagram")
                  ? Instagram
                  : href.includes("youtube")
                    ? Youtube
                    : Facebook;
                const label = href.includes("instagram") ? "Instagram" : href.includes("youtube") ? "YouTube" : "Facebook";
                return (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-[32px] w-[32px] items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-accent hover:text-accent"
                  >
                    <Icon className="h-[15px] w-[15px]" aria-hidden />
                  </a>
                );
              })}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title} className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                {col.title}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-neutral-500 transition-colors hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-neutral-200 pt-5 text-xs text-neutral-500 md:mt-10 md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} {COMPANY.name}. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 md:gap-x-4 md:gap-y-2">
            <Link href="/privacy" className="transition-colors hover:text-ink">Privacy Policy</Link>
            <Link href="/terms" className="transition-colors hover:text-ink">Terms</Link>
            <span className="hidden h-3 w-px bg-neutral-300 md:inline-block" aria-hidden />
            <a
              href="https://www.enveria.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-ink"
            >
              Powered by <span className="font-semibold text-neutral-600">enveria.io</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
