"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Lock, Minus, Plus, ShoppingBag, SquarePen, X } from "lucide-react";
import { Drawer } from "@/components/complex";
import { Spinner } from "@/components/ui";
import { useUIStore } from "@/store/uiStore";
import { useUnifiedCart, type UnifiedCartItem } from "@/hooks/useUnifiedCart";
import { usePublicSiteSettings } from "@/hooks/useSiteSettings";
import { formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { startRouteProgress } from "./RouteProgress";

/**
 * Header cart drawer, in the same editorial language as the collection grid:
 * square corners, hairline rules instead of stacked cards, prices to the
 * paisa, and an ink CHECKOUT bar over an outlined VIEW CART.
 *
 * Replaces an earlier grocery-style panel (orange stepper, green prices,
 * "Delivering in minutes"). The delivery-speed framing was wrong for a
 * clothing store — nothing here ships in minutes.
 *
 * Shares cart state with the full /cart page via `useUnifiedCart`, so
 * quantities and totals never drift between the two surfaces.
 */
export function CartDrawer() {
  const open = useUIStore((s) => s.cartDrawerOpen);
  const setOpen = useUIStore((s) => s.setCartDrawerOpen);
  const close = React.useCallback(() => setOpen(false), [setOpen]);

  return (
    <Drawer
      open={open}
      onClose={close}
      side="right"
      title={<CartDrawerTitle />}
      widthClassName="w-[92vw] sm:w-[440px] lg:w-[464px]"
    >
      <CartDrawerBody onClose={close} />
    </Drawer>
  );
}

/** "Shopping Cart" over a live item count, as one node for the Drawer header. */
function CartDrawerTitle() {
  const { items, itemCount } = useUnifiedCart();
  return (
    <span className="block py-[6px]">
      <span className="block text-[20px] font-bold leading-tight text-ink">Shopping Cart</span>
      {items.length > 0 ? (
        <span className="mt-[2px] block text-[14px] font-normal text-neutral-500">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>
      ) : null}
    </span>
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
      <div className="flex h-[70vh] flex-col items-center justify-center gap-[16px] px-[32px] text-center">
        <ShoppingBag className="h-[32px] w-[32px] text-neutral-300" strokeWidth={1.25} aria-hidden />
        <div>
          <p className="text-[15px] font-bold text-ink">Your cart is empty</p>
          <p className="mt-[6px] text-[13px] text-neutral-500">
            Once you add something, it will show up here.
          </p>
        </div>
        <Link
          href="/all-products"
          onClick={onClose}
          className="mt-[8px] border border-neutral-300 px-[28px] py-[13px] text-[13px] font-medium uppercase tracking-[0.10em] text-ink transition-colors hover:bg-ink hover:text-paper"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  /**
   * The delivery note the reference states flatly ("Delivery is FREE
   * nationwide") is derived here instead, so it can't contradict the store's
   * actual freeShippingThreshold setting.
   */
  const deliveryNote =
    freeThreshold <= 0 || isFree
      ? "Taxes to be included at checkout. Delivery is FREE nationwide."
      : `Taxes to be included at checkout. Spend ${formatPrice(amountToFree, currency, {
          decimals: true,
        })} more for free delivery.`;

  return (
    // min-h-full + flex-1 spacer pins the summary and CTAs to the bottom of
    // the drawer when the item list is short, and lets them scroll away
    // naturally once it isn't.
    <div className="flex min-h-full flex-col">
      <ul>
        {items.map((item) => (
          <CartDrawerRow
            key={item.id}
            item={item}
            currency={currency}
            onQtyChange={onQtyChange}
            onRemove={onRemove}
            onNavigate={onClose}
          />
        ))}
      </ul>

      <div className="flex-1" />

      {/* ── Coupon ── */}
      <div className="flex justify-center px-[24px] pb-[22px] pt-[32px]">
        <Link
          href={isAuthed ? "/cart" : "/login?next=/cart"}
          onClick={onClose}
          aria-label={
            appliedCoupon ? `Coupon ${appliedCoupon.code} applied` : "Apply a coupon"
          }
          title={appliedCoupon ? `${appliedCoupon.code} applied` : "Apply a coupon"}
          className={cn(
            "flex h-[62px] w-[78px] items-center justify-center border transition-colors",
            appliedCoupon
              ? "border-ink text-ink"
              : "border-neutral-300 text-neutral-600 hover:border-ink hover:text-ink",
          )}
        >
          {isAuthed ? (
            <ClipboardList className="h-[22px] w-[22px]" strokeWidth={1.5} aria-hidden />
          ) : (
            <Lock className="h-[20px] w-[20px]" strokeWidth={1.5} aria-hidden />
          )}
        </Link>
      </div>

      {/* ── Summary + CTAs ── */}
      <div className="px-[24px] pb-[24px]">
        <div className="flex items-center justify-between text-[15px]">
          <span className="font-bold text-ink">Subtotal:</span>
          <span className="font-bold text-ink">
            {formatPrice(subtotal, currency, { decimals: true })}
          </span>
        </div>

        {isAuthed && discount > 0 ? (
          <div className="mt-[10px] flex items-center justify-between text-[15px]">
            <span className="font-bold text-ink">Discount:</span>
            <span className="font-bold text-ink">
              −{formatPrice(discount, currency, { decimals: true })}
            </span>
          </div>
        ) : null}

        <div className="mt-[10px] flex items-center justify-between">
          <span className="text-[15px] font-bold text-ink">Total:</span>
          <span className="text-[19px] font-bold text-ink">
            {formatPrice(isAuthed ? total : subtotal, currency, { decimals: true })}
          </span>
        </div>

        <p className="mt-[14px] text-[14px] leading-relaxed text-neutral-500">
          {isAuthed
            ? deliveryNote
            : "Log in to see your exact total. Charges and discounts are calculated from your delivery details."}
        </p>

        <button
          type="button"
          onClick={goCheckout}
          className="mt-[20px] flex h-[56px] w-full items-center justify-center gap-[8px] bg-ink text-[15px] font-medium uppercase tracking-[0.10em] text-paper transition-colors hover:bg-neutral-800"
        >
          {isAuthed ? (
            "Checkout"
          ) : (
            <>
              <Lock className="h-[14px] w-[14px]" aria-hidden />
              Log in to checkout
            </>
          )}
        </button>

        <Link
          href="/cart"
          onClick={onClose}
          className="mt-[12px] flex h-[56px] w-full items-center justify-center border border-neutral-300 text-[15px] font-medium uppercase tracking-[0.10em] text-ink transition-colors hover:border-ink"
        >
          View cart
        </Link>
      </div>
    </div>
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
  const atStockCap = item.stock !== undefined && item.qty >= item.stock;
  const optionLine = formatOptionLine(item.options);

  return (
    <li className="flex gap-[18px] border-b border-neutral-200 px-[24px] py-[22px]">
      {/* 3:4 crop, matching the collection card so the same photo doesn't
          change shape between the grid and the cart. */}
      <Link
        href={`/product/${item.slug}`}
        onClick={onNavigate}
        className="relative h-[124px] w-[93px] shrink-0 overflow-hidden bg-[#F2F3F4]"
      >
        {item.image ? (
          <Image src={item.image} alt={item.title} fill sizes="93px" className="object-cover" />
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          href={`/product/${item.slug}`}
          onClick={onNavigate}
          className="text-[15px] font-medium leading-snug text-ink transition-colors hover:text-accent"
        >
          {item.title}
        </Link>

        {optionLine ? (
          // The pencil goes back to the PDP, which is where a different size
          // or colour is actually chosen — the drawer has no variant picker.
          <Link
            href={`/product/${item.slug}`}
            onClick={onNavigate}
            className="mt-[8px] flex items-center gap-[8px] text-[13px] uppercase tracking-[0.04em] text-neutral-500 transition-colors hover:text-ink"
          >
            <span className="truncate">{optionLine}</span>
            <SquarePen className="h-[15px] w-[15px] shrink-0" strokeWidth={1.5} aria-hidden />
          </Link>
        ) : null}

        <p className="mt-[8px] flex items-baseline gap-[8px]">
          <span className="text-[15px] font-bold text-ink">
            {formatPrice(item.price, currency, { decimals: true })}
          </span>
          {onSale ? (
            <span className="text-[12px] text-neutral-400 line-through">
              {formatPrice(item.originalPrice!, currency, { decimals: true })}
            </span>
          ) : null}
        </p>

        <div className="mt-[14px] flex items-center justify-between gap-[12px]">
          <div className="flex h-[44px] items-center border border-neutral-300">
            <StepperButton
              label="Decrease quantity"
              onClick={() => onQtyChange(item, item.qty - 1)}
            >
              <Minus className="h-[15px] w-[15px]" strokeWidth={1.5} aria-hidden />
            </StepperButton>
            <span className="min-w-[38px] text-center text-[14px] text-ink">{item.qty}</span>
            <StepperButton
              label="Increase quantity"
              onClick={() => onQtyChange(item, item.qty + 1)}
              disabled={atStockCap}
            >
              <Plus className="h-[15px] w-[15px]" strokeWidth={1.5} aria-hidden />
            </StepperButton>
          </div>

          <button
            type="button"
            onClick={() => onRemove(item)}
            aria-label={`Remove ${item.title}`}
            className="shrink-0 p-[4px] text-ink transition-colors hover:text-accent"
          >
            <X className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>
    </li>
  );
}

/**
 * Variant summary for the row, colour first ("Kentucky Blue / S") — the
 * fashion-retail convention, and the order the reference uses. Any other
 * axes a product defines (Fit, Length, …) follow in their own order, so
 * this doesn't silently drop options it wasn't written for.
 */
function formatOptionLine(options: Record<string, string> | undefined): string | null {
  if (!options) return null;
  const keys = Object.keys(options);
  if (keys.length === 0) return null;

  const lead = ["color", "colour", "size"];
  const rank = (k: string) => {
    const i = lead.indexOf(k.toLowerCase());
    return i === -1 ? lead.length : i;
  };
  return keys
    .slice()
    .sort((a, b) => rank(a) - rank(b))
    .map((k) => options[k])
    .join(" / ");
}

function StepperButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex h-full w-[42px] items-center justify-center text-ink transition-colors",
        "hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-300 disabled:hover:bg-transparent",
      )}
    >
      {children}
    </button>
  );
}
