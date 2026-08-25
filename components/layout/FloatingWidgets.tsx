"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ShoppingCart, MessageCircle } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useHydrated } from "@/hooks/useHydrated";
import { useUnifiedCart } from "@/hooks/useUnifiedCart";
import { usePublicSiteSettings } from "@/hooks/useSiteSettings";
import { formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { COMPANY } from "@/lib/entity/company";
// import { ChatWidget } from "./ChatWidget"; // (hidden - see render below)

/**
 * Storefront floating widgets - the persistent right-edge cart bubble, the
 * AI shopping-assistant chat bubble, and the bottom-right WhatsApp shortcut.
 * Mounted globally from the root layout so every page gets them with zero
 * per-page wiring.
 *
 * The cart bubble shows live item count + subtotal and opens the shared
 * {@link import("./CartDrawer").CartDrawer} via `uiStore.cartDrawerOpen` -
 * the same panel the navbar's "Shopping Cart" button opens. It used to own a
 * second, near-identical mini-cart drawer of its own; that copy read the
 * local zustand store directly, so a logged-in shopper whose cart lives
 * server-side saw different contents depending on which cart button they
 * pressed. One drawer, one source of truth.
 *
 * The chat bubble (`ChatWidget`) opens the same Drawer pattern with a
 * conversation that can search the catalog, answer store questions, and
 * place COD orders. The WhatsApp button deep-links to wa.me with whatever
 * number the admin configured in Site Settings → Contact.
 *
 * All three are auto-suppressed on /admin/*, /login, /register, /checkout
 * and any auth route - surfaces where they'd compete with the primary
 * action or where contacting support doesn't make sense (e.g. an admin
 * already inside the dashboard).
 */
export function FloatingWidgets() {
  const pathname = usePathname() ?? "/";

  // Routes where the floating bubble + WhatsApp button add more noise than
  // value. /cart and /checkout already have a primary cart UI; admin
  // routes have their own chrome.
  const hidden =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/verify") ||
    pathname.startsWith("/forgot") ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/checkout");

  if (hidden) return null;

  return (
    <>
      <CartBubble />
      {/* AI chat assistant temporarily hidden - nothing deleted, the
          ChatWidget component and its API wiring stay in place. Re-enable by
          uncommenting this line (and its import above). */}
      {/* <ChatWidget /> */}
      <WhatsAppBubble />
    </>
  );
}

/* ─────────────────────────────────── Cart bubble ─────────────────────── */

function CartBubble() {
  const setCartDrawerOpen = useUIStore((s) => s.setCartDrawerOpen);

  // Same unified source as the drawer itself, so the pill's count/subtotal
  // can never disagree with what opening it reveals.
  const { itemCount, subtotal, currency } = useUnifiedCart();

  // Persisted cart values can't reach the markup until after hydration.
  const hydrated = useHydrated();
  const showCount = hydrated ? itemCount : 0;
  const showSubtotal = hydrated ? subtotal : 0;

  return (
    /* The "1 ITEM / Tk 199" pill, pinned to the right edge of the viewport a
       bit above mid-screen so it sits comfortably below the WhatsApp button
       column without colliding with sticky filters or the search overlay. */
    <button
      type="button"
      onClick={() => setCartDrawerOpen(true)}
      aria-label="Open cart"
      className="fixed right-0 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-stretch overflow-hidden text-left shadow-md lg:flex"
    >
      <span className="flex items-center justify-center gap-[6px] bg-ink px-[10px] py-[7px] text-paper">
        <ShoppingCart className="h-[15px] w-[15px]" aria-hidden />
        <span className="text-[9px] font-bold uppercase tracking-[0.12em]">
          {showCount} {showCount === 1 ? "Item" : "Items"}
        </span>
      </span>
      <span className="border-t border-white/15 bg-ink px-[10px] py-[7px] text-center text-[10px] font-bold text-paper">
        {formatPrice(showSubtotal, currency)}
      </span>
    </button>
  );
}

/* ─────────────────────────────────── WhatsApp bubble ─────────────────── */

/**
 * Strip every character that isn't a digit. WhatsApp's wa.me protocol
 * expects E.164 without the leading "+", so a configured value like
 * "+880 1700-123 456" needs to become "8801700123456".
 */
function toWaNumber(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, "");
  return digits.length >= 6 ? digits : null;
}

function WhatsAppBubble() {
  const { data: settings } = usePublicSiteSettings();
  const number = toWaNumber(settings?.contact?.whatsapp ?? settings?.contact?.phone);

  // Don't render until we know there's a number to dial - otherwise the
  // button is a dead click.
  if (!number) return null;

  // Pre-filled message gives the support agent helpful context out of the
  // gate. Encoded server-side to survive the URL roundtrip.
  const text = encodeURIComponent(
    `Hi ${settings?.companyName ?? COMPANY.name}, I have a question about an order/product.`,
  );
  const href = `https://wa.me/${number}?text=${text}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className={cn(
        "fixed bottom-4 right-4 z-40 inline-flex h-[52px] w-[52px] items-center justify-center rounded-full text-paper shadow-lg",
        "bg-[#25D366] transition-transform hover:scale-105 hover:shadow-xl",
      )}
    >
      <MessageCircle className="h-[26px] w-[26px]" aria-hidden />
    </a>
  );
}
