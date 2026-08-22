"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@/components/complex";
import { cn } from "@/lib/utils/cn";
import type { CategoryNode } from "./CategoryMenu";

export interface SearchScope {
  /** Category path, or "" for "All". */
  slug: string;
  label: string;
}

export interface SearchScopeDropdownProps {
  categories: CategoryNode[];
  value: SearchScope;
  onChange: (scope: SearchScope) => void;
}

/**
 * The "All ▾" segment on the left of the desktop search bar - scopes the
 * search submit to a department (Evaly/Amazon-style). Sits flush against
 * SearchSuggestBox's "navbar" variant inside one shared pill.
 */
export function SearchScopeDropdown({ categories, value, onChange }: SearchScopeDropdownProps) {
  return (
    <Dropdown className="h-full shrink-0">
      <DropdownTrigger className="flex h-full items-center gap-1 whitespace-nowrap border-r border-neutral-300 px-3 text-[13px] font-medium text-neutral-600 transition-colors hover:text-ink">
        <span className="max-w-[110px] truncate">{value.label}</span>
        <ChevronDown className="h-3 w-3 shrink-0 text-neutral-400" aria-hidden />
      </DropdownTrigger>
      <DropdownMenu align="start" className="max-h-[70vh] min-w-[220px] overflow-y-auto">
        <DropdownItem
          className={cn(value.slug === "" && "bg-neutral-100 font-semibold")}
          onClick={() => onChange({ slug: "", label: "All Categories" })}
        >
          All Categories
        </DropdownItem>
        {categories.map((c) => (
          <DropdownItem
            key={c.slug}
            className={cn(value.slug === c.slug && "bg-neutral-100 font-semibold")}
            onClick={() => onChange({ slug: c.slug, label: c.name })}
          >
            {c.name}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
