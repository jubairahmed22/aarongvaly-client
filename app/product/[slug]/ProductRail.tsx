"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Yellow-style product carousel — centered uppercase heading, cards with the
 * product image on a light ground, centered title, "Tk X + VAT" price and a
 * small swatch thumbnail underneath, with circular prev/next arrows floating
 * at the sides. Shared by "Related products" and "Recently viewed".
 */

export interface RailItem {
  slug: string;
  title: string;
  image: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  isNew?: boolean;
}

function formatPrice(amount: number, currency: string): string {
  if (currency === "BDT")
    return `Tk ${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
}

export interface ProductRailProps {
  title: string;
  items: RailItem[];
  className?: string;
}

export function ProductRail({ title, items, className }: ProductRailProps) {
  const trackRef = React.useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = React.useState(false);
  const [canNext, setCanNext] = React.useState(false);

  const updateArrows = React.useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  React.useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows, items.length]);

  const scrollBy = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <section className={cn("py-6", className)} aria-label={title}>
      <h2 className="text-center text-[20px] font-semibold uppercase tracking-[0.08em] text-neutral-900 sm:text-[22px]">
        {title}
      </h2>

      <div className="relative mt-4">
        {/* Track */}
        <ul
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-[16px] overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => {
            const onSale =
              item.compareAtPrice !== undefined && item.compareAtPrice > item.price;
            return (
              <li
                key={item.slug}
                className="w-[calc(50%-8px)] shrink-0 snap-start sm:w-[calc(33.333%-11px)] lg:w-[calc(25%-12px)]"
              >
                <Link href={`/product/${item.slug}`} className="group block">
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100">
                    {item.isNew ? (
                      <span className="absolute left-0 top-[12px] z-10 bg-white px-[10px] py-[4px] text-[12px] font-medium text-neutral-900">
                        New
                      </span>
                    ) : onSale ? (
                      <span className="absolute left-0 top-[12px] z-10 bg-neutral-900 px-[10px] py-[4px] text-[12px] font-medium text-white">
                        Sale
                      </span>
                    ) : null}
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[12px] text-neutral-400">
                        No image
                      </span>
                    )}
                  </div>

                  <div className="mt-[14px] flex flex-col items-center gap-[8px] text-center">
                    <p className="line-clamp-2 text-[14px] text-neutral-800 transition-colors group-hover:text-neutral-500">
                      {item.title}
                    </p>
                    <p className="text-[14px]">
                      {onSale ? (
                        <span className="mr-[6px] text-neutral-400 line-through">
                          {formatPrice(item.compareAtPrice!, item.currency)}
                        </span>
                      ) : null}
                      <span className="font-semibold text-neutral-900">
                        {formatPrice(item.price, item.currency)}
                      </span>{" "}
                      <span className="text-[12px] font-normal text-neutral-500">+ VAT</span>
                    </p>
                    {/* Small swatch thumbnail, as on the reference cards */}
                    {item.image ? (
                      <span className="relative block h-[44px] w-[36px] border border-neutral-300 p-[2px]">
                        <Image
                          src={item.image}
                          alt=""
                          fill
                          sizes="36px"
                          className="object-cover p-[2px]"
                        />
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Prev / next arrows */}
        {canPrev ? (
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Previous products"
            className="absolute -left-[8px] top-[33%] z-10 hidden h-[44px] w-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-md transition-colors hover:text-neutral-900 sm:flex lg:-left-[22px]"
          >
            <ChevronLeft className="h-[18px] w-[18px]" aria-hidden />
          </button>
        ) : null}
        {canNext ? (
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="More products"
            className="absolute -right-[8px] top-[33%] z-10 hidden h-[44px] w-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-md transition-colors hover:text-neutral-900 sm:flex lg:-right-[22px]"
          >
            <ChevronRight className="h-[18px] w-[18px]" aria-hidden />
          </button>
        ) : null}
      </div>
    </section>
  );
}
