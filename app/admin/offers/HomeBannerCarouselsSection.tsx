"use client";

/**
 * Homepage dual banner carousel editor - manages the two independent
 * side-by-side promo carousels shown right under the category showcase
 * (see components/composed/HomeBannerCarousels.tsx). Lives at the top of
 * /admin/offers, right after HomeCategoryShowcaseSection.
 *
 * Each slide is just an uploaded image + a link - no title/subtitle/CTA
 * text fields, since the whole banner is the click target and any copy
 * lives inside the uploaded artwork itself. Left and right are independent
 * ordered lists, each submitted in full on Save (same contract as the offer
 * banner carousel).
 */

import * as React from "react";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  GripVertical,
  ImagePlay,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { ImageUploader, HomeBannerCarousels, type HomeBannerCarouselSlide } from "@/components/composed";
import { useUIStore } from "@/store/uiStore";
import { useAdminSiteSettings, useUpdateSiteSettings } from "@/hooks/useSiteSettings";
import { uploadsApi } from "@/lib/api/uploads";
import { AdminError } from "@/lib/api/admin";
import type { SiteSettingsHomeBannerCarouselItem } from "@/types/siteSettings";
import type { UploadedImage } from "@/types/uploads";
import { cn } from "@/lib/utils/cn";

const MAX_SLIDES_PER_SIDE = 8;

type Side = "left" | "right";

interface SlideDraft {
  /** Stable React key - server `_id` once persisted, a local generated id for new/unsaved slides. */
  key: string;
  _id?: string;
  image: string;
  imagePublicId: string;
  href: string;
  isActive: boolean;
}

let localIdCounter = 0;
function nextLocalId() {
  localIdCounter += 1;
  return `new-${localIdCounter}`;
}

function seedSide(items: SiteSettingsHomeBannerCarouselItem[] | undefined): SlideDraft[] {
  return (items ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      key: item._id,
      _id: item._id,
      image: item.image,
      imagePublicId: item.imagePublicId ?? "",
      href: item.href ?? "",
      isActive: item.isActive,
    }));
}

export function HomeBannerCarouselsSection() {
  const { data: settings, isLoading, isError, error, refetch } = useAdminSiteSettings();
  const update = useUpdateSiteSettings();
  const toast = useUIStore((s) => s.toast);

  const [slides, setSlides] = React.useState<Record<Side, SlideDraft[]>>({ left: [], right: [] });
  const [hydrated, setHydrated] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [attemptedSave, setAttemptedSave] = React.useState(false);
  const [dragKey, setDragKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (hydrated || !settings) return;
    setSlides({
      left: seedSide(settings.homeBannerCarousels?.left),
      right: seedSide(settings.homeBannerCarousels?.right),
    });
    setHydrated(true);
  }, [hydrated, settings]);

  function mutate(side: Side, next: SlideDraft[]) {
    setSlides((prev) => ({ ...prev, [side]: next }));
    setDirty(true);
  }

  function addSlide(side: Side) {
    if (slides[side].length >= MAX_SLIDES_PER_SIDE) return;
    mutate(side, [
      ...slides[side],
      { key: nextLocalId(), image: "", imagePublicId: "", href: "", isActive: true },
    ]);
  }

  function updateSlide(side: Side, key: string, patch: Partial<SlideDraft>) {
    mutate(side, slides[side].map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function removeSlide(side: Side, key: string) {
    const target = slides[side].find((s) => s.key === key);
    mutate(side, slides[side].filter((s) => s.key !== key));
    if (target?.imagePublicId) {
      uploadsApi.destroy(target.imagePublicId).catch(() => {
        /* best-effort - slide's gone from the list either way */
      });
    }
  }

  function reorder(side: Side, fromKey: string, toKey: string) {
    if (fromKey === toKey) return;
    const list = slides[side];
    const from = list.findIndex((s) => s.key === fromKey);
    const to = list.findIndex((s) => s.key === toKey);
    if (from < 0 || to < 0) return;
    const next = list.slice();
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    mutate(side, next);
  }

  const incompleteKeys = new Set(
    [...slides.left, ...slides.right].filter((s) => !s.image || !s.href.trim()).map((s) => s.key),
  );

  const previewSlides = (side: Side): HomeBannerCarouselSlide[] =>
    slides[side]
      .filter((s) => s.isActive && s.image)
      .map((s) => ({ key: s.key, image: s.image, href: s.href || undefined }));

  const onSave = () => {
    if (incompleteKeys.size > 0) {
      setAttemptedSave(true);
      toast({
        title: "Some banners are incomplete",
        description: "Every banner needs an image and a link before saving.",
        tone: "error",
      });
      return;
    }
    const toWire = (side: Side) =>
      slides[side].map((s) => ({
        _id: s._id,
        image: s.image,
        imagePublicId: s.imagePublicId || undefined,
        href: s.href.trim(),
        isActive: s.isActive,
      }));
    update.mutate(
      { homeBannerCarousels: { left: toWire("left"), right: toWire("right") } },
      {
        onSuccess: () => {
          setDirty(false);
          setAttemptedSave(false);
          toast({ title: "Banner carousels saved", tone: "success" });
        },
        onError: (err) =>
          toast({
            title: "Could not save",
            description: err instanceof AdminError ? err.message : undefined,
            tone: "error",
          }),
      },
    );
  };

  if (isError) {
    return (
      <section className="flex flex-col items-center gap-[12px] rounded-[8px] border border-gray-200 bg-white py-[32px] text-center shadow-sm">
        <AlertTriangle className="h-[20px] w-[20px] text-gray-400" aria-hidden />
        <p className="text-[14px] text-gray-500">{error instanceof AdminError ? error.message : "Couldn't load the banner carousels."}</p>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>Try again</Button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-[16px] rounded-[8px] border border-gray-200 bg-white p-[16px] shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-[12px]">
        <div className="flex items-start gap-[10px]">
          <span className="mt-[2px] flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[8px] bg-[#1A56DB]/10 text-[#1A56DB]">
            <ImagePlay className="h-[16px] w-[16px]" aria-hidden />
          </span>
          <div>
            <h2 className="text-[18px] font-semibold text-gray-900">Homepage banner carousels</h2>
            <p className="mt-[2px] text-[14px] text-gray-500">
              Two independent promo carousels shown side by side, right under the category showcase. Upload the
              banner art and set where it links to - the whole banner is clickable, no separate button is added.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={onSave} disabled={!dirty || update.isPending}>
          {update.isPending ? (
            <Loader2 className="h-[14px] w-[14px] animate-spin" aria-hidden />
          ) : (
            <Save className="h-[14px] w-[14px]" aria-hidden />
          )}
          Save
        </Button>
      </div>

      {isLoading ? (
        <div className="h-[160px] animate-pulse rounded-[8px] bg-gray-100" />
      ) : (
        <>
          {(previewSlides("left").length > 0 || previewSlides("right").length > 0) ? (
            <div className="flex flex-col gap-[6px]">
              <span className="text-[12px] font-medium uppercase tracking-wide text-gray-400">Live preview</span>
              <div className="overflow-hidden rounded-[8px] border border-gray-200">
                <HomeBannerCarousels left={previewSlides("left")} right={previewSlides("right")} className="border-b-0" />
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-[16px] lg:grid-cols-2">
            <SideColumn
              label="Left carousel"
              side="left"
              slides={slides.left}
              attemptedSave={attemptedSave}
              incompleteKeys={incompleteKeys}
              dragKey={dragKey}
              disabled={update.isPending}
              onAdd={() => addSlide("left")}
              onChange={(key, patch) => updateSlide("left", key, patch)}
              onRemove={(key) => removeSlide("left", key)}
              onDragKey={setDragKey}
              onReorder={(from, to) => reorder("left", from, to)}
            />
            <SideColumn
              label="Right carousel"
              side="right"
              slides={slides.right}
              attemptedSave={attemptedSave}
              incompleteKeys={incompleteKeys}
              dragKey={dragKey}
              disabled={update.isPending}
              onAdd={() => addSlide("right")}
              onChange={(key, patch) => updateSlide("right", key, patch)}
              onRemove={(key) => removeSlide("right", key)}
              onDragKey={setDragKey}
              onReorder={(from, to) => reorder("right", from, to)}
            />
          </div>
        </>
      )}
    </section>
  );
}

/* ───────────────────── Side column ───────────────────── */

interface SideColumnProps {
  label: string;
  side: Side;
  slides: SlideDraft[];
  attemptedSave: boolean;
  incompleteKeys: Set<string>;
  dragKey: string | null;
  disabled: boolean;
  onAdd: () => void;
  onChange: (key: string, patch: Partial<SlideDraft>) => void;
  onRemove: (key: string) => void;
  onDragKey: (key: string | null) => void;
  onReorder: (fromKey: string, toKey: string) => void;
}

function SideColumn({
  label,
  slides,
  attemptedSave,
  incompleteKeys,
  dragKey,
  disabled,
  onAdd,
  onChange,
  onRemove,
  onDragKey,
  onReorder,
}: SideColumnProps) {
  return (
    <div className="flex flex-col gap-[10px] rounded-[8px] border border-gray-100 bg-gray-50/50 p-[12px]">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-gray-700">{label}</span>
        <span className="text-[12px] text-gray-400">{slides.length}/{MAX_SLIDES_PER_SIDE}</span>
      </div>

      {slides.length === 0 ? (
        <p className="rounded-[8px] border border-dashed border-gray-300 bg-white py-[20px] text-center text-[13px] text-gray-500">
          No banners yet.
        </p>
      ) : (
        <div className="flex flex-col gap-[8px]">
          {slides.map((slide, i) => (
            <SlideCard
              key={slide.key}
              slide={slide}
              index={i}
              showErrors={attemptedSave && incompleteKeys.has(slide.key)}
              isDragTarget={dragKey === slide.key}
              disabled={disabled}
              onChange={(patch) => onChange(slide.key, patch)}
              onRemove={() => onRemove(slide.key)}
              onDragStart={() => onDragKey(slide.key)}
              onDragEnd={() => onDragKey(null)}
              onDropOnto={() => {
                if (dragKey === null) return;
                onReorder(dragKey, slide.key);
                onDragKey(null);
              }}
            />
          ))}
        </div>
      )}

      <Button type="button" variant="secondary" size="sm" onClick={onAdd} disabled={disabled || slides.length >= MAX_SLIDES_PER_SIDE}>
        <Plus className="h-[14px] w-[14px]" aria-hidden />
        Add banner
      </Button>
    </div>
  );
}

/* ───────────────────── Slide card ───────────────────── */

interface SlideCardProps {
  slide: SlideDraft;
  index: number;
  showErrors: boolean;
  isDragTarget: boolean;
  disabled: boolean;
  onChange: (patch: Partial<SlideDraft>) => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropOnto: () => void;
}

function SlideCard({
  slide,
  index,
  showErrors,
  isDragTarget,
  disabled,
  onChange,
  onRemove,
  onDragStart,
  onDragEnd,
  onDropOnto,
}: SlideCardProps) {
  const missingImage = showErrors && !slide.image;
  const missingHref = showErrors && !slide.href.trim();

  return (
    <div
      draggable={!disabled}
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDropOnto();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "flex flex-col gap-[8px] rounded-[8px] border bg-white p-[10px] transition-colors",
        isDragTarget ? "border-[#1A56DB] ring-1 ring-[#1A56DB]" : "border-gray-200",
        disabled && "opacity-60",
      )}
    >
      <div className="flex items-center gap-[6px] text-[12px] font-medium text-gray-400">
        <span className="cursor-grab text-gray-400 hover:text-gray-600" aria-label="Drag to reorder">
          <GripVertical className="h-[14px] w-[14px]" aria-hidden />
        </span>
        #{index + 1}
      </div>

      <ImageUploader
        scope="offer"
        max={1}
        hideAlt
        value={slide.image ? ([{ url: slide.image, publicId: slide.imagePublicId }] as UploadedImage[]) : []}
        onChange={(next: UploadedImage[]) => {
          const img = next[0];
          onChange({ image: img?.url ?? "", imagePublicId: img?.publicId ?? "" });
        }}
      />
      {missingImage ? <span className="text-[12px] text-red-600">Image is required.</span> : null}

      <div className="flex flex-col gap-[4px]">
        <Label htmlFor={`hbc-href-${slide.key}`} className="text-[12px] font-medium text-gray-500">Link</Label>
        <Input
          id={`hbc-href-${slide.key}`}
          value={slide.href}
          onChange={(e) => onChange({ href: e.target.value })}
          placeholder="/category/electronics or https://example.com"
          disabled={disabled}
          invalid={missingHref}
        />
        {missingHref ? <span className="text-[12px] text-red-600">A link is required - the whole banner is clickable.</span> : null}
      </div>

      <div className="flex items-center justify-between gap-[8px]">
        <button
          type="button"
          onClick={() => onChange({ isActive: !slide.isActive })}
          disabled={disabled}
          aria-pressed={slide.isActive}
          className={cn(
            "inline-flex items-center gap-[6px] rounded-[6px] border px-[10px] py-[6px] text-[12px] font-medium transition-colors",
            slide.isActive
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-gray-200 bg-gray-50 text-gray-500",
          )}
        >
          {slide.isActive ? <Eye className="h-[12px] w-[12px]" aria-hidden /> : <EyeOff className="h-[12px] w-[12px]" aria-hidden />}
          {slide.isActive ? "Visible" : "Hidden"}
        </button>

        <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={disabled} aria-label="Remove banner">
          <Trash2 className="h-[14px] w-[14px]" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
