"use client";

import * as React from "react";

/** Sane fallback before the real navbar is measured, or if it's ever missing from the DOM. */
const FALLBACK_HEIGHT = 80;

/**
 * Measures the sticky `<header id="site-navbar">`'s actual rendered height
 * so anything that needs to sit flush beneath it (a second sticky bar, a
 * jump-nav, a mini cart strip) can position itself with the real number
 * instead of guessing fixed per-breakpoint pixel values - those guesses
 * drift out of sync the moment the navbar's own content wraps differently
 * (search bar width, category row overflow, a longer company name, etc.)
 * and the dependent element ends up clipped behind the navbar.
 *
 * Re-measures on resize and whenever the navbar's own box changes (via
 * ResizeObserver), so it stays correct across breakpoints and content
 * changes without any hardcoded numbers.
 */
export function useNavbarHeight(): number {
  const [height, setHeight] = React.useState(FALLBACK_HEIGHT);

  React.useEffect(() => {
    const el = document.getElementById("site-navbar");
    if (!el) return;

    const update = () => setHeight(el.getBoundingClientRect().height);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return height;
}
