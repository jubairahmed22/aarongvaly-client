"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, ShoppingBag } from "lucide-react";
import { Dropdown, DropdownTrigger, DropdownMenu, useDropdown } from "@/components/complex";
import { CategoryIcon } from "@/lib/utils/categoryIcon";
import { cn } from "@/lib/utils/cn";
import type { CategoryNode, ChildCategory, SubCategory } from "./CategoryMenu";

export interface AllCategoriesMenuProps {
  categories: CategoryNode[];
}

/**
 * The "All" tab leading the desktop category strip - styled as a plain item
 * matching the rest of CategoryMenu's row (icon + label + underline), not a
 * separate pill/button. Opens a full directory of every department,
 * expandable in place down to subcategories and child categories (not just
 * the top-level list the per-item mega-menu already covers via hover).
 */
export function AllCategoriesMenu({ categories }: AllCategoriesMenuProps) {
  if (categories.length === 0) return null;

  return (
    <Dropdown className="shrink-0">
      <AllTrigger />
      <DropdownMenu align="start" className="max-h-[75vh] w-[320px] overflow-y-auto p-0">
        <ul>
          {categories.map((c) => (
            <DirectoryRow key={c.slug} category={c} />
          ))}
        </ul>
      </DropdownMenu>
    </Dropdown>
  );
}

/**
 * "All" represents the default browse-everything view, so it reads as the
 * current tab only while no specific department is - on `/category/*` or
 * `/brands` the sliding indicator in CategoryMenu owns the underline instead,
 * keeping exactly one marker on the strip at any time.
 *
 * Its underline animates with a scaleX wipe rather than appearing instantly,
 * to match the way CategoryMenu's indicator glides.
 */
function AllTrigger() {
  const { open } = useDropdown();
  const pathname = usePathname();
  const isCurrent = !pathname.startsWith("/category/") && !pathname.startsWith("/brands");
  const lit = isCurrent || open;

  return (
    <DropdownTrigger className="relative inline-flex h-full items-center gap-1.5 whitespace-nowrap px-3.5 pb-[11px] pt-2.5 text-sm font-semibold transition-colors duration-200">
      <ShoppingBag
        className={cn("h-[15px] w-[15px] transition-colors duration-200", lit ? "text-accent" : "text-neutral-500")}
        aria-hidden
      />
      <span className={cn("transition-colors duration-200", lit ? "text-accent" : "text-neutral-600")}>All</span>
      <ChevronDown
        className={cn(
          "h-[12px] w-[12px] transition-transform duration-200",
          lit ? "text-accent/70" : "text-neutral-400",
          open && "rotate-180",
        )}
        aria-hidden
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-[14px] bottom-0 h-[2px] origin-left rounded-full bg-accent transition-transform duration-300 ease-out"
        style={{ transform: `scaleX(${lit ? 1 : 0})` }}
      />
    </DropdownTrigger>
  );
}

/* ─── One expandable top-level row: name (navigates) + chevron (expands) ─── */

function DirectoryRow({ category }: { category: CategoryNode }) {
  const { setOpen } = useDropdown();
  const [expanded, setExpanded] = React.useState(false);
  const subs = category.children ?? [];
  const hasSubs = subs.length > 0;

  return (
    <li className="border-b border-neutral-100 last:border-0">
      <div className="flex items-stretch">
        <Link
          href={`/category/${category.slug}`}
          onClick={() => setOpen(false)}
          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-ink hover:bg-neutral-50"
        >
          <CategoryIcon name={category.icon} className="h-[13px] w-[13px] shrink-0 text-neutral-500" strokeWidth={1.75} aria-hidden />
          <span className="truncate">{category.name}</span>
        </Link>
        {hasSubs ? (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? `Collapse ${category.name}` : `Expand ${category.name}`}
            aria-expanded={expanded}
            className="flex shrink-0 items-center px-3 text-neutral-400 hover:bg-neutral-50 hover:text-ink"
          >
            <ChevronRight className={cn("h-[14px] w-[14px] transition-transform duration-150", expanded && "rotate-90")} aria-hidden />
          </button>
        ) : null}
      </div>

      {expanded && hasSubs ? (
        <ul className="bg-neutral-50 pb-1">
          {subs.map((sub) => (
            <SubRow key={sub.slug} sub={sub} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/* ─── One subcategory row: name (navigates) + its own children listed under it ─── */

function SubRow({ sub }: { sub: SubCategory }) {
  const { setOpen } = useDropdown();
  const children = sub.children ?? [];

  return (
    <li>
      <Link
        href={`/category/${sub.slug}`}
        onClick={() => setOpen(false)}
        className="flex items-center gap-2 py-2 pl-9 pr-3 text-[13px] text-neutral-700 hover:text-ink"
      >
        <CategoryIcon name={sub.icon} className="h-[13px] w-[13px] shrink-0 text-neutral-400" strokeWidth={1.75} aria-hidden />
        <span className="truncate">{sub.name}</span>
      </Link>
      {children.length > 0 ? (
        <ul>
          {children.map((child) => (
            <ChildRow key={child.slug} child={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/* ─── One child-category row - deepest level, always shown when its parent's subcategory list is. ─── */

function ChildRow({ child }: { child: ChildCategory }) {
  const { setOpen } = useDropdown();
  return (
    <li>
      <Link
        href={`/category/${child.slug}`}
        onClick={() => setOpen(false)}
        className="flex items-center gap-2 py-1.5 pl-[52px] pr-3 text-[12px] text-neutral-500 hover:text-ink"
      >
        <span className="truncate">{child.name}</span>
      </Link>
    </li>
  );
}
