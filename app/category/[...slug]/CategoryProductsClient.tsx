"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import {
  ProductCard,
  ProductCardSkeleton,
  Pagination,
  Breadcrumb,
  OfferBannerCarousel,
  Select,
  FilterRail,
  PRICE_BUCKETS,
  isPriceBucketActive,
  type FilterValue,
  type Crumb,
} from "@/components/composed";
import { Drawer } from "@/components/complex";
import { CategoryIcon } from "@/lib/utils/categoryIcon";
import { useProducts, useCategories } from "@/hooks/useCatalog";
import { cn } from "@/lib/utils/cn";
import type { ProductSort, ProductSummary, CategoryTreeNode, BrandDetail } from "@/types/catalog";
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

const SORT_OPTIONS: Array<{ label: string; value: ProductSort }> = [
  { label: "Newest first", value: "newest" },
  { label: "Popularity", value: "popular" },
  { label: "Customer rating", value: "rating-desc" },
  { label: "Price: low to high", value: "price-asc" },
  { label: "Price: high to low", value: "price-desc" },
];

/**
 * Finds what the left rail should show for `path`: if the matched node has
 * children, drill into those (browsing a parent category); otherwise show
 * its sibling list (the array it lives in) with itself marked active -
 * mirrors the grocery-app pattern of a persistent category rail (Zepto/
 * Blinkit-style) rather than a generic filter panel.
 */
function findSideNav(
  tree: CategoryTreeNode[],
  path: string,
): { items: CategoryTreeNode[]; activePath: string | null } {
  function walk(nodes: CategoryTreeNode[]): { items: CategoryTreeNode[]; activePath: string | null } | null {
    for (const node of nodes) {
      if (node.path === path) {
        if (node.children && node.children.length > 0) {
          return { items: node.children, activePath: null };
        }
        return { items: nodes, activePath: path };
      }
      if (node.children?.length) {
        const found = walk(node.children);
        if (found) return found;
      }
    }
    return null;
  }
  return walk(tree) ?? { items: [], activePath: null };
}

/**
 * Category listing - Zepto/Blinkit-style layout: a persistent narrow rail of
 * sibling categories (icon/photo + name, active one highlighted) beside the
 * product grid, an inline quick-filter chip row (stock/rating/featured/price
 * buckets), and a Filters drawer holding the full set (brand, price slider,
 * every rating tier, availability, featured) - category is already locked by
 * the rail, so the drawer's own category section is left empty.
 */
export function CategoryProductsClient({
  categoryPath,
  categoryName,
  categoryDescription,
  crumbs,
  banners,
  initialProducts,
  brands,
}: CategoryProductsClientProps) {
  const router = useRouter();
  const params = useSearchParams();

  const page = Number(params.get("page") ?? "1") || 1;
  const sort = (params.get("sort") as ProductSort | null) ?? "newest";
  const filters: FilterValue = {
    brandSlug: params.get("brand") ?? undefined,
    minPrice: params.get("minPrice") ? Number(params.get("minPrice")) : undefined,
    maxPrice: params.get("maxPrice") ? Number(params.get("maxPrice")) : undefined,
    minRating: params.get("minRating") ? Number(params.get("minRating")) : undefined,
    inStock: params.get("inStock") === "1" || undefined,
    isFeatured: params.get("featured") === "1" || undefined,
  };
  const activeFilterCount = [
    filters.brandSlug,
    filters.minPrice,
    filters.maxPrice,
    filters.minRating,
    filters.inStock,
    filters.isFeatured,
  ].filter((v) => v !== undefined).length;

  const usingInitial =
    page === 1 &&
    sort === "newest" &&
    !filters.brandSlug &&
    filters.minPrice === undefined &&
    filters.maxPrice === undefined &&
    filters.minRating === undefined &&
    !filters.inStock &&
    !filters.isFeatured;

  const { data: productResp, isLoading } = useProducts({
    sort,
    page,
    limit: PAGE_SIZE,
    categoryPath,
    brandSlug: filters.brandSlug,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    minRating: filters.minRating,
    inStock: filters.inStock,
    isFeatured: filters.isFeatured,
  });

  const { data: categoryTree } = useCategories({ shape: "tree", isActive: true });
  const sideNav = React.useMemo(
    () => findSideNav(categoryTree ?? [], categoryPath),
    [categoryTree, categoryPath],
  );

  const [filtersOpen, setFiltersOpen] = React.useState(false);

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

  const onFilterChange = (next: FilterValue) => {
    setSearchParam({
      brand: next.brandSlug,
      minPrice: next.minPrice,
      maxPrice: next.maxPrice,
      minRating: next.minRating,
      inStock: next.inStock ? "1" : undefined,
      featured: next.isFeatured ? "1" : undefined,
      page: undefined,
    });
  };

  // Inline quick filters: the drawer still holds the full set (brand, slider,
  // every rating tier), these just surface the most-used toggles without a
  // round trip through it. Each one writes the exact same FilterValue keys.
  const quickChips: Array<{ key: string; label: string; active: boolean; toggle: () => void }> = [
    {
      key: "inStock",
      label: "In stock",
      active: filters.inStock === true,
      toggle: () => onFilterChange({ ...filters, inStock: filters.inStock ? undefined : true }),
    },
    {
      key: "rating",
      label: "4★ & above",
      active: filters.minRating === 4,
      toggle: () =>
        onFilterChange({ ...filters, minRating: filters.minRating === 4 ? undefined : 4 }),
    },
    {
      key: "featured",
      label: "Featured",
      active: filters.isFeatured === true,
      toggle: () =>
        onFilterChange({ ...filters, isFeatured: filters.isFeatured ? undefined : true }),
    },
    ...PRICE_BUCKETS.map((b) => {
      const active = isPriceBucketActive(filters, b);
      return {
        key: b.label,
        label: b.label,
        active,
        toggle: () =>
          onFilterChange({
            ...filters,
            minPrice: active ? undefined : b.min,
            maxPrice: active ? undefined : b.max,
          }),
      };
    }),
  ];

  const clearFilters = () => onFilterChange({});

  const onSortChange = (s: ProductSort) => setSearchParam({ sort: s, page: undefined });
  const onPageChange = (p: number) => {
    setSearchParam({ page: p });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const products = productResp?.data ?? (usingInitial ? initialProducts : []);
  const meta = productResp?.meta;
  const maxObservedPrice = products.reduce((m, p) => Math.max(m, p.compareAtPrice ?? p.price), 0);

  return (
    <>
      {/* Persistent category rail - always visible, icon-only on mobile */}
      {sideNav.items.length > 0 ? (
        <aside className="w-[64px] shrink-0 sm:w-[180px] md:w-[210px]">
          <ul className="sticky top-2 flex flex-col overflow-hidden rounded-lg bg-white sm:border sm:border-neutral-100">
            {sideNav.items.map((item) => {
              const active = item.path === sideNav.activePath;
              return (
                <li key={item._id}>
                  <Link
                    href={`/category/${item.path}`}
                    className={cn(
                      "flex flex-col items-center gap-1 border-l-[3px] px-1.5 py-2.5 text-center transition-colors sm:flex-row sm:gap-3 sm:px-3 sm:text-left",
                      active
                        ? "border-accent bg-accent/10"
                        : "border-transparent hover:bg-neutral-50",
                    )}
                  >
                    <span className="relative h-[36px] w-[36px] shrink-0 overflow-hidden rounded-lg bg-neutral-100 sm:h-[40px] sm:w-[40px]">
                      {item.image ? (
                        <Image src={item.image} alt="" fill sizes="40px" className="object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center">
                          <CategoryIcon name={item.icon} className="h-[16px] w-[16px] text-neutral-400" strokeWidth={1.75} aria-hidden />
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "line-clamp-2 text-[10.5px] leading-tight sm:line-clamp-1 sm:text-[13px]",
                        active ? "font-bold text-accent" : "font-medium text-neutral-700",
                      )}
                    >
                      {item.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>
      ) : null}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="px-2 pt-2 sm:px-0 sm:pt-0">
          <Breadcrumb items={crumbs} />

          {banners.length > 0 ? (
            <div className="mt-2">
              <OfferBannerCarousel banners={banners} aspectClassName="aspect-[3/1] md:aspect-[21/5]" />
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
              Buy {categoryName} Online
            </h1>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="relative flex h-[38px] items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[13px] font-medium text-neutral-700 transition-colors hover:border-neutral-400"
              >
                <SlidersHorizontal className="h-[14px] w-[14px]" aria-hidden />
                Filters
                {activeFilterCount > 0 ? (
                  <span className="flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
              <Select
                value={sort}
                onChange={(e) => onSortChange(e.target.value as ProductSort)}
                options={SORT_OPTIONS}
                containerClassName="w-[168px] shrink-0"
                aria-label="Sort products"
              />
            </div>
          </div>
          {categoryDescription ? (
            <p className="mt-1 line-clamp-2 max-w-3xl text-sm text-neutral-500">{categoryDescription}</p>
          ) : null}

          {/* Quick-filter chip row - scrolls horizontally on narrow viewports
              so it never wraps the header into a tall block. */}
          <div className="scrollbar-hide mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {quickChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.toggle}
                aria-pressed={chip.active}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                  chip.active
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400",
                )}
              >
                {chip.label}
              </button>
            ))}
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-neutral-500 transition-colors hover:text-ink"
              >
                <X className="h-[12px] w-[12px]" aria-hidden />
                Clear all
              </button>
            ) : null}
          </div>
        </div>

        <ul className="mt-3 grid grid-cols-2 gap-2 px-[8px] sm:grid-cols-3 sm:px-0 lg:grid-cols-4 xl:grid-cols-5">
          {isLoading && !usingInitial
            ? Array.from({ length: 12 }).map((_, i) => (
                <li key={i} className="flex flex-col">
                  <ProductCardSkeleton className="h-full w-full" />
                </li>
              ))
            : products.map((p) => (
                <li key={p._id} className="flex flex-col">
                  <ProductCard product={p} className="h-full w-full" />
                </li>
              ))}
        </ul>

        {!isLoading && products.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-1 rounded-md border border-neutral-200 bg-paper py-6 text-center">
            <p className="text-base font-medium">No products match these filters.</p>
            <p className="text-sm text-neutral-600">Try clearing a filter or browse another department.</p>
          </div>
        ) : null}

        {meta && meta.totalPages > 1 ? (
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            onPageChange={onPageChange}
            className="mt-3"
          />
        ) : null}
      </div>

      {/* Filters drawer - category is already locked by the rail, so no
          category section is passed in here. */}
      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} side="right" title="Filters">
        <FilterRail
          value={filters}
          onChange={(next) => onFilterChange(next)}
          brands={brands}
          maxObservedPrice={maxObservedPrice}
        />
      </Drawer>
    </>
  );
}
