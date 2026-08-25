"use client";

import * as React from "react";
import { OfferBannerCarousel } from "@/components/composed";
import { MobileHeaderBar } from "./MobileHeaderBar";
import type { CategoryNode } from "./Navbar/CategoryMenu";
import type { OfferBanner } from "@/types/offer";

export interface MobileHomeHeaderProps {
  /**
   * Accepted for source compatibility with app/page.tsx, which still passes
   * it. The department tab strip this used to drive is gone (departments now
   * live in the hamburger's MobileMenu), so nothing here reads it.
   */
  categories?: CategoryNode[];
  /** Homepage offer banners, rendered full-bleed under the header. */
  banners?: OfferBanner[];
}

/**
 * Home page mobile header (below lg): the shared {@link MobileHeaderBar},
 * pinned, with the homepage offer banner running full-bleed beneath it.
 *
 * This used to be a Zepto-style lavender block - hamburger + logo + a
 * profile/wishlist/cart cluster, then a sticky inline search field and a
 * horizontally scrolling department tab strip, then a rounded banner card.
 * All of it is gone: search is now the magnifier in the bar (it opens the
 * full-width SearchOverlay) and departments are in the hamburger menu, so
 * the home page opens on the campaign image the way the rest of the
 * storefront's design intends.
 *
 * The standard Navbar's own mobile bar is suppressed here via its
 * `hideMobileHeader` prop; MobileMenu and CartDrawer stay mounted there, so
 * the hamburger and bag in this bar still have something to open.
 */
export function MobileHomeHeader({ banners = [] }: MobileHomeHeaderProps) {
  const hasBanner = banners.some((b) => b.isActive);

  return (
    <>
      <div className="sticky top-0 z-40 lg:hidden">
        <MobileHeaderBar />
      </div>

      {hasBanner ? (
        <div className="lg:hidden">
          <OfferBannerCarousel banners={banners} aspectClassName="aspect-[4/5] xs:aspect-[3/4]" />
        </div>
      ) : null}
    </>
  );
}
