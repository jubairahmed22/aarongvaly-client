"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, Search, ShoppingBag, User } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useCartStore } from "@/store/cartStore";
import { useAuth } from "@/hooks/useAuth";
import { useHydrated } from "@/hooks/useHydrated";
import { COMPANY } from "@/lib/entity/company";
import { cn } from "@/lib/utils/cn";

/**
 * The one mobile/tablet header bar (below lg): hamburger + search on the
 * left, the wordmark optically centred, account + bag on the right.
 *
 * Shared by the standard {@link import("./Navbar/Navbar").Navbar} and the
 * home page's {@link import("./MobileHomeHeader").MobileHomeHeader}, which
 * previously each rendered their own version — the home page carried a
 * lavender block with an inline search field and a department tab strip,
 * every other page carried a white bar with a different icon set. One
 * component means the two can't drift apart again.
 *
 * The logo is absolutely positioned rather than laid out between the two icon
 * groups: the groups aren't the same width (and the bag's badge changes
 * width with the count), so a flex-centred logo would visibly shift left and
 * right as the cart fills up.
 */
export function MobileHeaderBar({ className }: { className?: string }) {
  const { user } = useAuth();
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);
  const setCartDrawerOpen = useUIStore((s) => s.setCartDrawerOpen);

  // Persisted-store read: must stay 0 until after hydration, or the server
  // markup and the first client render disagree. See useHydrated.
  const hydrated = useHydrated();
  const cartCount = useCartStore((s) => (hydrated ? s.count() : 0));

  const iconBtn =
    "inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-neutral-100 active:bg-neutral-200";

  return (
    <div
      className={cn(
        "relative flex h-[62px] items-center border-b border-neutral-200 bg-paper px-[12px] lg:hidden",
        className,
      )}
    >
      {/* Left: menu + search */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
          className={iconBtn}
        >
          <Menu className="h-[26px] w-[26px]" strokeWidth={2.5} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Search"
          className={iconBtn}
        >
          <Search className="h-[23px] w-[23px]" strokeWidth={2.2} aria-hidden />
        </button>
      </div>

      {/* Centre: wordmark */}
      <Link
        href="/"
        aria-label={`${COMPANY.name} home`}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <Image
          src="/logo-wordmark.png"
          alt={COMPANY.name}
          width={148}
          height={28}
          className="h-[24px] w-auto"
          priority
        />
      </Link>

      {/* Right: account + bag */}
      <div className="ml-auto flex items-center">
        <Link
          href={user ? "/account" : "/login"}
          aria-label={user ? "Account" : "Sign in"}
          className={iconBtn}
        >
          <User className="h-[24px] w-[24px]" strokeWidth={1.8} aria-hidden />
        </Link>

        <button
          type="button"
          onClick={() => setCartDrawerOpen(true)}
          aria-label="Cart"
          className={cn(iconBtn, "relative")}
        >
          <ShoppingBag className="h-[24px] w-[24px]" strokeWidth={1.8} aria-hidden />
          {/* Always rendered, including at zero — the reference shows a "0"
              badge on an empty bag, and a badge that only appears once the
              cart fills would shift the icon on first add. */}
          <span className="absolute right-[2px] top-[2px] flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-ink px-[4px] text-[10px] font-semibold leading-none text-paper">
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        </button>
      </div>
    </div>
  );
}
