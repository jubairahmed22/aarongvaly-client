"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CircleUserRound, Heart, LayoutGrid, Menu, ShoppingCart } from "lucide-react";
import { SearchSuggestBox, OfferBannerCarousel } from "@/components/composed";
import { CategoryIcon } from "@/lib/utils/categoryIcon";
import { useUIStore } from "@/store/uiStore";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useAuth } from "@/hooks/useAuth";
import { COMPANY } from "@/lib/entity/company";
import { cn } from "@/lib/utils/cn";
import type { CategoryNode } from "./Navbar/CategoryMenu";
import type { OfferBanner } from "@/types/offer";
import { startRouteProgress } from "./RouteProgress";

export interface MobileHomeHeaderProps {
  categories: CategoryNode[];
  /** Homepage offer banners - rendered inside the purple block, Zepto style. */
  banners?: OfferBanner[];
}

/**
 * Zepto-style mobile home header (below lg) - the lavender block at the top
 * of the home page: hamburger (opens the left MobileMenu sidebar) +
 * aarongvaly logo + profile icon, then a sticky
 * search-bar + category-tab strip, then the homepage offer banner sitting on
 * the same lavender background.
 *
 * Rendered as sibling fragments (not one wrapper) so the search/tabs block
 * can `position: sticky` against the page root and stay pinned while the
 * rest of the page scrolls - exactly like the Zepto app. The standard
 * Navbar's mobile rows are hidden on the home page (see NavbarProps
 * `hideMobileHeader`); MobileMenu and CartDrawer stay mounted there.
 */
export function MobileHomeHeader({ categories, banners = [] }: MobileHomeHeaderProps) {
  const router = useRouter();
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen);

  const submitSearch = (q: string) => {
    if (!q.trim()) return;
    startRouteProgress();
    router.push(`/all-products?q=${encodeURIComponent(q.trim())}`);
  };

  const hasBanner = banners.some((b) => b.isActive);

  return (
    <>
      {/* ── Row 1: menu · logo · profile/wishlist/cart ── */}
      <div className="bg-[#F5EDFF] lg:hidden">
        {/* 12px gutter everywhere; the hamburger button pulls itself left by
            its own inner padding ((40-22)/2 = 9px) so the ☰ glyph's left edge
            sits exactly on the 12px line with the search bar and tabs. */}
        <div className="flex items-center gap-[2px] px-[12px] pt-[8px]">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
            className="-ml-[9px] inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full text-[#1F1235] transition-colors hover:bg-[#E9DCFC] active:bg-[#E2D2FA]"
          >
            <Menu className="h-[22px] w-[22px]" aria-hidden />
          </button>

          {/* aarongvaly logo - scales up a notch on tablets (md). */}
          <div className="min-w-0 flex-1 pl-[4px]">
            <Link
              href="/"
              aria-label={`${COMPANY.name} home`}
              className="inline-flex items-center py-[8px]"
            >
              <Image
                src="/logo-wordmark.png"
                alt={COMPANY.name}
                width={148}
                height={28}
                className="h-[24px] w-auto md:h-[28px]"
                priority
              />
            </Link>
          </div>

          <MobileHeaderIcons />
        </div>
      </div>

      {/* ── Sticky: search bar + category tabs ── */}
      <div className="sticky top-0 z-40 bg-[#F5EDFF] pt-[10px] lg:hidden">
        <div className="px-[12px]">
          <SearchSuggestBox placeholder='Search for "chocolate"' onSubmit={submitSearch} />
        </div>

        <nav aria-label="Shop departments" className="mt-[4px]">
          {/* Tabs size to their own label and sit a single gap-1 (8px) apart,
              scrolling left-right for the rest. They used to be locked to
              exactly 1/4 of the row, which left short labels ("Beauty",
              "Sports") floating in a lot of dead space. A max-width keeps one
              long department name from swallowing the whole strip - it
              truncates instead. */}
          <ul className="scrollbar-hide flex items-stretch gap-1 overflow-x-auto scroll-smooth px-[12px] pt-[6px]">
            {/* "All Products" - always the active tab on the home page. Icon
                and label are centred over each other, Zepto style, with the
                underline spanning the tab's full width. */}
            <li className="shrink-0">
              <Link href="/all-products" className="flex h-full flex-col items-center gap-[3px]">
                <LayoutGrid className="h-[20px] w-[20px] text-[#1F1235]" aria-hidden />
                <span className="block max-w-[120px] truncate text-center text-[12.5px] font-bold leading-tight text-[#1F1235]">
                  All Products
                </span>
                <span className="mt-auto h-[3px] w-full rounded-t-full bg-ink" aria-hidden />
              </Link>
            </li>

            {categories.map((cat) => (
              <li key={cat.slug} className="shrink-0">
                <Link
                  href={`/category/${cat.slug}`}
                  className="flex h-full flex-col items-center gap-[3px] pb-[3px]"
                >
                  <CategoryIcon
                    name={cat.icon}
                    className="h-[20px] w-[20px] text-[#3D2A66]"
                    aria-hidden
                  />
                  <span className="block max-w-[120px] truncate text-center text-[12.5px] font-medium leading-tight text-[#4A3A6B]">
                    {cat.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* ── Offer banner - sits on the lavender background like Zepto's hero ── */}
      {hasBanner ? (
        <div className="bg-[#F5EDFF] px-[12px] pb-[16px] pt-[12px] lg:hidden">
          <div className="overflow-hidden rounded-[16px]">
            <OfferBannerCarousel banners={banners} aspectClassName="aspect-[4/3] xs:aspect-[16/9]" />
          </div>
        </div>
      ) : null}
    </>
  );
}

/* ───────────────────── Right-side icon cluster ─────────────────────
 * Profile · Wishlist · Cart, in the lavender-header style. Shared by the
 * home page's MobileHomeHeader and the standard Navbar's mobile rows so both
 * headers stay pixel-identical. The cart button opens the CartDrawer
 * (mounted inside Navbar) instead of navigating. */

export function MobileHeaderIcons() {
  const { user } = useAuth();
  const wishlistCount = useWishlistStore((s) => s.count());
  const cartCount = useCartStore((s) => s.count());
  const setCartDrawerOpen = useUIStore((s) => s.setCartDrawerOpen);

  // Counts come from persisted stores - only show badges after mount so the
  // SSR markup and first client render agree (same trick as Navbar's
  // NavBadge).
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const iconBtn =
    "relative inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full text-[#1F1235] transition-colors hover:bg-[#E9DCFC] active:bg-[#E2D2FA]";

  return (
    <div className="flex shrink-0 items-center">
      <Link
        href={user ? "/account" : "/login"}
        aria-label={user ? "Account" : "Sign in"}
        className={iconBtn}
      >
        <CircleUserRound className="h-[26px] w-[26px]" strokeWidth={1.5} aria-hidden />
      </Link>

      <Link href="/wishlist" aria-label="Wishlist" className={iconBtn}>
        <Heart className="h-[22px] w-[22px]" aria-hidden />
        <IconBadge count={mounted ? wishlistCount : 0} />
      </Link>

      {/* Pulls itself right by its inner padding ((40-22)/2 = 9px) so the
          cart glyph's right edge sits exactly on the 12px gutter line. */}
      <button
        type="button"
        onClick={() => setCartDrawerOpen(true)}
        aria-label="Cart"
        className={cn(iconBtn, "-mr-[9px]")}
      >
        <ShoppingCart className="h-[22px] w-[22px]" aria-hidden />
        <IconBadge count={mounted ? cartCount : 0} />
      </button>
    </div>
  );
}

function IconBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute right-[2px] top-[2px] flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#FF3269] px-[4px] text-[9px] font-bold leading-none text-white ring-2 ring-[#F5EDFF]">
      {count > 99 ? "99+" : count}
    </span>
  );
}
