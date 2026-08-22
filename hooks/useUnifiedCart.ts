"use client";

import { useSession } from "next-auth/react";
import { useCartStore, type CartItem, type CartAddOn } from "@/store/cartStore";
import {
  useServerCart,
  useUpdateCartItem,
  useRemoveCartItem,
  useClearCart,
} from "@/hooks/useCommerce";
import { usePublicCustomizations } from "@/hooks/useCustomizations";
import { deriveAddOns } from "@/lib/utils/cartAddOns";
import type { PublicCustomizationConfig } from "@/types/customization";
import type { AppliedCoupon, CartCouponRejectionCode, ServerCart, ServerCartItem } from "@/types/commerce";

/**
 * Normalized cart line - the server envelope (signed-in users) and the local
 * Zustand cart (anonymous browsers) have different shapes; every cart UI
 * (the /cart page, the header drawer) renders this same shape so they never
 * drift out of sync with each other.
 */
export interface UnifiedCartItem {
  id: string;
  productId: string;
  slug: string;
  title: string;
  image?: string;
  price: number;
  originalPrice?: number;
  qty: number;
  options?: Record<string, string>;
  stock?: number;
  /** Unit price before customization add-ons (only set on customized lines). */
  basePrice?: number;
  /** Per-unit customization charges included in `price`. */
  addOns?: CartAddOn[];
}

function unifyServerItem(
  item: ServerCartItem,
  customizations: PublicCustomizationConfig | null | undefined,
): UnifiedCartItem {
  return {
    id: item._id,
    productId: item.product,
    slug: item.slug,
    title: item.title,
    image: item.image,
    price: item.price,
    originalPrice: item.originalPrice,
    qty: item.qty,
    options: item.options,
    stock: item.stock,
    ...(item.addOns && item.addOns.length > 0
      ? { basePrice: item.basePrice, addOns: item.addOns }
      : deriveAddOns(item.price, item.options, customizations)),
  };
}

function unifyLocalItem(item: CartItem): UnifiedCartItem {
  let options: Record<string, string> | undefined;
  if (item.options && Object.keys(item.options).length > 0) {
    options = item.options;
  } else if (item.variant?.color || item.variant?.size) {
    const legacy: Record<string, string> = {};
    if (item.variant?.color) legacy.Color = item.variant.color;
    if (item.variant?.size) legacy.Size = item.variant.size;
    options = legacy;
  }
  return {
    id: item.lineId,
    productId: item.productId,
    slug: item.slug,
    title: item.title,
    image: item.image,
    price: item.price,
    originalPrice: item.originalPrice,
    qty: item.qty,
    options,
    stock: item.stock,
    basePrice: item.basePrice,
    addOns: item.addOns,
  };
}

export interface UseUnifiedCartResult {
  items: UnifiedCartItem[];
  subtotal: number;
  currency: string;
  itemCount: number;
  isAuthed: boolean;
  /** True only while the server cart is loading for an authed user with no local fallback yet rendered. */
  isLoading: boolean;
  usingServer: boolean;
  cart: ServerCart | null;
  appliedCoupon: AppliedCoupon | null;
  couponError: { code: CartCouponRejectionCode; message: string } | null;
  onQtyChange: (item: UnifiedCartItem, qty: number) => void;
  onRemove: (item: UnifiedCartItem) => void;
  onClear: () => void;
}

/**
 * Single source of truth for "what's in the cart right now" - prefers the
 * server cart when the user is authed AND it actually has rows (the normal
 * post-merge state); falls back to the local cart otherwise so the buyer
 * never sees an empty cart while a merge is in flight or failed transiently.
 * Shared by the full /cart page and the header CartDrawer so both always
 * agree with each other.
 */
export function useUnifiedCart(): UseUnifiedCartResult {
  const { status } = useSession();
  const isAuthed = status === "authenticated";

  const { data: envelope, isLoading: serverLoading } = useServerCart(isAuthed);
  const serverCart = envelope?.cart ?? null;
  const appliedCoupon = envelope?.appliedCoupon ?? null;
  const couponError = envelope?.couponError ?? null;

  const updateServer = useUpdateCartItem();
  const removeServer = useRemoveCartItem();
  const clearServer = useClearCart();

  const localItems = useCartStore((s) => s.items);
  const localSetQty = useCartStore((s) => s.setQty);
  const localRemove = useCartStore((s) => s.remove);
  const localClear = useCartStore((s) => s.clear);

  const serverItemRows = isAuthed ? serverCart?.items ?? [] : [];
  const usingServer = serverItemRows.length > 0;

  const { data: customizations } = usePublicCustomizations(usingServer);

  const items: UnifiedCartItem[] = usingServer
    ? serverItemRows.map((row) => unifyServerItem(row, customizations))
    : localItems.map(unifyLocalItem);

  const subtotal = usingServer
    ? serverCart?.subtotal ?? 0
    : items.reduce((s, i) => s + i.price * i.qty, 0);
  const currency = usingServer ? serverCart?.currency ?? "BDT" : "BDT";
  const itemCount = items.reduce((s, i) => s + i.qty, 0);

  const onQtyChange = (item: UnifiedCartItem, qty: number) => {
    const next = Math.max(1, Math.min(item.stock ?? 99, qty));
    if (usingServer) updateServer.mutate({ itemId: item.id, qty: next });
    else localSetQty(item.id, next);
  };

  const onRemove = (item: UnifiedCartItem) => {
    if (usingServer) removeServer.mutate(item.id);
    else localRemove(item.id);
  };

  const onClear = () => {
    if (usingServer) clearServer.mutate();
    else localClear();
  };

  return {
    items,
    subtotal,
    currency,
    itemCount,
    isAuthed,
    isLoading: isAuthed && serverLoading,
    usingServer,
    cart: serverCart,
    appliedCoupon,
    couponError,
    onQtyChange,
    onRemove,
    onClear,
  };
}
