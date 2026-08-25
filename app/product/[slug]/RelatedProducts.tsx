import type { ProductSummary } from "@/types/catalog";
import { ProductRail } from "./ProductRail";

export interface RelatedProductsProps {
  products: ProductSummary[];
  className?: string;
}

export function RelatedProducts({ products, className }: RelatedProductsProps) {
  if (products.length === 0) return null;
  return (
    <ProductRail
      title="Related Products"
      items={products.map((p) => ({
        slug: p.slug,
        title: p.title,
        image: p.images[0]?.url ?? "",
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        currency: p.currency,
      }))}
      className={className}
    />
  );
}
