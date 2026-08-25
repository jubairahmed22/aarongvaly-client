"use client";

/**
 * Homepage category-showcase editor - manages the "Top categories" grid that
 * renders under the homepage banner (see
 * components/composed/HomeCategoryShowcase.tsx). Since the homepage lists no
 * products, this grid is the whole of it below the banner, which makes the
 * order here the storefront's primary navigation.
 *
 * Each tile is just a category pick - top-level, sub-category, or child
 * category all work identically, since the storefront just follows the
 * category's `path`. There's no separate tile image/title to fill in: the
 * moment a category is selected, its own image and name are shown and used
 * automatically, so the tile always matches its category (edit the photo/
 * name once in Categories admin and every tile pointing at it updates). The
 * whole ordered list is submitted on Save, same contract as the offer
 * banner carousel.
 */

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  GripVertical,
  ImageOff,
  LayoutGrid,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button, Label } from "@/components/ui";
import { Select, type SelectOption, HomeCategoryShowcase, type HomeCategoryShowcaseTile } from "@/components/composed";
import { useUIStore } from "@/store/uiStore";
import { useAdminSiteSettings, useUpdateSiteSettings } from "@/hooks/useSiteSettings";
import { useCategories } from "@/hooks/useCatalog";
import { flattenCategoryTree, indexCategoryTree } from "@/lib/utils/category";
import { AdminError } from "@/lib/api/admin";
import type { HomeCategoryShowcaseCategoryRef } from "@/types/siteSettings";
import type { CategoryTreeNode } from "@/types/catalog";
import { cn } from "@/lib/utils/cn";

const MAX_TILES = 40;

interface TileDraft {
  /** Stable React key - server `_id` once persisted, a local generated id for new/unsaved tiles. */
  key: string;
  _id?: string;
  category: string;
  isActive: boolean;
}

let localIdCounter = 0;
function nextLocalId() {
  localIdCounter += 1;
  return `new-${localIdCounter}`;
}

/** Handles the dangling-ref case too - populate returns `null` for a category that's since been deleted. */
function categoryIdOf(category: HomeCategoryShowcaseCategoryRef | string | null): string {
  if (!category) return "";
  return typeof category === "string" ? category : category._id;
}

export function HomeCategoryShowcaseSection() {
  const { data: settings, isLoading, isError, error, refetch } = useAdminSiteSettings();
  const update = useUpdateSiteSettings();
  const toast = useUIStore((s) => s.toast);

  const categoriesQuery = useCategories({ shape: "tree", isActive: true });
  const flatCategories = React.useMemo<SelectOption[]>(
    () => (categoriesQuery.data ? flattenCategoryTree(categoriesQuery.data) : []),
    [categoriesQuery.data],
  );
  const categoryIndex = React.useMemo<Map<string, CategoryTreeNode>>(
    () => (categoriesQuery.data ? indexCategoryTree(categoriesQuery.data) : new Map()),
    [categoriesQuery.data],
  );

  const [tiles, setTiles] = React.useState<TileDraft[]>([]);
  const [hydrated, setHydrated] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [attemptedSave, setAttemptedSave] = React.useState(false);
  const [dragKey, setDragKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (hydrated || !settings) return;
    const seeded: TileDraft[] = (settings.homeCategoryShowcase ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((item) => ({
        key: item._id,
        _id: item._id,
        category: categoryIdOf(item.category),
        isActive: item.isActive,
      }));
    setTiles(seeded);
    setHydrated(true);
  }, [hydrated, settings]);

  function mutate(next: TileDraft[]) {
    setTiles(next);
    setDirty(true);
  }

  function addTile() {
    if (tiles.length >= MAX_TILES) return;
    mutate([...tiles, { key: nextLocalId(), category: "", isActive: true }]);
  }

  function updateTile(key: string, patch: Partial<TileDraft>) {
    mutate(tiles.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  }

  function removeTile(key: string) {
    mutate(tiles.filter((t) => t.key !== key));
  }

  function reorder(fromKey: string, toKey: string) {
    if (fromKey === toKey) return;
    const from = tiles.findIndex((t) => t.key === fromKey);
    const to = tiles.findIndex((t) => t.key === toKey);
    if (from < 0 || to < 0) return;
    const next = tiles.slice();
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    mutate(next);
  }

  const incompleteKeys = new Set(tiles.filter((t) => !t.category).map((t) => t.key));

  const previewItems: HomeCategoryShowcaseTile[] = tiles
    .filter((t) => t.isActive && t.category)
    .map((t) => {
      const cat = categoryIndex.get(t.category);
      return { key: t.key, title: cat?.name ?? "Untitled", image: cat?.image };
    });

  const onSave = () => {
    if (incompleteKeys.size > 0) {
      setAttemptedSave(true);
      toast({
        title: "Some tiles are incomplete",
        description: "Every tile needs a category picked before saving.",
        tone: "error",
      });
      return;
    }
    update.mutate(
      {
        homeCategoryShowcase: tiles.map((t) => ({
          _id: t._id,
          category: t.category,
          isActive: t.isActive,
        })),
      },
      {
        onSuccess: () => {
          setDirty(false);
          setAttemptedSave(false);
          toast({ title: "Category showcase saved", tone: "success" });
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
        <p className="text-[14px] text-gray-500">{error instanceof AdminError ? error.message : "Couldn't load the category showcase."}</p>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>Try again</Button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-[16px] rounded-[8px] border border-gray-200 bg-white p-[16px] shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-[12px]">
        <div className="flex items-start gap-[10px]">
          <span className="mt-[2px] flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[8px] bg-[#1A56DB]/10 text-[#1A56DB]">
            <LayoutGrid className="h-[16px] w-[16px]" aria-hidden />
          </span>
          <div>
            <h2 className="text-[18px] font-semibold text-gray-900">Homepage category showcase</h2>
            <p className="mt-[2px] text-[14px] text-gray-500">
              The "Top categories" grid on the homepage - four across on desktop, two on mobile. Since the
              homepage shows no products, this grid is how visitors start browsing. Pick any category,
              sub-category or child category; its own image and name are used automatically. Tiles are tall
              portraits (4:5), so category images shot upright look best. Drag the handle to reorder.
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
          {/* Live preview - mirrors the storefront grid exactly */}
          {previewItems.length > 0 ? (
            <div className="flex flex-col gap-[6px]">
              <span className="text-[12px] font-medium uppercase tracking-wide text-gray-400">Live preview</span>
              <div className="overflow-hidden rounded-[8px] border border-gray-200">
                <HomeCategoryShowcase items={previewItems} className="py-[20px]" />
              </div>
            </div>
          ) : null}

          {/* Tile cards */}
          <div className="flex flex-col gap-[10px]">
            {tiles.map((tile, i) => (
              <TileCard
                key={tile.key}
                tile={tile}
                index={i}
                category={tile.category ? categoryIndex.get(tile.category) : undefined}
                categoryOptions={flatCategories}
                categoriesLoading={categoriesQuery.isLoading}
                showErrors={attemptedSave && incompleteKeys.has(tile.key)}
                isDragTarget={dragKey === tile.key}
                disabled={update.isPending}
                onChange={(patch) => updateTile(tile.key, patch)}
                onRemove={() => removeTile(tile.key)}
                onDragStart={() => setDragKey(tile.key)}
                onDragEnd={() => setDragKey(null)}
                onDropOnto={() => {
                  if (dragKey === null) return;
                  reorder(dragKey, tile.key);
                  setDragKey(null);
                }}
              />
            ))}
          </div>

          {tiles.length === 0 ? (
            <p className="rounded-[8px] border border-dashed border-gray-300 bg-gray-50 py-[24px] text-center text-[14px] text-gray-500">
              No tiles yet. Add one below to start building the homepage category grid.
            </p>
          ) : null}

          <div>
            <Button type="button" variant="secondary" size="sm" onClick={addTile} disabled={tiles.length >= MAX_TILES}>
              <Plus className="h-[14px] w-[14px]" aria-hidden />
              Add tile
            </Button>
            {tiles.length >= MAX_TILES ? (
              <span className="ml-[8px] text-[12px] text-gray-400">Maximum {MAX_TILES} tiles reached.</span>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

/* ───────────────────── Tile card ───────────────────── */

interface TileCardProps {
  tile: TileDraft;
  index: number;
  category?: CategoryTreeNode;
  categoryOptions: SelectOption[];
  categoriesLoading: boolean;
  showErrors: boolean;
  isDragTarget: boolean;
  disabled: boolean;
  onChange: (patch: Partial<TileDraft>) => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropOnto: () => void;
}

function TileCard({
  tile,
  index,
  category,
  categoryOptions,
  categoriesLoading,
  showErrors,
  isDragTarget,
  disabled,
  onChange,
  onRemove,
  onDragStart,
  onDragEnd,
  onDropOnto,
}: TileCardProps) {
  const missingCategory = showErrors && !tile.category;

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
        "grid grid-cols-1 gap-[12px] rounded-[8px] border p-[12px] transition-colors sm:grid-cols-[auto_84px_1fr] sm:items-center",
        isDragTarget ? "border-[#1A56DB] ring-1 ring-[#1A56DB]" : "border-gray-200",
        disabled && "opacity-60",
      )}
    >
      <div className="flex items-center gap-[8px] sm:flex-col sm:items-center">
        <span className="cursor-grab text-gray-400 hover:text-gray-600" aria-label="Drag to reorder">
          <GripVertical className="h-[16px] w-[16px]" aria-hidden />
        </span>
        <span className="text-[12px] font-medium text-gray-400">#{index + 1}</span>
      </div>

      {/* Auto image - the category's own photo, read-only here. */}
      <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-gray-200 bg-gray-50">
        {category?.image ? (
          <Image src={category.image} alt={category.name} width={76} height={76} className="h-full w-full object-cover" />
        ) : (
          <ImageOff className="h-[18px] w-[18px] text-gray-300" aria-hidden />
        )}
      </div>

      <div className="flex flex-col gap-[10px]">
        <div className="flex flex-col gap-[4px]">
          <Label htmlFor={`hcs-category-${tile.key}`} className="text-[12px] font-medium text-gray-500">Category</Label>
          <Select
            id={`hcs-category-${tile.key}`}
            value={tile.category}
            onChange={(e) => onChange({ category: e.target.value })}
            disabled={disabled || categoriesLoading}
            invalid={missingCategory}
            options={
              categoriesLoading
                ? [{ value: "", label: "Loading categories…" }]
                : [{ value: "", label: "-- Pick a category --" }, ...categoryOptions]
            }
          />
          {missingCategory ? (
            <span className="text-[12px] text-red-600">Pick a category.</span>
          ) : category && !category.image ? (
            <span className="text-[12px] text-amber-600">
              "{category.name}" has no image yet - add one in{" "}
              <Link href="/admin/categories" className="underline">Categories</Link> so this tile shows a photo.
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-[8px]">
          <button
            type="button"
            onClick={() => onChange({ isActive: !tile.isActive })}
            disabled={disabled}
            aria-pressed={tile.isActive}
            className={cn(
              "inline-flex items-center gap-[6px] rounded-[6px] border px-[10px] py-[6px] text-[12px] font-medium transition-colors",
              tile.isActive
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-gray-200 bg-gray-50 text-gray-500",
            )}
          >
            {tile.isActive ? <Eye className="h-[12px] w-[12px]" aria-hidden /> : <EyeOff className="h-[12px] w-[12px]" aria-hidden />}
            {tile.isActive ? "Visible" : "Hidden"}
          </button>

          <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={disabled} aria-label="Remove tile">
            <Trash2 className="h-[14px] w-[14px]" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
