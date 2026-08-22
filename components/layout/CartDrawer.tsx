"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  FileText,
  Lock,
  Minus,
  Plus,
  ShoppingCart,
  Tag,
  Trash2,
} from "lucide-react";
import { Drawer } from "@/components/complex";
import { Spinner } from "@/components/ui";
import { buttonVariants } from "@/components/ui/Button";
import { useUIStore } from "@/store/uiStore";
import { useUnifiedCart, type UnifiedCartItem } from "@/hooks/useUnifiedCart";
import { usePublicSiteSettings } from "@/hooks/useSiteSettings";
import { formatPrice } from "@/lib/utils/format";
import { startRouteProgress } from "./RouteProgress";

/**
 * Header cart drawer - Zepto/Blinkit-style slide-out: coupons teaser,
 * "Delivering in minutes" line list with a per-row qty stepper, and a bill
 * summary card with a sticky checkout CTA. Shares its cart data with the
 * full /cart page via `useUnifiedCart` so quantities and totals never drift
 * between the two surfaces.
 */
export function CartDrawer() {
  const open = useUIStore((s) => s.cartDrawerOpen);
  const setOpen = useUIStore((s) => s.setCartDrawerOpen);
  const close = React.useCallback(() => setOpen(false), [setOpen]);

  return (
    <Drawer open={open} onClose={close} side="right" title="Cart" widthClassName="w-[92vw] sm:w-[420px] lg:w-[440px]">
      <CartDrawerBody onClose={close} />
    </Drawer>
  );
}

function CartDrawerBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { data: publicSettings } = usePublicSiteSettings();
  const freeThreshold = publicSettings?.delivery?.freeShippingThreshold ?? 0;

  const {
    items,
    subtotal,
    currency,
    itemCount,
    isAuthed,
    isLoading,
    appliedCoupon,
    onQtyChange,
    onRemove,
  } = useUnifiedCart();

  const isFree = freeThreshold > 0 && subtotal >= freeThreshold;
  const amountToFree = freeThreshold > 0 ? Math.max(0, freeThreshold - subtotal) : 0;
  const discount = appliedCoupon?.discount ?? 0;
  const total = Math.max(0, subtotal - discount);

  const goCheckout = () => {
    onClose();
    startRouteProgress();
    router.push(isAuthed ? "/checkout" : "/login?next=/checkout");
  };

  if (isAuthed && isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-[12px] px-[24px] text-center">
        <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-gray-100">
          <ShoppingCart className="h-[24px] w-[24px] text-gray-400" aria-hidden />
        </div>
        <div>
          <p className="text-[16px] font-semibold text-gray-900">Your cart is empty</p>
          <p className="mt-[4px] text-[14px] text-gray-500">Add something to get started.</p>
        </div>
        <Link
          href="/all-products"
          onClick={onClose}
          className={buttonVariants({ variant: "accent", size: "md", className: "mt-[4px] rounded-[8px]" })}
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col gap-[12px] bg-gray-50 p-[12px]">
      {/* Coupons & offers */}
      <div className="rounded-[8px] border border-gray-200 bg-white p-[16px]">
        <h3 className="text-[15px] font-bold text-gray-900">Coupons &amp; offers</h3>
        {isAuthed ? (
          appliedCoupon ? (
            <div className="mt-[10px] flex items-center gap-[8px] rounded-[8px] border border-green-200 bg-green-50 px-[12px] py-[10px] text-[13px]">
              <Tag className="h-[14px] w-[14px] shrink-0 text-green-600" aria-hidden />
              <span className="font-bold text-green-800">{appliedCoupon.code}</span>
              <span className="text-green-600">applied</span>
            </div>
          ) : (
            <Link
              href="/cart"
              onClick={onClose}
              className="mt-[10px] flex items-center gap-[10px] text-[13px] font-medium text-gray-500 transition-colors hover:text-accent"
            >
              <Tag className="h-[15px] w-[15px] shrink-0 text-gray-400" aria-hidden />
              Have a coupon? Apply it at checkout
            </Link>
          )
        ) : (
          <Link
            href="/login?next=/cart"
            onClick={onClose}
            className="mt-[10px] flex items-center justify-center gap-[8px] py-[6px] text-[14px] font-semibold text-gray-900"
          >
            <Lock className="h-[15px] w-[15px] text-gray-400" aria-hidden />
            Login to view coupons
          </Link>
        )}
      </div>

      {/* Delivering in minutes / item list */}
      <div className="rounded-[8px] border border-gray-200 bg-white">
        <div className="flex items-center gap-[10px] px-[16px] py-[14px]">
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500">
            <Clock className="h-[15px] w-[15px]" aria-hidden />
          </span>
          <div>
            <p className="text-[14px] font-bold text-gray-900">Delivering in minutes</p>
            <p className="text-[12px] text-gray-500">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
          </div>
        </div>

        <ul className="divide-y divide-gray-100 border-t border-gray-100">
          {items.map((item) => (
            <CartDrawerRow key={item.id} item={item} currency={currency} onQtyChange={onQtyChange} onRemove={onRemove} onNavigate={onClose} />
          ))}
        </ul>

        <div className="border-t border-gray-100 px-[16px] py-[12px] text-center">
          <span className="text-[13px] text-gray-500">Forgot something? </span>
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] font-bold text-accent hover:underline"
          >
            Add More Items
          </button>
        </div>
      </div>

      {/* Free delivery nudge */}
      {freeThreshold > 0 && !isFree ? (
        <div className="flex items-center gap-[8px] rounded-[8px] border border-amber-200 bg-amber-50 px-[12px] py-[10px] text-[12.5px] text-amber-800">
          Add <span className="font-bold">{formatPrice(amountToFree, currency)}</span> more for free delivery
        </div>
      ) : null}

      {/* Bill summary */}
      <div className="rounded-[8px] border border-gray-200 bg-white p-[16px]">
        <div className="flex items-center gap-[10px]">
          <FileText className="h-[16px] w-[16px] text-gray-400" aria-hidden />
          <h3 className="text-[15px] font-bold text-gray-900">Bill Summary</h3>
        </div>

        <div className="mt-[12px] flex items-center justify-between text-[14px]">
          <span className="text-gray-600">Item Total</span>
          <span className="font-semibold text-gray-900">{formatPrice(subtotal, currency)}</span>
        </div>

        {isAuthed ? (
          <>
            {discount > 0 ? (
              <div className="mt-[8px] flex items-center justify-between text-[14px]">
                <span className="text-gray-600">Discount</span>
                <span className="font-semibold text-green-600">−{formatPrice(discount, currency)}</span>
              </div>
            ) : null}
            <div className="mt-[10px] flex items-center justify-between border-t border-gray-100 pt-[10px] text-[15px]">
              <span className="font-bold text-gray-900">To Pay</span>
              <span className="font-bold text-gray-900">{formatPrice(total, currency)}</span>
            </div>
            <p className="mt-[4px] text-[11px] text-gray-400">Delivery charges calculated at checkout.</p>
          </>
        ) : (
          <div className="mt-[12px] rounded-[8px] bg-amber-50 px-[12px] py-[10px] text-[12.5px] leading-relaxed text-amber-800">
            Log in to see your exact total. Applicable charges and discounts will be calculated based on your
            delivery details.
          </div>
        )}
      </div>
    </div>

    {/* Sticky checkout CTA - a sibling of the scrollable content (not nested
        inside its padding), so `sticky bottom-0` pins it flush against the
        bottom of the drawer's own scroll viewport with no offset hacks. */}
    <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white p-[12px]">
      <button
        type="button"
        onClick={goCheckout}
        className="flex h-[48px] w-full items-center justify-center gap-[8px] rounded-[8px] bg-accent text-[15px] font-bold text-white transition-colors hover:bg-accent-dark"
      >
        {isAuthed ? (
          <>
            <ShoppingCart className="h-[16px] w-[16px]" aria-hidden />
            Proceed to Checkout
          </>
        ) : (
          <>
            <Lock className="h-[14px] w-[14px]" aria-hidden />
            Login to Proceed
          </>
        )}
      </button>
    </div>
    </>
  );
}

interface CartDrawerRowProps {
  item: UnifiedCartItem;
  currency: string;
  onQtyChange: (item: UnifiedCartItem, qty: number) => void;
  onRemove: (item: UnifiedCartItem) => void;
  onNavigate: () => void;
}

function CartDrawerRow({ item, currency, onQtyChange, onRemove, onNavigate }: CartDrawerRowProps) {
  const onSale = typeof item.originalPrice === "number" && item.originalPrice > item.price;

  return (
    <li className="flex gap-[10px] px-[16px] py-[12px]">
      <Link
        href={`/product/${item.slug}`}
        onClick={onNavigate}
        className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[8px] border border-gray-100 bg-gray-50"
      >
        {item.image ? (
          <Image src={item.image} alt={item.title} fill sizes="52px" className="object-cover" />
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
        <Link
          href={`/product/${item.slug}`}
          onClick={onNavigate}
          className="line-clamp-2 text-[13px] font-semibold leading-snug text-gray-900 hover:text-accent"
        >
          {item.title}
        </Link>
        {item.options && Object.keys(item.options).length > 0 ? (
          <p className="truncate text-[11.5px] text-gray-500">
            {Object.entries(item.options).map(([k, v]) => `${k}: ${v}`).join(" · ")}
          </p>
        ) : null}

        <div className="mt-[2px] flex items-center justify-between gap-[8px]">
          <div className="flex items-baseline gap-[6px]">
            <span className="text-[13px] font-bold text-green-700">{formatPrice(item.price, currency)}</span>
            {onSale ? (
              <span className="text-[11px] text-gray-400 line-through">
                {formatPrice(item.originalPrice!, currency)}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-[8px]">
            <button
              type="button"
              onClick={() => onRemove(item)}
              aria-label={`Remove ${item.title}`}
              className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] border border-gray-200 text-gray-400 transition-colors hover:border-red-200 hover:text-red-600"
            >
              <Trash2 className="h-[12px] w-[12px]" aria-hidden />
            </button>
            <div className="flex h-[26px] items-center overflow-hidden rounded-[6px] bg-accent">
              <button
                type="button"
                onClick={() => onQtyChange(item, item.qty - 1)}
                aria-label="Decrease quantity"
                className="flex h-full w-[24px] items-center justify-center text-white transition-colors hover:bg-accent-dark"
              >
                <Minus className="h-[10px] w-[10px]" strokeWidth={3} aria-hidden />
              </button>
              <span className="min-w-[16px] text-center text-[11px] font-bold text-white">{item.qty}</span>
              <button
                type="button"
                onClick={() => onQtyChange(item, item.qty + 1)}
                disabled={item.stock !== undefined && item.qty >= item.stock}
                aria-label="Increase quantity"
                className="flex h-full w-[24px] items-center justify-center text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
              >
                <Plus className="h-[10px] w-[10px]" strokeWidth={3} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
