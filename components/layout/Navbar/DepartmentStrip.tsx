"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { CategoryNode } from "./CategoryMenu";
import { startRouteProgress } from "../RouteProgress";

export interface DepartmentStripProps {
  categories: CategoryNode[];
  /** Editorial/seasonal link pinned before the departments. */
  feature?: { label: string; href: string };
  className?: string;
}

/**
 * The black department strip under the main header row.
 *
 * Departments are plain links, so keyboard and touch users get a working
 * destination immediately; hovering one (pointer devices only) drops a panel
 * listing its subcategories. The panel is driven by an intent delay in both
 * directions - opening late enough that sweeping the cursor across the strip
 * doesn't flicker four panels, closing late enough that the diagonal move
 * from label to panel doesn't dismiss it.
 */
export function DepartmentStrip({ categories, feature, className }: DepartmentStripProps) {
  const [openSlug, setOpenSlug] = React.useState<string | null>(null);
  const timer = React.useRef<number | null>(null);

  const clearTimer = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const scheduleOpen = (slug: string) => {
    clearTimer();
    timer.current = window.setTimeout(() => setOpenSlug(slug), 90);
  };

  const scheduleClose = () => {
    clearTimer();
    timer.current = window.setTimeout(() => setOpenSlug(null), 160);
  };

  React.useEffect(() => clearTimer, []);

  const withSubcategories = categories.filter((c) => (c.children?.length ?? 0) > 0);
  const active = withSubcategories.find((c) => c.slug === openSlug) ?? null;

  return (
    <div
      className={cn("relative bg-ink", className)}
      onMouseLeave={scheduleClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          clearTimer();
          setOpenSlug(null);
        }
      }}
    >
      <nav aria-label="Departments" className="mx-auto w-full px-[16px] lg:w-[92%] lg:px-0 xl:w-[86%]">
        <ul className="flex items-center justify-center gap-[8px] overflow-x-auto lg:gap-[14px] [&::-webkit-scrollbar]:hidden">
          {feature ? (
            <li className="shrink-0">
              <Link
                href={feature.href}
                onClick={startRouteProgress}
                className="inline-flex items-center whitespace-nowrap px-[12px] py-[15px] text-[13px] font-semibold uppercase tracking-[0.10em] text-paper transition-colors hover:text-accent"
              >
                {feature.label}
              </Link>
            </li>
          ) : null}

          {categories.map((cat) => {
            const hasChildren = (cat.children?.length ?? 0) > 0;
            return (
              <li
                key={cat.slug}
                className="shrink-0"
                onMouseEnter={() => (hasChildren ? scheduleOpen(cat.slug) : scheduleClose())}
                onFocus={() => (hasChildren ? setOpenSlug(cat.slug) : setOpenSlug(null))}
              >
                <Link
                  href={`/category/${cat.slug}`}
                  onClick={() => {
                    clearTimer();
                    setOpenSlug(null);
                    startRouteProgress();
                  }}
                  aria-expanded={hasChildren ? openSlug === cat.slug : undefined}
                  className={cn(
                    "inline-flex items-center whitespace-nowrap px-[12px] py-[15px] text-[13px] font-semibold uppercase tracking-[0.14em] transition-colors lg:px-[16px]",
                    openSlug === cat.slug ? "text-accent" : "text-paper hover:text-accent",
                  )}
                >
                  {cat.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Subcategory drop panel */}
      {active ? (
        <div
          className="absolute left-0 right-0 top-full z-40 border-t border-neutral-200 bg-white shadow-[0_16px_36px_rgba(0,0,0,0.16)]"
          onMouseEnter={clearTimer}
          onMouseLeave={scheduleClose}
        >
          <div className="mx-auto w-full px-[16px] py-[24px] lg:w-[92%] lg:px-0 xl:w-[86%]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">
              {active.name}
            </p>
            <ul className="mt-[16px] grid grid-cols-2 gap-x-[24px] gap-y-[10px] sm:grid-cols-3 lg:grid-cols-6">
              {active.children?.map((sub) => (
                <li key={sub.slug}>
                  <Link
                    href={`/category/${sub.slug}`}
                    onClick={() => {
                      clearTimer();
                      setOpenSlug(null);
                      startRouteProgress();
                    }}
                    className="block py-[4px] text-[14px] text-neutral-700 transition-colors hover:text-accent hover:underline"
                  >
                    {sub.name}
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              href={`/category/${active.slug}`}
              onClick={() => {
                clearTimer();
                setOpenSlug(null);
                startRouteProgress();
              }}
              className="mt-[20px] inline-block text-[12px] font-bold uppercase tracking-[0.14em] text-ink underline underline-offset-4 transition-colors hover:text-accent"
            >
              Shop all {active.name}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
