"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Leaf, Minus, Plus } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils/cn";
import type { ProductSummary } from "@/types/catalog";

export interface ProductCardProps {
  product: ProductSummary;
  className?: string;
}

function fmtPrice(amount: number, currency: string): string {
  if (currency === "BDT") return `Tk ${amount.toLocaleString("en-IN")}`;
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
}

/**
 * Grocery-app style product card (Blinkit reference): the card itself has no
 * chrome - only the square product shot sits in a bordered, rounded box, and
 * the text below runs flush to the card edges so grids stay tight. A floating
 * Add/quantity-stepper pill anchors to the image's bottom-right corner, then a
 * green price badge + strikethrough +
 * "<amount> OFF" line, title, and a rating row. Shared by every catalog
 * surface (homepage rows, category/brand/all-products grids, wishlist, PDP
 * related products) - the grid vs. horizontal-scroll layout is the parent's
 * call, this component just fills `h-full w-full`.
 */
export function ProductCard({ product, className }: ProductCardProps) {
  const router = useRouter();
  const hero = product.images[0];
  const href = `/product/${product.slug}`;
  // Variant products (sizes etc.) can't be added blind - checkout rejects
  // lines without a variantId, so the card routes to the PDP instead.
  const needsVariantChoice = (product.variants?.length ?? 0) > 0;
  const addToCart = useCartStore((s) => s.add);
  const setQty = useCartStore((s) => s.setQty);
  const toast = useUIStore((s) => s.toast);

  // Non-variant cart lines always key as `${productId}::base` (see
  // store/cartStore.ts `lineKey`) - variant lines never match this, so
  // variant products correctly always show the static "Add" pill (routes to
  // the PDP) instead of a stepper we can't attribute to the right variant.
  const lineId = `${product._id}::base`;
  const qty = useCartStore(
    (s) => s.items.find((i) => i.lineId === lineId)?.qty ?? 0,
  );

  const onSale =
    typeof product.compareAtPrice === "number" && product.compareAtPrice > product.price;
  const offAmount = onSale ? product.compareAtPrice! - product.price : 0;
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= 5;
  const hasRating = product.ratingCount > 0;
  const brandName =
    typeof product.brand === "object" && product.brand !== null
      ? (product.brand as { name: string }).name
      : undefined;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    if (needsVariantChoice) {
      // Size/option products go through the PDP picker.
      toast({ title: "Choose your options", description: "Pick a size to add this item" });
      router.push(href);
      return;
    }
    addToCart({
      productId: product._id,
      slug: product.slug,
      title: product.title,
      image: hero?.url ?? "",
      price: product.price,
      originalPrice: product.compareAtPrice,
      qty: 1,
      stock: product.stock,
    });
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQty(lineId, qty + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQty(lineId, qty - 1);
  };

  return (
    <div className={cn("group relative flex flex-col", className)}>
      <Link href={href} className="flex flex-1 flex-col">
        {/* ── Product shot ── */}
        <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {hero ? (
            <Image
              src={hero.url}
              alt={hero.alt ?? product.title}
              fill
              sizes="(min-width: 1024px) 16vw, (min-width: 640px) 28vw, 42vw"
              className={cn(
                "object-contain p-1.5 transition-transform duration-500 ease-out group-hover:scale-[1.03]",
                outOfStock && "opacity-50",
              )}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[11px] text-neutral-300">
              No image
            </div>
          )}

          {/* Status badges - top-left stack */}
          <div className="absolute left-1.5 top-1.5 flex flex-col gap-1">
            {!onSale && product.isFeatured && (
              <span className="rounded-[4px] bg-neutral-900 px-1.5 py-0.5 text-[10px] font-bold leading-none tracking-wide text-white">
                NEW
              </span>
            )}
            {outOfStock && (
              <span className="rounded-[4px] bg-neutral-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                Sold Out
              </span>
            )}
            {lowStock && (
              <span className="rounded-[4px] bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                Few Left
              </span>
            )}
          </div>
        </div>

        {/* ── Info ── */}
        <div className="flex flex-1 flex-col gap-1 pt-2">
          {brandName && (
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              {brandName}
            </p>
          )}

          {/* Price row */}
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="rounded-[6px] bg-green-700 px-1.5 py-[3px] text-[13px] font-bold leading-none text-white">
              {fmtPrice(product.price, product.currency)}
            </span>
            {onSale && (
              <span className="text-[11px] leading-none text-neutral-400 line-through">
                {fmtPrice(product.compareAtPrice!, product.currency)}
              </span>
            )}
          </div>

          {onSale && (
            <div className="flex items-center gap-1.5">
              <span className="shrink-0 text-[11px] font-bold leading-none text-green-700">
                {fmtPrice(offAmount, product.currency)} OFF
              </span>
              <span className="h-0 flex-1 border-t border-dashed border-neutral-300" aria-hidden />
            </div>
          )}

          <h3 className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-neutral-900 sm:text-[13px]">
            {product.title}
          </h3>

          {product.shortDescription && (
            <p className="truncate text-[11px] text-neutral-500">{product.shortDescription}</p>
          )}

          {hasRating && (
            <div className="mt-0.5 flex items-center gap-1">
              <Leaf className="h-[12px] w-[12px] fill-green-700 stroke-green-700" aria-hidden />
              <span className="text-[11px] font-semibold text-neutral-700">
                {product.ratingAverage.toFixed(1)}
              </span>
              <span className="text-[10px] text-neutral-400">
                (
                {product.ratingCount > 999
                  ? `${(product.ratingCount / 1000).toFixed(1)}k`
                  : product.ratingCount}
                )
              </span>
            </div>
          )}
        </div>
      </Link>

      {/*
        Add / quantity stepper - floats over the image's bottom-right corner.
        Sibling of the Link (never nested inside <a>), positioned via a
        same-size `aspect-square` overlay so it tracks the image box exactly
        regardless of the card's actual rendered width.
      */}
      <div className="pointer-events-none absolute inset-x-0 top-0 aspect-square w-full">
        <div className="pointer-events-auto absolute bottom-1.5 right-1.5">
          {qty > 0 ? (
            <div className="flex h-[28px] items-center overflow-hidden rounded-[8px] bg-accent shadow-sm">
              <button
                type="button"
                onClick={handleDecrement}
                aria-label="Decrease quantity"
                className="flex h-full w-[24px] items-center justify-center text-white transition-colors hover:bg-accent-dark"
              >
                <Minus className="h-[10px] w-[10px]" strokeWidth={3} aria-hidden />
              </button>
              <span className="min-w-[14px] text-center text-[11px] font-bold text-white">{qty}</span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={qty >= product.stock}
                aria-label="Increase quantity"
                className="flex h-full w-[24px] items-center justify-center text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
              >
                <Plus className="h-[10px] w-[10px]" strokeWidth={3} aria-hidden />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              disabled={outOfStock}
              aria-label={outOfStock ? "Out of stock" : `Add ${product.title} to cart`}
              className={cn(
                "h-[28px] min-w-[56px] rounded-[8px] border-[1.5px] bg-white px-2.5 text-[12px] font-bold uppercase tracking-wide shadow-sm transition-colors",
                outOfStock
                  ? "cursor-not-allowed border-neutral-200 text-neutral-300"
                  : "border-accent text-accent hover:bg-accent hover:text-white",
              )}
            >
              {outOfStock ? "Sold out" : "Add"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Skeleton preserves exact card proportions during loading. */
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex flex-col", className)}
    >
      <div className="aspect-square w-full shrink-0 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100" />
      <div className="flex flex-1 flex-col gap-2 pt-2">
        <div className="h-4 w-2/5 animate-pulse rounded bg-neutral-100" />
        <div className="h-2 w-1/3 animate-pulse rounded bg-neutral-100" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-neutral-100" />
        <div className="h-2.5 w-3/5 animate-pulse rounded bg-neutral-100" />
      </div>
    </div>
  );
}
