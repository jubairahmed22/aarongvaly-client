"use client";

import * as React from "react";
import { ProductRail, type RailItem } from "./ProductRail";

/**
 * "Recently viewed products" rail, as on the reference site. The PDP records
 * each visit into localStorage (see ProductDetailClient); this reads the list
 * back and renders every product except the one currently open. Renders
 * nothing on a first visit or when storage is unavailable.
 */

export const RECENTLY_VIEWED_KEY = "recentlyViewed";

export interface RecentlyViewedProps {
  /** Slug of the product currently open — excluded from the rail. */
  currentSlug: string;
  className?: string;
}

export function RecentlyViewed({ currentSlug, className }: RecentlyViewedProps) {
  const [items, setItems] = React.useState<RailItem[]>([]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
      const list: RailItem[] = raw ? JSON.parse(raw) : [];
      setItems(
        list.filter((i) => i && i.slug && i.slug !== currentSlug && i.title && i.image),
      );
    } catch {
      // private mode / corrupted entry — just skip the section
    }
  }, [currentSlug]);

  if (items.length === 0) return null;
  return <ProductRail title="Recently Viewed Products" items={items} className={className} />;
}
