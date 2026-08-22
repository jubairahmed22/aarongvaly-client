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
 * Zepto-style "shop by category" strip - a horizontally scrollable row of
 * image + title tiles. Lives right under the navbar, above the hero / offer
 * banner (see app/page.tsx). Fully admin-managed at /admin/offers - each
 * tile points at any node in the category tree (top-level, sub-category, or
 * child category all work the same way, since the storefront just follows
 * the category's `path`).
 *
 * `href` is optional per-tile so this same component doubles as the admin
 * form's live preview (non-interactive - no navigation) without forking the
 * markup between the two call sites.
 */
export function HomeCategoryShowcase({ items, className }: HomeCategoryShowcaseProps) {
  if (items.length === 0) return null;

  return (
    <section
      className={cn(
        // Below lg the strip sits on the same lavender as the mobile home
        // header (Zepto style) and shares its 12px gutters so both line up;
        // lg+ keeps the original white scroll-row look.
        "border-b border-neutral-200 bg-[#F5EDFF] lg:bg-paper",
        className,
      )}
      aria-label="Shop by category"
    >
      <div className="mx-auto w-full px-[12px] lg:w-[82%] lg:max-w-none lg:px-0">
        {/* One horizontal scroll row at every size.
            - below lg: each tile is exactly 1/4 of the row (4 per viewport).
            - lg+: the row is divided evenly by the tile count, so the tiles
              always span the full navbar width instead of leaving a gap on
              the right. `max()` floors the tile at 88px, so an unusually long
              admin-configured list stops shrinking and scrolls instead. The
              16px subtracted per gap is Tailwind `gap-2` on this project's
              8px-per-unit spacing scale - it has to stay in sync with the
              `lg:gap-2` class below or the row stops adding up. */}
        <ul
          className="scrollbar-hide flex items-start gap-[10px] overflow-x-auto scroll-smooth py-[14px] lg:gap-2 lg:py-4"
          style={
            {
              "--tile-w": `max(72px, calc((100% - ${(items.length - 1) * 16}px) / ${items.length}))`,
            } as CSSProperties
          }
        >
          {items.map((item) => {
            const inner = (
              <>
                <span className="flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-neutral-100 transition-transform duration-200 group-hover:scale-[1.04]">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={92}
                      height={92}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <LayoutGrid className="h-6 w-6 text-neutral-300" aria-hidden />
                  )}
                </span>
                <span className="line-clamp-2 w-full text-center text-[12px] font-semibold leading-tight text-ink lg:text-[13px]">
                  {item.title}
                </span>
              </>
            );
            // 3 gaps of 10px sit between 4 visible tiles - subtract them
            // from the row width so exactly 4 columns fill the viewport.
            return (
              <li key={item.key} className="w-[calc((100%-30px)/4)] shrink-0 lg:w-[var(--tile-w)]">
                {item.href ? (
                  <Link href={item.href} className="group flex flex-col items-center gap-[6px] lg:gap-2">
                    {inner}
                  </Link>
                ) : (
                  <div className="flex flex-col items-center gap-[6px] lg:gap-2">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
