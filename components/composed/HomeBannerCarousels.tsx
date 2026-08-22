"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export interface HomeBannerCarouselSlide {
  key: string;
  image: string;
  /** Omit for a non-interactive slide (used by the admin form's live preview, or a banner with no link yet). */
  href?: string;
}

export interface HomeBannerCarouselsProps {
  /** Slides for the left card. Auto-rotates independently of `right`. */
  left: HomeBannerCarouselSlide[];
  /** Slides for the right card. Auto-rotates independently of `left`. */
  right: HomeBannerCarouselSlide[];
  /** Override auto-advance interval in ms. Pass 0 to disable. Default 5000. */
  autoplayMs?: number;
  className?: string;
}

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/**
 * Homepage dual banner carousel - two independent side-by-side promo cards
 * right under the category showcase (Zepto's "ALL NEW ZEPTO EXPERIENCE" /
 * "PAAN CORNER" pair is the reference layout). Fully admin-managed at
 * /admin/offers - each slide is just an uploaded image + a link; the whole
 * slide is the click target, no separate CTA button is rendered (any copy
 * shown lives inside the banner artwork itself).
 *
 * If only one side has slides, it takes the full row instead of leaving an
 * empty gap. If neither side has slides, the section renders nothing.
 */
export function HomeBannerCarousels({ left, right, autoplayMs = 5000, className }: HomeBannerCarouselsProps) {
  if (left.length === 0 && right.length === 0) return null;
  const bothPresent = left.length > 0 && right.length > 0;

  return (
    <section className={cn("border-b border-neutral-200 bg-paper", className)} aria-label="Featured banners">
      {/* Below lg: full-bleed sliders, edge to edge (no side gutters, no
          rounding). lg+: original contained, rounded card pair. */}
      <div className="mx-auto w-full py-[12px] lg:w-[82%] lg:max-w-none lg:py-6">
        <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:gap-6">
          {left.length > 0 ? (
            <BannerColumn slides={left} autoplayMs={autoplayMs} full={!bothPresent} />
          ) : null}
          {right.length > 0 ? (
            <BannerColumn slides={right} autoplayMs={autoplayMs} full={!bothPresent} />
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────── Single carousel column ───────────────────── */

interface BannerColumnProps {
  slides: HomeBannerCarouselSlide[];
  autoplayMs: number;
  full: boolean;
}

function BannerColumn({ slides, autoplayMs, full }: BannerColumnProps) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const touchStartX = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [slides.length, index]);

  React.useEffect(() => {
    if (slides.length <= 1 || autoplayMs <= 0 || paused) return;
    const id = window.setTimeout(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, autoplayMs);
    return () => window.clearTimeout(id);
  }, [slides.length, autoplayMs, paused, index]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    setPaused(true);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current !== null && slides.length > 1) {
      const delta = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
      if (Math.abs(delta) > 40) {
        setIndex((i) => (delta > 0 ? (i - 1 + slides.length) % slides.length : (i + 1) % slides.length));
      }
    }
    touchStartX.current = null;
    setPaused(false);
  };

  return (
    <div
      className={cn(
        "relative aspect-[2/1] w-full overflow-hidden rounded-none bg-neutral-100 lg:rounded-2xl",
        full && "sm:col-span-2",
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-roledescription="carousel"
    >
      {slides.map((slide, i) => (
        <BannerSlide key={slide.key} slide={slide} active={i === index} priority={i === 0} />
      ))}

      {slides.length > 1 ? (
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
          {slides.map((slide, i) => (
            <button
              key={slide.key}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 rounded-full bg-ink/30 shadow-sm transition-all duration-200 ease-out hover:bg-ink/60",
                i === index ? "w-5 bg-ink/80" : "w-1.5",
              )}
            />
          ))}
        </div>
      ) : null}

      <span className="sr-only" aria-live="polite">
        Banner {index + 1} of {slides.length}
      </span>
    </div>
  );
}

/* ───────────────────── Slide ───────────────────── */

function BannerSlide({ slide, active, priority }: { slide: HomeBannerCarouselSlide; active: boolean; priority: boolean }) {
  const wrapperClass = cn(
    "absolute inset-0 transition-opacity duration-300 ease-out",
    active ? "opacity-100" : "pointer-events-none opacity-0",
  );

  const body = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={slide.image}
      alt=""
      className="h-full w-full object-cover"
      loading={priority ? "eager" : "lazy"}
    />
  );

  if (!slide.href) {
    return <div className={wrapperClass}>{body}</div>;
  }

  if (isExternal(slide.href)) {
    return (
      <a href={slide.href} target="_blank" rel="noopener noreferrer" className={wrapperClass}>
        {body}
      </a>
    );
  }

  return (
    <Link href={slide.href} className={wrapperClass}>
      {body}
    </Link>
  );
}
