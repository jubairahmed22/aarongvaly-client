"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown, HelpCircle, Plus } from "lucide-react";
import { Spinner } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { getCheckoutAttribution } from "@/lib/analytics";
import { formatPrice } from "@/lib/utils/format";
import { useUIStore } from "@/store/uiStore";
import { useCartStore, type CartItem } from "@/store/cartStore";
import {
  useServerCart,
  useAddresses,
  useCheckout,
  useGuestCheckout,
  useMergeCart,
} from "@/hooks/useCommerce";
import { usePublicSiteSettings } from "@/hooks/useSiteSettings";
import { usePublicCustomizations } from "@/hooks/useCustomizations";
import { deriveAddOns } from "@/lib/utils/cartAddOns";
import type {
  Address,
  AddressInput,
  AppliedCoupon,
  CartCouponRejectionCode,
  MergeCartItem,
  PaymentMethod,
  ServerCart,
  ServerCartItem,
} from "@/types/commerce";

/* ───────────────────── Address form ───────────────────── */

const addressFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(60),
  lastName: z.string().min(1, "Last name is required").max(60),
  phone: z.string().min(5, "Phone number is required").max(20),
  // The Contact field accepts an email or a phone number, Shopify-style.
  // Only actual emails are sent to the server as `email`.
  email: z
    .string()
    .max(200)
    .optional()
    .or(z.literal(""))
    .refine((v) => {
      if (!v) return true;
      return v.includes("@") ? /^\S+@\S+\.\S+$/.test(v) : /^[\d+\-\s()]{5,20}$/.test(v);
    }, "Enter a valid email or phone number"),
  line1: z.string().min(3, "Address is required").max(200),
  district: z.string().min(1, "City/District is required").max(80),
  postalCode: z.string().max(20).optional().or(z.literal("")),
  country: z.string().max(3).optional(),
  saveAddress: z.boolean().optional(),
});

type AddressFormValues = z.infer<typeof addressFormSchema>;

const PAYMENT_OPTIONS: Array<{ id: PaymentMethod; label: string; description: string }> = [
  {
    id: "sslcommerz",
    label: "SSLCOMMERZ",
    description: "You'll be redirected to SSLCOMMERZ to complete your purchase.",
  },
  { id: "cod", label: "Cash on Delivery (COD)", description: "Pay in cash when your order arrives." },
  { id: "bkash", label: "bKash", description: "You'll be redirected to bKash to complete your purchase." },
  { id: "nagad", label: "Nagad", description: "You'll be redirected to Nagad to complete your purchase." },
  { id: "rocket", label: "Rocket", description: "You'll be redirected to Rocket (DBBL) to complete your purchase." },
  { id: "stripe", label: "Stripe", description: "You'll be redirected to Stripe to complete your purchase." },
  { id: "paypal", label: "PayPal", description: "You'll be redirected to PayPal to complete your purchase." },
  { id: "card", label: "Credit / Debit Card", description: "Visa, Mastercard, or AmEx." },
  { id: "bank_transfer", label: "Bank Transfer", description: "Direct bank deposit — details shared after the order is placed." },
];

/* ───────────────────── Local → Server cart adapter ───────────────────── */

/**
 * Build a synthetic `ServerCart` from the local Zustand cart so the existing
 * OrderSummary can render unchanged. We deliberately keep the same field
 * names the server uses (`product`, `slug`, `title`, `image`, `price`, `qty`)
 * because the summary component is typed against `ServerCart`.
 *
 * Authed users on /checkout normally arrive with a server-side cart, but if
 * the login-merge is still in-flight or failed (429, network blip), the
 * server cart can read empty while the local cart still holds the items they
 * just added. Falling back here keeps the buyer from staring at an empty
 * cart message after they explicitly clicked "Checkout".
 */
function buildLocalCartShim(items: CartItem[]): ServerCart {
  const now = new Date().toISOString();
  const shimItems: ServerCartItem[] = items.map((it) => {
    // Prefer the full options map written by cartStore v2; only fall back
    // to the legacy {size,color} fields when the row was hydrated from an
    // older persisted cart. This keeps "Storage: 128GB" / "Material: Cotton"
    // axes visible in the summary instead of silently dropping them.
    let options: Record<string, string> | undefined;
    if (it.options && Object.keys(it.options).length > 0) {
      options = it.options;
    } else if (it.variant?.color || it.variant?.size) {
      const legacy: Record<string, string> = {};
      if (it.variant?.color) legacy.Color = it.variant.color;
      if (it.variant?.size) legacy.Size = it.variant.size;
      options = legacy;
    }
    return {
      _id: it.lineId,
      product: it.productId,
      variantId: it.variantId,
      slug: it.slug,
      title: it.title,
      image: it.image,
      options,
      price: it.price,
      originalPrice: it.originalPrice,
      currency: "BDT",
      qty: it.qty,
    };
  });
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const itemCount = items.reduce((n, i) => n + i.qty, 0);
  return {
    _id: "local-cart",
    user: "local",
    items: shimItems,
    subtotal,
    itemCount,
    currency: "BDT",
    createdAt: now,
    updatedAt: now,
  };
}

function localItemsToMergePayload(items: CartItem[]): MergeCartItem[] {
  // Same preference order as CartSyncBridge - send the most specific
  // identifier we have so the server can deterministically pick the
  // variant row instead of failing with VARIANT_REQUIRED on products
  // whose axes aren't named "Size"/"Color".
  return items.map((it) => {
    if (it.variantId) {
      return { productId: it.productId, variantId: it.variantId, qty: it.qty };
    }
    if (it.options && Object.keys(it.options).length > 0) {
      return { productId: it.productId, options: it.options, qty: it.qty };
    }
    const legacy: Record<string, string> = {};
    if (it.variant?.color) legacy.Color = it.variant.color;
    if (it.variant?.size) legacy.Size = it.variant.size;
    return {
      productId: it.productId,
      qty: it.qty,
      options: Object.keys(legacy).length > 0 ? legacy : undefined,
    };
  });
}

/* ───────────────────── Shared field primitives ───────────────────── */

/**
 * Shopify-style floating-label input: the label sits where a placeholder
 * would, then shrinks to the top edge on focus / when a value is present.
 */
interface FloatFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Show the "?" help icon on the right edge. */
  help?: boolean;
  wrapClass?: string;
}

const FloatField = React.forwardRef<HTMLInputElement, FloatFieldProps>(
  function FloatField({ label, error, help, wrapClass, className, ...rest }, ref) {
    return (
      <div className={cn("flex flex-col gap-[4px]", wrapClass)}>
        <div className="relative">
          <input
            ref={ref}
            placeholder=" "
            aria-label={label}
            aria-invalid={error ? true : undefined}
            {...rest}
            className={cn(
              "peer h-[52px] w-full rounded-[8px] border bg-white px-[12px] pb-[4px] pt-[18px] text-[14px] text-neutral-900 outline-none transition-colors",
              help && "pr-[40px]",
              error
                ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                : "border-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900",
              className,
            )}
          />
          <label className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-[14px] text-neutral-500 transition-all duration-150 peer-focus:top-[8px] peer-focus:translate-y-0 peer-focus:text-[11px] peer-[:not(:placeholder-shown)]:top-[8px] peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[11px]">
            {label}
          </label>
          {help ? (
            <HelpCircle
              className="pointer-events-none absolute right-[12px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-neutral-400"
              aria-hidden
            />
          ) : null}
        </div>
        {error ? <span className="text-[12px] text-red-600">{error}</span> : null}
      </div>
    );
  },
);

function CheckRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-[10px] text-[14px] text-neutral-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-[18px] w-[18px] shrink-0 rounded accent-neutral-900"
      />
      {children}
    </label>
  );
}

function RadioDot({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors",
        active ? "border-neutral-900" : "border-neutral-400",
      )}
    >
      {active ? <span className="h-[10px] w-[10px] rounded-full bg-neutral-900" /> : null}
    </span>
  );
}

/** VISA / Mastercard / AmEx chips shown on card-gateway payment rows. */
function CardBadges() {
  return (
    <span className="flex items-center gap-[4px]" aria-hidden>
      <span className="flex h-[24px] w-[38px] items-center justify-center rounded-[4px] border border-neutral-200 bg-[#1A1F71] text-[10px] font-bold italic text-white">
        VISA
      </span>
      <span className="relative h-[24px] w-[38px] rounded-[4px] border border-neutral-200 bg-[#252525]">
        <span className="absolute left-[6px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 rounded-full bg-[#EB001B]" />
        <span className="absolute right-[6px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 rounded-full bg-[#F79E1B] mix-blend-screen" />
      </span>
      <span className="flex h-[24px] w-[38px] items-center justify-center rounded-[4px] border border-neutral-200 bg-[#2E77BC] text-[8px] font-bold tracking-tight text-white">
        AMEX
      </span>
      <span className="text-[11px] text-neutral-500">+2</span>
    </span>
  );
}

/** Brand chip for BD mobile-banking rows. */
function WalletBadge({ id }: { id: PaymentMethod }) {
  const style =
    id === "bkash"
      ? { bg: "#E2136E", label: "bKash" }
      : id === "nagad"
        ? { bg: "#F6921E", label: "Nagad" }
        : id === "rocket"
          ? { bg: "#8C3494", label: "Rocket" }
          : null;
  if (!style) return null;
  return (
    <span
      aria-hidden
      className="flex h-[24px] items-center justify-center rounded-[4px] px-[8px] text-[10px] font-bold italic text-white"
      style={{ backgroundColor: style.bg }}
    >
      {style.label}
    </span>
  );
}

/* ───────────────────── Page client ───────────────────── */

export function CheckoutClient() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const isAuthed = status === "authenticated";
  const toast = useUIStore((s) => s.toast);
  const { data: publicSettings } = usePublicSiteSettings();
  const deliveryConfig = publicSettings?.delivery;

  // Guests check out without an account - they just fill in the address
  // form and place the order. No login redirect.

  // The cart query returns a CartEnvelope ({ cart, appliedCoupon, couponError }).
  // We pull the slice plus the resolved discount so the summary can render
  // the actual amount the buyer will pay - checkout re-validates anyway, so
  // a stale `appliedCoupon` here just shows up as a corrected discount line
  // on the order success page, not a surprise.
  const { data: envelope, isLoading: cartLoading } = useServerCart(isAuthed);
  const serverCart = envelope?.cart;
  const appliedCoupon = envelope?.appliedCoupon ?? null;
  const couponError = envelope?.couponError ?? null;
  const { data: addresses, isLoading: addrLoading } = useAddresses(isAuthed);
  const checkoutMut = useCheckout();
  const guestCheckoutMut = useGuestCheckout();
  const mergeMut = useMergeCart();

  // Local-cart fallback. If the server cart is empty (or still loading the
  // login-merge), the local Zustand cart is the source of truth for what the
  // buyer thinks they're checking out with. We render those items in the
  // summary and merge them up to the server right before placing the order.
  const localItems = useCartStore((s) => s.items);
  const clearLocal = useCartStore((s) => s.clear);

  const serverItems = serverCart?.items ?? [];
  const usingLocal = serverItems.length === 0 && localItems.length > 0;
  const cart: ServerCart | undefined = usingLocal
    ? buildLocalCartShim(localItems)
    : serverCart;

  const [selectedAddressId, setSelectedAddressId] = React.useState<string | "new" | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("cod");
  const [customerNote, setCustomerNote] = React.useState("");

  // Billing address — "same as shipping" by default; a different one is
  // captured as free text and attached to the order note (the order model
  // has no separate billing field).
  const [billingSame, setBillingSame] = React.useState(true);
  const [billingAddress, setBillingAddress] = React.useState("");

  // Marketing opt-in toggles (visual parity with the reference checkout).
  const [emailOffers, setEmailOffers] = React.useState(true);
  const [textOffers, setTextOffers] = React.useState(false);

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      line1: "",
      district: "",
      postalCode: "",
      country: "BD",
      saveAddress: true,
    },
  });

  // Admin-enabled payment methods, in display order. If the current
  // selection was disabled by the admin, switch to the first available.
  const enabledOptions = React.useMemo(
    () =>
      publicSettings?.enabledPaymentMethods && publicSettings.enabledPaymentMethods.length > 0
        ? PAYMENT_OPTIONS.filter((o) => publicSettings.enabledPaymentMethods!.includes(o.id))
        : PAYMENT_OPTIONS,
    [publicSettings?.enabledPaymentMethods],
  );
  React.useEffect(() => {
    if (enabledOptions.length > 0 && !enabledOptions.some((o) => o.id === paymentMethod)) {
      setPaymentMethod(enabledOptions[0]!.id);
    }
  }, [enabledOptions, paymentMethod]);

  // Pick the default address by default.
  React.useEffect(() => {
    if (!addresses) return;
    if (selectedAddressId) return;
    if (addresses.length === 0) {
      setSelectedAddressId("new");
      return;
    }
    const def = addresses.find((a) => a.isDefault) ?? addresses[0];
    setSelectedAddressId(def?._id ?? "new");
  }, [addresses, selectedAddressId]);

  if (status === "loading" || cartLoading || addrLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto flex max-w-[480px] flex-col items-center gap-[12px] px-[24px] py-[80px] text-center">
        <p className="text-[18px] font-semibold text-neutral-900">Your cart is empty</p>
        <p className="text-[14px] text-neutral-500">Add a few items before checking out.</p>
        <Link
          href="/all-products"
          className="mt-[8px] flex h-[48px] items-center justify-center rounded-[8px] bg-neutral-900 px-[32px] text-[14px] font-semibold text-white transition-colors hover:bg-neutral-800"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  const toAddressInput = (values: AddressFormValues): AddressInput => ({
    fullName: `${values.firstName} ${values.lastName}`.trim(),
    phone: values.phone,
    line1: values.line1,
    district: values.district,
    postalCode: values.postalCode || undefined,
    country: values.country || "BD",
  });

  /** Order note plus the free-text billing address when one was entered. */
  const buildNote = (): string | undefined => {
    const parts = [customerNote.trim()];
    if (!billingSame && billingAddress.trim()) {
      parts.push(`Billing address: ${billingAddress.trim()}`);
    }
    const joined = parts.filter(Boolean).join("\n");
    return joined || undefined;
  };

  const onSubmit = async (values: AddressFormValues) => {
    try {
      const contactEmail =
        values.email && values.email.includes("@") ? values.email : undefined;

      // ── Guest path: no account, no server cart. The local cart lines go
      // straight to the public guest-checkout endpoint - the buyer just
      // fills the form and the order is placed. ──
      if (!isAuthed) {
        if (localItems.length === 0) {
          toast({ title: "Your cart is empty", tone: "error" });
          return;
        }
        // Unlike the merge payload, keep the full options map alongside the
        // variantId so jersey personalisation (Name/Number/Patches) survives
        // onto the order snapshot.
        const guestItems: MergeCartItem[] = localItems.map((it) => ({
          productId: it.productId,
          variantId: it.variantId,
          qty: it.qty,
          options:
            it.options && Object.keys(it.options).length > 0 ? it.options : undefined,
        }));

        const order = await guestCheckoutMut.mutateAsync({
          items: guestItems,
          shippingAddress: toAddressInput(values),
          paymentMethod,
          email: contactEmail,
          customerNote: buildNote(),
          attribution: getCheckoutAttribution(),
        });

        clearLocal();
        // Stash the order so the success page can render it without auth.
        try {
          window.sessionStorage.setItem(
            `guest_order_${order.orderNumber}`,
            JSON.stringify(order),
          );
        } catch {
          /* storage blocked - success page falls back to a generic message */
        }
        toast({ title: "Order placed", description: order.orderNumber, tone: "success" });
        router.push(`/order/${order.orderNumber}/success`);
        return;
      }

      // If we're rendering from the local cart, push it up to the server
      // first so the checkout controller has the right line items to charge
      // against. The merge endpoint reports per-item skips (deleted product,
      // variant resolution failed, out of stock, etc.) instead of failing the
      // whole batch, so we inspect the envelope before deciding what to do:
      //   - 0 items merged → cart would be empty server-side; bail with the
      //     first skip reason so the user knows why instead of seeing a
      //     generic EMPTY_CART at checkout.
      //   - some items merged with skips → warn but proceed. The buyer can
      //     review what made it through on the order success page.
      //   - everything merged → silently clear local + continue.
      if (usingLocal && localItems.length > 0) {
        try {
          const envelopeAfterMerge = await mergeMut.mutateAsync(
            localItemsToMergePayload(localItems),
          );
          const skipped = envelopeAfterMerge.skipped ?? [];
          const mergedCount = envelopeAfterMerge.mergedCount ?? 0;
          const serverItemsAfter = envelopeAfterMerge.cart?.items ?? [];

          if (mergedCount === 0 && serverItemsAfter.length === 0) {
            const reason =
              skipped[0]?.message ??
              "None of your cart items could be added to the order";
            toast({
              title: "Could not place order",
              description: reason,
              tone: "error",
            });
            return;
          }

          if (skipped.length > 0) {
            toast({
              title: `${skipped.length} item${skipped.length > 1 ? "s" : ""} skipped`,
              description: skipped[0]?.message ?? "Some items could not be added.",
              tone: "info",
            });
          }
          clearLocal();
        } catch (mergeErr) {
          const msg =
            mergeErr instanceof Error
              ? mergeErr.message
              : "Could not sync your cart to the server";
          toast({ title: "Could not place order", description: msg, tone: "error" });
          return;
        }
      }

      const useSaved = selectedAddressId && selectedAddressId !== "new";

      // Snapshot marketing attribution at the moment of purchase so the
      // server can persist it on the order + user and stitch server-side
      // conversions (GA4 MP, Meta CAPI) to this session.
      const attribution = getCheckoutAttribution();

      let body: Parameters<typeof checkoutMut.mutateAsync>[0];
      if (useSaved && typeof selectedAddressId === "string") {
        body = {
          shippingAddressId: selectedAddressId,
          paymentMethod,
          customerNote: buildNote(),
          attribution,
        };
      } else {
        body = {
          shippingAddress: toAddressInput(values),
          paymentMethod,
          customerNote: buildNote(),
          saveAddress: values.saveAddress,
          attribution,
        };
      }

      const order = await checkoutMut.mutateAsync(body);
      // Belt-and-braces: clear the local cart on a successful checkout so a
      // user with stale local rows doesn't see a phantom badge after the
      // server-side order is placed.
      if (localItems.length > 0) clearLocal();
      toast({ title: "Order placed", description: order.orderNumber, tone: "success" });
      router.push(`/order/${order.orderNumber}/success`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not place order";
      toast({ title: "Checkout failed", description: message, tone: "error" });
    }
  };

  // When the user picks a saved address, skip RHF validation and just submit.
  // Guests always go through form validation - the address form is their
  // only path.
  const handlePlaceOrder = () => {
    if (isAuthed && selectedAddressId && selectedAddressId !== "new") {
      onSubmit(form.getValues());
    } else {
      form.handleSubmit(onSubmit)();
    }
  };

  const isPlacing =
    checkoutMut.isPending || guestCheckoutMut.isPending || mergeMut.isPending;

  const subtotal = cart.subtotal;
  const shippingCost = estimateShipping(
    getDistrictFromSelection(addresses, selectedAddressId, form.watch("district")),
    subtotal,
    deliveryConfig,
  );
  const discount = appliedCoupon?.discount ?? 0;
  const total = Math.max(0, subtotal - discount) + shippingCost;

  const { register, formState: { errors } } = form;
  const showAddressForm = !isAuthed || selectedAddressId === "new" || (addresses ?? []).length === 0;

  const summary = (
    <OrderSummary
      cart={cart}
      appliedCoupon={appliedCoupon}
      couponError={couponError}
      subtotal={subtotal}
      discount={discount}
      shippingCost={shippingCost}
      total={total}
    />
  );

  return (
    <div className="lg:grid lg:min-h-[calc(100vh-65px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,44%)]">

      {/* Mobile order summary — collapsible band, Shopify-style */}
      <details className="group border-b border-neutral-200 bg-[#F5F5F5] lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-[16px] py-[14px] [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-[6px] text-[14px] text-neutral-800">
            Show order summary
            <ChevronDown className="h-[16px] w-[16px] transition-transform group-open:rotate-180" aria-hidden />
          </span>
          <span className="text-[16px] font-semibold text-neutral-900">
            {formatPrice(total, cart.currency)}
          </span>
        </summary>
        <div className="border-t border-neutral-200 px-[16px] py-[20px]">{summary}</div>
      </details>

      {/* ── LEFT: form column ─────────────────────────────────────────── */}
      <div className="flex justify-center bg-white lg:justify-end">
        <div className="w-full max-w-[580px] px-[16px] py-[28px] sm:px-[32px] lg:py-[40px] lg:pr-[56px]">

          {/* Contact */}
          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="text-[21px] font-semibold text-neutral-900">Contact</h2>
              {!isAuthed ? (
                <Link
                  href="/login?callbackUrl=/checkout"
                  className="text-[14px] text-neutral-900 underline underline-offset-2 hover:text-neutral-600"
                >
                  Sign in
                </Link>
              ) : null}
            </div>
            <div className="mt-[14px] flex flex-col gap-[12px]">
              {isAuthed ? (
                <p className="rounded-[8px] border border-neutral-300 bg-neutral-50 px-[12px] py-[14px] text-[14px] text-neutral-800">
                  {session?.user?.email ?? session?.user?.name ?? "Signed in"}
                </p>
              ) : (
                <FloatField
                  label="Email or phone number"
                  error={errors.email?.message}
                  help
                  inputMode="email"
                  autoComplete="email"
                  {...register("email")}
                />
              )}
              <CheckRow checked={emailOffers} onChange={setEmailOffers}>
                Email me with news and offers
              </CheckRow>
            </div>
          </section>

          {/* Delivery */}
          <section className="mt-[32px]">
            <h2 className="text-[21px] font-semibold text-neutral-900">Delivery</h2>

            {/* Saved addresses (authed) */}
            {isAuthed && (addresses ?? []).length > 0 ? (
              <div className="mt-[14px] overflow-hidden rounded-[8px] border border-neutral-300">
                {(addresses ?? []).map((a, i) => {
                  const active = selectedAddressId === a._id;
                  return (
                    <button
                      key={a._id}
                      type="button"
                      onClick={() => setSelectedAddressId(a._id!)}
                      className={cn(
                        "flex w-full items-start gap-[12px] px-[16px] py-[13px] text-left transition-colors",
                        i > 0 && "border-t border-neutral-200",
                        active ? "bg-neutral-50" : "hover:bg-neutral-50/60",
                      )}
                    >
                      <span className="mt-[2px]"><RadioDot active={active} /></span>
                      <span className="min-w-0 flex-1 text-[13px] leading-relaxed text-neutral-600">
                        <span className="block text-[14px] font-medium text-neutral-900">
                          {a.fullName}
                          {a.isDefault ? (
                            <span className="ml-[8px] text-[11px] font-normal uppercase tracking-wide text-neutral-400">
                              Default
                            </span>
                          ) : null}
                        </span>
                        {a.line1}
                        {a.line2 ? `, ${a.line2}` : ""}, {a.district}
                        {a.postalCode ? ` ${a.postalCode}` : ""} · {a.phone}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setSelectedAddressId("new")}
                  className={cn(
                    "flex w-full items-center gap-[10px] border-t border-neutral-200 px-[16px] py-[13px] text-left text-[14px] transition-colors",
                    selectedAddressId === "new"
                      ? "bg-neutral-50 font-medium text-neutral-900"
                      : "text-neutral-600 hover:bg-neutral-50/60",
                  )}
                >
                  <Plus className="h-[16px] w-[16px]" aria-hidden />
                  Use a new address
                </button>
              </div>
            ) : null}

            {showAddressForm ? (
              <form
                className="mt-[14px] flex flex-col gap-[12px]"
                onSubmit={(e) => e.preventDefault()}
              >
                {/* Country/Region — fixed to Bangladesh */}
                <div className="relative h-[52px] rounded-[8px] border border-neutral-300 bg-white px-[12px] pb-[4px] pt-[18px]">
                  <span className="absolute left-[13px] top-[8px] text-[11px] text-neutral-500">
                    Country/Region
                  </span>
                  <span className="text-[14px] text-neutral-900">Bangladesh</span>
                  <ChevronDown
                    className="pointer-events-none absolute right-[12px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-neutral-500"
                    aria-hidden
                  />
                </div>

                <div className="grid grid-cols-2 gap-[12px]">
                  <FloatField
                    label="First name"
                    error={errors.firstName?.message}
                    autoComplete="given-name"
                    {...register("firstName")}
                  />
                  <FloatField
                    label="Last name"
                    error={errors.lastName?.message}
                    autoComplete="family-name"
                    {...register("lastName")}
                  />
                </div>

                <FloatField
                  label="Detail full address (house, road/lane/bazar, block/sector, area, THANA etc.)"
                  error={errors.line1?.message}
                  autoComplete="street-address"
                  {...register("line1")}
                />

                <div className="grid grid-cols-2 gap-[12px]">
                  <FloatField
                    label="City/District"
                    error={errors.district?.message}
                    autoComplete="address-level2"
                    {...register("district")}
                  />
                  <FloatField
                    label="Postal code (optional)"
                    error={errors.postalCode?.message}
                    autoComplete="postal-code"
                    {...register("postalCode")}
                  />
                </div>

                <FloatField
                  label="Phone number"
                  error={errors.phone?.message}
                  help
                  inputMode="tel"
                  autoComplete="tel"
                  {...register("phone")}
                />

                <div className="mt-[4px] flex flex-col gap-[10px]">
                  <label className="flex cursor-pointer items-center gap-[10px] text-[14px] text-neutral-800">
                    <input
                      type="checkbox"
                      {...register("saveAddress")}
                      className="h-[18px] w-[18px] shrink-0 rounded accent-neutral-900"
                    />
                    Save this information for next time
                  </label>
                  <CheckRow checked={textOffers} onChange={setTextOffers}>
                    Text me with news and offers
                  </CheckRow>
                </div>
              </form>
            ) : null}
          </section>

          {/* Shipping method */}
          <section className="mt-[32px]">
            <h3 className="text-[17px] font-semibold text-neutral-900">Shipping method</h3>
            <div className="mt-[14px] flex items-center justify-between rounded-[8px] border border-neutral-900 bg-[#F5F5F5] px-[16px] py-[16px]">
              <span className="text-[14px] text-neutral-900">Standard Shipping</span>
              <span className="text-[14px] font-semibold text-neutral-900">
                {shippingCost === 0 ? "FREE" : formatPrice(shippingCost, cart.currency)}
              </span>
            </div>
          </section>

          {/* Payment */}
          <section className="mt-[32px]">
            <h2 className="text-[21px] font-semibold text-neutral-900">Payment</h2>
            <p className="mt-[4px] text-[13px] text-neutral-500">
              All transactions are secure and encrypted.
            </p>
            <div className="mt-[14px] overflow-hidden rounded-[8px] border border-neutral-300">
              {enabledOptions.map((opt, i) => {
                const active = paymentMethod === opt.id;
                const showCards = opt.id === "sslcommerz" || opt.id === "stripe" || opt.id === "card";
                return (
                  <div key={opt.id} className={cn(i > 0 && "border-t border-neutral-300")}>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod(opt.id)}
                      aria-pressed={active}
                      className={cn(
                        "flex w-full items-center justify-between gap-[12px] px-[16px] py-[15px] text-left transition-colors",
                        active ? "bg-white" : "bg-white hover:bg-neutral-50/60",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-[12px]">
                        <RadioDot active={active} />
                        <span className={cn("truncate text-[14px] text-neutral-900", active && "font-semibold")}>
                          {opt.label}
                        </span>
                      </span>
                      {showCards ? <CardBadges /> : <WalletBadge id={opt.id} />}
                    </button>
                    {active ? (
                      <div className="border-t border-neutral-200 bg-[#FAFAFA] px-[24px] py-[20px] text-center text-[13px] leading-relaxed text-neutral-600">
                        {opt.description}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Billing address */}
          <section className="mt-[32px]">
            <h2 className="text-[21px] font-semibold text-neutral-900">Billing address</h2>
            <div className="mt-[14px] overflow-hidden rounded-[8px] border border-neutral-300">
              <button
                type="button"
                onClick={() => setBillingSame(true)}
                aria-pressed={billingSame}
                className={cn(
                  "flex w-full items-center gap-[12px] px-[16px] py-[15px] text-left transition-colors",
                  billingSame ? "bg-white" : "hover:bg-neutral-50/60",
                )}
              >
                <RadioDot active={billingSame} />
                <span className={cn("text-[14px] text-neutral-900", billingSame && "font-semibold")}>
                  Same as shipping address
                </span>
              </button>
              <button
                type="button"
                onClick={() => setBillingSame(false)}
                aria-pressed={!billingSame}
                className={cn(
                  "flex w-full items-center gap-[12px] border-t border-neutral-300 px-[16px] py-[15px] text-left transition-colors",
                  !billingSame ? "bg-white" : "hover:bg-neutral-50/60",
                )}
              >
                <RadioDot active={!billingSame} />
                <span className={cn("text-[14px] text-neutral-900", !billingSame && "font-semibold")}>
                  Use a different billing address
                </span>
              </button>
              {!billingSame ? (
                <div className="border-t border-neutral-200 bg-[#FAFAFA] px-[16px] py-[16px]">
                  <textarea
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    placeholder="Full billing address"
                    rows={3}
                    maxLength={500}
                    className="w-full rounded-[8px] border border-neutral-300 bg-white px-[12px] py-[10px] text-[14px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                  />
                </div>
              ) : null}
            </div>
          </section>

          {/* Order note */}
          <section className="mt-[32px]">
            <h3 className="text-[17px] font-semibold text-neutral-900">
              Order note <span className="text-[13px] font-normal text-neutral-400">(optional)</span>
            </h3>
            <textarea
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="Anything our delivery team should know?"
              rows={3}
              maxLength={1000}
              className="mt-[14px] w-full rounded-[8px] border border-neutral-300 bg-white px-[12px] py-[12px] text-[14px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </section>

          {/* Complete order */}
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={isPlacing}
            className="mt-[24px] flex h-[56px] w-full items-center justify-center rounded-[8px] bg-neutral-900 text-[15px] font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPlacing ? <Spinner className="text-white" /> : paymentMethod === "cod" ? "Complete order" : "Pay now"}
          </button>
          <p className="mt-[12px] text-center text-[12px] text-neutral-500">
            By placing your order you agree to our{" "}
            <Link href="/terms" className="underline underline-offset-2">
              terms
            </Link>
            .
          </p>
        </div>
      </div>

      {/* ── RIGHT: order summary (desktop) ─────────────────────────────── */}
      <aside className="hidden border-l border-neutral-200 bg-[#F5F5F5] lg:block">
        <div className="sticky top-0 w-full max-w-[480px] px-[40px] py-[40px]">{summary}</div>
      </aside>
    </div>
  );
}

/* ───────────────────── Order summary ───────────────────── */

interface OrderSummaryProps {
  cart: ServerCart;
  appliedCoupon: AppliedCoupon | null;
  couponError: { code: CartCouponRejectionCode; message: string } | null;
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
}

function OrderSummary({
  cart,
  appliedCoupon,
  couponError,
  subtotal,
  discount,
  shippingCost,
  total,
}: OrderSummaryProps) {
  return (
    <div>
      <ul className="flex flex-col gap-[18px]">
        {cart.items.map((it) => (
          <li key={it._id} className="flex items-center gap-[14px]">
            <div className="relative h-[64px] w-[64px] shrink-0 rounded-[8px] border border-neutral-300 bg-white">
              {it.image ? (
                <Image
                  src={it.image}
                  alt={it.title}
                  fill
                  sizes="64px"
                  className="rounded-[8px] object-cover"
                />
              ) : null}
              <span className="absolute -right-[8px] -top-[8px] flex h-[21px] min-w-[21px] items-center justify-center rounded-full bg-neutral-800 px-[6px] text-[11px] font-medium text-white">
                {it.qty}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[14px] leading-snug text-neutral-900">{it.title}</p>
              {it.options && Object.keys(it.options).length > 0 ? (
                <p className="mt-[2px] truncate text-[12px] uppercase text-neutral-500">
                  {Object.values(it.options).join(" / ")}
                </p>
              ) : null}
              <AddOnBreakdown price={it.price} options={it.options} currency={cart.currency} />
            </div>
            <span className="shrink-0 text-[14px] text-neutral-900">
              {formatPrice(it.price * it.qty, cart.currency)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-[24px] flex flex-col gap-[10px] text-[14px]">
        <div className="flex justify-between">
          <span className="text-neutral-700">
            Subtotal · {cart.itemCount} item{cart.itemCount === 1 ? "" : "s"}
          </span>
          <span className="font-medium text-neutral-900">
            {formatPrice(subtotal, cart.currency)}
          </span>
        </div>
        {appliedCoupon ? (
          <div className="flex justify-between">
            <span className="text-neutral-700">Discount ({appliedCoupon.code})</span>
            <span className="font-medium text-neutral-900">
              −{formatPrice(discount, cart.currency)}
            </span>
          </div>
        ) : cart.couponCode && couponError ? (
          <div className="flex justify-between">
            <span className="text-neutral-700">Coupon ({cart.couponCode})</span>
            <span className="text-neutral-500">{couponError.message}</span>
          </div>
        ) : null}
        <div className="flex justify-between">
          <span className="flex items-center gap-[4px] text-neutral-700">
            Shipping
            <HelpCircle className="h-[14px] w-[14px] text-neutral-400" aria-hidden />
          </span>
          <span className="font-semibold text-neutral-900">
            {shippingCost === 0 ? "FREE" : formatPrice(shippingCost, cart.currency)}
          </span>
        </div>
      </div>

      <div className="mt-[16px] flex items-baseline justify-between border-t border-neutral-300 pt-[16px]">
        <span className="text-[19px] font-semibold text-neutral-900">Total</span>
        <span className="flex items-baseline gap-[8px]">
          <span className="text-[12px] text-neutral-500">{cart.currency}</span>
          <span className="text-[19px] font-semibold text-neutral-900">
            {formatPrice(total, cart.currency)}
          </span>
        </span>
      </div>
    </div>
  );
}

/**
 * Per-line customization cost breakdown in the order summary. Rebuilt from
 * the line's option strings + the public customization config so customers
 * see exactly where a personalised jersey's extra cost comes from before
 * placing the order.
 */
function AddOnBreakdown({
  price,
  options,
  currency,
}: {
  price: number;
  options?: Record<string, string>;
  currency: string;
}) {
  const hasCustomOptions = Boolean(options?.Name || options?.Number || options?.Patches);
  const { data: customizations } = usePublicCustomizations(hasCustomOptions);
  const { basePrice, addOns } = deriveAddOns(price, options, customizations);
  if (!addOns || addOns.length === 0) return null;
  return (
    <div className="mt-[6px] flex flex-col gap-px rounded-[4px] border border-neutral-200 bg-white px-[8px] py-[6px] text-[11px]">
      <div className="flex justify-between text-neutral-500">
        <span>Base price</span>
        <span className="tabular-nums">{formatPrice(basePrice ?? price, currency)}</span>
      </div>
      {addOns.map((a, i) => (
        <div key={i} className="flex justify-between text-neutral-500">
          <span>+ {a.label}</span>
          <span className="tabular-nums">{formatPrice(a.amount, currency)}</span>
        </div>
      ))}
      <div className="flex justify-between border-t border-neutral-200 pt-px font-medium text-neutral-900">
        <span>Per item</span>
        <span className="tabular-nums">{formatPrice(price, currency)}</span>
      </div>
    </div>
  );
}

/* ───────────────────── helpers ───────────────────── */

function estimateShipping(
  district?: string,
  subtotal = 0,
  delivery?: { insideDhaka?: number; outsideDhaka?: number; freeShippingThreshold?: number },
): number {
  const threshold = delivery?.freeShippingThreshold ?? 0;
  if (threshold > 0 && subtotal >= threshold) return 0;
  const isDhaka = district?.trim().toLowerCase() === "dhaka";
  return isDhaka ? (delivery?.insideDhaka ?? 80) : (delivery?.outsideDhaka ?? 130);
}

function getDistrictFromSelection(
  addresses: Address[] | undefined,
  selectedId: string | "new" | null,
  fallback?: string,
): string | undefined {
  if (selectedId && selectedId !== "new" && addresses) {
    return addresses.find((a) => a._id === selectedId)?.district;
  }
  return fallback;
}
