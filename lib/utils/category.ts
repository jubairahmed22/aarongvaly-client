import type { SelectOption } from "@/components/composed";
import type { CategoryTreeNode } from "@/types/catalog";

/**
 * Flatten a category tree into a single indented option list - "Clothing",
 * "Clothing › Men", "Clothing › Men › Shirts" - so one <select> can pick a
 * category at any depth (top-level, sub-category, or child category).
 * Shared by the product create/edit forms and the products list filter.
 */
export function flattenCategoryTree(nodes: CategoryTreeNode[], prefix = ""): SelectOption[] {
  const out: SelectOption[] = [];
  for (const node of nodes) {
    if (!node.isActive) continue;
    const label = prefix ? `${prefix} › ${node.name}` : node.name;
    out.push({ value: node._id, label });
    if (node.children?.length) out.push(...flattenCategoryTree(node.children, label));
  }
  return out;
}

/**
 * Flatten a category tree into a lookup by id - same traversal/active-filter
 * as `flattenCategoryTree`, but keeps the full node (name, image, path, …)
 * instead of a select-option label. Used wherever a picker needs to resolve
 * more than just the display label for the selected id - e.g. the homepage
 * category-showcase tile editor, which auto-fills the tile's image/title
 * from the selected category's own fields.
 */
export function indexCategoryTree(
  nodes: CategoryTreeNode[],
  out: Map<string, CategoryTreeNode> = new Map(),
): Map<string, CategoryTreeNode> {
  for (const node of nodes) {
    if (!node.isActive) continue;
    out.set(node._id, node);
    if (node.children?.length) indexCategoryTree(node.children, out);
  }
  return out;
}
