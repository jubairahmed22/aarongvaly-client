"use client";

/**
 * Homepage banner editor - manages the single full-width carousel that sits
 * directly under the navbar (see components/composed/HomeBanner.tsx). Lives at
 * the top of /admin/offers, right after HomeCategoryShowcaseSection.
 *
 * Replaced the older two-column editor for the side-by-side promo pair; the
 * homepage now shows one banner, so this is one ordered list.
 *
 * Each slide is just an uploaded image + a link - no title/subtitle/CTA text
 * fields, since the whole banner is the click target and any copy lives inside
 * the uploaded artwork itself. The full list is submitted on every Save (same
 * contract as the offer banner carousel).
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
import { ImageUploader, HomeBanner, type HomeBannerSlide } from "@/components/composed";
import { useUIStore } from "@/store/uiStore";
import { useAdminSiteSettings, useUpdateSiteSettings } from "@/hooks/useSiteSettings";
import { uploadsApi } from "@/lib/api/uploads";
import { AdminError } from "@/lib/api/admin";
import type { SiteSettingsHomeBannerSlide } from "@/types/siteSettings";
import type { UploadedImage } from "@/types/uploads";
import { cn } from "@/lib/utils/cn";

const MAX_SLIDES = 8;

/** Desktop renders the banner at 3:1 inside the 82% column; this is that box at 2x. */
const RECOMMENDED_SIZE = "1920 × 640px";

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

function seed(items: SiteSettingsHomeBannerSlide[] | undefined): SlideDraft[] {
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

export function HomeBannerSection() {
  const { data: settings, isLoading, isError, error, refetch } = useAdminSiteSettings();
  const update = useUpdateSiteSettings();
  const toast = useUIStore((s) => s.toast);

  const [slides, setSlides] = React.useState<SlideDraft[]>([]);
  const [hydrated, setHydrated] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [attemptedSave, setAttemptedSave] = React.useState(false);
  const [dragKey, setDragKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (hydrated || !settings) return;
    setSlides(seed(settings.homeBanner));
    setHydrated(true);
  }, [hydrated, settings]);

  function mutate(next: SlideDraft[]) {
    setSlides(next);
    setDirty(true);
  }

  function addSlide() {
    if (slides.length >= MAX_SLIDES) return;
    mutate([...slides, { key: nextLocalId(), image: "", imagePublicId: "", href: "", isActive: true }]);
  }

  function updateSlide(key: string, patch: Partial<SlideDraft>) {
    mutate(slides.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function removeSlide(key: string) {
    const target = slides.find((s) => s.key === key);
    mutate(slides.filter((s) => s.key !== key));
    if (target?.imagePublicId) {
      uploadsApi.destroy(target.imagePublicId).catch(() => {
        /* best-effort - the slide is gone from the list either way */
      });
    }
  }

  function reorder(fromKey: string, toKey: string) {
    if (fromKey === toKey) return;
    const from = slides.findIndex((s) => s.key === fromKey);
    const to = slides.findIndex((s) => s.key === toKey);
    if (from < 0 || to < 0) return;
    const next = slides.slice();
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    mutate(next);
  }

  const incompleteKeys = new Set(
    slides.filter((s) => !s.image || !s.href.trim()).map((s) => s.key),
  );

  const previewSlides: HomeBannerSlide[] = slides
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
    update.mutate(
      {
        homeBanner: slides.map((s) => ({
          _id: s._id,
          image: s.image,
          imagePublicId: s.imagePublicId || undefined,
          href: s.href.trim(),
          isActive: s.isActive,
        })),
      },
      {
        onSuccess: () => {
          setDirty(false);
          setAttemptedSave(false);
          toast({ title: "Homepage banner saved", tone: "success" });
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
        <p className="text-[14px] text-gray-500">
          {error instanceof AdminError ? error.message : "Couldn't load the homepage banner."}
        </p>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
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
            <h2 className="text-[18px] font-semibold text-gray-900">Homepage banner</h2>
            <p className="mt-[2px] max-w-[60ch] text-[14px] text-gray-500">
              The full-width banner shown directly under the navbar. Add up to {MAX_SLIDES} slides and it
              rotates automatically; add one and it sits there as a static banner. Upload the artwork at{" "}
              <strong className="font-medium text-gray-700">{RECOMMENDED_SIZE}</strong> and set where it links
              to - the whole banner is clickable, so no separate button is drawn.
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
          {previewSlides.length > 0 ? (
            <div className="flex flex-col gap-[6px]">
              <span className="text-[12px] font-medium uppercase tracking-wide text-gray-400">
                Live preview
              </span>
              <div className="overflow-hidden rounded-[8px] border border-gray-200">
                <HomeBanner slides={previewSlides} eager={false} />
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-gray-700">Slides</span>
              <span className="text-[12px] text-gray-400">
                {slides.length}/{MAX_SLIDES}
              </span>
            </div>

            {slides.length === 0 ? (
              <p className="rounded-[8px] border border-dashed border-gray-300 bg-white py-[20px] text-center text-[13px] text-gray-500">
                No banner yet. Add one to show it under the navbar.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-[8px] md:grid-cols-2 xl:grid-cols-3">
                {slides.map((slide, i) => (
                  <SlideCard
                    key={slide.key}
                    slide={slide}
                    index={i}
                    showErrors={attemptedSave && incompleteKeys.has(slide.key)}
                    isDragTarget={dragKey === slide.key}
                    disabled={update.isPending}
                    onChange={(patch) => updateSlide(slide.key, patch)}
                    onRemove={() => removeSlide(slide.key)}
                    onDragStart={() => setDragKey(slide.key)}
                    onDragEnd={() => setDragKey(null)}
                    onDropOnto={() => {
                      if (dragKey === null) return;
                      reorder(dragKey, slide.key);
                      setDragKey(null);
                    }}
                  />
                ))}
              </div>
            )}

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={addSlide}
              disabled={update.isPending || slides.length >= MAX_SLIDES}
            >
              <Plus className="h-[14px] w-[14px]" aria-hidden />
              Add banner
            </Button>
          </div>
        </>
      )}
    </section>
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
        <Label htmlFor={`hb-href-${slide.key}`} className="text-[12px] font-medium text-gray-500">
          Link
        </Label>
        <Input
          id={`hb-href-${slide.key}`}
          value={slide.href}
          onChange={(e) => onChange({ href: e.target.value })}
          placeholder="/category/electronics or https://example.com"
          disabled={disabled}
          invalid={missingHref}
        />
        {missingHref ? (
          <span className="text-[12px] text-red-600">A link is required - the whole banner is clickable.</span>
        ) : null}
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
          {slide.isActive ? (
            <Eye className="h-[12px] w-[12px]" aria-hidden />
          ) : (
            <EyeOff className="h-[12px] w-[12px]" aria-hidden />
          )}
          {slide.isActive ? "Visible" : "Hidden"}
        </button>

        <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={disabled} aria-label="Remove banner">
          <Trash2 className="h-[14px] w-[14px]" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
