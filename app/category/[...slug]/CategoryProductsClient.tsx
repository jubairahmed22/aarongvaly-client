"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  CollectionProductCard,
  CollectionProductCardSkeleton,
  FilterDropdown,
  MobileFilterDrawer,
  Pagination,
  OfferBannerCarousel,
  type Crumb,
} from "@/components/composed";
import { useProducts } from "@/hooks/useCatalog";
import { formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ProductSort, ProductSummary, BrandDetail } from "@/types/catalog";
import type { OfferBanner } from "@/types/offer";

const PAGE_SIZE = 24;

export interface CategoryProductsClientProps {
  categoryPath: string;
  categoryName: string;
  categoryDescription?: string;
  crumbs: Crumb[];
  banners: OfferBanner[];
  initialProducts: ProductSummary[];
  brands: BrandDetail[];
}

/**
 * Sort labels follow the fashion-retail phrasing ("Date, new to old") rather
 * than the generic "Newest first" used elsewhere; the values are unchanged
 * so existing `?sort=` links keep working.
 */
const SORT_OPTIONS: Array<{ label: string; value: ProductSort }> = [
  { label: "Date, new to old", value: "newest" },
  { label: "Best selling", value: "popular" },
  { label: "Customer rating", value: "rating-desc" },
  { label: "Price, low to high", value: "price-asc" },
  { label: "Price, high to low", value: "price-desc" },
];

/** Fixed price bands, filtered down to the ones this collection can fill. */
const PRICE_BANDS: Array<{ label: string; value: string; min: number; max?: number }> = [
  { label: "Under Tk 1,000", value: "0-1000", min: 0, max: 1000 },
  { label: "Tk 1,000 – 2,000", value: "1000-2000", min: 1000, max: 2000 },
  { label: "Tk 2,000 – 3,500", value: "2000-3500", min: 2000, max: 3500 },
  { label: "Tk 3,500 – 5,000", value: "3500-5000", min: 3500, max: 5000 },
  { label: "Over Tk 5,000", value: "5000-", min: 5000 },
];

/**
 * Sizes sort by the run they belong to, not alphabetically — "XS, S, M, L,
 * XL, XXL" and "2-3Y, 4-5Y, …" both read wrong under a plain string sort.
 * Anything unrecognised falls to the end in first-seen order.
 */
const SIZE_ORDER = [
  "XS", "S", "M", "L", "XL", "XXL", "XXXL",
  "0-3M", "3-6M", "6-12M", "12-18M", "18-24M",
  "2-3Y", "4-5Y", "6-7Y", "8-9Y", "10-11Y", "12-13Y",
];

/**
 * Bordered sort control. The chevron is a real element rather than a CSS
 * background-image: the data-URI SVG that used to draw it silently failed to
 * render inside a Tailwind arbitrary value, leaving the select with no
 * dropdown affordance at all.
 */
function SortSelect({
  value,
  onChange,
  className,
}: {
  value: ProductSort;
  onChange: (next: ProductSort) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ProductSort)}
        aria-label="Sort products"
        className="h-full w-full cursor-pointer appearance-none border border-neutral-300 bg-white pl-[14px] pr-[36px] text-inherit text-ink outline-none transition-colors hover:border-neutral-500 focus:border-ink"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-[12px] top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-neutral-600"
        aria-hidden
      />
    </div>
  );
}

function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a);
    const ib = SIZE_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

/**
 * Collection grid in the editorial fashion layout: a thin toolbar of SIZE /
 * PRICE dropdowns on the left and a sort control on the right, then a
 * full-bleed 4-up grid of chrome-free product cards. No category rail and no
 * visible page heading — the department strip in the navbar already carries
 * the wayfinding, and the h1 stays in the DOM for SEO/screen readers.
 *
 * Every control writes to the query string, so a filtered grid is
 * linkable/shareable and the back button steps through filter changes.
 */
export function CategoryProductsClient({
  categoryPath,
  categoryName,
  categoryDescription,
  banners,
  initialProducts,
}: CategoryProductsClientProps) {
  const router = useRouter();
  const params = useSearchParams();

  const page = Number(params.get("page") ?? "1") || 1;
  const sort = (params.get("sort") as ProductSort | null) ?? "newest";
  const sizes = React.useMemo(
    () => (params.get("size") ?? "").split(",").filter(Boolean),
    [params],
  );
  const bands = React.useMemo(
    () => (params.get("price") ?? "").split(",").filter(Boolean),
    [params],
  );

  // Several price bands can be checked at once, but the API takes a single
  // min/max pair — so we send the envelope covering every checked band. The
  // bands are contiguous, so for any realistic selection the envelope is
  // exactly the union; picking non-adjacent bands widens it to include the
  // gap, which is the forgiving direction to be wrong in.
  const { minPrice, maxPrice } = React.useMemo(() => {
    const picked = PRICE_BANDS.filter((b) => bands.includes(b.value));
    if (picked.length === 0) return { minPrice: undefined, maxPrice: undefined };
    const min = Math.min(...picked.map((b) => b.min));
    const hasOpenEnded = picked.some((b) => b.max === undefined);
    const max = hasOpenEnded ? undefined : Math.max(...picked.map((b) => b.max!));
    return { minPrice: min || undefined, maxPrice: max };
  }, [bands]);

  const usingInitial =
    page === 1 && sort === "newest" && sizes.length === 0 && bands.length === 0;

  const { data: productResp, isLoading } = useProducts({
    sort,
    page,
    limit: PAGE_SIZE,
    categoryPath,
    size: sizes.length > 0 ? sizes.join(",") : undefined,
    minPrice,
    maxPrice,
  });

  const products = productResp?.data ?? (usingInitial ? initialProducts : []);
  const meta = productResp?.meta;

  // Size options come from the server-rendered, unfiltered first page rather
  // than the current (possibly filtered) result set — otherwise checking "M"
  // would collapse the dropdown to just "M" and strand the shopper.
  const sizeOptions = React.useMemo(() => {
    const found = new Set<string>();
    for (const p of initialProducts) {
      for (const v of p.variants ?? []) {
        if (v.options?.Size) found.add(v.options.Size);
      }
    }
    return sortSizes([...found]).map((s) => ({ label: s, value: s }));
  }, [initialProducts]);

  const priceOptions = React.useMemo(() => {
    if (initialProducts.length === 0) return PRICE_BANDS.map((b) => ({ label: b.label, value: b.value }));
    const lo = Math.min(...initialProducts.map((p) => p.price));
    const hi = Math.max(...initialProducts.map((p) => p.price));
    return PRICE_BANDS.filter((b) => b.min <= hi && (b.max === undefined || b.max >= lo)).map(
      (b) => ({ label: b.label, value: b.value }),
    );
  }, [initialProducts]);

  const setSearchParam = React.useCallback(
    (patch: Record<string, string | number | undefined | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === null || v === "") next.delete(k);
        else next.set(k, String(v));
      }
      const qs = next.toString();
      router.push(`/category/${categoryPath}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [params, router, categoryPath],
  );

  const onPageChange = (p: number) => {
    setSearchParam({ page: p });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeCount = sizes.length + bands.length;

  return (
    <>
      {/* h1 carries the collection name for SEO and screen readers while the
          visual design stays heading-free, matching the reference layout. */}
      <h1 className="sr-only">
        {categoryName}
        {categoryDescription ? ` — ${categoryDescription}` : ""}
      </h1>

      {banners.length > 0 ? (
        <div className="mb-[24px]">
          <OfferBannerCarousel banners={banners} aspectClassName="aspect-[3/1] md:aspect-[21/5]" />
        </div>
      ) : null}

      {/* ── Toolbar (mobile): "Filter By" drawer + sort, two equal columns ── */}
      <div className="grid grid-cols-2 gap-[12px] sm:hidden">
        <MobileFilterDrawer
          groups={[
            {
              key: "size",
              label: "Size",
              options: sizeOptions,
              selected: sizes,
              onChange: (next) => setSearchParam({ size: next.join(","), page: undefined }),
            },
            {
              key: "price",
              label: "Price",
              options: priceOptions,
              selected: bands,
              onChange: (next) => setSearchParam({ price: next.join(","), page: undefined }),
            },
          ]}
          onClearAll={() => setSearchParam({ size: undefined, price: undefined, page: undefined })}
          resultCount={meta?.total}
        />
        <SortSelect
          value={sort}
          onChange={(next) => setSearchParam({ sort: next, page: undefined })}
          className="h-[46px] text-[14px]"
        />
      </div>

      {/* ── Toolbar (sm+) ── */}
      <div className="hidden flex-wrap items-center justify-between gap-[12px] border-b border-neutral-200 pb-[18px] sm:flex">
        <div className="flex flex-wrap items-center gap-[10px]">
          <FilterDropdown
            label="Size"
            options={sizeOptions}
            selected={sizes}
            onChange={(next) =>
              setSearchParam({ size: next.join(","), page: undefined })
            }
          />
          <FilterDropdown
            label="Price"
            options={priceOptions}
            selected={bands}
            onChange={(next) =>
              setSearchParam({ price: next.join(","), page: undefined })
            }
          />
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={() => setSearchParam({ size: undefined, price: undefined, page: undefined })}
              className="text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-500 transition-colors hover:text-ink"
            >
              Clear all
            </button>
          ) : null}
        </div>

        <label className="flex items-center gap-[10px] text-[12px] text-neutral-600">
          <span className="whitespace-nowrap">Sort By:</span>
          <SortSelect
            value={sort}
            onChange={(next) => setSearchParam({ sort: next, page: undefined })}
            className="h-[38px] w-auto text-[12px]"
          />
        </label>
      </div>

      {/* ── Grid ── */}
      <ul
        className={cn(
          "mt-[24px] grid gap-x-[10px] gap-y-[32px] sm:mt-[36px] sm:gap-x-[20px] sm:gap-y-[44px]",
          "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
        )}
      >
        {isLoading && !usingInitial
          ? Array.from({ length: 8 }).map((_, i) => (
              <li key={i}>
                <CollectionProductCardSkeleton />
              </li>
            ))
          : products.map((p) => (
              <li key={p._id}>
                <CollectionProductCard product={p} />
              </li>
            ))}
      </ul>

      {!isLoading && products.length === 0 ? (
        <div className="flex flex-col items-center gap-[6px] py-[64px] text-center">
          <p className="text-[15px] font-semibold text-ink">Nothing matches these filters.</p>
          <p className="text-[13px] text-neutral-500">
            Try a different size or price range.
          </p>
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={() => setSearchParam({ size: undefined, price: undefined, page: undefined })}
              className="mt-[12px] border border-ink px-[20px] py-[10px] text-[12px] font-semibold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-ink hover:text-paper"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}

      {meta && meta.totalPages > 1 ? (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          onPageChange={onPageChange}
          className="mt-[48px]"
        />
      ) : null}

      {meta && meta.total > 0 ? (
        <p className="mt-[24px] text-center text-[12px] text-neutral-400">
          {meta.total} {meta.total === 1 ? "product" : "products"}
          {minPrice !== undefined || maxPrice !== undefined
            ? ` · ${formatPrice(minPrice ?? 0)}${maxPrice !== undefined ? ` – ${formatPrice(maxPrice)}` : "+"}`
            : ""}
        </p>
      ) : null}
    </>
  );
}
