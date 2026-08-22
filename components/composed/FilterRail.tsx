"use client";

import * as React from "react";
import { Check, ChevronDown, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { CategoryTreeNode, BrandSummary } from "@/types/catalog";

export interface FilterValue {
  categoryPath?: string;
  brandSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: boolean;
  /** Handpicked/featured products only - maps to the API's `isFeatured`. */
  isFeatured?: boolean;
}

/**
 * Quick price buckets. Exported so the rail's chips and the category page's
 * inline quick-filter row stay in sync - both write the same
 * `minPrice`/`maxPrice` pair the API already understands, so a bucket and the
 * slider are interchangeable views of one filter.
 */
export const PRICE_BUCKETS: ReadonlyArray<{ label: string; min?: number; max?: number }> = [
  { label: "Under Tk 500", max: 500 },
  { label: "Tk 500 - 1,000", min: 500, max: 1000 },
  { label: "Tk 1,000 - 2,000", min: 1000, max: 2000 },
  { label: "Tk 2,000 - 5,000", min: 2000, max: 5000 },
  { label: "Over Tk 5,000", min: 5000 },
];

/** True when the current min/max pair is exactly this bucket. */
export function isPriceBucketActive(
  value: FilterValue,
  bucket: { min?: number; max?: number },
): boolean {
  return value.minPrice === bucket.min && value.maxPrice === bucket.max;
}

export interface FilterRailProps {
  value: FilterValue;
  onChange: (next: FilterValue) => void;
  categories?: CategoryTreeNode[];
  brands?: BrandSummary[];
  /** Upper bound for the price slider; rounded up to a sensible step. */
  maxObservedPrice?: number;
  className?: string;
}

function formatTk(n: number): string {
  return `Tk ${n.toLocaleString("en-IN")}`;
}

/* ───────────── Collapsible section (Flipkart uppercase headers) ───────────── */

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="border-t border-neutral-200 py-2 first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500"
      >
        <span>{title}</span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 text-neutral-400 transition-transform duration-hover", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? <div className="mt-1.5">{children}</div> : null}
    </div>
  );
}

/* ───────────── Checkbox row ───────────── */

function CheckRow({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: (next: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-2.5 text-sm text-neutral-700">
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onToggle(e.target.checked)}
      />
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
          checked ? "border-ink bg-ink" : "border-neutral-300 bg-white",
        )}
      >
        {checked ? <Check className="h-2.5 w-2.5 text-white" aria-hidden /> : null}
      </span>
      <span>{children}</span>
    </label>
  );
}

/* ───────────── Categories (drill-down, mirrors the Flipkart sidebar) ─────────────
 * Shows the active branch: the selected category's parent crumb (← back) and
 * its children, or the top level when nothing is selected. */

function findActiveBranch(
  nodes: CategoryTreeNode[],
  activePath?: string,
): { parent?: CategoryTreeNode; siblings: CategoryTreeNode[]; node?: CategoryTreeNode } {
  if (!activePath) return { siblings: nodes };
  // BFS for the active node + its parent.
  const stack: Array<{ node: CategoryTreeNode; parent?: CategoryTreeNode }> = nodes.map((n) => ({
    node: n,
    parent: undefined,
  }));
  while (stack.length) {
    const { node, parent } = stack.shift()!;
    if (node.path === activePath) {
      const siblings = parent?.children ?? nodes;
      return { parent, siblings, node };
    }
    for (const c of node.children ?? []) stack.push({ node: c, parent: node });
  }
  return { siblings: nodes };
}

function Categories({
  nodes,
  activePath,
  onPick,
}: {
  nodes: CategoryTreeNode[];
  activePath?: string;
  onPick: (path: string | undefined) => void;
}) {
  const { parent, node } = findActiveBranch(nodes, activePath);
  // What to list: the active node's children if it has any, else its siblings.
  const list =
    node && node.children?.length ? node.children : parent?.children ?? nodes;
  const heading = node?.name ?? (parent?.name ?? null);

  return (
    <ul className="flex flex-col gap-0.5 text-sm">
      {/* Back row when drilled in */}
      {activePath ? (
        <li>
          <button
            type="button"
            onClick={() => onPick(parent?.path)}
            className="flex items-center gap-1 py-2.5 text-xs text-neutral-500 transition-colors hover:text-ink"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> {parent ? parent.name : "All categories"}
          </button>
        </li>
      ) : null}

      {heading && node ? (
        <li className="py-1 text-sm font-semibold text-ink">{heading}</li>
      ) : null}

      {list.map((n) => {
        const active = n.path === activePath;
        return (
          <li key={n._id}>
            <button
              type="button"
              onClick={() => onPick(active ? parent?.path : n.path)}
              className={cn(
                "flex w-full items-center justify-between py-2.5 text-left",
                active ? "font-medium text-accent" : "text-neutral-700 hover:text-accent",
              )}
            >
              <span className="truncate">{n.name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ───────────── Price (dual slider + Min/Max selects) ───────────── */

function roundUpNice(n: number): number {
  if (n <= 1000) return Math.ceil(n / 100) * 100 || 1000;
  if (n <= 5000) return Math.ceil(n / 500) * 500;
  return Math.ceil(n / 1000) * 1000;
}

function PriceRange({
  bound,
  value,
  onChange,
}: {
  bound: number;
  value: FilterValue;
  onChange: (patch: Partial<FilterValue>) => void;
}) {
  const lo = value.minPrice ?? 0;
  const hi = value.maxPrice ?? bound;
  const [localLo, setLocalLo] = React.useState(lo);
  const [localHi, setLocalHi] = React.useState(hi);
  const [loInput, setLoInput] = React.useState(lo === 0 ? "" : String(lo));
  const [hiInput, setHiInput] = React.useState(hi >= bound ? "" : String(hi));

  React.useEffect(() => {
    const nextLo = value.minPrice ?? 0;
    const nextHi = value.maxPrice ?? bound;
    setLocalLo(nextLo);
    setLocalHi(nextHi);
    setLoInput(nextLo === 0 ? "" : String(nextLo));
    setHiInput(nextHi >= bound ? "" : String(nextHi));
  }, [value.minPrice, value.maxPrice, bound]);

  const step = bound <= 1000 ? 50 : bound <= 5000 ? 100 : 500;
  const pctLo = (Math.min(localLo, localHi) / bound) * 100;
  const pctHi = (Math.max(localLo, localHi) / bound) * 100;

  const commit = (nextLo: number, nextHi: number) => {
    const min = Math.max(0, Math.min(nextLo, nextHi));
    const max = Math.max(nextLo, nextHi);
    onChange({
      minPrice: min > 0 ? min : undefined,
      maxPrice: max < bound ? max : undefined,
    });
  };

  const commitInputs = () => {
    const parsedLo = loInput ? Math.max(0, Math.min(Number(loInput), bound)) : 0;
    const parsedHi = hiInput ? Math.max(0, Math.min(Number(hiInput), bound)) : bound;
    setLocalLo(parsedLo);
    setLocalHi(parsedHi);
    commit(parsedLo, parsedHi);
  };

  return (
    <div className="flex flex-col gap-3">

      {/* Quick buckets - one tap for the common ranges; the slider below
          stays authoritative for anything in between. */}
      <div className="flex flex-wrap gap-1.5">
        {PRICE_BUCKETS.map((b) => {
          const active = isPriceBucketActive(value, b);
          return (
            <button
              key={b.label}
              type="button"
              aria-pressed={active}
              onClick={() =>
                onChange(
                  active
                    ? { minPrice: undefined, maxPrice: undefined }
                    : { minPrice: b.min, maxPrice: b.max },
                )
              }
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-400",
              )}
            >
              {b.label}
            </button>
          );
        })}
      </div>

      {/* Live range label */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink">{formatTk(localLo)}</span>
        <span className="text-xs text-neutral-400">–</span>
        <span className="text-xs font-medium text-ink">
          {localHi >= bound ? `${formatTk(bound)}+` : formatTk(localHi)}
        </span>
      </div>

      {/* Dual-thumb slider */}
      <div className="price-slider">
        <div className="absolute left-0 top-1/2 h-[3px] w-full -translate-y-1/2 rounded-full bg-neutral-200" />
        <div
          className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-ink"
          style={{ left: `${pctLo}%`, width: `${Math.max(0, pctHi - pctLo)}%` }}
        />
        <input
          type="range"
          min={0}
          max={bound}
          step={step}
          value={Math.min(localLo, localHi)}
          aria-label="Minimum price"
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), localHi);
            setLocalLo(v);
            setLoInput(v === 0 ? "" : String(v));
          }}
          onPointerUp={() => commit(localLo, localHi)}
          onTouchEnd={() => commit(localLo, localHi)}
          onKeyUp={() => commit(localLo, localHi)}
        />
        <input
          type="range"
          min={0}
          max={bound}
          step={step}
          value={Math.max(localLo, localHi)}
          aria-label="Maximum price"
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), localLo);
            setLocalHi(v);
            setHiInput(v >= bound ? "" : String(v));
          }}
          onPointerUp={() => commit(localLo, localHi)}
          onTouchEnd={() => commit(localLo, localHi)}
          onKeyUp={() => commit(localLo, localHi)}
        />
      </div>

      {/* Min / Max inputs */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 focus-within:border-neutral-400 focus-within:bg-white transition-colors">
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-neutral-400">Min</span>
          <input
            type="number"
            min={0}
            max={bound}
            value={loInput}
            placeholder="0"
            onChange={(e) => setLoInput(e.target.value)}
            onBlur={commitInputs}
            onKeyDown={(e) => e.key === "Enter" && commitInputs()}
            className="w-full bg-transparent text-xs font-medium text-ink outline-none tabular-nums placeholder:text-neutral-300"
          />
        </div>
        <span className="text-xs text-neutral-300">—</span>
        <div className="flex flex-1 items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 focus-within:border-neutral-400 focus-within:bg-white transition-colors">
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-neutral-400">Max</span>
          <input
            type="number"
            min={0}
            max={bound}
            value={hiInput}
            placeholder={String(bound)}
            onChange={(e) => setHiInput(e.target.value)}
            onBlur={commitInputs}
            onKeyDown={(e) => e.key === "Enter" && commitInputs()}
            className="w-full bg-transparent text-xs font-medium text-ink outline-none tabular-nums placeholder:text-neutral-300"
          />
        </div>
      </div>

    </div>
  );
}

/* ───────────── FilterRail ───────────── */

export function FilterRail({
  value,
  onChange,
  categories = [],
  brands = [],
  maxObservedPrice,
  className,
}: FilterRailProps) {
  const update = (patch: Partial<FilterValue>) => onChange({ ...value, ...patch });
  const clearAll = () => onChange({});

  const bound = roundUpNice(Math.max(maxObservedPrice ?? 0, 600, value.maxPrice ?? 0));

  const activeCount =
    Number(!!value.categoryPath) +
    Number(!!value.brandSlug) +
    Number(value.minPrice !== undefined) +
    Number(value.maxPrice !== undefined) +
    Number(value.minRating !== undefined) +
    Number(value.inStock === true) +
    Number(value.isFeatured === true);

  return (
    <aside className={cn("flex flex-col bg-white px-4 py-3", className)}>
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-base font-bold tracking-tight text-ink">Filters</h2>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="rounded px-2 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/10 hover:underline"
          >
            CLEAR ALL
          </button>
        ) : null}
      </div>

      {categories.length > 0 ? (
        <Section title="Categories">
          <Categories
            nodes={categories}
            activePath={value.categoryPath}
            onPick={(path) => update({ categoryPath: path })}
          />
        </Section>
      ) : null}

      {brands.length > 0 ? (
        <Section title="Brand">
          <ul className="flex max-h-52 flex-col gap-0.5 overflow-y-auto pr-0.5">
            {brands.map((b) => {
              const active = value.brandSlug === b.slug;
              return (
                <li key={b._id}>
                  <label className="flex cursor-pointer items-center gap-2 py-2.5 text-sm text-neutral-700">
                    <input type="checkbox" className="sr-only" checked={active} onChange={() => update({ brandSlug: active ? undefined : b.slug })} readOnly />
                    <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors", active ? "border-ink bg-ink" : "border-neutral-300 bg-white")}>
                      {active ? <Check className="h-2.5 w-2.5 text-white" aria-hidden /> : null}
                    </span>
                    <span className="truncate">{b.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      <Section title="Price">
        <PriceRange bound={bound} value={value} onChange={update} />
      </Section>

      <Section title="Customer Ratings">
        <ul className="flex flex-col gap-0.5">
          {[4, 3, 2, 1].map((rating) => {
            const active = value.minRating === rating;
            return (
              <li key={rating}>
                <label className="flex cursor-pointer items-center gap-2 py-2.5 text-sm text-neutral-700">
                  <input type="checkbox" className="sr-only" checked={active} onChange={() => update({ minRating: active ? undefined : rating })} readOnly />
                  <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors", active ? "border-ink bg-ink" : "border-neutral-300 bg-white")}>
                    {active ? <Check className="h-2.5 w-2.5 text-white" aria-hidden /> : null}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    {rating}
                    <span
                      className="inline-flex items-center rounded px-1 text-[10px] font-medium text-white"
                      style={{ backgroundColor: "#26a541" }}
                    >
                      ★
                    </span>
                    & above
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Availability">
        <CheckRow
          checked={value.inStock === true}
          onToggle={(next) => update({ inStock: next || undefined })}
        >
          Exclude out of stock
        </CheckRow>
      </Section>

      <Section title="More filters">
        <CheckRow
          checked={value.isFeatured === true}
          onToggle={(next) => update({ isFeatured: next || undefined })}
        >
          Featured picks only
        </CheckRow>
      </Section>
    </aside>
  );
}
