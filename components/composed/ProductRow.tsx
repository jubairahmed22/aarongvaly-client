"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ProductCard } from "./ProductCard";
import type { ProductSummary } from "@/types/catalog";

export interface ProductRowProps {
  title: string;
  products: ProductSummary[];
  viewAllHref?: string;
  limit?: number;
  /** Render without the white card chrome (no bleed, bg, or inner padding) so
      the row aligns flush with surrounding page content. */
  plain?: boolean;
  className?: string;
}

/**
 * Grocery-app style product row (Zepto reference: "Laundry Care",
 * "Cleaning Essentials", …) - a horizontally scrollable strip of fixed-width
 * cards with a "See all" link in the header and a floating round scroll
 * button that only appears once the row actually overflows.
 */
export function ProductRow({
  title,
  products,
  viewAllHref,
  limit = 12,
  plain = false,
  className,
}: ProductRowProps) {
  const items = products.slice(0, limit);
  const scrollRef = React.useRef<HTMLUListElement>(null);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const updateScrollButton = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollButton();
    el.addEventListener("scroll", updateScrollButton, { passive: true });
    const ro = new ResizeObserver(updateScrollButton);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollButton);
      ro.disconnect();
    };
  }, [updateScrollButton, items.length]);

  if (items.length === 0) return null;

  const slide = () => scrollRef.current?.scrollBy({ left: 520, behavior: "smooth" });

  return (
    <section
      className={cn(
        "flex flex-col gap-2.5",
        !plain && "-mx-4 bg-white py-3 sm:mx-0 sm:rounded-xl sm:p-3",
        className,
      )}
    >
      {/* Header: own horizontal padding on mobile, stripped on sm+ where section handles it */}
      <header
        className={cn(
          "flex items-center justify-between gap-1",
          !plain && "px-[12px] sm:px-0",
        )}
      >
        <h2 className="text-[20px] font-extrabold leading-tight text-ink sm:text-[22px]">
          {title}
        </h2>
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-bold text-accent transition-colors hover:text-accent-dark"
          >
            See all <ChevronRight className="h-[14px] w-[14px]" aria-hidden />
          </Link>
        ) : null}
      </header>

      <div className={cn("relative", !plain && "px-[12px] sm:px-0")}>
        <ul
          ref={scrollRef}
          className="scrollbar-hide flex items-stretch gap-3 overflow-x-auto scroll-smooth sm:gap-2"
        >
          {items.map((p) => (
            <li key={p._id} className="w-[148px] shrink-0 sm:w-[168px] lg:w-[184px]">
              <ProductCard product={p} className="h-full w-full" />
            </li>
          ))}
        </ul>

        {canScrollRight ? (
          <button
            type="button"
            onClick={slide}
            aria-label="Scroll right"
            className="absolute -right-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-ink text-paper shadow-lg transition-transform duration-150 hover:scale-105 sm:flex"
          >
            <ChevronRight className="h-[18px] w-[18px]" aria-hidden />
          </button>
        ) : null}
      </div>
    </section>
  );
}
