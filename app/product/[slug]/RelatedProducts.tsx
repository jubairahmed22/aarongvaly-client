import { ProductRow } from "@/components/composed";
import type { ProductSummary } from "@/types/catalog";
import { cn } from "@/lib/utils/cn";

export interface RelatedProductsProps {
  products: ProductSummary[];
  className?: string;
}

export function RelatedProducts({ products, className }: RelatedProductsProps) {
  if (products.length === 0) return null;
  return (
    <ProductRow
      title="You might also like"
      products={products}
      viewAllHref="/all-products"
      plain
      className={cn(className)}
    />
  );
}
