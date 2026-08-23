"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingBag, Heart, Menu, Search } from "lucide-react";
import { type CategoryNode, type BrandLite } from "./CategoryMenu";
import { DepartmentStrip } from "./DepartmentStrip";
import { SearchOverlay } from "./SearchOverlay";
import { MobileMenu } from "./MobileMenu";
import { UserMenu } from "./UserMenu";
import { CartDrawer } from "../CartDrawer";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useUIStore } from "@/store/uiStore";
import { COMPANY } from "@/lib/entity/company";
import { cn } from "@/lib/utils/cn";

import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "@/lib/api/catalog";
import { catalogKeys } from "@/hooks/useCatalog";
import type { CategoryTreeNode } from "@/types/catalog";

export interface NavbarProps {
  categories?: CategoryNode[];
  /**
   * Accepted for source compatibility with the pages that still pass it.
   * The department strip is category-only by design (brands live on /brands),
   * so nothing in this header reads it today.
   */
  brands?: BrandLite[];
  /**
   * Hide the built-in mobile/tablet header rows. The home page sets this and
   * renders MobileHomeHeader instead; MobileMenu and CartDrawer stay mounted
   * here either way, so the sidebar/cart still work.
   */
  hideMobileHeader?: boolean;
}

/** Seasonal editorial link pinned to the front of the department strip. */
const FEATURE_LINK = { label: "The Fall Edit ’26", href: "/offers" };

export function Navbar({ categories: ssrCategories, hideMobileHeader }: NavbarProps) {
  const cartCount = useCartStore((s) => s.count());
  const wishlistCount = useWishlistStore((s) => s.count());
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen);
  const setCartDrawerOpen = useUIStore((s) => s.setCartDrawerOpen);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);
  const searchOpen = useUIStore((s) => s.searchOpen);

  const wantsCategories = !ssrCategories || ssrCategories.length === 0;

  const catsQuery = useQuery({
    queryKey: catalogKeys.categories({ shape: "tree", isActive: true }),
    queryFn: () => catalogApi.listCategories({ shape: "tree", isActive: true }),
    enabled: wantsCategories,
    staleTime: 5 * 60_000,
  });

  const fallbackCategories = wantsCategories ? (catsQuery.data ?? []).map(toCategoryNode) : [];
  const categories = ssrCategories?.length ? ssrCategories : fallbackCategories;

  return (
    <header id="site-navbar" className="sticky top-0 z-50">
      {/* ─────────────── Mobile & tablet header (below lg) ─────────────── */}
      <div className={cn("border-b border-neutral-200 bg-paper lg:hidden", hideMobileHeader && "hidden")}>
        <div className="flex items-center gap-[4px] px-[12px] py-[10px]">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
            className="-ml-[8px] inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-neutral-100"
          >
            <Menu className="h-[22px] w-[22px]" aria-hidden />
          </button>

          <div className="min-w-0 flex-1 pl-[4px]">
            <Link href="/" aria-label={`${COMPANY.name} home`} className="inline-flex items-center py-[6px]">
              <Image
                src="/logo-wordmark.png"
                alt={COMPANY.name}
                width={148}
                height={28}
                className="h-[24px] w-auto"
                priority
              />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            aria-expanded={searchOpen}
            className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-neutral-100"
          >
            <Search className="h-[21px] w-[21px]" strokeWidth={2.4} aria-hidden />
          </button>

          <Link
            href="/wishlist"
            aria-label="My Wish List"
            className="relative inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-neutral-100"
          >
            <Heart className="h-[21px] w-[21px]" aria-hidden />
            <CountBadge count={wishlistCount} />
          </Link>

          <button
            type="button"
            onClick={() => setCartDrawerOpen(true)}
            aria-label="Shopping Cart"
            className="relative inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-neutral-100"
          >
            <ShoppingBag className="h-[21px] w-[21px]" aria-hidden />
            <CountBadge count={cartCount} />
          </button>
        </div>
      </div>

      {/* ─────────────── Desktop header (lg+) ───────────────
          Row 1 is a two-column split: wordmark hard left, and a right column
          that stacks the black Search button over the cart/wishlist/account
          cluster. Row 2 is the black department strip. */}
      <div className="hidden bg-paper lg:block">
        <div className="border-b border-neutral-200">
          <div className="mx-auto flex w-full items-start justify-between gap-[32px] py-[14px] lg:w-[92%] xl:w-[86%]">
            <Link
              href="/"
              aria-label={`${COMPANY.name} home`}
              className="mt-[10px] shrink-0 transition-opacity hover:opacity-80"
            >
              <Image
                src="/logo-wordmark.png"
                alt={COMPANY.name}
                width={260}
                height={48}
                className="h-[38px] w-auto"
                priority
              />
            </Link>

            <div className="flex min-w-0 flex-col items-end gap-[12px]">
              {/* Search trigger — the black box in the top-right corner. */}
              <button
                type="button"
                onClick={() => setSearchOpen(!searchOpen)}
                aria-label="Search"
                aria-expanded={searchOpen}
                aria-controls="site-search-overlay"
                className="inline-flex h-[34px] w-[240px] items-center justify-between gap-[10px] bg-ink px-[16px] text-[14px] font-medium text-paper transition-colors hover:bg-neutral-800 xl:w-[280px]"
              >
                <span>Search</span>
                <Search className="h-[17px] w-[17px] shrink-0" strokeWidth={2.4} aria-hidden />
              </button>

              <nav aria-label="Account and cart" className="flex items-center gap-[22px]">
                <button
                  type="button"
                  onClick={() => setCartDrawerOpen(true)}
                  className="group inline-flex items-center gap-[8px] text-[14px] text-ink transition-colors hover:text-accent"
                >
                  <ShoppingBag className="h-[19px] w-[19px]" strokeWidth={1.7} aria-hidden />
                  <span>Shopping Cart</span>
                  <InlineCount count={cartCount} />
                </button>

                <Link
                  href="/wishlist"
                  className="inline-flex items-center gap-[8px] text-[14px] text-ink transition-colors hover:text-accent"
                >
                  <Heart className="h-[19px] w-[19px]" strokeWidth={1.7} aria-hidden />
                  <span>My Wish List</span>
                  {wishlistCount > 0 ? <InlineCount count={wishlistCount} /> : null}
                </Link>

                <UserMenu variant="light" showLabel />
              </nav>
            </div>
          </div>
        </div>

        <DepartmentStrip categories={categories} feature={FEATURE_LINK} />
      </div>

      <SearchOverlay />
      <MobileMenu categories={categories} />
      <CartDrawer />
    </header>
  );
}

/* ───────────────────── Reusable bits ───────────────────── */

/**
 * Pill count rendered inline beside a text label (the "0" bubble next to
 * "Shopping Cart"). Mount-gated because cart/wishlist counts come out of
 * persisted zustand stores, and rendering the client value on the server
 * pass would hydration-mismatch.
 */
function InlineCount({ count }: { count: number }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return (
    <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-accent/15 px-[6px] text-[12px] font-semibold leading-none text-ink">
      {mounted ? count : 0}
    </span>
  );
}

/** Corner badge for the icon-only mobile header buttons. */
function CountBadge({ count }: { count: number }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted || count <= 0) return null;
  return (
    <span className="absolute -right-[2px] -top-[2px] flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-accent px-[4px] text-[9px] font-bold leading-none text-paper ring-2 ring-paper">
      {count > 99 ? "99+" : count}
    </span>
  );
}

/* ───────────────────── Mappers ───────────────────── */

function toCategoryNode(node: CategoryTreeNode): CategoryNode {
  return {
    name: node.name,
    slug: node.path,
    icon: node.icon,
    children: node.children?.map((sub) => ({
      name: sub.name,
      slug: sub.path,
      icon: sub.icon,
      children: sub.children?.map((leaf) => ({ name: leaf.name, slug: leaf.path, icon: leaf.icon })),
    })),
  };
}

