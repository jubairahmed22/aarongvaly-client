"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, BadgePercent, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { COMPANY } from "@/lib/entity/company";

export interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  /** Bottom CTA - e.g. "Don't have an account? Sign up". */
  altPrompt?: { question: string; ctaLabel: string; ctaHref: string };
  children: React.ReactNode;
}

/** Value props shown on the brand panel - same set across every auth page. */
const BENEFITS = [
  {
    Icon: Truck,
    title: "Fast delivery nationwide",
    body: "All 64 districts, tracked end to end.",
  },
  {
    Icon: ShieldCheck,
    title: "Secure checkout",
    body: "Your details stay private and encrypted.",
  },
  {
    Icon: RotateCcw,
    title: "Easy returns",
    body: "Changed your mind? Send it back, hassle-free.",
  },
  {
    Icon: BadgePercent,
    title: "Members-only offers",
    body: "Early access to deals and price drops.",
  },
] as const;

/**
 * Auth shell for login / register / verify / forgot- & reset-password.
 *
 * Full storefront chrome (Navbar + Footer) so signing in never feels like
 * leaving the shop, wrapped around a two-column layout: a lavender brand
 * panel carrying the value props on lg+, and the form itself in a white card.
 * Below lg the panel drops to a compact benefit grid under the card, so the
 * form stays the first thing in view on a phone.
 */
export function AuthLayout({ title, subtitle, altPrompt, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <Navbar />

      {/* Top-aligned on phones (form first, no dead space); optically centred
          on lg+ where the tall brand panel would otherwise sit high. */}
      <main className="mx-auto flex w-full flex-1 flex-col px-[12px] py-[20px] md:py-[36px] lg:w-[82%] lg:max-w-none lg:justify-center lg:px-0">
        {/* Back to shopping - small, quiet, above the fold */}
        <Link
          href="/"
          className="mb-[16px] inline-flex items-center gap-[6px] text-[13px] font-semibold text-neutral-500 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-[15px] w-[15px]" aria-hidden />
          Back to shopping
        </Link>

        <div className="grid items-stretch gap-[20px] lg:grid-cols-[1.05fr_1fr] lg:gap-[32px]">
          {/* ── Brand panel (lg+) ── */}
          <section className="relative hidden overflow-hidden rounded-[24px] bg-[#F5EDFF] p-[40px] lg:flex lg:flex-col">
            {/* Soft decorative blobs - purely visual */}
            <span
              aria-hidden
              className="pointer-events-none absolute -right-[60px] -top-[60px] h-[220px] w-[220px] rounded-full bg-[#E4D3FB] blur-[8px]"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-[80px] -left-[40px] h-[260px] w-[260px] rounded-full bg-white/60 blur-[10px]"
            />

            <div className="relative flex flex-1 flex-col">
              <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#7B4DD8]">
                {COMPANY.name}
              </p>
              <h2 className="mt-[10px] max-w-[380px] text-[34px] font-extrabold leading-[1.15] tracking-tight text-[#1F1235]">
                Everything you need, delivered in minutes.
              </h2>
              <p className="mt-[10px] max-w-[380px] text-[14px] leading-relaxed text-[#4A3A6B]">
                One account for orders, wishlists, and offers across the whole store.
              </p>

              <ul className="mt-[32px] flex flex-col gap-[18px]">
                {BENEFITS.map(({ Icon, title: t, body }) => (
                  <li key={t} className="flex items-start gap-[12px]">
                    <span className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-white text-[#5718C2] shadow-sm">
                      <Icon className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-bold leading-tight text-[#1F1235]">
                        {t}
                      </span>
                      <span className="mt-[2px] block text-[13px] leading-snug text-[#4A3A6B]">
                        {body}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* ── Form card ── */}
          <section className="flex flex-col justify-center">
            <div className="rounded-[24px] border border-neutral-200 bg-paper p-[20px] shadow-[0_2px_18px_rgba(16,8,40,0.06)] sm:p-[32px]">
              <div className="mb-[20px] flex flex-col gap-[6px]">
                <h1 className="text-[26px] font-extrabold leading-tight tracking-tight sm:text-[30px]">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="text-[14px] leading-relaxed text-neutral-500">{subtitle}</p>
                ) : null}
              </div>

              {children}

              {altPrompt ? (
                <p className="mt-[20px] border-t border-neutral-200 pt-[16px] text-center text-[14px] text-neutral-600">
                  {altPrompt.question}{" "}
                  <Link
                    href={altPrompt.ctaHref}
                    className="font-bold text-[#5718C2] underline-offset-4 hover:underline"
                  >
                    {altPrompt.ctaLabel}
                  </Link>
                </p>
              ) : null}
            </div>

            {/* Compact benefit grid - stands in for the brand panel below lg */}
            <ul className="mt-[16px] grid grid-cols-2 gap-[8px] lg:hidden">
              {BENEFITS.map(({ Icon, title: t }) => (
                <li
                  key={t}
                  className="flex items-center gap-[8px] rounded-[14px] bg-[#F5EDFF] px-[12px] py-[10px]"
                >
                  <Icon className="h-[16px] w-[16px] shrink-0 text-[#5718C2]" aria-hidden />
                  <span className="min-w-0 text-[12px] font-semibold leading-tight text-[#1F1235]">
                    {t}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
