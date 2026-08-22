"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, ShoppingCart, Tag, AlertTriangle, Truck, Lock, ChevronLeft } from "lucide-react";
import { Button, Spinner } from "@/components/ui";
import { buttonVariants } from "@/components/ui/Button";
import { useApplyCoupon, useRemoveCoupon } from "@/hooks/useCommerce";
import { usePublicSiteSettings } from "@/hooks/useSiteSettings";
import { useUnifiedCart, type UnifiedCartItem } from "@/hooks/useUnifiedCart";
import { useUIStore } from "@/store/uiStore";
import { trackBeginCheckout } from "@/lib/analytics";
import { formatPrice } from "@/lib/utils/format";
import type { AppliedCoupon, CartCouponRejectionCode, ServerCart } from "@/types/commerce";
import { startRouteProgress } from "@/components/layout";

/**
 * Unified cart UI - backed by the server cart envelope for signed-in users
 * and the Zustand local cart for anonymous browsers, via `useUnifiedCart`
 * (shared with the header CartDrawer so both always agree with each other).
 *
 * Coupon flow:
 *  - The envelope arrives with `appliedCoupon` populated when a stored
 *    `cart.couponCode` still validates. We surface the discount on the
 *    totals block and render the chip with a Remove affordance.
 *  - On apply, the backend re-runs the engine and either returns a fresh
 *    envelope (success) or a 422 with a structured `code` + `message`. The
 *    UI binds that error to the input as inline feedback and shows a toast.
 *  - On a stored code that's gone stale (`couponError`), we render a banner
 *    prompting the user to remove or pick a new code without surprising
 *    them at the checkout button.
 */

type UnifiedItem = UnifiedCartItem;

export function CartClient() {
  const router = useRouter();
  const { data: publicSettings } = usePublicSiteSettings();
  const freeThreshold = publicSettings?.delivery?.freeShippingThreshold ?? 0;
  const insideDhaka = publicSettings?.delivery?.insideDhaka ?? 80;
  const outsideDhaka = publicSettings?.delivery?.outsideDhaka ?? 130;

  const {
    items,
    subtotal,
    currency,
    isAuthed,
    isLoading: serverLoading,
    cart: serverCart,
    appliedCoupon,
    couponError,
    onQtyChange,
    onRemove,
    onClear,
  } = useUnifiedCart();

  const applyCouponServer = useApplyCoupon();
  const removeCouponServer = useRemoveCoupon();

  const toast = useUIStore((s) => s.toast);
  const [couponInput, setCouponInput] = React.useState("");
  // Field-level error from the last failed apply call. We keep this in
  // local state so it's cleared the next time the user edits the input,
  // not just when the envelope refetches.
  const [couponFormError, setCouponFormError] = React.useState<string | null>(
    null,
  );

  const discount = appliedCoupon?.discount ?? 0;
  const total = Math.max(0, subtotal - discount);

  const onApplyCoupon = () => {
    if (!isAuthed) {
      toast({
        title: "Sign in to apply coupons",
        description: "Coupons are processed at checkout.",
        tone: "info",
      });
      return;
    }
    const code = couponInput.trim();
    if (!code) return;
    setCouponFormError(null);
    applyCouponServer.mutate(code, {
      onSuccess: () => {
        toast({ title: "Coupon applied", tone: "success" });
        setCouponInput("");
      },
      onError: (e: unknown) => {
        const message = e instanceof Error ? e.message : "Could not apply coupon";
        setCouponFormError(message);
        toast({ title: "Coupon failed", description: message, tone: "error" });
      },
    });
  };

  const onRemoveCoupon = () => {
    if (!isAuthed) return;
    setCouponFormError(null);
    removeCouponServer.mutate();
  };

  const onCheckout = () => {
    if (items.length === 0) return;
    trackBeginCheckout({
      value: total,
      currency,
      items: items.reduce((s, i) => s + i.qty, 0),
    });
    startRouteProgress();
    router.push("/checkout");
  };

  if (isAuthed && serverLoading) {
    return (
      <div className="mt-3 flex h-40 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyCart />;
  }

  // Total unit count across all rows - Amazon surfaces this in both the
  // items-card footer and the summary headline ("Subtotal (N items)").
  const itemCount = items.reduce((s, i) => s + i.qty, 0);

  return (
    <>
    <div className="pb-24 sm:pb-0">
      <h1 className="text-[20px] font-semibold text-gray-900 sm:text-[24px]">Shopping cart</h1>
      <div className="mt-[16px] grid grid-cols-1 items-start gap-[16px] sm:grid-cols-[1fr_280px] lg:grid-cols-[1fr_360px]">
      <section>
        <div className="overflow-hidden rounded-[8px] border border-gray-200 bg-white shadow-sm">

          {/* Card header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-[16px] py-[12px]">
            <h2 className="text-[14px] font-semibold text-gray-900">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </h2>
            <button
              type="button"
              onClick={onClear}
              className="shrink-0 text-[13px] font-medium text-gray-500 transition-colors hover:text-red-600"
            >
              Clear all
            </button>
          </div>

          <ul className="divide-y divide-gray-100">
            {items.map((it) => (
              <li key={it.id} className="flex gap-[12px] p-[16px]">

                {/* Product image */}
                <Link
                  href={`/product/${it.slug}`}
                  className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-[8px] border border-gray-100 bg-gray-50 sm:h-[96px] sm:w-[96px]"
                >
                  {it.image ? (
                    <Image
                      src={it.image}
                      alt={it.title}
                      fill
                      sizes="(min-width: 640px) 100px, 80px"
                      className="object-cover"
                    />
                  ) : null}
                </Link>

                {/* Info */}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-[12px]">
                    <Link
                      href={`/product/${it.slug}`}
                      className="line-clamp-2 flex-1 text-[14px] font-semibold leading-snug text-gray-900 underline-offset-2 hover:text-accent hover:underline"
                    >
                      {it.title}
                    </Link>
                    <div className="shrink-0 text-right">
                      <p className="text-[15px] font-bold text-gray-900">
                        {formatPrice(it.price * it.qty, currency)}
                      </p>
                      {it.originalPrice && it.originalPrice > it.price ? (
                        <p className="text-[12px] text-gray-400 line-through">
                          {formatPrice(it.originalPrice * it.qty, currency)}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {it.options && Object.keys(it.options).length > 0 ? (
                    <p className="text-[12px] text-gray-500">
                      {Object.entries(it.options).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                    </p>
                  ) : null}

                  {/* Customization cost breakdown - shows where the extra
                      money on a personalised line comes from. */}
                  {it.addOns && it.addOns.length > 0 ? (
                    <div className="mt-[4px] flex flex-col gap-px rounded-[6px] border border-gray-200 bg-gray-50 px-[8px] py-[6px] text-[12px]">
                      <div className="flex justify-between text-gray-500">
                        <span>Base price</span>
                        <span className="tabular-nums">
                          {formatPrice(
                            it.basePrice ?? Math.max(0, it.price - it.addOns.reduce((s, a) => s + a.amount, 0)),
                            currency,
                          )}
                        </span>
                      </div>
                      {it.addOns.map((a, ai) => (
                        <div key={ai} className="flex justify-between text-gray-500">
                          <span>+ {a.label}</span>
                          <span className="tabular-nums">{formatPrice(a.amount, currency)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-gray-200 pt-px font-medium text-gray-900">
                        <span>Per item</span>
                        <span className="tabular-nums">{formatPrice(it.price, currency)}</span>
                      </div>
                    </div>
                  ) : null}

                  {it.stock !== undefined && it.stock <= 5 ? (
                    <span className="text-[12px] font-medium text-yellow-600">
                      Only {it.stock} left in stock
                    </span>
                  ) : (
                    <span className="text-[12px] font-medium text-green-600">In stock</span>
                  )}

                  {/* Qty stepper + remove - Flowbite joined stepper */}
                  <div className="mt-[8px] flex items-center gap-[12px]">
                    <div className="inline-flex h-[32px]">
                      <button
                        type="button"
                        onClick={() => onQtyChange(it, it.qty - 1)}
                        disabled={it.qty <= 1}
                        aria-label="Decrease quantity"
                        style={{ borderRadius: "8px 0 0 8px" }}
                        className="flex h-[32px] w-[32px] items-center justify-center border border-gray-300 bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="flex h-[32px] w-[40px] select-none items-center justify-center border-y border-gray-300 bg-gray-50 text-[14px] font-semibold text-gray-900">
                        {it.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onQtyChange(it, it.qty + 1)}
                        disabled={it.stock !== undefined && it.qty >= it.stock}
                        aria-label="Increase quantity"
                        style={{ borderRadius: "0 8px 8px 0" }}
                        className="flex h-[32px] w-[32px] items-center justify-center border border-gray-300 bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemove(it)}
                      aria-label={`Remove ${it.title}`}
                      className="inline-flex items-center gap-[4px] text-[13px] font-medium text-gray-500 transition-colors hover:text-red-600"
                    >
                      <Trash2 className="h-[14px] w-[14px]" aria-hidden />
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Footer */}
          <div className="flex items-center justify-between gap-[12px] border-t border-gray-100 px-[16px] py-[12px]">
            <Link
              href="/all-products"
              className="flex shrink-0 items-center gap-[4px] whitespace-nowrap text-[13px] font-medium text-gray-500 transition-colors hover:text-accent"
            >
              <ChevronLeft className="h-[16px] w-[16px]" aria-hidden />
              Continue shopping
            </Link>
            <p className="shrink-0 whitespace-nowrap text-[14px] text-gray-500">
              Subtotal:{" "}
              <span className="font-bold text-gray-900">{formatPrice(subtotal, currency)}</span>
            </p>
          </div>
        </div>
      </section>

      <Summary
        cart={isAuthed ? serverCart ?? null : null}
        appliedCoupon={appliedCoupon}
        couponError={couponError}
        couponFormError={couponFormError}
        subtotal={subtotal}
        discount={discount}
        total={total}
        currency={currency}
        itemCount={itemCount}
        freeThreshold={freeThreshold}
        insideDhaka={insideDhaka}
        outsideDhaka={outsideDhaka}
        couponInput={couponInput}
        onCouponInputChange={(v) => {
          setCouponInput(v);
          if (couponFormError) setCouponFormError(null);
        }}
        onApplyCoupon={onApplyCoupon}
        onRemoveCoupon={onRemoveCoupon}
        onCheckout={onCheckout}
        applyingCoupon={applyCouponServer.isPending}
        removingCoupon={removeCouponServer.isPending}
        isAuthed={isAuthed}
      />
      </div>
    </div>

    {/* Mobile sticky checkout bar */}
    <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center gap-[12px] border-t border-gray-200 bg-white px-[16px] pt-[12px] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] sm:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-gray-500">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </p>
        <p className="text-[16px] font-bold text-gray-900">{formatPrice(total, currency)}</p>
      </div>
      <Button variant="accent" onClick={onCheckout} size="md" className="shrink-0 rounded-[8px]">
        <ShoppingCart className="h-[16px] w-[16px]" aria-hidden />
        <span className="ml-1.5">Checkout</span>
      </Button>
    </div>
    </>
  );
}

/* ───────────── Order summary side card ───────────── */

interface SummaryProps {
  cart: ServerCart | null;
  appliedCoupon: AppliedCoupon | null;
  couponError: { code: CartCouponRejectionCode; message: string } | null;
  couponFormError: string | null;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  itemCount: number;
  freeThreshold: number;
  insideDhaka: number;
  outsideDhaka: number;
  couponInput: string;
  onCouponInputChange: (v: string) => void;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
  onCheckout: () => void;
  applyingCoupon: boolean;
  removingCoupon: boolean;
  isAuthed: boolean;
}

function Summary({
  cart,
  appliedCoupon,
  couponError,
  couponFormError,
  subtotal,
  discount,
  total,
  currency,
  itemCount,
  freeThreshold,
  insideDhaka,
  outsideDhaka,
  couponInput,
  onCouponInputChange,
  onApplyCoupon,
  onRemoveCoupon,
  onCheckout,
  applyingCoupon,
  removingCoupon,
  isAuthed,
}: SummaryProps) {
  const isFree = freeThreshold > 0 && subtotal >= freeThreshold;
  const amountToFree = freeThreshold > 0 ? Math.max(0, freeThreshold - subtotal) : 0;
  const progressPct = freeThreshold > 0 ? Math.min(100, (subtotal / freeThreshold) * 100) : 0;
  // A stored code can be in three states from the buyer's POV:
  //  - applied + valid     → appliedCoupon !== null
  //  - applied + stale     → cart.couponCode set, appliedCoupon null, couponError set
  //  - not applied         → cart.couponCode falsy, appliedCoupon null
  const hasStaleCode =
    !!cart?.couponCode && !appliedCoupon && !!couponError;

  return (
    <aside className="self-start overflow-hidden rounded-[8px] border border-gray-200 bg-white shadow-sm sm:sticky sm:top-20">

      {/* ── CTA + price ── */}
      <div className="p-[16px]">
        <h2 className="text-[16px] font-semibold text-gray-900">Order summary</h2>
        <div className="mb-[16px] mt-[8px] flex items-baseline justify-between">
          <p className="text-[14px] text-gray-500">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </p>
          <p className="text-[20px] font-bold text-gray-900">{formatPrice(total, currency)}</p>
        </div>

        <Button variant="accent" onClick={onCheckout} size="md" fullWidth className="rounded-[8px]">
          <ShoppingCart className="h-[16px] w-[16px]" aria-hidden />
          <span className="ml-1.5">Proceed to Checkout</span>
        </Button>

        <div className="mt-[12px] flex items-center justify-center gap-[6px] text-[12px] text-gray-400">
          <Lock className="h-[12px] w-[12px]" aria-hidden />
          Secure &amp; encrypted checkout
        </div>

        {!isAuthed ? (
          <p className="mt-[8px] text-center text-[13px] text-gray-500">
            <Link
              href="/login?next=/checkout"
              className="font-semibold text-gray-900 underline underline-offset-2 hover:opacity-70"
            >
              Sign in
            </Link>{" "}
            for a faster checkout
          </p>
        ) : null}
      </div>

      {/* ── Free delivery progress ── */}
      {freeThreshold > 0 ? (
        <div className="border-t border-gray-100 px-[16px] py-[12px]">
          <div className="mb-[10px] flex items-center justify-between gap-[8px] text-[12px]">
            <span className="flex items-center gap-[6px] font-medium text-gray-600">
              <Truck className="h-[14px] w-[14px] shrink-0 text-gray-400" aria-hidden />
              {isFree ? (
                <span className="font-semibold text-green-600">Free delivery unlocked!</span>
              ) : (
                <span>
                  Add{" "}
                  <span className="font-semibold text-gray-900">
                    {formatPrice(amountToFree, currency)}
                  </span>{" "}
                  more for free delivery
                </span>
              )}
            </span>
            <span className="shrink-0 text-gray-400">{formatPrice(freeThreshold, currency)}</span>
          </div>
          <div className="h-[6px] w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isFree ? "bg-green-500" : "bg-accent"}`}
              style={{ width: `${progressPct}%` }}
              role="progressbar"
              aria-valuenow={Math.round(progressPct)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      ) : null}

      {/* ── Price breakdown ── */}
      <div className="border-t border-gray-100 px-[16px] py-[16px]">
        <div className="flex flex-col gap-[10px] text-[14px]">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium text-gray-900">{formatPrice(subtotal, currency)}</span>
          </div>
          {appliedCoupon ? (
            <div className="flex justify-between">
              <span className="text-gray-500">Discount</span>
              <span className="font-medium text-green-600">
                −{formatPrice(discount, currency)}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-gray-500">Shipping</span>
            {isFree ? (
              <span className="font-semibold text-green-600">Free</span>
            ) : freeThreshold > 0 ? (
              <span className="text-gray-400">
                {formatPrice(insideDhaka, currency)}–{formatPrice(outsideDhaka, currency)}
              </span>
            ) : (
              <span className="text-gray-400">Calculated at checkout</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Coupon ── */}
      <div className="border-t border-gray-100 px-[16px] py-[12px]">
        {isAuthed && appliedCoupon ? (
          <div className="flex items-center justify-between rounded-[8px] border border-green-200 bg-green-50 px-[12px] py-[10px]">
            <span className="flex items-center gap-[8px] text-[14px]">
              <Tag className="h-[14px] w-[14px] text-green-600" aria-hidden />
              <span className="font-bold text-green-800">{appliedCoupon.code}</span>
              <span className="text-[12px] text-green-600">
                {appliedCoupon.type === "percent"
                  ? `${appliedCoupon.value}% off`
                  : `${formatPrice(appliedCoupon.value, currency)} off`}
              </span>
            </span>
            <button
              type="button"
              onClick={onRemoveCoupon}
              disabled={removingCoupon}
              className="text-[13px] font-medium text-gray-500 transition-colors hover:text-red-600 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-[8px] overflow-hidden rounded-[8px] border border-gray-300 bg-gray-50 px-[12px] py-[8px] transition-colors focus-within:border-accent focus-within:bg-white">
              <Tag className="h-[16px] w-[16px] shrink-0 text-gray-400" aria-hidden />
              <input
                value={couponInput}
                onChange={(e) => onCouponInputChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onApplyCoupon()}
                placeholder="Enter coupon code"
                aria-label="Coupon code"
                aria-invalid={!!couponFormError || undefined}
                className="min-w-0 flex-1 bg-transparent text-[14px] text-gray-900 outline-none placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={onApplyCoupon}
                disabled={applyingCoupon || !couponInput.trim()}
                className="shrink-0 text-[13px] font-semibold text-accent transition-colors hover:opacity-70 disabled:text-gray-300"
              >
                {applyingCoupon ? "…" : "Apply"}
              </button>
            </div>
            {couponFormError ? (
              <p className="mt-[6px] text-[12px] text-red-600" role="alert">
                {couponFormError}
              </p>
            ) : null}
          </>
        )}

        {hasStaleCode ? (
          <div className="mt-[10px] flex items-start gap-[8px] rounded-[8px] border border-yellow-200 bg-yellow-50 p-[12px] text-[12px]">
            <AlertTriangle className="mt-[2px] h-[14px] w-[14px] shrink-0 text-yellow-500" aria-hidden />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">
                Coupon &ldquo;{cart?.couponCode}&rdquo; no longer applies
              </p>
              <p className="mt-[2px] text-gray-500">{couponError?.message}</p>
            </div>
            <button
              type="button"
              onClick={onRemoveCoupon}
              disabled={removingCoupon}
              className="text-xs underline-offset-2 hover:underline disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        ) : null}
      </div>

      {/* ── Total ── */}
      <div className="flex items-center justify-between border-t border-gray-200 px-[16px] py-[12px]">
        <span className="text-[16px] font-bold text-gray-900">Total</span>
        <div className="text-right">
          <p className="text-[18px] font-bold text-gray-900">{formatPrice(total, currency)}</p>
          <p className="text-[11px] text-gray-400">Incl. all taxes</p>
        </div>
      </div>
    </aside>
  );
}

/* ───────────── Empty state ───────────── */

function EmptyCart() {
  return (
    <div className="mt-[24px] flex flex-col items-center gap-[12px] rounded-[8px] border border-gray-200 bg-white px-[24px] py-[56px] text-center shadow-sm">
      <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-gray-100">
        <ShoppingCart className="h-[24px] w-[24px] text-gray-400" aria-hidden />
      </div>
      <div>
        <p className="text-[16px] font-semibold text-gray-900">Your cart is empty</p>
        <p className="mt-[4px] text-[14px] text-gray-500">
          Looks like you haven&apos;t added anything yet.
        </p>
      </div>
      <Link
        href="/all-products"
        className={buttonVariants({ variant: "accent", size: "md", className: "mt-[4px] rounded-[8px]" })}
      >
        Start shopping
      </Link>
    </div>
  );
}
