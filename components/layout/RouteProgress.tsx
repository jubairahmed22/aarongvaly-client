"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * YouTube-style top loading bar for route transitions.
 *
 * Next's App Router gives us no router events, so start and finish are
 * detected separately:
 *
 *  - START  — a left-click on any same-origin `<a>` (every `<Link>` renders
 *             one), a browser back/forward (`popstate`), or an explicit
 *             `startRouteProgress()` call for programmatic `router.push`.
 *             Measured on this app: a click leads the committed navigation by
 *             ~200ms locally and far more over a real network, which is
 *             exactly the gap this bar fills.
 *  - FINISH — `usePathname()` / `useSearchParams()` changing, i.e. the new
 *             route actually rendered.
 *
 * `history.pushState` is deliberately NOT used as the start signal: it fires
 * ~9ms before the DOM commits (i.e. at the END of the navigation), so a bar
 * driven by it would never be seen.
 *
 * While pending, the bar eases toward 90% and parks there - it never implies
 * completion it can't verify. A watchdog retires it if a click turns out not
 * to navigate at all (a dropdown trigger, a blocked route), so it can never
 * get stuck on screen.
 */

const START_EVENT = "aarongvaly:route-progress-start";

/** Trigger the bar for a programmatic navigation (`router.push`/`replace`). */
export function startRouteProgress(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(START_EVENT));
}

/** Give up and hide the bar if a "navigation" never commits. */
const STUCK_TIMEOUT_MS = 8000;
/** How far the bar creeps while waiting - never 100 until the route lands. */
const CEILING = 90;

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  const [value, setValue] = React.useState(0);
  const [visible, setVisible] = React.useState(false);

  const creepRef = React.useRef<number | null>(null);
  const hideRef = React.useRef<number | null>(null);
  const stuckRef = React.useRef<number | null>(null);
  const activeRef = React.useRef(false);
  /** The route currently on screen, as `pathname + search` (no hash). */
  const currentRouteRef = React.useRef("");

  const clearTimers = React.useCallback(() => {
    if (creepRef.current !== null) window.clearInterval(creepRef.current);
    if (hideRef.current !== null) window.clearTimeout(hideRef.current);
    if (stuckRef.current !== null) window.clearTimeout(stuckRef.current);
    creepRef.current = hideRef.current = stuckRef.current = null;
  }, []);

  const finish = React.useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    clearTimers();
    setValue(100);
    // Hold the full bar briefly so the completion reads as intentional,
    // then fade out and reset for the next navigation.
    hideRef.current = window.setTimeout(() => {
      setVisible(false);
      hideRef.current = window.setTimeout(() => setValue(0), 220);
    }, 180);
  }, [clearTimers]);

  const start = React.useCallback(() => {
    if (activeRef.current) return; // already running - don't restart
    activeRef.current = true;
    clearTimers();
    setValue(12);
    setVisible(true);

    // Decelerating creep: fast at first, crawling as it nears the ceiling, so
    // a slow route still looks alive without ever pretending to be done.
    creepRef.current = window.setInterval(() => {
      setValue((v) => (v >= CEILING ? v : v + Math.max(0.4, (CEILING - v) * 0.06)));
    }, 120);

    stuckRef.current = window.setTimeout(finish, STUCK_TIMEOUT_MS);
  }, [clearTimers, finish]);

  /* ── Finish when the new route has actually rendered ── */
  const firstRender = React.useRef(true);
  React.useEffect(() => {
    // Track the committed URL so popstate can tell a real route change from a
    // hash jump (which fires popstate but never re-renders a route).
    currentRouteRef.current = window.location.pathname + window.location.search;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    finish();
  }, [routeKey, finish]);

  /* ── Start signals ── */
  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Left button only, no modifier (those open a new tab/window and leave
      // this document exactly where it is).
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as Element | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || anchor.hasAttribute("download")) return;

      const anchorTarget = anchor.getAttribute("target");
      if (anchorTarget && anchorTarget !== "_self") return;

      let url: URL;
      try {
        url = new URL((anchor as HTMLAnchorElement).href, window.location.href);
      } catch {
        return; // mailto:, tel:, javascript: - not a route change
      }
      if (url.origin !== window.location.origin) return;

      // Same route (including hash-only jumps) never re-renders a page, so a
      // bar started here would only ever be cleaned up by the watchdog.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      start();
    };

    // Back/forward needs two guards, both checked one macrotask after
    // popstate. Verified event order in Chrome: popstate → hashchange →
    // setTimeout(0), so by then we know which case this is.
    //
    //  - An in-page hash jump also fires popstate. It changes no route, so
    //    nothing would ever finish a bar started for it.
    //  - Next flushes a *cached* back/forward synchronously inside its own
    //    popstate listener (which is registered before ours), so the route
    //    can already be committed by the time we look. There is no pending
    //    work left to show, and starting then would strand the bar.
    let sawHashChange = false;
    const onHashChange = () => {
      sawHashChange = true;
    };
    const onPopState = () => {
      sawHashChange = false;
      window.setTimeout(() => {
        if (sawHashChange) return;
        const next = window.location.pathname + window.location.search;
        if (next === currentRouteRef.current) return; // already rendered
        start();
      }, 0);
    };
    const onManualStart = () => start();

    // Capture phase: run before Link's own handler calls preventDefault.
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener(START_EVENT, onManualStart);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener(START_EVENT, onManualStart);
    };
  }, [start]);

  React.useEffect(() => clearTimers, [clearTimers]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px]"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms ease-out" }}
    >
      <div
        className="h-full bg-ink"
        style={{
          width: `${value}%`,
          transition: "width 180ms ease-out",
        }}
      />
    </div>
  );
}
