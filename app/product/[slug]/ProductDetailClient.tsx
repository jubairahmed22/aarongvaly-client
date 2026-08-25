"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  ShoppingCart,
  Share2,
  Check,
  Tag,
  X,
  Plus,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Play,
  Truck,
  HelpCircle,
} from "lucide-react";
import { Markdown, RatingStars } from "@/components/composed";
import { useCartStore, type CartAddOn } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useUIStore } from "@/store/uiStore";
import { trackProductView, trackAddToCart } from "@/lib/analytics";
import { cn } from "@/lib/utils/cn";
import type {
  ProductDetail,
  ProductVariant,
  SizeChart,
} from "@/types/catalog";
import type { PublicCustomizationConfig } from "@/types/customization";
import { usePublicCustomizations } from "@/hooks/useCustomizations";
import { useNavbarHeight } from "@/hooks/useNavbarHeight";
import type { SiteSettingsDelivery, SiteSettingsContact } from "@/types/siteSettings";
import { RECENTLY_VIEWED_KEY } from "./RecentlyViewed";

function formatPrice(amount: number, currency: string): string {
  if (currency === "BDT")
    return `Tk ${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
}

// Default size chart - used when a product has no custom chart configured
const DEFAULT_SIZE_CHART: SizeChart = {
  unit: "cm",
  columns: ["Chest", "Waist", "Hip", "Length"],
  rows: [
    { size: "XS",  values: ["80–84", "64–68", "88–92", "63"] },
    { size: "S",   values: ["86–91", "70–75", "94–99", "65"] },
    { size: "M",   values: ["92–98", "76–81", "100–105", "68"] },
    { size: "L",   values: ["99–105", "82–87", "106–111", "70"] },
    { size: "XL",  values: ["106–112", "88–94", "112–118", "72"] },
    { size: "XXL", values: ["113–120", "95–102", "119–126", "74"] },
  ],
  notes: "General size guide - measurements may vary by style. When between sizes, size up.",
};

// ── Accordion row (Yellow-style "+" that rotates into "×") ───────────────────

function AccordionRow({
  title,
  children,
  defaultOpen,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="group border-t border-neutral-200 last:border-b" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-[16px] py-[18px] [&::-webkit-details-marker]:hidden">
        <span className="text-[16px] font-medium text-neutral-900">{title}</span>
        <Plus
          className="h-[16px] w-[16px] shrink-0 text-neutral-700 transition-transform duration-200 group-open:rotate-45"
          aria-hidden
        />
      </summary>
      <div className="pb-[20px]">{children}</div>
    </details>
  );
}

// ── Size chart (inline accordion content) ────────────────────────────────────

function SizeChartTable({ chart }: { chart: SizeChart }) {
  return (
    <div>
      <p className="mb-[12px] text-[13px] text-neutral-500">
        All measurements in <span className="font-medium text-neutral-900">{chart.unit}</span>.
        For the best fit, measure yourself and compare to the chart.
      </p>
      <div className="overflow-x-auto border border-neutral-200">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="px-[14px] py-[10px] text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Size
              </th>
              {chart.columns.map((col) => (
                <th
                  key={col}
                  className="px-[14px] py-[10px] text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.rows.map((row, i) => (
              <tr
                key={row.size}
                className={cn(
                  "border-b border-neutral-100 last:border-0",
                  i % 2 === 0 ? "bg-white" : "bg-neutral-50/60",
                )}
              >
                <td className="px-[14px] py-[10px] font-semibold text-neutral-900">{row.size}</td>
                {row.values.map((val, j) => (
                  <td key={j} className="px-[14px] py-[10px] text-neutral-700">
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {chart.notes ? (
        <p className="mt-[12px] whitespace-pre-line text-[13px] leading-relaxed text-neutral-500">
          {chart.notes}
        </p>
      ) : null}
    </div>
  );
}

// ── Jersey Customization ──────────────────────────────────────────────────────

// Common shape used by both the fallback catalog and API-fetched patches
interface PatchOption {
  id: string;
  name: string;
  abbr: string;
  color: string;
  imageUrl?: string;
  price: number;
}


const NAME_PRICE = 50;
const NUMBER_PRICE = 50;

/** Where the personalisation is printed. Front carries a number only. */
type PrintPlacement = "Both" | "Front" | "Back";

interface JerseyPersonalization {
  placement: PrintPlacement;
  nameEnabled: boolean;
  name: string;
  numberEnabled: boolean;
  number: string;
  patches: string[];
}

function JerseyCustomizer({
  value,
  onChange,
  currency,
  patches,
  namePriceBDT,
  showName,
  showNumber,
}: {
  value: JerseyPersonalization;
  onChange: (p: JerseyPersonalization) => void;
  currency: string;
  patches: PatchOption[];
  namePriceBDT: number;
  showName: boolean;
  showNumber: boolean;
}) {
  const togglePatch = (id: string) =>
    onChange({
      ...value,
      patches: value.patches.includes(id)
        ? value.patches.filter((p) => p !== id)
        : [...value.patches, id],
    });

  /* Placement gates what can be printed: a Front print carries a number
   * only, so switching to Front clears any entered name. */
  const setPlacement = (placement: PrintPlacement) =>
    onChange(
      placement === "Front"
        ? { ...value, placement, nameEnabled: false, name: "" }
        : { ...value, placement },
    );
  const nameVisible = showName && value.placement !== "Front";

  /* Tapping a patch's zoom affordance opens a large preview so the art is
   * actually inspectable (the grid thumbnails are small on mobile). */
  const [previewPatch, setPreviewPatch] = React.useState<PatchOption | null>(null);

  const patchCost = value.patches.reduce((sum, id) => {
    const p = patches.find((x) => x.id === id);
    return sum + (p?.price ?? 0);
  }, 0);
  const personalisationFee = (value.nameEnabled || value.numberEnabled) ? namePriceBDT : 0;
  const totalAddOn = personalisationFee + patchCost;
  const anyEnabled = value.nameEnabled || value.numberEnabled || value.patches.length > 0;

  return (
    <div className="overflow-hidden border border-neutral-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-[16px] py-[10px]">
        <div className="flex items-center gap-[8px]">
          <span className="text-neutral-900" aria-hidden>✦</span>
          <h3 className="text-[14px] font-semibold text-neutral-900">Personalise your jersey</h3>
        </div>
        {totalAddOn > 0 ? (
          <span className="bg-neutral-900 px-[10px] py-[2px] text-[12px] font-bold text-white">
            +{formatPrice(totalAddOn, currency)}
          </span>
        ) : anyEnabled ? (
          <span className="bg-neutral-100 px-[10px] py-[2px] text-[12px] font-medium text-neutral-500">
            Added
          </span>
        ) : (
          <span className="text-[12px] text-neutral-400">Optional</span>
        )}
      </div>

      <div className="flex flex-col gap-[4px] p-[16px]">
        {/* Print placement - Both / Front / Back. Front = number only. */}
        {showName && showNumber ? (
          <div className="flex flex-col gap-[8px] pb-[12px]">
            <span className="text-[14px] font-medium text-neutral-900">Select</span>
            <div className="flex gap-[8px]" role="radiogroup" aria-label="Print placement">
              {(["Both", "Front", "Back"] as const).map((p) => {
                const active = value.placement === p;
                return (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setPlacement(p)}
                    className={cn(
                      "flex-1 border px-[12px] py-[8px] text-[13px] font-semibold transition-all duration-150",
                      active
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-400 hover:bg-white",
                    )}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            {value.placement === "Front" ? (
              <p className="text-[11px] text-neutral-400">Front print carries the number only.</p>
            ) : null}
          </div>
        ) : null}

        {/* Name on back */}
        {nameVisible ? (
          <div className="flex flex-col gap-[8px] border-t border-neutral-100 py-[12px]">
            <label className="flex cursor-pointer items-center gap-[10px]">
              <input
                type="checkbox"
                className="sr-only"
                checked={value.nameEnabled}
                onChange={() =>
                  onChange({ ...value, nameEnabled: !value.nameEnabled, name: !value.nameEnabled ? value.name : "" })
                }
              />
              <div
                aria-hidden
                className={cn(
                  "flex h-[18px] w-[18px] shrink-0 items-center justify-center border-2 transition-all",
                  value.nameEnabled ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white",
                )}
              >
                {value.nameEnabled ? <Check className="h-[12px] w-[12px]" aria-hidden /> : null}
              </div>
              <span className="flex-1 select-none text-[14px] font-medium text-neutral-900">Name on back</span>
            </label>
            {value.nameEnabled ? (
              <input
                type="text"
                value={value.name}
                onChange={(e) => onChange({ ...value, name: e.target.value.toUpperCase().slice(0, 12) })}
                placeholder="YOUR NAME"
                maxLength={12}
                autoFocus
                className="border border-neutral-200 bg-neutral-50 px-[12px] py-[10px] text-[14px] font-bold uppercase tracking-widest text-neutral-900 placeholder:font-normal placeholder:tracking-normal placeholder:text-neutral-300 focus:border-neutral-900 focus:bg-white focus:outline-none"
              />
            ) : null}
          </div>
        ) : null}

        {/* Squad number */}
        {showNumber ? (
          <div className="flex flex-col gap-[8px] border-t border-neutral-100 py-[12px]">
            <label className="flex cursor-pointer items-center gap-[10px]">
              <input
                type="checkbox"
                className="sr-only"
                checked={value.numberEnabled}
                onChange={() =>
                  onChange({ ...value, numberEnabled: !value.numberEnabled, number: !value.numberEnabled ? value.number : "" })
                }
              />
              <div
                aria-hidden
                className={cn(
                  "flex h-[18px] w-[18px] shrink-0 items-center justify-center border-2 transition-all",
                  value.numberEnabled ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white",
                )}
              >
                {value.numberEnabled ? <Check className="h-[12px] w-[12px]" aria-hidden /> : null}
              </div>
              <span className="flex-1 select-none text-[14px] font-medium text-neutral-900">Squad number</span>
            </label>
            {value.numberEnabled ? (
              <input
                type="text"
                inputMode="numeric"
                value={value.number}
                autoFocus
                onChange={(e) => onChange({ ...value, number: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                placeholder="00"
                className="w-[64px] border border-neutral-200 bg-neutral-50 px-[12px] py-[8px] text-center text-[20px] font-black text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900 focus:bg-white focus:outline-none"
              />
            ) : null}
          </div>
        ) : null}

        {/* Personalisation fee strip */}
        {namePriceBDT > 0 && (showName || showNumber) ? (
          <div className="flex items-center justify-between bg-neutral-50 px-[12px] py-[8px]">
            <div className="flex flex-col">
              <span className="text-[13px] font-medium text-neutral-900">Personalisation fee</span>
              <span className="text-[11px] text-neutral-500">Name, number, or both — charged once</span>
            </div>
            <span className={cn(
              "text-[14px] font-bold",
              personalisationFee > 0 ? "text-neutral-900" : "text-neutral-400",
            )}>
              +{formatPrice(namePriceBDT, currency)}
            </span>
          </div>
        ) : null}

        {/* Patches */}
        <div className="flex flex-col gap-[8px] border-t border-neutral-100 pt-[12px]">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-neutral-500">Badge &amp; patches</p>

          {/* Picker grid - 2-up on mobile so the art is readable, zoom
              button opens the large preview. */}
          <div className="grid grid-cols-2 gap-[8px] sm:grid-cols-3 md:grid-cols-4">
            {patches.map((patch) => {
              const selected = value.patches.includes(patch.id);
              return (
                <div key={patch.id} className="relative">
                  <button
                    type="button"
                    onClick={() => togglePatch(patch.id)}
                    aria-pressed={selected}
                    className={cn(
                      "flex w-full flex-col items-center gap-[6px] border p-[10px] text-center transition-all duration-150",
                      selected
                        ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900"
                        : "border-neutral-200 bg-neutral-50 hover:border-neutral-400 hover:bg-white",
                    )}
                  >
                    {patch.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={patch.imageUrl} alt={patch.name} className="h-[64px] w-[64px] rounded-full object-cover" />
                    ) : (
                      <div
                        className="flex h-[64px] w-[64px] items-center justify-center rounded-full text-[12px] font-bold text-white"
                        style={{ backgroundColor: patch.color }}
                      >
                        {patch.abbr}
                      </div>
                    )}
                    <span className="line-clamp-2 text-[11px] font-medium leading-tight text-neutral-700">{patch.name}</span>
                    <span className="text-[12px] font-bold text-neutral-900">+{formatPrice(patch.price, currency)}</span>
                    {selected ? (
                      <span className="absolute left-[6px] top-[6px] flex h-[18px] w-[18px] items-center justify-center rounded-full bg-neutral-900 text-white">
                        <Check className="h-[10px] w-[10px]" aria-hidden />
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewPatch(patch)}
                    aria-label={`Preview ${patch.name}`}
                    title="View larger"
                    className="absolute right-[6px] top-[6px] flex h-[22px] w-[22px] items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-neutral-500 shadow-sm transition-colors hover:text-neutral-900"
                  >
                    <Maximize2 className="h-[11px] w-[11px]" aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Patch preview modal */}
      {previewPatch ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-[16px]"
          role="dialog"
          aria-modal="true"
          aria-label={`${previewPatch.name} preview`}
          onClick={() => setPreviewPatch(null)}
        >
          <div
            className="w-full max-w-[320px] bg-white p-[16px] text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewPatch(null)}
                aria-label="Close preview"
                className="flex h-[28px] w-[28px] items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X className="h-[16px] w-[16px]" aria-hidden />
              </button>
            </div>
            {previewPatch.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewPatch.imageUrl}
                alt={previewPatch.name}
                className="mx-auto h-[200px] w-[200px] rounded-full object-cover shadow-md"
              />
            ) : (
              <div
                className="mx-auto flex h-[200px] w-[200px] items-center justify-center rounded-full text-[32px] font-bold text-white shadow-md"
                style={{ backgroundColor: previewPatch.color }}
              >
                {previewPatch.abbr}
              </div>
            )}
            <p className="mt-[12px] text-[15px] font-semibold text-neutral-900">{previewPatch.name}</p>
            <p className="mt-[2px] text-[16px] font-bold text-neutral-900">
              +{formatPrice(previewPatch.price, currency)}
            </p>
            <button
              type="button"
              onClick={() => {
                togglePatch(previewPatch.id);
                setPreviewPatch(null);
              }}
              className={cn(
                "mt-[12px] w-full py-[10px] text-[14px] font-bold uppercase tracking-wide transition-opacity",
                value.patches.includes(previewPatch.id)
                  ? "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"
                  : "bg-neutral-900 text-white hover:opacity-90",
              )}
            >
              {value.patches.includes(previewPatch.id) ? "Remove patch" : "Add patch"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Product Detail Client ─────────────────────────────────────────────────────

export interface ProductDetailClientProps {
  product: ProductDetail;
  customizationConfig?: PublicCustomizationConfig | null;
  siteSettings?: { delivery?: SiteSettingsDelivery | null; contact?: SiteSettingsContact | null } | null;
  className?: string;
}

// ─── Full-screen image lightbox ────────────────────────────────────────────
function ImageLightbox({
  images,
  initialIndex,
  title,
  onClose,
}: {
  images: { url: string; alt?: string | null; _id?: string }[];
  initialIndex: number;
  title: string;
  onClose: (finalIdx: number) => void;
}) {
  const [idx, setIdx] = React.useState(initialIndex);
  const idxRef = React.useRef(initialIndex);
  const touchStartX = React.useRef<number | null>(null);
  const go = (i: number) => { setIdx(i); idxRef.current = i; };
  // Wrap around so both arrows always work (and stay visible) on any image.
  const prev = () => go((idxRef.current - 1 + images.length) % images.length);
  const next = () => go((idxRef.current + 1) % images.length);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(idxRef.current);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    const saved = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = saved;
    };
  }, [onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  const stripRef = React.useRef<HTMLDivElement>(null);

  // Keep the active thumbnail visible as the user swipes / uses the arrows.
  React.useEffect(() => {
    stripRef.current
      ?.querySelector<HTMLElement>(`[data-thumb="${idx}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [idx]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - (e.changedTouches[0]?.clientX ?? 0);
    if (Math.abs(delta) > 40) delta > 0 ? next() : prev();
    touchStartX.current = null;
  };

  const current = images[idx];

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between px-[16px] py-[10px] pt-[max(10px,env(safe-area-inset-top))]">
        <span className="text-sm tabular-nums text-white/70">
          {idx + 1} <span className="mx-1 text-white/40">/</span> {images.length}
        </span>
        <button
          type="button"
          onClick={() => onClose(idxRef.current)}
          aria-label="Close"
          className="flex h-[44px] w-[44px] items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-[22px] w-[22px]" aria-hidden />
        </button>
      </div>

      {/* Main image area */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {current ? (
          <div className="relative h-full w-full">
            <Image
              key={current.url}
              src={current.url}
              alt={current.alt ?? title}
              fill
              sizes="100vw"
              priority
              className="object-contain"
            />
          </div>
        ) : null}

        {/* Prev / Next arrows — always visible, navigation wraps around */}
        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-[8px] top-1/2 z-10 flex h-[44px] w-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-neutral-900/70 text-white shadow-lg transition-colors hover:bg-neutral-900/90 active:bg-neutral-800 sm:left-[24px]"
            >
              <ChevronLeft className="h-[22px] w-[22px] -translate-x-[1px]" aria-hidden />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next image"
              className="absolute right-[8px] top-1/2 z-10 flex h-[44px] w-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-neutral-900/70 text-white shadow-lg transition-colors hover:bg-neutral-900/90 active:bg-neutral-800 sm:right-[24px]"
            >
              <ChevronRight className="h-[22px] w-[22px] translate-x-[1px]" aria-hidden />
            </button>
          </>
        ) : null}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 ? (
        <div
          ref={stripRef}
          // Auto margins (not justify-center) keep the strip centered when it
          // fits but still fully scrollable when it overflows.
          className="flex shrink-0 gap-[8px] overflow-x-auto px-[16px] pt-[12px] pb-[max(12px,env(safe-area-inset-bottom))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*:first-child]:ml-auto [&>*:last-child]:mr-auto"
        >
          {images.map((img, i) => (
            <button
              key={img._id ?? i}
              data-thumb={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`View image ${i + 1}`}
              className={cn(
                "relative h-[56px] w-[56px] shrink-0 overflow-hidden border-2 transition-all",
                i === idx
                  ? "border-white opacity-100"
                  : "border-white/20 opacity-50 hover:border-white/50 hover:opacity-80",
              )}
            >
              <Image src={img.url} alt="" fill sizes="56px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ProductDetailClient({ product, customizationConfig, siteSettings, className }: ProductDetailClientProps) {
  const router = useRouter();
  const toast = useUIStore((s) => s.toast);
  const addToCart = useCartStore((s) => s.add);
  const inWishlist = useWishlistStore((s) => s.has(product._id));
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  const [imageIdx, setImageIdx] = React.useState(0);
  // When true the hero area plays the product video instead of showing an image.
  const [showVideo, setShowVideo] = React.useState(false);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [zoomPoint, setZoomPoint] = React.useState<{ x: number; y: number } | null>(null);
  // Hover-zoom is desktop-only — disabled on touch / tablet and on viewports below lg
  const [canZoom, setCanZoom] = React.useState(false);
  const [qty, setQty] = React.useState(1);
  const [ctaVisible, setCtaVisible] = React.useState(true);
  const [ctaEverVisible, setCtaEverVisible] = React.useState(false);
  const [bottomPassed, setBottomPassed] = React.useState(false);
  const [touchStartX, setTouchStartX] = React.useState<number | null>(null);
  const ctaRef = React.useRef<HTMLDivElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  // Real measured navbar height - the top sticky mini-bar sits flush under
  // it. A hardcoded per-breakpoint guess drifted out of sync and got
  // clipped behind the navbar; this always matches whatever's actually
  // rendered there.
  const navbarHeight = useNavbarHeight();

  // Jersey personalization
  const [personalization, setPersonalization] = React.useState<JerseyPersonalization>({
    placement: "Both",
    nameEnabled: false,
    name: "",
    numberEnabled: false,
    number: "",
    patches: [],
  });

  // ── Variant axes ──────────────────────────────────────────────────────────
  const optionAxes = React.useMemo(() => {
    const axes = new Map<string, string[]>();
    for (const v of product.variants) {
      if (!v.options) continue;
      for (const [k, val] of Object.entries(v.options)) {
        const set = axes.get(k) ?? [];
        if (!set.includes(val)) set.push(val);
        axes.set(k, set);
      }
    }
    return Array.from(axes.entries());
  }, [product.variants]);

  const [selectedOptions, setSelectedOptions] = React.useState<Record<string, string>>(() => {
    const first =
      product.variants.find((v) => (v.isActive ?? true) && v.stock > 0) ?? product.variants[0];
    return first?.options ? { ...first.options } : {};
  });

  const matchedVariant: ProductVariant | undefined = React.useMemo(
    () =>
      product.variants.find((v) => {
        if (!v.options) return Object.keys(selectedOptions).length === 0;
        return Object.entries(v.options).every(([k, val]) => selectedOptions[k] === val);
      }),
    [product.variants, selectedOptions],
  );

  const effectivePrice = matchedVariant?.price ?? product.price;
  const effectiveCompareAt = matchedVariant?.compareAtPrice ?? product.compareAtPrice;
  const effectiveStock =
    product.variants.length > 0 ? matchedVariant?.stock ?? 0 : product.stock;
  const onSale = effectiveCompareAt !== undefined && effectiveCompareAt > effectivePrice;
  const discountPct = onSale
    ? Math.round(((effectiveCompareAt - effectivePrice) / effectiveCompareAt) * 100)
    : 0;
  const outOfStock = product.trackStock && effectiveStock <= 0;

  // How many of this exact variant is already sitting in the local cart.
  // Used to prevent adding beyond available stock.
  const existingCartQty = useCartStore((s) => {
    if (!product.trackStock) return 0;
    const vid = matchedVariant?._id;
    return (
      s.items.find(
        (i) =>
          i.productId === product._id &&
          (vid ? i.variantId === vid : !i.variantId),
      )?.qty ?? 0
    );
  });
  const remaining = product.trackStock
    ? Math.max(0, effectiveStock - existingCartQty)
    : 99;

  // Reset qty to 1 when the matched variant changes so stale qty doesn't carry over
  React.useEffect(() => {
    setQty(1);
  }, [matchedVariant?._id]);

  // When the selected variant has its own photo, jump the gallery to it (the
  // arrows / thumbnails then keep working over the full image list).
  React.useEffect(() => {
    const vImg = matchedVariant?.image;
    if (!vImg) return;
    const i = product.images.findIndex((img) => img.url === vImg);
    if (i >= 0) {
      setImageIdx(i);
      setShowVideo(false);
    }
  }, [matchedVariant?._id, matchedVariant?.image, product.images]);

  React.useEffect(() => {
    const ctaEl = ctaRef.current;
    if (!ctaEl) return;
    const ctaObs = new IntersectionObserver(([e]) => {
      const visible = !!e?.isIntersecting;
      if (visible) setCtaEverVisible(true);
      setCtaVisible(visible);
    }, { threshold: 0 });
    ctaObs.observe(ctaEl);

    const bottomEl = bottomRef.current;
    const bottomObs = bottomEl
      ? new IntersectionObserver(([e]) => setBottomPassed(!!e?.isIntersecting), { threshold: 0 })
      : null;
    if (bottomEl && bottomObs) bottomObs.observe(bottomEl);

    return () => {
      ctaObs.disconnect();
      bottomObs?.disconnect();
    };
  }, []);

  const heroImage = product.images[imageIdx] ?? product.images[0];

  // ── Category data ─────────────────────────────────────────────────────────
  const primaryCategory =
    typeof product.category === "object" ? product.category : undefined;

  // ── Customization assignments ─────────────────────────────────────────────
  // The server-rendered prop can be stale (the PDP HTML sits in the Full
  // Route Cache for up to a minute); the client-side query re-fetches the
  // live config so a freshly saved admin assignment shows up immediately.
  const { data: liveCustomizations } = usePublicCustomizations();
  const activeConfig = liveCustomizations ?? customizationConfig;
  const assignments = activeConfig?.assignments ?? [];
  const apiPatches = activeConfig?.patches ?? [];
  const addOnPrices = activeConfig?.addOnPrices ?? { name: NAME_PRICE, number: NUMBER_PRICE };

  // Every category slug this product belongs to, directly or via ancestors:
  // the primary category chain PLUS the secondary `categories[]` (products
  // are often filed under a broad primary like "jerseys" with the specific
  // club/tournament as a secondary category). Category `path` is the full
  // slug chain ("jerseys/football-club-kits/arsenal"), so splitting it also
  // covers ancestors that aren't populated on the response.
  const allCategorySlugs = React.useMemo(() => {
    const slugs = new Set<string>();
    const addCategory = (c: { slug?: string; path?: string } | string | null | undefined) => {
      if (!c || typeof c !== "object") return;
      if (c.slug) slugs.add(c.slug);
      for (const seg of (c.path ?? "").split("/")) if (seg) slugs.add(seg);
    };
    addCategory(primaryCategory);
    for (const a of primaryCategory?.ancestors ?? []) addCategory(a);
    for (const c of product.categories ?? []) addCategory(c);
    return Array.from(slugs);
  }, [primaryCategory, product.categories]);

  // Find the most specific matching assignment: product-level first, then category
  const matchedAssignment = React.useMemo(() => {
    const productMatch = assignments.find(
      (a) => a.targetType === "product" && a.targetId === product._id,
    );
    if (productMatch) return productMatch;
    return (
      assignments.find(
        (a) => a.targetType === "category" && allCategorySlugs.includes(a.targetId),
      ) ?? null
    );
  }, [assignments, product._id, allCategorySlugs]);

  const isJerseyProduct = matchedAssignment !== null;
  const allowName = matchedAssignment?.allowName ?? true;
  const allowNumber = matchedAssignment?.allowNumber ?? true;

  const activePatchLibrary: PatchOption[] = React.useMemo(() => {
    if (!matchedAssignment) return [];
    const allActive = apiPatches
      .filter((p) => p.isActive)
      .map((p) => ({
        id: p._id,
        name: p.name,
        abbr: p.abbreviation,
        color: p.color,
        imageUrl: p.imageUrl,
        price: p.price,
      }));
    if (matchedAssignment.allPatches) return allActive;
    return allActive.filter((p) => matchedAssignment.patchIds.includes(p.id));
  }, [matchedAssignment, apiPatches]);

  // ── Personalization add-on total ──────────────────────────────────────────
  const customTotal = React.useMemo(() => {
    if (!isJerseyProduct) return 0;
    let t = 0;
    const nameActive = personalization.nameEnabled && Boolean(personalization.name.trim());
    const numberActive = personalization.numberEnabled && Boolean(personalization.number.trim());
    if (nameActive || numberActive) t += addOnPrices.name;
    for (const id of personalization.patches) {
      const patch = activePatchLibrary.find((p) => p.id === id);
      if (patch) t += patch.price;
    }
    return t;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalization, isJerseyProduct, addOnPrices, activePatchLibrary]);

  const totalPrice = effectivePrice + customTotal;

  // ── Free delivery nudge ───────────────────────────────────────────────────
  const freeThreshold = siteSettings?.delivery?.freeShippingThreshold ?? 0;
  const orderValue = totalPrice * qty;
  const qualifiesForFree = freeThreshold > 0 && orderValue >= freeThreshold;
  const amountToFree = freeThreshold > 0 ? Math.max(0, freeThreshold - orderValue) : 0;

  // ── Seller ────────────────────────────────────────────────────────────────
  const brandName =
    typeof product.brand === "object" && product.brand ? product.brand.name : undefined;

  const cartOptions: Record<string, string> | undefined = React.useMemo(() => {
    if (matchedVariant?.options && Object.keys(matchedVariant.options).length > 0) {
      return { ...matchedVariant.options };
    }
    return Object.keys(selectedOptions).length > 0 ? { ...selectedOptions } : undefined;
  }, [matchedVariant, selectedOptions]);

  // ── Analytics ─────────────────────────────────────────────────────────────
  React.useEffect(() => {
    trackProductView({
      productId: product._id,
      slug: product.slug,
      title: product.title,
      price: product.price,
      currency: product.currency,
      category: primaryCategory?.name,
      brand: brandName,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product._id]);

  // ── Recently viewed (feeds the rail at the bottom of the PDP) ─────────────
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
      const list: unknown[] = raw ? JSON.parse(raw) : [];
      const entry = {
        slug: product.slug,
        title: product.title,
        image: product.images[0]?.url ?? "",
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        currency: product.currency,
      };
      const next = [
        entry,
        ...(Array.isArray(list) ? list : []).filter(
          (i): i is { slug: string } =>
            !!i && typeof i === "object" && (i as { slug?: string }).slug !== product.slug,
        ),
      ].slice(0, 12);
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable — the rail just won't render
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product._id]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const onSelectOption = (axis: string, value: string) =>
    setSelectedOptions((prev) => ({ ...prev, [axis]: value }));

  const onAddToCart = () => {
    if (outOfStock) return;

    if (product.trackStock) {
      if (remaining <= 0) {
        toast({
          title: "Maximum quantity reached",
          description: `You already have all ${effectiveStock} available in your cart.`,
          tone: "error",
        });
        return;
      }
      if (qty > remaining) {
        toast({
          title: "Not enough stock",
          description: `Only ${remaining} more available - reduced to ${remaining}.`,
          tone: "info",
        });
        setQty(remaining);
        return;
      }
    }

    const customOptions: Record<string, string> = {};
    const addOns: CartAddOn[] = [];
    if (isJerseyProduct) {
      const nameActive = personalization.nameEnabled && Boolean(personalization.name.trim());
      const numberActive = personalization.numberEnabled && Boolean(personalization.number.trim());
      if (nameActive) customOptions["Name"] = personalization.name.trim();
      if (numberActive) customOptions["Number"] = personalization.number.trim();
      // Record where the print goes so POS / order views show the same
      // choice the buyer made (Front = number only).
      if (nameActive || numberActive) customOptions["Print"] = personalization.placement;
      if ((nameActive || numberActive) && addOnPrices.name > 0) {
        addOns.push({
          label:
            nameActive && numberActive
              ? "Name & number print"
              : nameActive
                ? "Name print"
                : "Number print",
          amount: addOnPrices.name,
        });
      }
      if (personalization.patches.length > 0) {
        const patchNames: string[] = [];
        for (const id of personalization.patches) {
          const patch = activePatchLibrary.find((p) => p.id === id);
          if (!patch) continue;
          patchNames.push(patch.name);
          addOns.push({ label: `Patch: ${patch.name}`, amount: patch.price });
        }
        if (patchNames.length) customOptions["Patches"] = patchNames.join(", ");
      }
    }
    addToCart({
      productId: product._id,
      variantId: matchedVariant?._id,
      options: { ...cartOptions, ...customOptions },
      slug: product.slug,
      title: product.title,
      image: heroImage?.url ?? "",
      price: totalPrice,
      originalPrice: effectiveCompareAt,
      basePrice: addOns.length > 0 ? effectivePrice : undefined,
      addOns: addOns.length > 0 ? addOns : undefined,
      qty,
      stock: product.trackStock ? effectiveStock : undefined,
    });
    trackAddToCart({
      productId: product._id,
      slug: product.slug,
      title: product.title,
      price: totalPrice,
      currency: product.currency,
      qty,
      variantId: matchedVariant?._id,
    });
    toast({ title: "Added to cart", description: product.title, tone: "success" });
  };

  const onBuyNow = () => {
    if (outOfStock) return;
    onAddToCart();
    router.push("/checkout");
  };

  const onToggleWishlist = () =>
    toggleWishlist({
      productId: product._id,
      slug: product.slug,
      title: product.title,
      image: heroImage?.url ?? "",
      price: totalPrice,
    });

  const onShare = async () => {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: product.title, url });
      } catch {
        // user cancelled - no-op
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied to clipboard", tone: "success" });
    }
  };

  React.useEffect(() => {
    const mq = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (min-width: 1024px)",
    );
    const update = () => setCanZoom(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const selectImage = (i: number) => {
    setImageIdx(i);
    setShowVideo(false);
  };
  const prevImage = () =>
    selectImage((imageIdx - 1 + product.images.length) % product.images.length);
  const nextImage = () => selectImage((imageIdx + 1) % product.images.length);

  const onGalleryTouchStart = (e: React.TouchEvent) =>
    setTouchStartX(e.touches[0]?.clientX ?? null);
  const onGalleryTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || product.images.length <= 1) return;
    const delta = touchStartX - (e.changedTouches[0]?.clientX ?? 0);
    if (Math.abs(delta) > 40) {
      // Swiping while the video is up returns to the image gallery.
      if (showVideo) setShowVideo(false);
      else delta > 0 ? nextImage() : prevImage();
    }
    setTouchStartX(null);
  };

  const productVideo = product.video ?? null;
  // The thumbnail strip renders when there's more than one thing to pick from.
  const galleryCount = product.images.length + (productVideo ? 1 : 0);

  // "New" ribbon — same as the reference site's badge on fresh arrivals.
  const isNewProduct = React.useMemo(() => {
    const created = Date.parse(product.createdAt);
    if (Number.isNaN(created)) return false;
    return Date.now() - created < 45 * 24 * 60 * 60 * 1000;
  }, [product.createdAt]);

  // SKU / Product Type lines under the title, as on the reference.
  const displaySku = matchedVariant?.sku ?? product.sku ?? product.variants[0]?.sku;
  const productType = primaryCategory?.name ?? brandName;

  // Always show a size guide - the product's own chart when it actually has
  // rows, otherwise the default general guide.
  const sizeChart =
    product.sizeChart && product.sizeChart.rows.length > 0
      ? product.sizeChart
      : DEFAULT_SIZE_CHART;

  /**
   * Is a value on an axis buyable at all? Used to strike through sold-out
   * sizes exactly like the reference ("14.5/xs" crossed out). A value is
   * unavailable when every active variant carrying it is out of stock.
   */
  const isValueAvailable = (axis: string, value: string): boolean => {
    if (!product.trackStock) return true;
    return product.variants.some(
      (v) => (v.isActive ?? true) && v.options?.[axis] === value && v.stock > 0,
    );
  };

  /** Image swatch for a color value - the photo of a variant in that color. */
  const swatchImageFor = (axis: string, value: string): string | undefined =>
    product.variants.find((v) => v.options?.[axis] === value && v.image)?.image ??
    (optionAxes.length === 1 || product.variants.every((v) => v.options?.[axis] === value)
      ? product.images[0]?.url
      : undefined);

  return (
    <section className={cn("pb-24 lg:pb-0", className)}>
      {/* Full-screen image lightbox */}
      {lightboxOpen ? (
        <ImageLightbox
          images={product.images}
          initialIndex={imageIdx}
          title={product.title}
          onClose={(finalIdx) => { setLightboxOpen(false); setImageIdx(finalIdx); }}
        />
      ) : null}

      {/*
        Yellow-style PDP layout (2-column):
        - lg+:    [Gallery with arrows + thumbnail strip below] | [Info column]
        - mobile: stacked, with a sticky add-to-cart bar
      */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-5 lg:gap-6">

        {/* ── GALLERY ─────────────────────────────────────────────────── */}
        <div className="md:sticky md:top-4 md:self-start">
          {/* Main image */}
          <div
            role={canZoom ? "button" : undefined}
            tabIndex={canZoom ? 0 : undefined}
            aria-label={showVideo ? "Product video" : canZoom ? "View full screen" : undefined}
            className={cn(
              "group relative aspect-[4/5] w-full overflow-hidden bg-neutral-100 outline-none",
              showVideo || !canZoom ? "cursor-default" : "cursor-zoom-in",
            )}
            onClick={() => canZoom && !showVideo && heroImage && setLightboxOpen(true)}
            onKeyDown={(e) => e.key === "Enter" && canZoom && !showVideo && heroImage && setLightboxOpen(true)}
            onTouchStart={onGalleryTouchStart}
            onTouchEnd={onGalleryTouchEnd}
            onMouseMove={canZoom && !showVideo ? (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setZoomPoint({
                x: ((e.clientX - r.left) / r.width) * 100,
                y: ((e.clientY - r.top) / r.height) * 100,
              });
            } : undefined}
            onMouseLeave={canZoom && !showVideo ? () => setZoomPoint(null) : undefined}
          >
            {showVideo && productVideo ? (
              <video
                key={productVideo.url}
                src={productVideo.url}
                poster={productVideo.posterUrl}
                controls
                autoPlay
                muted
                playsInline
                preload="metadata"
                className="absolute inset-0 h-full w-full bg-black object-contain"
              />
            ) : heroImage ? (
              <div
                className="absolute inset-0"
                style={canZoom && zoomPoint ? {
                  transform: "scale(2.2)",
                  transformOrigin: `${zoomPoint.x}% ${zoomPoint.y}%`,
                  transition: "transform 0.08s ease-out",
                } : {
                  transform: "scale(1)",
                  transition: "transform 0.25s ease-out",
                }}
              >
                <Image
                  src={heroImage.url}
                  alt={heroImage.alt ?? product.title}
                  fill
                  priority
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
                No image
              </div>
            )}

            {/* "New" ribbon / sale badge — white tab pinned to the top-left edge */}
            {!showVideo ? (
              isNewProduct ? (
                <span className="absolute left-0 top-[14px] z-10 bg-white px-[12px] py-[5px] text-[13px] font-medium text-neutral-900 shadow-sm">
                  New
                </span>
              ) : onSale ? (
                <span className="absolute left-0 top-[14px] z-10 bg-neutral-900 px-[12px] py-[5px] text-[13px] font-medium text-white shadow-sm">
                  -{discountPct}%
                </span>
              ) : null
            ) : null}

            {/* Prev / next arrows — circular, floating over the image sides */}
            {product.images.length > 1 && !showVideo ? (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  aria-label="Previous image"
                  className="absolute left-[12px] top-1/2 z-10 flex h-[40px] w-[40px] -translate-y-1/2 items-center justify-center rounded-full border border-neutral-300 bg-white/90 text-neutral-700 shadow-sm transition-colors hover:bg-white hover:text-neutral-900"
                >
                  <ChevronLeft className="h-[18px] w-[18px]" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  aria-label="Next image"
                  className="absolute right-[12px] top-1/2 z-10 flex h-[40px] w-[40px] -translate-y-1/2 items-center justify-center rounded-full border border-neutral-300 bg-white/90 text-neutral-700 shadow-sm transition-colors hover:bg-white hover:text-neutral-900"
                >
                  <ChevronRight className="h-[18px] w-[18px]" aria-hidden />
                </button>
              </>
            ) : null}

            {/* Expand hint — visible on hover (desktop) */}
            {heroImage && !showVideo && canZoom ? (
              <span className="pointer-events-none absolute right-[12px] top-[12px] flex h-[32px] w-[32px] items-center justify-center rounded-full bg-black/30 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
                <Maximize2 className="h-4 w-4" aria-hidden />
              </span>
            ) : null}
          </div>

          {/* Thumbnail strip below the main image (all breakpoints) */}
          {galleryCount > 1 ? (
            <ul className="mt-3 flex gap-[10px] overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*:first-child]:ml-auto [&>*:last-child]:mr-auto">
              {product.images.map((img, i) => (
                <li key={img._id ?? i} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => selectImage(i)}
                    aria-label={`Show image ${i + 1}`}
                    className={cn(
                      "relative h-[88px] w-[72px] overflow-hidden border transition-all",
                      !showVideo && i === imageIdx
                        ? "border-neutral-900"
                        : "border-neutral-200 opacity-80 hover:border-neutral-400 hover:opacity-100",
                    )}
                  >
                    <Image
                      src={img.url}
                      alt={img.alt ?? product.title}
                      fill
                      sizes="72px"
                      className="object-cover"
                    />
                  </button>
                </li>
              ))}
              {productVideo ? (
                <li className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowVideo(true)}
                    aria-label="Play product video"
                    className={cn(
                      "relative h-[88px] w-[72px] overflow-hidden border bg-neutral-900 transition-all",
                      showVideo ? "border-neutral-900" : "border-neutral-200 opacity-80 hover:border-neutral-400 hover:opacity-100",
                    )}
                  >
                    {productVideo.posterUrl ? (
                      <Image
                        src={productVideo.posterUrl}
                        alt=""
                        fill
                        sizes="72px"
                        className="object-cover"
                      />
                    ) : null}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <span className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-white/90">
                        <Play className="h-[12px] w-[12px] translate-x-[1px] fill-ink text-ink" aria-hidden />
                      </span>
                    </span>
                  </button>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>

        {/* ── PRODUCT INFO ─────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col px-1 sm:px-0">

          {/* Title + Share */}
          <div className="flex items-start justify-between gap-[16px]">
            <h1 className="text-[24px] font-bold normal-case leading-tight tracking-normal text-neutral-900 sm:text-[28px]">
              {product.title}
            </h1>
            <button
              type="button"
              onClick={onShare}
              aria-label="Share this product"
              className="mt-[6px] flex shrink-0 items-center gap-[6px] text-[13px] text-neutral-700 transition-colors hover:text-neutral-900"
            >
              <Share2 className="h-[16px] w-[16px]" aria-hidden />
              <span className="underline underline-offset-2">Share</span>
            </button>
          </div>

          {/* SKU / Product Type */}
          <dl className="mt-[16px] flex flex-col gap-[6px] text-[14px]">
            {displaySku ? (
              <div className="flex gap-[8px]">
                <dt className="text-neutral-500">SKU:</dt>
                <dd className="text-neutral-900">{displaySku}</dd>
              </div>
            ) : null}
            {productType ? (
              <div className="flex gap-[8px]">
                <dt className="text-neutral-500">Product Type:</dt>
                <dd className="text-neutral-900">{productType}</dd>
              </div>
            ) : null}
          </dl>

          {/* Rating (only when reviews exist) */}
          {product.ratingCount > 0 ? (
            <button
              type="button"
              onClick={() => document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" })}
              className="mt-[10px] flex w-fit items-center gap-[8px] text-[13px] text-neutral-500 transition-colors hover:text-neutral-700"
            >
              <RatingStars value={product.ratingAverage} size="sm" />
              <span>
                {product.ratingAverage.toFixed(1)} · {product.ratingCount.toLocaleString()} reviews
              </span>
            </button>
          ) : null}

          {/* Price */}
          <div className="mt-[16px] flex flex-wrap items-baseline gap-[10px]">
            <span className="text-[22px] font-bold text-neutral-900">
              {formatPrice(totalPrice, product.currency)}
            </span>
            <span className="text-[14px] text-neutral-500">+ VAT</span>
            {onSale ? (
              <>
                <span className="text-[15px] text-neutral-400 line-through">
                  {formatPrice(effectiveCompareAt, product.currency)}
                </span>
                <span className="text-[13px] font-semibold text-neutral-900">
                  Save {discountPct}%
                </span>
              </>
            ) : null}
          </div>

          {customTotal > 0 ? (
            <p className="mt-[4px] text-[12px] text-neutral-500">
              Base {formatPrice(effectivePrice, product.currency)} + personalisation{" "}
              <span className="font-semibold text-neutral-900">
                {formatPrice(customTotal, product.currency)}
              </span>
            </p>
          ) : null}

          {product.activeOffer ? (
            <Link
              href={`/offers/${product.activeOffer.slug}`}
              className="mt-[8px] inline-flex w-fit items-center gap-[6px] text-[13px] font-semibold text-neutral-900 underline underline-offset-2 hover:text-neutral-600"
            >
              <Tag className="h-[14px] w-[14px]" aria-hidden />
              {product.activeOffer.name}
            </Link>
          ) : null}

          {/* Variant axes — color as image swatches, size as pill text, rest as boxes */}
          {optionAxes.map(([axis, values]) => {
            const lower = axis.toLowerCase();
            const isColorAxis = lower.includes("color") || lower.includes("colour");
            const isSizeAxis = lower.includes("size");
            const selected = selectedOptions[axis];

            if (isColorAxis) {
              return (
                <div key={axis} className="mt-[24px]">
                  <p className="text-[15px] text-neutral-900">
                    {axis} - <span className="uppercase">{selected ?? ""}</span>
                  </p>
                  <div className="mt-[10px] flex flex-wrap gap-[10px]">
                    {values.map((v) => {
                      const active = selected === v;
                      const swatch = swatchImageFor(axis, v);
                      return swatch ? (
                        <button
                          key={v}
                          type="button"
                          onClick={() => onSelectOption(axis, v)}
                          aria-label={`${axis}: ${v}`}
                          aria-pressed={active}
                          title={v}
                          className={cn(
                            "relative h-[92px] w-[76px] overflow-hidden border bg-neutral-100 p-[3px] transition-all",
                            active
                              ? "border-neutral-900"
                              : "border-neutral-200 hover:border-neutral-400",
                          )}
                        >
                          <Image src={swatch} alt={v} fill sizes="76px" className="object-cover p-[3px]" />
                        </button>
                      ) : (
                        <button
                          key={v}
                          type="button"
                          onClick={() => onSelectOption(axis, v)}
                          aria-pressed={active}
                          className={cn(
                            "border px-[14px] py-[8px] text-[13px] uppercase transition-all",
                            active
                              ? "border-neutral-900 text-neutral-900"
                              : "border-neutral-200 text-neutral-600 hover:border-neutral-400",
                          )}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            if (isSizeAxis) {
              return (
                <div key={axis} className="mt-[24px]">
                  <p className="text-[15px] text-neutral-900">{axis}</p>
                  <div className="mt-[10px] flex flex-wrap items-center gap-x-[6px] gap-y-[10px]">
                    {values.map((v) => {
                      const active = selected === v;
                      const available = isValueAvailable(axis, v);
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => onSelectOption(axis, v)}
                          aria-pressed={active}
                          className={cn(
                            "min-w-[52px] rounded-full border px-[14px] py-[9px] text-[14px] lowercase transition-all",
                            active
                              ? "border-neutral-900 font-medium text-neutral-900"
                              : "border-transparent text-neutral-700 hover:text-neutral-900",
                            !available && "text-neutral-400 line-through hover:text-neutral-400",
                          )}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return (
              <div key={axis} className="mt-[24px]">
                <p className="text-[15px] text-neutral-900">
                  {axis}
                  {selected ? <span className="ml-[8px] text-neutral-500">{selected}</span> : null}
                </p>
                <div className="mt-[10px] flex flex-wrap gap-[8px]">
                  {values.map((v) => {
                    const active = selected === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => onSelectOption(axis, v)}
                        aria-pressed={active}
                        className={cn(
                          "inline-flex h-[40px] min-w-[48px] items-center justify-center border px-[12px] text-[14px] transition-all",
                          active
                            ? "border-neutral-900 text-neutral-900"
                            : "border-neutral-200 text-neutral-600 hover:border-neutral-400",
                        )}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Stock + quantity */}
          <div className="mt-[20px] flex flex-wrap items-center gap-x-[20px] gap-y-[10px]">
            <div className="inline-flex items-center border border-neutral-300">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label="Decrease quantity"
                className="flex h-[40px] w-[40px] items-center justify-center text-[18px] text-neutral-600 transition-colors hover:text-neutral-900 disabled:opacity-30"
              >
                −
              </button>
              <span className="w-[40px] select-none border-x border-neutral-300 py-[9px] text-center text-[14px] font-semibold text-neutral-900">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(remaining, q + 1))}
                disabled={product.trackStock && qty >= remaining}
                aria-label="Increase quantity"
                className="flex h-[40px] w-[40px] items-center justify-center text-[18px] text-neutral-600 transition-colors hover:text-neutral-900 disabled:opacity-30"
              >
                +
              </button>
            </div>
            {outOfStock ? (
              <span className="text-[13px] font-medium text-red-500">Out of stock</span>
            ) : effectiveStock < 10 && product.trackStock ? (
              <span className="text-[13px] font-medium text-amber-600">
                Only {effectiveStock} left
              </span>
            ) : (
              <span className="text-[13px] font-medium text-green-700">In stock</span>
            )}
          </div>

          {/* Jersey customizer */}
          {isJerseyProduct ? (
            <div className="mt-[20px]">
              <JerseyCustomizer
                value={personalization}
                onChange={setPersonalization}
                currency={product.currency}
                patches={activePatchLibrary}
                namePriceBDT={addOnPrices.name}
                showName={allowName}
                showNumber={allowNumber}
              />
            </div>
          ) : null}

          {/* Size Guide / Description accordions */}
          <div className="mt-[24px]">
            <AccordionRow title="Size Guide">
              <SizeChartTable chart={sizeChart} />
            </AccordionRow>
            {product.description ? (
              <AccordionRow title="Description">
                <Markdown
                  content={product.description}
                  className="text-[14px] leading-relaxed text-neutral-600"
                />
              </AccordionRow>
            ) : null}
          </div>

          {/* Short description — e.g. "The model is 6.2", weighs 80kg..." */}
          {product.shortDescription ? (
            <p className="mt-[20px] text-[15px] leading-relaxed text-neutral-800">
              {product.shortDescription}
            </p>
          ) : null}

          {/* Free shipping */}
          <div className="mt-[16px]">
            {freeThreshold === 0 || qualifiesForFree ? (
              <div className="flex items-center gap-[10px] text-[14px] font-medium text-neutral-900">
                <Truck className="h-[20px] w-[20px]" aria-hidden />
                Free Shipping
                <span
                  title={
                    freeThreshold > 0
                      ? `Free shipping on orders over ${formatPrice(freeThreshold, product.currency)}`
                      : "Free shipping on this order"
                  }
                >
                  <HelpCircle className="h-[15px] w-[15px] text-neutral-400" aria-hidden />
                </span>
              </div>
            ) : (
              <p className="flex items-center gap-[10px] text-[13px] text-neutral-600">
                <Truck className="h-[18px] w-[18px] text-neutral-500" aria-hidden />
                Add{" "}
                <span className="font-semibold text-neutral-900">
                  {formatPrice(amountToFree, product.currency)}
                </span>{" "}
                more for free shipping
              </p>
            )}
          </div>

          {/* CTAs */}
          <div ref={ctaRef} className="mt-[20px] flex flex-col gap-[12px]">
            <div className="flex items-stretch gap-[12px]">
              <button
                type="button"
                onClick={onAddToCart}
                disabled={outOfStock}
                className="h-[52px] flex-1 bg-neutral-900 text-[14px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-neutral-800 active:bg-neutral-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {outOfStock ? "Out of Stock" : "Add to Cart"}
              </button>
              <button
                type="button"
                onClick={onToggleWishlist}
                aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
                aria-pressed={inWishlist}
                className={cn(
                  "flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border transition-colors",
                  inWishlist
                    ? "border-neutral-900 text-red-500"
                    : "border-neutral-300 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900",
                )}
              >
                <Heart className={cn("h-[20px] w-[20px]", inWishlist && "fill-red-500 text-red-500")} aria-hidden />
              </button>
            </div>
            <button
              type="button"
              onClick={onBuyNow}
              disabled={outOfStock}
              className="h-[52px] w-full border border-neutral-400 bg-white text-[14px] font-medium uppercase tracking-[0.12em] text-neutral-900 transition-colors hover:border-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Buy It Now
            </button>

            {/* Trust line */}
            <p className="text-center text-[11px] text-neutral-400">
              {freeThreshold > 0
                ? `Free delivery over ${formatPrice(freeThreshold, product.currency)}`
                : "Cash on delivery"}
              {" · "}7-day returns{" · "}Secure checkout
            </p>
          </div>
        </div>
      </div>

      {/* Sentinel — hides sticky bar once user scrolls past the product grid */}
      <div ref={bottomRef} aria-hidden className="pointer-events-none h-px" />

      {/* Sticky ATC bar - shows when inline CTA scrolls out of view; hidden on lg+ (info column keeps the CTA in view) */}
      <div
        aria-hidden={!ctaEverVisible || ctaVisible || bottomPassed}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white/95 backdrop-blur-sm lg:hidden",
          "transition-transform duration-300 ease-out",
          ctaEverVisible && !ctaVisible && !bottomPassed ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mx-auto flex w-full items-center gap-2 px-2 pt-[12px]" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          {heroImage ? (
            <div className="relative h-[40px] w-[40px] shrink-0 overflow-hidden border border-neutral-200">
              <Image src={heroImage.url} alt="" fill sizes="40px" className="object-cover" />
            </div>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate text-[11px] text-neutral-500">{product.title}</p>
            <p className="text-sm font-bold text-neutral-900">{formatPrice(totalPrice, product.currency)}</p>
          </div>
          <button
            type="button"
            onClick={onAddToCart}
            disabled={outOfStock}
            className="flex h-[42px] shrink-0 items-center gap-1.5 bg-neutral-900 px-4 text-[12px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden />
            {outOfStock ? "Out of stock" : "Add to Cart"}
          </button>
        </div>
      </div>

      {/*
        Top sticky mini-bar (desktop) - the gallery's `md:sticky` keeps it in
        view while scrolling the initial fold, but once the buy block scrolls
        away entirely (reviews / related products), this persists so Add to
        Cart is always reachable. Desktop-only; the bottom bar above already
        covers mobile.
      */}
      <div
        aria-hidden={!ctaEverVisible || ctaVisible}
        style={{ top: navbarHeight }}
        className={cn(
          "fixed inset-x-0 z-30 hidden border-b border-neutral-200 bg-white/95 shadow-sm backdrop-blur-sm lg:flex",
          "transition-transform duration-300 ease-out",
          ctaEverVisible && !ctaVisible ? "translate-y-0" : "-translate-y-full",
        )}
      >
        <div className="mx-auto flex w-full items-center gap-3 py-[10px] lg:w-[82%]">
          {heroImage ? (
            <div className="relative h-[40px] w-[40px] shrink-0 overflow-hidden border border-neutral-200">
              <Image src={heroImage.url} alt="" fill sizes="40px" className="object-cover" />
            </div>
          ) : null}
          <p className="min-w-0 flex-1 truncate text-[14px] font-medium text-neutral-900">{product.title}</p>
          <span className="text-[15px] font-bold text-neutral-900">
            {formatPrice(totalPrice, product.currency)}
          </span>
          {onSale ? (
            <span className="text-[13px] text-neutral-400 line-through">
              {formatPrice(effectiveCompareAt, product.currency)}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onAddToCart}
            disabled={outOfStock}
            className="ml-2 flex h-[40px] shrink-0 items-center gap-[8px] bg-neutral-900 px-[20px] text-[13px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ShoppingCart className="h-[16px] w-[16px]" aria-hidden />
            {outOfStock ? "Out of stock" : "Add to Cart"}
          </button>
        </div>
      </div>
    </section>
  );
}
