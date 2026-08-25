"use client";

import * as React from "react";
import { ListFilter, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { FilterDropdownOption } from "./FilterDropdown";

/**
 * One checkbox group inside the drawer. `selected`/`onChange` stay owned by
 * the page so the drawer never holds filter state of its own — every change
 * writes straight through to the query string, same as the desktop dropdowns.
 */
export interface MobileFilterGroup {
  key: string;
  label: string;
  options: FilterDropdownOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}

export interface MobileFilterDrawerProps {
  groups: MobileFilterGroup[];
  onClearAll: () => void;
  /** Result count shown on the footer button, when known. */
  resultCount?: number;
  className?: string;
}

/**
 * Mobile "Filter By" control: a full-width bordered trigger that opens a
 * left-hand drawer of checkbox groups. Pairs with the sort <select> to form
 * the two-up toolbar the collection grid shows below `sm`, where the desktop
 * SIZE / PRICE dropdown popovers are too cramped to use.
 */
export function MobileFilterDrawer({
  groups,
  onClearAll,
  resultCount,
  className,
}: MobileFilterDrawerProps) {
  const [open, setOpen] = React.useState(false);
  const activeCount = groups.reduce((n, g) => n + g.selected.length, 0);

  // Lock the page behind the drawer and close on Escape.
  React.useEffect(() => {
    if (!open) return;
    const saved = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = saved;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const usableGroups = groups.filter((g) => g.options.length > 0);
  if (usableGroups.length === 0) return null;

  const toggle = (group: MobileFilterGroup, value: string) =>
    group.onChange(
      group.selected.includes(value)
        ? group.selected.filter((v) => v !== value)
        : [...group.selected, value],
    );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex h-[46px] w-full items-center gap-[10px] border border-neutral-300 px-[14px] text-[14px] text-ink transition-colors hover:border-neutral-500",
          activeCount > 0 && "border-ink",
          className,
        )}
      >
        <ListFilter className="h-[18px] w-[18px] shrink-0" strokeWidth={2} aria-hidden />
        <span>Filter By</span>
        {activeCount > 0 ? (
          <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ink px-[5px] text-[10px] font-semibold leading-none text-paper">
            {activeCount}
          </span>
        ) : null}
      </button>

      {/* Backdrop */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Filter products"
        className={cn(
          "fixed inset-y-0 left-0 z-[61] flex w-[86%] max-w-[360px] flex-col bg-white shadow-2xl lg:hidden",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-[20px] py-[16px]">
          <h2 className="text-[15px] font-semibold uppercase tracking-[0.1em] text-ink">
            Filter By
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close filters"
            className="flex h-[36px] w-[36px] items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-ink"
          >
            <X className="h-[18px] w-[18px]" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-[20px] py-[8px]">
          {usableGroups.map((group) => (
            <section key={group.key} className="border-b border-neutral-100 py-[18px] last:border-0">
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                {group.label}
              </h3>
              <ul className="mt-[12px] flex flex-col gap-[2px]">
                {group.options.map((opt) => {
                  const checked = group.selected.includes(opt.value);
                  return (
                    <li key={opt.value}>
                      <label className="flex cursor-pointer items-center gap-[12px] py-[9px] text-[14px] text-neutral-800">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(group, opt.value)}
                          className="h-[17px] w-[17px] shrink-0 accent-black"
                        />
                        <span className={cn(checked && "font-medium text-ink")}>{opt.label}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-[12px] border-t border-neutral-200 px-[20px] py-[16px] pb-[max(16px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClearAll}
            disabled={activeCount === 0}
            className="h-[48px] flex-1 border border-neutral-300 text-[13px] font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:border-ink disabled:opacity-40"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-[48px] flex-1 bg-ink text-[13px] font-semibold uppercase tracking-[0.1em] text-paper transition-colors hover:bg-neutral-800"
          >
            {resultCount !== undefined ? `View ${resultCount}` : "Apply"}
          </button>
        </div>
      </aside>
    </>
  );
}
