import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface HomeCategoryShowcaseTile {
  key: string;
  title: string;
  image?: string;
  /** Omit to render a non-interactive tile (used by the admin form's live preview). */
  href?: string;
}

export interface HomeCategoryShowcaseProps {
  items: HomeCategoryShowcaseTile[];
  className?: string;
}

/**
 * "Top categories" grid - the homepage's editorial category block, a near
 * full-bleed grid of tall portrait tiles with the category name set over the
 * bottom of each image. Admin-managed at /admin/offers; each tile points at
 * any node in the category tree (top-level, sub-category or child all behave
 * the same, since the storefront just follows the category's `path`).
 *
 * `href` is optional per tile so this same component doubles as the admin
 * form's live preview (non-interactive) without forking the markup.
 */
export function HomeCategoryShowcase({ items, className }: HomeCategoryShowcaseProps) {
  if (items.length === 0) return null;

  return (
    <section className={cn("bg-paper py-[28px] lg:py-[44px]", className)} aria-labelledby="top-categories">
      {/* Only a hairline gutter: the tiles run almost the full width, matching
          the full-bleed banner above them. */}
      <div className="w-full px-[12px] lg:px-[20px]">
        {/* Centred label with a rule running out to each edge. */}
        <div className="flex items-center gap-[16px] lg:gap-[28px]">
          <span aria-hidden className="h-px flex-1 bg-neutral-300" />
          <h2
            id="top-categories"
            className="text-center text-[13px] font-medium uppercase tracking-[0.18em] text-ink lg:text-[15px]"
          >
            Top Categories
          </h2>
          <span aria-hidden className="h-px flex-1 bg-neutral-300" />
        </div>

        {/* Four across at most, but never more columns than there are tiles -
            a fixed 4-up grid leaves dead cells at the end of the row when the
            admin has configured fewer. */}
        <ul
          className="mt-[20px] grid gap-[8px] grid-cols-[repeat(var(--cols-sm),minmax(0,1fr))] lg:mt-[28px] lg:grid-cols-[repeat(var(--cols-lg),minmax(0,1fr))]"
          style={
            {
              "--cols-sm": Math.min(items.length, 2),
              "--cols-lg": Math.min(items.length, 4),
            } as CSSProperties
          }
        >
          {items.map((item) => {
            // A category with no image yet gets a plain neutral tile with dark
            // type. Laying white-on-a-scrim over an empty grey box reads as a
            // broken image, and the label stops being legible.
            const inner = item.image ? (
              <>
                <Image
                  src={item.image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                />
                {/* Category photography is typically shot on a pale backdrop, so
                    the white caption needs a scrim under it to stay readable. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 via-black/20 to-transparent"
                />
                <span className="absolute inset-x-0 bottom-[14px] px-[10px] text-center text-[13px] font-semibold leading-tight text-white lg:bottom-[18px] lg:text-[15px]">
                  {item.title}
                </span>
              </>
            ) : (
              <>
                <span className="absolute inset-0 flex items-center justify-center bg-neutral-100">
                  <LayoutGrid className="h-7 w-7 text-neutral-300" aria-hidden />
                </span>
                <span className="absolute inset-x-0 bottom-[14px] px-[10px] text-center text-[13px] font-semibold leading-tight text-ink lg:bottom-[18px] lg:text-[15px]">
                  {item.title}
                </span>
              </>
            );

            return (
              <li key={item.key}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="group relative block aspect-[4/5] overflow-hidden bg-neutral-100"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="group relative block aspect-[4/5] overflow-hidden bg-neutral-100">
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
