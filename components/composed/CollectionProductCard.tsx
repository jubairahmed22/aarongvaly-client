"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { useUIStore } from "@/store/uiStore";
import { formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ProductSummary, ProductVariant } from "@/types/catalog";

export interface CollectionProductCardProps {
  product: ProductSummary;
  className?: string;
}

/**
 * Editorial fashion card for collection grids — deliberately chrome-free:
 * a tall portrait shot, then centred title, price, and colourway swatches.
 * No border, no badge, no floating pill; the only interactive affordance is
 * an "Add to cart" bar that slides up over the bottom of the image on hover.
 *
 * Distinct from {@link ProductCard}, which is the dense grocery-style card
 * used by the homepage rows and the general catalog grids. Both read the
 * same {@link ProductSummary}, so a surface can swap between them freely.
 */
export function CollectionProductCard({ product, className }: CollectionProductCardProps) {
  const router = useRouter();
  const href = `/product/${product.slug}`;
  const addToCart = useCartStore((s) => s.add);
  const toast = useUIStore((s) => s.toast);

  const colourways = useColourways(product.variants);
  // Hovering a swatch previews that colourway without leaving the grid.
  const [activeColour, setActiveColour] = React.useState<string | null>(null);
  const activeWay = colourways.find((c) => c.colour === activeColour);

  const hero = product.images[0];
  const heroUrl = activeWay?.image ?? hero?.url;
  const outOfStock = product.stock <= 0;
  const onSale =
    typeof product.compareAtPrice === "number" && product.compareAtPrice > product.price;
  // Variant products can't be added blind — checkout rejects lines with no
  // variantId — so the bar routes to the PDP picker instead of adding.
  const needsVariantChoice = (product.variants?.length ?? 0) > 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    if (needsVariantChoice) {
      toast({ title: "Choose your options", description: "Pick a size to add this item" });
      router.push(href);
      return;
    }
    addToCart({
      productId: product._id,
      slug: product.slug,
      title: product.title,
      image: heroUrl ?? "",
      price: product.price,
      originalPrice: product.compareAtPrice,
      qty: 1,
      stock: product.stock,
    });
  };

  return (
    <div className={cn("group flex flex-col", className)}>
      <Link href={href} className="block">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F2F3F4]">
          {heroUrl ? (
            <Image
              src={heroUrl}
              alt={hero?.alt ?? product.title}
              fill
              sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 50vw"
              className={cn(
                "object-cover transition-opacity duration-300",
                outOfStock && "opacity-45",
              )}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[11px] text-neutral-400">
              No image
            </div>
          )}

          {outOfStock ? (
            <span className="absolute left-0 top-[14px] bg-ink/85 px-[12px] py-[5px] text-[10px] font-bold uppercase tracking-[0.16em] text-paper">
              Sold out
            </span>
          ) : onSale ? (
            <span className="absolute left-0 top-[14px] bg-accent px-[12px] py-[5px] text-[10px] font-bold uppercase tracking-[0.16em] text-paper">
              Sale
            </span>
          ) : null}

          {/* Slides up from the bottom edge on hover / keyboard focus.
              translate-y-full keeps it fully clipped by the overflow-hidden
              frame until then, so it never adds height to the card. Desktop
              only — below sm the card carries a permanently visible bar
              instead, since there's no hover on touch. */}
          {!outOfStock ? (
            <button
              type="button"
              onClick={handleAdd}
              tabIndex={-1}
              aria-hidden
              className={cn(
                "absolute inset-x-0 bottom-0 hidden translate-y-full bg-ink/90 py-[14px] text-[13px] font-medium text-paper sm:block",
                "transition-transform duration-300 ease-out",
                "group-hover:translate-y-0 group-focus-within:translate-y-0 hover:bg-ink",
              )}
            >
              Add to cart
            </button>
          ) : null}
        </div>
      </Link>

      {/* Touch-target add-to-cart bar — sits flush under the image on mobile,
          where the hover-reveal bar above can never be triggered. */}
      <button
        type="button"
        onClick={handleAdd}
        disabled={outOfStock}
        aria-label={outOfStock ? "Sold out" : `Add ${product.title} to cart`}
        className={cn(
          "w-full py-[14px] text-[14px] font-medium transition-colors sm:hidden",
          outOfStock
            ? "cursor-not-allowed bg-neutral-200 text-neutral-500"
            : "bg-[#2B2B2B] text-paper active:bg-ink",
        )}
      >
        {outOfStock ? "Sold out" : "Add to cart"}
      </button>

      <div className="flex flex-col items-center px-[6px] pt-[16px] text-center">
        <Link
          href={href}
          className="text-[13px] font-semibold leading-snug tracking-[0.02em] text-ink transition-colors hover:text-accent"
        >
          {product.title}
        </Link>

        <p className="mt-[8px] text-[13px] text-ink">
          {formatPrice(product.price, product.currency, { decimals: true })}
          {onSale ? (
            <span className="ml-[8px] text-neutral-400 line-through">
              {formatPrice(product.compareAtPrice!, product.currency, { decimals: true })}
            </span>
          ) : null}
        </p>

        {colourways.length > 1 ? (
          <ul className="mt-[12px] flex flex-wrap items-center justify-center gap-[6px]">
            {colourways.map((way) => (
              <li key={way.colour}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveColour(way.colour)}
                  onMouseLeave={() => setActiveColour(null)}
                  onFocus={() => setActiveColour(way.colour)}
                  onBlur={() => setActiveColour(null)}
                  onClick={() => router.push(href)}
                  aria-label={`${product.title} in ${way.colour}${way.inStock ? "" : " — sold out"}`}
                  title={way.colour}
                  className={cn(
                    "relative block h-[34px] overflow-hidden border transition-colors",
                    // Image swatches keep the garment's portrait ratio; the
                    // name-only chips size to their text, as on the reference.
                    way.image ? "w-[28px]" : "min-w-[44px] px-[8px]",
                    activeColour === way.colour
                      ? "border-ink"
                      : "border-neutral-300 hover:border-neutral-500",
                  )}
                >
                  {way.image ? (
                    <Image src={way.image} alt="" fill sizes="28px" className="object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.06em] text-neutral-600">
                      {way.colour}
                    </span>
                  )}
                  {/* Diagonal strike marks a colourway that's entirely sold
                      out — the shopper can still open it, but sees up front
                      that nothing in that colour is available. */}
                  {!way.inStock ? (
                    <span
                      aria-hidden
                      className="absolute inset-0 text-neutral-400"
                      style={{
                        background:
                          "linear-gradient(to top right, transparent calc(50% - 0.5px), currentColor calc(50% - 0.5px), currentColor calc(50% + 0.5px), transparent calc(50% + 0.5px))",
                      }}
                    />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

/* ───────────────────── helpers ───────────────────── */

interface Colourway {
  colour: string;
  image?: string;
  /** False when every variant in this colourway is out of stock. */
  inStock: boolean;
}

/**
 * Distinct `Color` options across a product's variants, in first-seen order,
 * each keeping the first variant image that carries it and whether any
 * variant in that colour is still buyable. Products with no variants (or no
 * Color option) yield an empty list, which hides the row.
 */
function useColourways(variants: ProductVariant[] | undefined): Colourway[] {
  return React.useMemo(() => {
    const byColour = new Map<string, Colourway>();
    for (const v of variants ?? []) {
      const colour = v.options?.Color;
      if (!colour) continue;
      const existing = byColour.get(colour);
      const buyable = (v.isActive ?? true) && v.stock > 0;
      if (!existing) {
        byColour.set(colour, { colour, image: v.image, inStock: buyable });
        continue;
      }
      // Keep the first image seen, but let any in-stock variant mark the
      // whole colourway as available.
      if (!existing.image && v.image) existing.image = v.image;
      if (buyable) existing.inStock = true;
    }
    return [...byColour.values()];
  }, [variants]);
}

/** Matches the card's proportions so grids don't reflow while loading. */
export function CollectionProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex animate-pulse flex-col", className)}>
      <div className="aspect-[3/4] w-full bg-neutral-100" />
      <div className="mt-[16px] flex flex-col items-center gap-[8px]">
        <div className="h-[12px] w-3/4 bg-neutral-100" />
        <div className="h-[12px] w-1/3 bg-neutral-100" />
      </div>
    </div>
  );
}
