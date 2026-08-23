"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, X, TrendingUp, Clock, CornerDownLeft } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useDebounce } from "@/hooks/useDebounce";
import { useSearchSuggest, useFeaturedProducts } from "@/hooks/useCatalog";
import { formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { startRouteProgress } from "../RouteProgress";

/**
 * Full-width search panel that drops out of the navbar's "Search" button.
 *
 * Two states share one layout:
 *  - Idle (query < 2 chars) → "Popular search terms" chips + a "Featured
 *    products" grid, so the panel is never an empty box.
 *  - Typing → the same grid, refilled with live suggestion hits, plus a
 *    "see all results" footer that hands off to /all-products?q=.
 *
 * Mounted inside <header>, so it inherits the sticky positioning and lands
 * flush under the black category strip. The backdrop is a sibling `fixed`
 * layer rather than a parent, so the panel itself stays in normal flow and
 * doesn't need a portal.
 */

const RECENT_KEY = "ag:recent-searches";
const MAX_RECENT = 6;

/**
 * Curated because there's no aggregate-search endpoint to derive real
 * popularity from - these track the seeded department/subcategory taxonomy,
 * so every chip lands on a populated result set.
 */
const POPULAR_TERMS = [
  "panjabi",
  "kurti",
  "t-shirt",
  "jeans",
  "saree",
  "winter jacket",
  "kids dress",
];

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    // Private windows and "block site data" browsers throw on access.
    return [];
  }
}

function pushRecent(term: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = [term, ...readRecent().filter((t) => t !== term)].slice(0, MAX_RECENT);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* non-fatal - recents are a convenience, not state we depend on */
  }
}

export function SearchOverlay() {
  const router = useRouter();
  const open = useUIStore((s) => s.searchOpen);
  const setOpen = useUIStore((s) => s.setSearchOpen);

  const [value, setValue] = React.useState("");
  const [recent, setRecent] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const debounced = useDebounce(value, 250);
  const query = debounced.trim();
  const isSearching = query.length >= 2;

  const { data: suggest, isFetching } = useSearchSuggest(isSearching ? query : "");
  const { data: featured = [] } = useFeaturedProducts(8);

  // Focus the input and read recents each time the panel opens; reset the
  // query on close so re-opening always starts from the idle state.
  React.useEffect(() => {
    if (!open) {
      setValue("");
      return;
    }
    setRecent(readRecent());
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [open]);

  // Escape closes from anywhere; body scroll is locked while the panel is up.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, setOpen]);

  const runSearch = React.useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      pushRecent(trimmed);
      setOpen(false);
      startRouteProgress();
      router.push(`/all-products?q=${encodeURIComponent(trimmed)}`);
    },
    [router, setOpen],
  );

  if (!open) return null;

  const hits = suggest?.suggestions ?? [];
  const correction = suggest?.corrected ?? null;

  return (
    <>
      {/* Backdrop — click-away close. Sits under the panel, over the page. */}
      <div
        className="fixed inset-0 top-0 z-30 bg-black/25"
        aria-hidden
        onClick={() => setOpen(false)}
      />

      <div
        id="site-search-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Search products"
        className="absolute left-0 right-0 top-full z-40 max-h-[calc(100vh-var(--navbar-h,120px))] overflow-y-auto border-t border-neutral-200 bg-[#F5F6F8] shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
      >
        <div className="mx-auto w-full px-[16px] py-[20px] lg:w-[92%] lg:px-0 lg:py-[24px] xl:w-[86%]">
          {/* ── Search field + close ── */}
          <div className="flex items-center gap-[12px]">
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                runSearch(value);
              }}
              className="flex h-[56px] min-w-0 flex-1 items-center gap-[14px] rounded-[4px] bg-white px-[20px] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
            >
              <Search className="h-[22px] w-[22px] shrink-0 text-[#0F172A]" strokeWidth={3} aria-hidden />
              <input
                ref={inputRef}
                type="search"
                name="q"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Search"
                autoComplete="off"
                aria-label="Search products"
                className="min-w-0 flex-1 appearance-none border-0 bg-transparent text-[17px] text-[#0F172A] outline-none ring-0 placeholder:text-neutral-400 focus:outline-none focus:ring-0 [&::-webkit-search-cancel-button]:hidden"
              />
              {value ? (
                <button
                  type="button"
                  onClick={() => {
                    setValue("");
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="shrink-0 rounded-full p-[4px] text-neutral-400 transition-colors hover:text-ink"
                >
                  <X className="h-[16px] w-[16px]" aria-hidden />
                </button>
              ) : null}
            </form>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close search"
              className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full text-[#0F172A] transition-colors hover:bg-neutral-200"
            >
              <X className="h-[24px] w-[24px]" strokeWidth={2.5} aria-hidden />
            </button>
          </div>

          {/* ── Idle state: recent + popular terms ── */}
          {!isSearching ? (
            <>
              {recent.length > 0 ? (
                <TermSection
                  title="Recent searches"
                  icon={Clock}
                  terms={recent}
                  onPick={runSearch}
                />
              ) : null}
              <TermSection
                title="Popular search terms"
                icon={TrendingUp}
                terms={POPULAR_TERMS}
                onPick={runSearch}
              />
            </>
          ) : null}

          {/* ── Typing state: spell correction hint ── */}
          {isSearching && correction ? (
            <p className="mt-[18px] text-[14px] text-neutral-600">
              Did you mean{" "}
              <button
                type="button"
                onClick={() => {
                  setValue(correction);
                  runSearch(correction);
                }}
                className="font-bold italic text-brand-blue underline-offset-2 hover:underline"
              >
                {correction}
              </button>
              ?
            </p>
          ) : null}

          {/* ── Product grid: featured when idle, hits when typing ── */}
          <section className="mt-[20px]">
            <header className="rounded-t-[4px] bg-white px-[20px] py-[16px]">
              <h2 className="text-[17px] font-bold text-[#334155]">
                {isSearching ? `Results for “${query}”` : "Featured products"}
              </h2>
            </header>

            {isSearching && hits.length === 0 ? (
              <p className="bg-white px-[20px] pb-[24px] text-[14px] text-neutral-500">
                {isFetching ? "Searching…" : "No products matched that search."}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-[16px] bg-[#F5F6F8] p-[16px] sm:grid-cols-3 lg:grid-cols-4">
                {(isSearching
                  ? hits.map((h) => ({
                      key: h._id,
                      slug: h.slug,
                      title: h.name,
                      price: h.price,
                      image: h.image,
                    }))
                  : featured.map((p) => ({
                      key: p._id,
                      slug: p.slug,
                      title: p.title,
                      price: p.price,
                      image: p.images?.[0]?.url,
                    }))
                ).map((item) => (
                  <ResultCard
                    key={item.key}
                    slug={item.slug}
                    title={item.title}
                    price={item.price}
                    image={item.image}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </div>
            )}

            {isSearching ? (
              <button
                type="button"
                onClick={() => runSearch(query)}
                className="flex w-full items-center justify-between gap-[8px] rounded-b-[4px] bg-ink px-[20px] py-[14px] text-[12px] font-bold uppercase tracking-[0.14em] text-paper transition-colors hover:bg-neutral-800"
              >
                <span>See all results for “{query}”</span>
                <CornerDownLeft className="h-[14px] w-[14px]" aria-hidden />
              </button>
            ) : null}
          </section>
        </div>
      </div>
    </>
  );
}

/* ───────────────────── pieces ───────────────────── */

function TermSection({
  title,
  icon: Icon,
  terms,
  onPick,
}: {
  title: string;
  icon: typeof TrendingUp;
  terms: string[];
  onPick: (term: string) => void;
}) {
  return (
    <div className="mt-[22px]">
      <h2 className="text-[17px] font-bold text-[#334155]">{title}</h2>
      <ul className="mt-[12px] flex flex-wrap gap-[10px]">
        {terms.map((term) => (
          <li key={term}>
            <button
              type="button"
              onClick={() => onPick(term)}
              className="inline-flex items-center gap-[8px] rounded-full border border-neutral-300 bg-white px-[16px] py-[8px] text-[14px] font-semibold text-[#0F172A] transition-colors hover:border-neutral-400 hover:bg-neutral-50"
            >
              <Icon className="h-[14px] w-[14px] text-neutral-500" aria-hidden />
              {term}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultCard({
  slug,
  title,
  price,
  image,
  onNavigate,
}: {
  slug: string;
  title: string;
  price: number;
  image?: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={`/product/${slug}`}
      onClick={onNavigate}
      className={cn(
        "group flex flex-col items-center bg-white p-[16px] text-center",
        "transition-shadow hover:shadow-[0_2px_12px_rgba(0,0,0,0.10)]",
      )}
    >
      <span className="relative block aspect-[3/4] w-full overflow-hidden bg-neutral-100">
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-neutral-300">
            <Search className="h-[24px] w-[24px]" aria-hidden />
          </span>
        )}
      </span>

      <span className="mt-[14px] line-clamp-2 text-[15px] font-bold leading-snug text-brand-blue group-hover:underline">
        {title}
      </span>
      <span className="mt-[8px] text-[15px] font-bold text-[#0F172A]">{formatPrice(price)}</span>
    </Link>
  );
}
