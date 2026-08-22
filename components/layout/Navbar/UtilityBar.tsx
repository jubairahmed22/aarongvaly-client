import Link from "next/link";
import { HelpCircle, MapPin, Package, Store } from "lucide-react";
import { COMPANY } from "@/lib/entity/company";
import { NotificationsBell } from "./NotificationsBell";

/**
 * Thin dark utility strip above the main header (Evaly/Daraz-style layout):
 * delivery location + quick links on the left, notifications/locale/currency
 * on the right. Desktop only - the mobile header is a separate, self-contained
 * compact layout below `lg`.
 */
export function UtilityBar() {
  return (
    <div className="hidden border-b border-white/10 bg-ink lg:block">
      <div className="mx-auto flex h-[34px] w-full items-center justify-between lg:w-[82%]">
        <nav aria-label="Quick links" className="flex items-center gap-4 text-[12px] text-neutral-300">
          <Link href="/account/addresses" className="flex items-center gap-1 transition-colors hover:text-paper">
            <MapPin className="h-[13px] w-[13px] text-neutral-400" aria-hidden />
            Deliver to <span className="font-semibold text-paper">Dhaka</span>
          </Link>
          <Link href="/contact" className="hidden items-center gap-1 transition-colors hover:text-paper sm:flex">
            <Store className="h-[13px] w-[13px] text-neutral-400" aria-hidden />
            Sell on {COMPANY.name}
          </Link>
          <Link href="/account/orders" className="hidden items-center gap-1 transition-colors hover:text-paper md:flex">
            <Package className="h-[13px] w-[13px] text-neutral-400" aria-hidden />
            Track order
          </Link>
          <Link href="/faq" className="hidden items-center gap-1 transition-colors hover:text-paper md:flex">
            <HelpCircle className="h-[13px] w-[13px] text-neutral-400" aria-hidden />
            Help center
          </Link>
        </nav>

        <div className="flex items-center gap-3 text-[12px] text-neutral-300">
          <NotificationsBell compact />
          <span className="hidden sm:inline">বাংলা / EN</span>
          <span className="font-medium text-paper">{COMPANY.currency} ৳</span>
        </div>
      </div>
    </div>
  );
}
