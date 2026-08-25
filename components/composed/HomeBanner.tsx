"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface HomeBannerSlide {
  key: string;
  image: string;
  /** Omit for a non-interactive slide (the admin form's live preview, or a banner with no link yet). */
  href?: string;
}

export interface HomeBannerProps {
  slides: HomeBannerSlide[];
  /** Override auto-advance interval in ms. Pass 0 to disable. Default 5000. */
  autoplayMs?: number;
  /** Set on the admin preview so it never claims the page's LCP image. */
  eager?: boolean;
  className?: string;
}

const SWIPE_THRESHOLD = 48;

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/**
 * Homepage hero banner - one full-width carousel sitting directly under the
 * navbar, admin-managed at /admin/offers. Replaced the older pair of
 * side-by-side promo cards.
 *
 * Each slide is just an uploaded image + a link; the whole slide is the click
 * target and no separate CTA is drawn, because any copy lives inside the
 * artwork itself.
 *
 * Because it sits at the top of the page the first slide is almost always the
 * LCP element, so it loads eagerly at high priority while the rest stay lazy.
 * Autoplay stops whenever it cannot be seen - pointer over it, keyboard focus
 * inside it, scrolled out of view, tab in the background - and never starts at
 * all for a visitor who asked for reduced motion.
 */
export function HomeBanner({ slides, autoplayMs = 5000, eager = true, className }: HomeBannerProps) {
  const count = slides.length;

  const [index, setIndex] = React.useState(0);
  const [hovered, setHovered] = React.useState(false);
  const [visible, setVisible] = React.useState(true);
  const [drag, setDrag] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(false);

  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const dragStartX = React.useRef<number | null>(null);

  const go = React.useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );

  // Clamp if slides shrink underneath us (the admin preview re-renders live).
  React.useEffect(() => {
    if (count > 0 && index >= count) setIndex(0);
  }, [count, index]);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Pause while scrolled out of view or while the tab is backgrounded - an
  // unseen carousel should not be burning timers or decoding images.
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(!!entry?.isIntersecting), {
      threshold: 0.25,
    });
    io.observe(el);
    const onVisibility = () => setVisible(!document.hidden && !!el.isConnected);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const paused = hovered || !visible || dragging;

  React.useEffect(() => {
    if (count <= 1 || autoplayMs <= 0 || paused || reducedMotion) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % count), autoplayMs);
    return () => window.clearTimeout(id);
  }, [count, autoplayMs, paused, reducedMotion, index]);

  if (count === 0) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    if (count <= 1) return;
    dragStartX.current = e.touches[0]?.clientX ?? null;
    setDragging(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (dragStartX.current === null) return;
    setDrag((e.touches[0]?.clientX ?? 0) - dragStartX.current);
  };
  const onTouchEnd = () => {
    if (dragStartX.current !== null && Math.abs(drag) > SWIPE_THRESHOLD) {
      go(index + (drag > 0 ? -1 : 1));
    }
    dragStartX.current = null;
    setDragging(false);
    setDrag(0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (count <= 1) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(index + 1);
    }
  };

  return (
    <section
      className={cn("bg-paper", className)}
      aria-label="Featured banners"
      aria-roledescription="carousel"
    >
      {/* Full-bleed at every breakpoint - edge to edge, square corners, flush
          against the nav above it. This is the storefront's cover image, so it
          gets no gutters and no rounding at all.

          16:9 at every width, deliberately: campaign artwork is cut from 16:9
          video and carries baked-in copy (season title, caption, logo) near
          its edges, so any breakpoint-specific crop slices the wording off.
          Holding one ratio shows every upload exactly as it was designed. */}
      <div className="w-full">
        <div
          ref={rootRef}
          className="group/banner relative aspect-[16/9] w-full overflow-hidden bg-neutral-100"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setHovered(true)}
          onBlurCapture={() => setHovered(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onKeyDown={onKeyDown}
          tabIndex={count > 1 ? 0 : -1}
          role="group"
        >
          <div
            className={cn("flex h-full w-full", !reducedMotion && "transition-transform duration-500 ease-out")}
            style={{
              transform: `translate3d(calc(${-index * 100}% + ${drag}px), 0, 0)`,
              transitionDuration: dragging ? "0ms" : undefined,
            }}
          >
            {slides.map((slide, i) => (
              <BannerSlide
                key={slide.key}
                slide={slide}
                label={`${i + 1} of ${count}`}
                hidden={i !== index}
                priority={eager && i === 0}
              />
            ))}
          </div>

          {count > 1 ? (
            <>
              <ArrowButton side="left" onClick={() => go(index - 1)} />
              <ArrowButton side="right" onClick={() => go(index + 1)} />

              <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5 lg:bottom-6">
                {slides.map((slide, i) => (
                  <button
                    key={slide.key}
                    type="button"
                    aria-label={`Go to banner ${i + 1}`}
                    aria-current={i === index ? "true" : undefined}
                    onClick={() => go(i)}
                    className={cn(
                      "h-1.5 rounded-full shadow-sm transition-all duration-200 ease-out",
                      i === index ? "w-6 bg-white" : "w-1.5 bg-white/60 hover:bg-white/90",
                    )}
                  />
                ))}
              </div>
            </>
          ) : null}

          <span className="sr-only" aria-live="polite">
            Banner {index + 1} of {count}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────── Arrow ───────────────────── */

function ArrowButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous banner" : "Next banner"}
      // Pointer-only: touch users swipe, and on a phone the arrows would cover
      // the artwork. Always visible rather than hover-revealed, so it reads as
      // a carousel before anyone moves the mouse.
      className={cn(
        "absolute top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full lg:flex",
        "h-10 w-10 border border-black/5 bg-white/80 text-ink shadow-sm backdrop-blur-sm",
        "transition-colors duration-200 hover:bg-white",
        side === "left" ? "left-4" : "right-4",
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}

/* ───────────────────── Slide ───────────────────── */

function BannerSlide({
  slide,
  label,
  hidden,
  priority,
}: {
  slide: HomeBannerSlide;
  label: string;
  hidden: boolean;
  priority: boolean;
}) {
  const className = "relative h-full w-full shrink-0 grow-0 basis-full";

  const body = (
    // Next's optimizer is disabled project-wide (see next.config.mjs), so a
    // plain <img> renders identically to next/image without the extra wrapper.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={slide.image}
      alt=""
      className="h-full w-full object-cover"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding={priority ? "sync" : "async"}
      draggable={false}
    />
  );

  // Slides scrolled out of the viewport are hidden from the a11y tree and from
  // tab order so a keyboard user isn't sent to a link they cannot see.
  const shared = { className, "aria-hidden": hidden || undefined, "aria-roledescription": "slide", "aria-label": label };

  if (!slide.href) return <div {...shared}>{body}</div>;

  if (isExternal(slide.href)) {
    return (
      <a {...shared} href={slide.href} target="_blank" rel="noopener noreferrer" tabIndex={hidden ? -1 : undefined}>
        {body}
      </a>
    );
  }

  return (
    <Link {...shared} href={slide.href} tabIndex={hidden ? -1 : undefined}>
      {body}
    </Link>
  );
}
