"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingCart, TrendingUp } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useCartStore } from "@/store/cartStore";
import { cn } from "@/lib/utils/cn";

/**
 * Zepto-style fixed bottom navigation for mobile (below lg): Home ·
 * Categories · Trending · Cart. "Categories" opens the left MobileMenu
 * sidebar and "Cart" opens the CartDrawer - both live in uiStore and are
 * mounted by the Navbar, so this bar works on any page that renders the
 * Navbar. Pages showing this bar should pad their bottom (pb) so content
 * isn't hidden behind it.
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen);
  const setCartDrawerOpen = useUIStore((s) => s.setCartDrawerOpen);
  const cartCount = useCartStore((s) => s.count());

  // Cart count comes from a persisted store - render the badge only after
  // mount so SSR and first client render agree (same trick as NavBadge).
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const badge = mounted && cartCount > 0 ? (cartCount > 99 ? "99+" : String(cartCount)) : null;

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-4">
        <li>
          <TabLink href="/" label="Home" active={pathname === "/"}>
            <Home className="h-[22px] w-[22px]" aria-hidden />
          </TabLink>
        </li>
        <li>
          <TabButton label="Categories" onClick={() => setMobileMenuOpen(true)}>
            <LayoutGrid className="h-[22px] w-[22px]" aria-hidden />
          </TabButton>
        </li>
        <li>
          <TabLink
            href="/all-products?sort=popular"
            label="Trending"
            active={pathname === "/all-products"}
          >
            <TrendingUp className="h-[22px] w-[22px]" aria-hidden />
          </TabLink>
        </li>
        <li>
          <TabButton label="Cart" onClick={() => setCartDrawerOpen(true)}>
            <span className="relative">
              <ShoppingCart className="h-[22px] w-[22px]" aria-hidden />
              {badge ? (
                <span className="absolute -right-[7px] -top-[5px] flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[#FF3269] px-[3px] text-[9px] font-bold leading-none text-white ring-2 ring-white">
                  {badge}
                </span>
              ) : null}
            </span>
          </TabButton>
        </li>
      </ul>
    </nav>
  );
}

/* ───────────────────── Tab items ───────────────────── */

const tabClass = (active?: boolean) =>
  cn(
    "flex h-[56px] w-full flex-col items-center justify-center gap-[3px] text-[11px] font-semibold leading-none transition-colors",
    active ? "text-[#FF3269]" : "text-neutral-600 hover:text-neutral-900",
  );

function TabLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
      {children}
      <span>{label}</span>
    </Link>
  );
}

function TabButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={tabClass(false)}>
      {children}
      <span>{label}</span>
    </button>
  );
}
