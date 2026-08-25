import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { CheckoutClient } from "./CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

/**
 * Shopify-style checkout chrome: a minimal white header with the wordmark
 * centered and a bag icon back to the cart — no navbar/footer distractions.
 * The split white/gray two-column body is rendered by CheckoutClient.
 */
export default function CheckoutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="relative flex h-[64px] shrink-0 items-center justify-center border-b border-neutral-200 bg-white px-2">
        <Link href="/" aria-label="Back to store" className="flex items-center">
          <Image
            src="/logo-wordmark.png"
            alt="aarongvaly"
            width={150}
            height={36}
            priority
            className="h-[32px] w-auto object-contain"
          />
        </Link>
        <Link
          href="/cart"
          aria-label="View cart"
          className="absolute right-[16px] top-1/2 -translate-y-1/2 p-[8px] text-neutral-700 transition-colors hover:text-neutral-900 sm:right-[32px]"
        >
          <ShoppingBag className="h-[20px] w-[20px]" aria-hidden />
        </Link>
      </header>
      <main className="flex-1">
        <CheckoutClient />
      </main>
    </div>
  );
}
