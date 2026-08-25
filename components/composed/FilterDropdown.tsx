"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface FilterDropdownOption {
  label: string;
  value: string;
}

export interface FilterDropdownProps {
  /** Button label, rendered uppercase (e.g. "Size", "Price"). */
  label: string;
  options: FilterDropdownOption[];
  /** Currently selected values — multiple options can be active at once. */
  selected: string[];
  onChange: (next: string[]) => void;
  className?: string;
}

/**
 * Bordered dropdown filter used by the collection toolbar. Options are
 * checkboxes rather than radios: shoppers routinely want "M or L", and the
 * backend's `size` / price params both accept a set.
 *
 * Closes on outside pointerdown and on Escape; the panel is rendered only
 * while open so its checkboxes stay out of the tab order when collapsed.
 */
export function FilterDropdown({
  label,
  options,
  selected,
  onChange,
  className,
}: FilterDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
    );
  };

  if (options.length === 0) return null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "inline-flex h-[38px] items-center gap-[8px] border px-[16px] text-[12px] font-semibold uppercase tracking-[0.12em] transition-colors",
          selected.length > 0
            ? "border-ink text-ink"
            : "border-neutral-300 text-ink hover:border-neutral-500",
        )}
      >
        {label}
        {selected.length > 0 ? (
          <span className="inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-ink px-[4px] text-[9px] leading-none text-paper">
            {selected.length}
          </span>
        ) : null}
        <ChevronDown
          className={cn("h-[14px] w-[14px] transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 min-w-[210px] border border-neutral-200 bg-white p-[8px] shadow-[0_12px_28px_rgba(0,0,0,0.12)]">
          <ul className="max-h-[280px] overflow-y-auto">
            {options.map((opt) => {
              const checked = selected.includes(opt.value);
              return (
                <li key={opt.value}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-[10px] px-[10px] py-[8px] text-[13px] transition-colors",
                      checked ? "text-ink" : "text-neutral-700",
                      "hover:bg-neutral-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(opt.value)}
                      className="h-[14px] w-[14px] shrink-0 accent-black"
                    />
                    <span>{opt.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>

          {selected.length > 0 ? (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-[4px] w-full border-t border-neutral-200 px-[10px] pt-[10px] text-left text-[12px] font-semibold text-neutral-500 transition-colors hover:text-ink"
            >
              Clear
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
