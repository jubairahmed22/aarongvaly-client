"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { CategoryIcon } from "@/lib/utils/categoryIcon";

/* ───────────────────── Types ─────────────────────
 * The desktop strip mirrors the 3-tier mobile accordion so we don't fork data.
 * CategoryNode is intentionally a thin view of the heavier CategoryTreeNode the
 * homepage already passes - see app/page.tsx for the mapper.
 */
export interface ChildCategory {
  name: string;
  slug: string;
  icon?: string;
}
export interface SubCategory {
  name: string;
  slug: string;
  icon?: string;
  children?: ChildCategory[];
}
export interface CategoryNode {
  name: string;
  slug: string;
  icon?: string;
  children?: SubCategory[];
}

/**
 * Brand summary used by the desktop "Brands" dropdown. Kept as a structural
 * type so the consumer can pass either BrandSummary or BrandDetail from
 * @/types/catalog without an explicit cast.
 */
export interface BrandLite {
  name: string;
  slug: string;
  logo?: string;
}

export interface CategoryMenuProps {
  categories: CategoryNode[];
  brands?: BrandLite[];
  className?: string;
}

/**
 * Desktop category strip - light bar with plain-text department links,
 * modeled after the Evaly.com.bd reference. Layout:
 *
 *   [All Categories ▾]  Electronics   Fashion   Home & Living   …
 *                          ▲ hover any item to reveal a mega-menu beneath it
 *
 * - The strip lives inside the Navbar's row 3, on a white background - this
 *   component supplies its own dark-on-white styling to match.
 * - Hovering - or focusing via keyboard - an item with children opens a
 *   full-width mega menu beneath the bar: one column per sub-category with a
 *   bold heading and its children listed vertically underneath (Tailwind-UI
 *   flyout style).
 * - The active item gets a bottom underline in `accent` red.
 * - `AllCategoriesMenu` (rendered alongside this by Navbar) is the leading
 *   black "All Categories" pill / full department directory.
 *
 * Mobile uses MobileMenu/CategoryAccordion instead; this component is hidden
 * below md.
 */
export function CategoryMenu({ categories, brands = [], className }: CategoryMenuProps) {
  const [active, setActive] = React.useState<string | null>(null);
  /** Hovered tab - tracked for every item, not just ones with a mega-menu,
      so the underline follows the cursor across the whole strip. */
  const [hovered, setHovered] = React.useState<string | null>(null);
  const pathname = usePathname();
  const scrollRef = React.useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const items = React.useMemo(
    () => [
      ...categories.map((c) => ({
        id: c.slug,
        label: c.name,
        href: `/category/${c.slug}` as const,
        hasMenu: Boolean(c.children?.length),
        icon: c.icon,
      })),
      {
        id: "__brands__",
        label: "Brands",
        href: "/brands" as const,
        hasMenu: brands.length > 0,
        icon: undefined as string | undefined,
      },
    ],
    [brands.length, categories],
  );

  const activeItem = items.find((item) => item.id === active);

  /* ── Zepto-style sliding underline ───────────────────────────────────
   * One indicator for the whole strip instead of a per-tab border, so it
   * glides (and resizes) between tabs. It points at whatever is hovered,
   * falling back to the tab matching the current route. Living inside the
   * scroll container means it tracks its tab automatically while the strip
   * scrolls - no scroll listener needed. */
  const currentId = items.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  )?.id;
  const indicatorId = hovered ?? currentId ?? null;

  const tabRefs = React.useRef<Record<string, HTMLLIElement | null>>({});
  const [indicator, setIndicator] = React.useState({ x: 0, w: 0, show: false });
  // First placement must not animate in from x=0; transitions switch on after.
  const [animate, setAnimate] = React.useState(false);

  const measure = React.useCallback(() => {
    const el = indicatorId ? tabRefs.current[indicatorId] : null;
    if (!el) {
      setIndicator((prev) => ({ ...prev, show: false }));
      return;
    }
    setIndicator({ x: el.offsetLeft, w: el.offsetWidth, show: true });
  }, [indicatorId]);

  React.useLayoutEffect(() => {
    measure();
  }, [measure, items.length]);

  // Enable the transition only once an initial position is on screen.
  React.useEffect(() => {
    if (!indicator.show || animate) return;
    const id = window.requestAnimationFrame(() => setAnimate(true));
    return () => window.cancelAnimationFrame(id);
  }, [indicator.show, animate]);

  // Re-measure when the strip resizes (font swap, container width, zoom).
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  /* Bring the current route's tab into view when it sits past either edge of
   * the strip - otherwise landing on, say, /brands leaves its underline
   * scrolled off screen. Only the route tab does this; hovering never
   * scrolls the strip out from under the cursor. scrollLeft is set directly
   * rather than via scrollIntoView(), which would also scroll the page. */
  React.useEffect(() => {
    const el = scrollRef.current;
    const tab = currentId ? tabRefs.current[currentId] : null;
    if (!el || !tab) return;
    const PAD = 24;
    const left = tab.offsetLeft;
    const right = left + tab.offsetWidth;
    if (left < el.scrollLeft + PAD) {
      el.scrollTo({ left: Math.max(0, left - PAD), behavior: "smooth" });
    } else if (right > el.scrollLeft + el.clientWidth - PAD) {
      el.scrollTo({ left: right - el.clientWidth + PAD, behavior: "smooth" });
    }
  }, [currentId, items.length]);

  /* Track whether the strip actually overflows, on either edge, so the
   * slide buttons only show up when there's somewhere to scroll to (and
   * disappear once fully scrolled to that edge). Re-checked on scroll,
   * resize, and whenever the item list itself changes width. */
  const updateScrollButtons = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    const ro = new ResizeObserver(updateScrollButtons);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      ro.disconnect();
    };
  }, [updateScrollButtons, items.length]);

  const slide = (direction: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: direction * 240, behavior: "smooth" });
  };

  return (
    <nav
      className={cn("relative hidden md:block", className)}
      aria-label="Browse"
      onMouseLeave={() => {
        setActive(null);
        setHovered(null);
      }}
    >
      <div className="flex items-stretch">
        {canScrollLeft ? (
          <button
            type="button"
            onClick={() => slide(-1)}
            aria-label="Scroll categories left"
            className="z-10 flex shrink-0 items-center bg-paper px-1 text-neutral-500 shadow-[4px_0_6px_-4px_rgba(0,0,0,0.15)] transition-colors hover:text-ink"
          >
            <ChevronLeft className="h-[16px] w-[16px]" aria-hidden />
          </button>
        ) : null}

        <ul
          ref={scrollRef}
          // flex-1 so the list itself spans the row - without it the <ul> is
          // only as wide as its content and the tabs have nothing to divide.
          className="scrollbar-hide relative flex min-w-0 flex-1 items-stretch overflow-x-auto scroll-smooth"
        >
          {items.map((item) => {
            const isOpen = active === item.id;
            const isLit = indicatorId === item.id;
            const isCurrent =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li
                key={item.id}
                ref={(el) => {
                  tabRefs.current[item.id] = el;
                }}
                // Tabs divide the strip evenly (`flex: 1 1 0`) so the row
                // always spans the full navbar width instead of ending early.
                // `min-w-min` stops a tab shrinking below its own label - if
                // the labels together outgrow the bar it scrolls instead of
                // clipping text.
                className="min-w-min flex-1 basis-0"
                onMouseEnter={() => {
                  setHovered(item.id);
                  setActive(item.hasMenu ? item.id : null);
                }}
              >
                <Link
                  href={item.href}
                  onFocus={() => {
                    setHovered(item.id);
                    setActive(item.hasMenu ? item.id : null);
                  }}
                  className={cn(
                    // No per-tab border any more - the shared indicator below
                    // draws the underline so it can travel between tabs.
                    "flex h-full w-full items-center justify-center gap-1.5 whitespace-nowrap px-3.5 pb-[11px] pt-2.5 text-sm font-semibold transition-colors duration-200",
                    isLit ? "text-ink" : "text-neutral-600 hover:text-ink",
                  )}
                  aria-expanded={isOpen}
                  aria-haspopup={item.hasMenu ? "menu" : undefined}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {item.icon ? (
                    <CategoryIcon
                      name={item.icon}
                      className={cn(
                        "h-[15px] w-[15px] transition-colors duration-200",
                        isLit ? "text-accent" : "text-neutral-500",
                      )}
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  ) : null}
                  {item.label}
                  {item.hasMenu ? (
                    <ChevronDown
                      className={cn(
                        "h-[12px] w-[12px] shrink-0 transition-transform duration-200",
                        isOpen ? "rotate-180 text-neutral-500" : "text-neutral-400",
                      )}
                      aria-hidden
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}

          {/* Sliding underline. An <li> (not a <span>) so the list stays valid
              HTML; presentation-only for assistive tech, which reads
              aria-current on the tab itself. */}
          <li
            role="presentation"
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 h-[2px] rounded-full bg-accent"
            style={{
              width: `${indicator.w}px`,
              transform: `translate3d(${indicator.x}px, 0, 0)`,
              opacity: indicator.show ? 1 : 0,
              transition: animate
                ? "transform 340ms cubic-bezier(0.22,1,0.36,1), width 340ms cubic-bezier(0.22,1,0.36,1), opacity 180ms ease-out"
                : "none",
            }}
          />
        </ul>

        {canScrollRight ? (
          <button
            type="button"
            onClick={() => slide(1)}
            aria-label="Scroll categories right"
            className="z-10 flex shrink-0 items-center bg-paper px-1 text-neutral-500 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)] transition-colors hover:text-ink"
          >
            <ChevronRight className="h-[16px] w-[16px]" aria-hidden />
          </button>
        ) : null}
      </div>

      {/* Active dropdown - rendered as a sibling of the scroll container (not
          inside it), so it isn't clipped by the strip's overflow-x-auto and
          can still span the full nav width via `inset-x-0`. */}
      {activeItem && activeItem.hasMenu ? (
        <ItemDropdown
          itemId={activeItem.id}
          categories={categories}
          brands={brands}
          onClose={() => setActive(null)}
        />
      ) : null}
    </nav>
  );
}

/* ───────────────────── Per-item dropdown ─────────────────────
 *
 * Dropdowns are anchored to the nav itself (the `li`s are static, the nav is
 * `relative`), so the category panel spans the full width of the bar - a
 * Tailwind-UI-style mega menu - and sits flush against it so the cursor can
 * travel from trigger to panel without crossing a dead zone. Panels are
 * light-themed (white background, dark text) to pop against the dark bar
 * above.
 */
interface ItemDropdownProps {
  itemId: string;
  categories: CategoryNode[];
  brands: BrandLite[];
  onClose: () => void;
}

function ItemDropdown({ itemId, categories, brands, onClose }: ItemDropdownProps) {
  const isBrands = itemId === "__brands__";
  const cat = !isBrands ? categories.find((c) => c.slug === itemId) : undefined;

  if (isBrands) {
    return <BrandsDropdown brands={brands} onNavigate={onClose} />;
  }
  if (cat) {
    return <CategoryDropdown category={cat} onNavigate={onClose} />;
  }
  return null;
}

/* ─── Category dropdown ────────────────────────────────────────────────── */

function CategoryDropdown({
  category,
  onNavigate,
}: {
  category: CategoryNode;
  onNavigate: () => void;
}) {
  const subs = category.children ?? [];

  if (!subs.length) {
    return null;
  }

  return (
    <div
      role="menu"
      className="animate-dropdown-in absolute inset-x-0 top-full z-40 border-b border-neutral-200 bg-paper shadow-xl"
    >
      {/* Tailwind-UI-style flyout: one column per sub-category, bold heading
          on top, children stacked vertically beneath in plain gray text.
          Columns spread evenly across the full panel width; extra subs wrap
          to a second row. max-h + scroll is a safety net for extreme trees. */}
      <div
        className="grid max-h-[75vh] gap-x-[32px] gap-y-[40px] overflow-y-auto px-[40px] py-[32px]"
        style={{
          gridTemplateColumns: `repeat(${Math.min(subs.length, 4)}, minmax(0, 1fr))`,
        }}
      >
        {subs.map((sub) => (
          <div key={sub.slug} className="flex flex-col">
            <Link
              href={`/category/${sub.slug}`}
              onClick={onNavigate}
              className="flex items-center gap-1.5 text-[15px] font-semibold leading-6 text-ink hover:underline"
            >
              <CategoryIcon name={sub.icon} className="h-[13px] w-[13px] shrink-0 text-neutral-400" strokeWidth={1.75} aria-hidden />
              {sub.name}
            </Link>

            {sub.children?.length ? (
              <ul className="mt-[24px] grid grid-cols-2 gap-x-[24px] gap-y-[20px]">
                {sub.children.map((child) => (
                  <li key={child.slug}>
                    <Link
                      href={`/category/${child.slug}`}
                      onClick={onNavigate}
                      className="flex items-center gap-1.5 text-[14px] leading-6 text-neutral-500 transition-colors hover:text-ink"
                    >
                      <CategoryIcon name={child.icon} className="h-[12px] w-[12px] shrink-0 text-neutral-400" strokeWidth={1.75} aria-hidden />
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Brands dropdown ──────────────────────────────────────────────────── */

function BrandsDropdown({
  brands,
  onNavigate,
}: {
  brands: BrandLite[];
  onNavigate: () => void;
}) {
  if (!brands.length) {
    return null;
  }
  // Cap at 12 so the dropdown stays a manageable size - the "See all brands"
  // CTA below routes to the dedicated /brands page with the full A–Z grid.
  const visible = brands.slice(0, 12);
  return (
    <div
      role="menu"
      className="animate-dropdown-in absolute left-0 top-full z-40 w-[min(56rem,90vw)] rounded-b-xl border border-t-0 border-neutral-200 bg-paper p-3 shadow-xl"
    >
      <div className="grid grid-cols-6 gap-1.5">
        {visible.map((b) => (
          <Link
            key={b.slug}
            href={`/all-products?brand=${encodeURIComponent(b.slug)}`}
            onClick={onNavigate}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral-200 p-2 transition-colors duration-150 hover:border-neutral-400 hover:bg-neutral-50"
          >
            {b.logo ? (
              <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-50">
                <Image
                  src={b.logo}
                  alt={b.name}
                  fill
                  sizes="56px"
                  className="object-contain p-1"
                  unoptimized
                />
              </span>
            ) : (
              <span
                aria-hidden
                className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-base font-semibold text-neutral-500"
              >
                {b.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="w-full truncate text-center text-xs font-medium text-ink">
              {b.name}
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-2 border-t border-neutral-200 pt-2">
        <Link
          href="/brands"
          onClick={onNavigate}
          className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-neutral-600 hover:text-ink hover:underline"
        >
          See all brands
          <ArrowRight className="h-[12px] w-[12px]" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
