"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingCart, Menu, ChevronDown, Zap } from "lucide-react";
import { SearchSuggestBox } from "@/components/composed";
import { CategoryMenu, type CategoryNode, type BrandLite } from "./CategoryMenu";
import { MobileMenu } from "./MobileMenu";
import { UserMenu } from "./UserMenu";
import { AllCategoriesMenu } from "./AllCategoriesMenu";
import { CartDrawer } from "../CartDrawer";
import { MobileHeaderIcons } from "../MobileHomeHeader";
import { useCartStore } from "@/store/cartStore";
import { useUIStore } from "@/store/uiStore";
import { COMPANY } from "@/lib/entity/company";
import { cn } from "@/lib/utils/cn";

import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "@/lib/api/catalog";
import { catalogKeys } from "@/hooks/useCatalog";
import type { CategoryTreeNode } from "@/types/catalog";
import { startRouteProgress } from "../RouteProgress";

export interface NavbarProps {
  categories?: CategoryNode[];
  brands?: BrandLite[];
  /**
   * Hide the built-in mobile/tablet header rows. The home page sets this and
   * renders the Zepto-style MobileHomeHeader instead; MobileMenu and
   * CartDrawer stay mounted here either way, so the sidebar/cart still work.
   */
  hideMobileHeader?: boolean;
}

export function Navbar({ categories: ssrCategories, brands: ssrBrands, hideMobileHeader }: NavbarProps) {
  const router = useRouter();
  const cartCount = useCartStore((s) => s.count());
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen);
  const setCartDrawerOpen = useUIStore((s) => s.setCartDrawerOpen);
  const openCart = () => setCartDrawerOpen(true);
  const wantsCategories = !ssrCategories || ssrCategories.length === 0;
  const wantsBrands = !ssrBrands || ssrBrands.length === 0;

  const catsQuery = useQuery({
    queryKey: catalogKeys.categories({ shape: "tree", isActive: true }),
    queryFn: () => catalogApi.listCategories({ shape: "tree", isActive: true }),
    enabled: wantsCategories,
    staleTime: 5 * 60_000,
  });

  const brandsQuery = useQuery({
    queryKey: catalogKeys.brands({ isActive: true, limit: 100 }),
    queryFn: () => catalogApi.listBrands({ isActive: true, limit: 100 }),
    enabled: wantsBrands,
    staleTime: 5 * 60_000,
  });

  const fallbackCategories = wantsCategories ? (catsQuery.data ?? []).map(toCategoryNode) : [];
  const fallbackBrands = wantsBrands ? (brandsQuery.data?.data ?? []).map(toBrandLite) : [];

  const categories = ssrCategories?.length ? ssrCategories : fallbackCategories;
  const brands = ssrBrands?.length ? ssrBrands : fallbackBrands;

  const submitSearch = (q: string) => {
    if (!q.trim()) return;
    startRouteProgress();
    router.push(`/all-products?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header id="site-navbar" className="sticky top-0 z-50">

      {/* ─────────────── Mobile & tablet header (below lg) ───────────────
          Same lavender design as the home page's MobileHomeHeader: hamburger
          + aarongvaly logo + profile/wishlist/cart cluster, then the search bar.
          MobileHeaderIcons is shared with MobileHomeHeader so the two headers
          stay pixel-identical. */}
      <div className={cn("border-b border-neutral-200 bg-[#F5EDFF] lg:hidden", hideMobileHeader && "hidden")}>
        {/* Row 1 — menu · logo · profile/wishlist/cart. 12px gutters; the
            hamburger pulls itself left by its 9px inner padding so the ☰
            glyph sits exactly on the 12px line with the search bar. */}
        <div className="flex items-center gap-[2px] px-[12px] pt-[8px]">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
            className="-ml-[9px] inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full text-[#1F1235] transition-colors hover:bg-[#E9DCFC] active:bg-[#E2D2FA]"
          >
            <Menu className="h-[22px] w-[22px]" aria-hidden />
          </button>

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

        {/* Row 2 — full-width search bar */}
        <div className="px-[12px] pb-[10px] pt-[2px]">
          <SearchSuggestBox placeholder='Search for "chocolate"' onSubmit={submitSearch} />
        </div>
      </div>

      {/* ─────────────── Desktop header (lg+) — Zepto-style: single main row, no utility bar ─────────────── */}
      <div className="hidden bg-paper lg:block">
        {/* Row 1 — logo · delivery/location · search · login · cart */}
        <div className="border-b border-neutral-200">
          <div className="mx-auto w-full lg:w-[82%]">
            <div className="flex items-center gap-6 py-3">
              <Link
                href="/"
                aria-label={`${COMPANY.name} home`}
                className="shrink-0 flex items-center transition-opacity hover:opacity-80"
              >
                <Image src="/logo-wordmark.png" alt={COMPANY.name} width={148} height={28} className="h-7 w-auto" priority />
              </Link>

              <Link
                href="/account/addresses"
                className="hidden shrink-0 flex-col leading-tight md:flex"
              >
                <span className="inline-flex items-center gap-1 text-sm font-bold text-ink">
                  <Zap className="h-[13px] w-[13px] fill-accent text-accent" aria-hidden />
                  Fast Delivery Nationwide
                </span>
                <span className="inline-flex items-center gap-0.5 text-[13px] text-neutral-500">
                  Deliver to <span className="font-semibold text-neutral-700">Dhaka</span>
                  <ChevronDown className="h-[12px] w-[12px]" aria-hidden />
                </span>
              </Link>

              <div className="min-w-0 flex-1">
                <SearchSuggestBox placeholder="Search phones, beauty, home & more…" onSubmit={submitSearch} />
              </div>

              <nav className="flex shrink-0 items-center gap-1">
                <UserMenu variant="light" stacked />
                <StackedNavLink onClick={openCart} label="Cart" count={cartCount}>
                  <ShoppingCart className="h-[22px] w-[22px]" />
                </StackedNavLink>
              </nav>
            </div>
          </div>
        </div>

        {/* Row 2 — all categories · department strip */}
        <div className="border-b border-neutral-200">
          <div className="mx-auto flex w-full items-center lg:w-[82%]">
            <AllCategoriesMenu categories={categories} />
            <CategoryMenu categories={categories} brands={brands} className="min-w-0 flex-1" />
          </div>
        </div>
      </div>

      <MobileMenu categories={categories} />
      <CartDrawer />
    </header>
  );
}

/* ───────────────────── Reusable bits ───────────────────── */

const NavBadge = React.memo(function NavBadge({ count, tight = false }: { count?: number; tight?: boolean }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted || typeof count !== "number" || count <= 0) return null;
  return (
    <span
      className={cn(
        // `ring-2 ring-paper` cuts a clean white gap between the badge and the
        // icon glyph behind it, so it reads as a tucked-in corner badge
        // instead of a circle just floating on top of the icon.
        "absolute flex items-center justify-center rounded-full bg-accent font-bold leading-none text-ink ring-2 ring-paper",
        tight
          ? "-right-[5px] -top-[5px] h-[15px] min-w-[15px] px-[3px] text-[8px]"
          : "-right-0.5 -top-0.5 h-[18px] min-w-[18px] px-1 text-[8px]",
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
});

/**
 * Icon nav item - a `<Link>` when `href` is given, or a `<button>` when
 * `onClick` is given instead (the cart trigger opens the CartDrawer rather
 * than navigating). Both render identical markup/classes either way.
 */
function IconLink({
  href,
  onClick,
  label,
  count,
  variant = "dark",
  children,
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  count?: number;
  /** "dark" = paper-on-ink (mobile header); "light" = ink-on-paper (desktop header). */
  variant?: "dark" | "light";
  children: React.ReactNode;
}) {
  const className = cn(
    "relative inline-flex h-[40px] w-[40px] items-center justify-center rounded-full transition-colors",
    variant === "light" ? "text-ink hover:bg-neutral-100" : "text-paper hover:bg-white/10",
  );
  const inner = (
    <>
      {children}
      <NavBadge count={count} />
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={label} className={className}>
        {inner}
      </button>
    );
  }
  return (
    <Link href={href ?? "#"} aria-label={label} className={className}>
      {inner}
    </Link>
  );
}

/**
 * Icon-above-label nav item (Zepto's "Login"/"Cart" pattern) for the desktop
 * main row. `onClick` (cart) opens the CartDrawer instead of navigating.
 */
function StackedNavLink({
  href,
  onClick,
  label,
  count,
  children,
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  count?: number;
  children: React.ReactNode;
}) {
  const className = "flex flex-col items-center gap-0.5 rounded-md px-2.5 py-1 text-ink transition-colors hover:bg-neutral-100";
  const inner = (
    <>
      {/* 24px to match the account avatar (UserMenu's `stacked` size) right next to it. */}
      <span className="relative flex h-[24px] w-[24px] items-center justify-center">
        {children}
        <NavBadge count={count} tight />
      </span>
      <span className="text-[13px] font-semibold leading-none">{label}</span>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={label} className={className}>
        {inner}
      </button>
    );
  }
  return (
    <Link href={href ?? "#"} aria-label={label} className={className}>
      {inner}
    </Link>
  );
}

function IconButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-neutral-100"
    >
      {children}
    </button>
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

function toBrandLite(b: { name: string; slug: string; logo?: string }): BrandLite {
  return { name: b.name, slug: b.slug, logo: b.logo };
}
