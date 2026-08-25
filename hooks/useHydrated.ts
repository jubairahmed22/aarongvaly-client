"use client";

import * as React from "react";

/**
 * `false` during SSR and on the first client render, `true` from the first
 * effect onward.
 *
 * Guards anything read from a persisted zustand store (cart, wishlist).
 * Those stores rehydrate from localStorage synchronously, so by the time
 * React hydrates the tree the client value is already the saved one while
 * the server HTML still has the empty default - React then throws
 * "Hydration failed because the initial UI does not match".
 *
 * The subtle part: it isn't enough for a badge component to null itself out
 * internally. Any *conditional around* it (`count > 0 ? <Badge/> : null`)
 * is evaluated by the parent before mount and produces the same mismatch,
 * so the parent has to gate on this too.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => setHydrated(true), []);
  return hydrated;
}
