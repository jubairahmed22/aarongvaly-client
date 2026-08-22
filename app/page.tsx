import type { Metadata } from "next";
import axios from "axios";
import { Navbar, Footer, MobileHomeHeader, MobileBottomNav } from "@/components/layout";
import type {
  BrandLite,
  CategoryNode,
  SubCategory,
  ChildCategory,
} from "@/components/layout";
import {
  CategoryTiles,
  HomeCategoryShowcase,
  HomeBannerCarousels,
  ProductRow,
  OfferBannerCarousel,
} from "@/components/composed";
import type { HomeCategoryShowcaseTile, HomeBannerCarouselSlide } from "@/components/composed";
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/seo";
import { homeMetadata } from "@/lib/seo/metadata";
import { COMPANY } from "@/lib/entity/company";
import { getSiteSettings } from "@/lib/siteSettings.server";
import type { ApiResponse } from "@/types/api";
import type { BrandDetail, CategoryTreeNode, ProductSummary } from "@/types/catalog";
import type { Offer, OfferBanner, PublicListOffersResponse } from "@/types/offer";
import type { HomeCategoryShowcaseCategoryRef, SiteSettingsHomeBannerCarouselItem } from "@/types/siteSettings";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:50001";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const revalidate = 300;

export const metadata: Metadata = homeMetadata();

/* ───────────────────── SSR fetchers ───────────────────── */

async function fetchCategoryTree(): Promise<CategoryTreeNode[]> {
  try {
    const res = await axios.get<ApiResponse<CategoryTreeNode[]>>(
      `${API_URL}/api/categories`,
      { params: { shape: "tree", isActive: true }, timeout: 8000 },
    );
    return res.data.success ? res.data.data : [];
  } catch {
    return [];
  }
}

async function fetchBrands(): Promise<BrandDetail[]> {
  try {
    const res = await axios.get<ApiResponse<BrandDetail[]>>(
      `${API_URL}/api/brands`,
      { params: { isActive: true, limit: 100 }, timeout: 8000 },
    );
    return res.data.success ? res.data.data : [];
  } catch {
    return [];
  }
}

async function fetchFeaturedProducts(): Promise<ProductSummary[]> {
  try {
    const res = await axios.get<ApiResponse<ProductSummary[]>>(
      `${API_URL}/api/products/featured`,
      { params: { limit: 8 }, timeout: 8000 },
    );
    return res.data.success ? res.data.data : [];
  } catch {
    return [];
  }
}

async function fetchNewArrivals(): Promise<ProductSummary[]> {
  try {
    const res = await axios.get<ApiResponse<ProductSummary[]>>(
      `${API_URL}/api/products`,
      { params: { sort: "newest", limit: 8 }, timeout: 8000 },
    );
    return res.data.success ? res.data.data : [];
  } catch {
    return [];
  }
}

async function fetchProductsByCategoryPath(path: string, limit = 8): Promise<ProductSummary[]> {
  try {
    const res = await axios.get<ApiResponse<ProductSummary[]>>(
      `${API_URL}/api/products`,
      { params: { categoryPath: path, sort: "newest", limit }, timeout: 8000 },
    );
    return res.data.success ? res.data.data : [];
  } catch {
    return [];
  }
}

async function fetchHomepageOffers(): Promise<Offer[]> {
  try {
    const res = await axios.get<ApiResponse<PublicListOffersResponse>>(
      `${API_URL}/api/offers`,
      { params: { sort: "ends-soonest", limit: 12 }, timeout: 8000 },
    );
    if (!res.data.success) return [];
    return res.data.data.offers;
  } catch {
    return [];
  }
}

/* ───────────────────── Mappers ───────────────────── */

function toChildCategory(node: CategoryTreeNode): ChildCategory {
  return { name: node.name, slug: node.path, icon: node.icon };
}

function toSubCategory(node: CategoryTreeNode): SubCategory {
  return {
    name: node.name,
    slug: node.path,
    icon: node.icon,
    children: node.children?.length ? node.children.map(toChildCategory) : undefined,
  };
}

function toNavCategory(node: CategoryTreeNode): CategoryNode {
  return {
    name: node.name,
    slug: node.path,
    icon: node.icon,
    children: node.children?.length ? node.children.map(toSubCategory) : undefined,
  };
}

/* ───────────────────── Page ───────────────────── */

export default async function HomePage() {
  const [categoryTree, brandList, featured, newArrivals, liveOffers, siteSettings] =
    await Promise.all([
      fetchCategoryTree(),
      fetchBrands(),
      fetchFeaturedProducts(),
      fetchNewArrivals(),
      fetchHomepageOffers(),
      getSiteSettings(),
    ]);

  // Homepage "shop by category" strip - admin-managed at /admin/offers.
  // Active tiles, sorted by order, category ref resolved to a /category/:path
  // link. Title/image are always the category's own name/image - there's no
  // separate tile-level override.
  const homeCategoryShowcaseTiles: HomeCategoryShowcaseTile[] = (siteSettings?.homeCategoryShowcase ?? [])
    // `item.category` populates to `null` (not a string) if the referenced
    // category was since deleted - guard against that dangling ref too, not
    // just the plain-id shape.
    .filter((item) => item.isActive && item.category && typeof item.category !== "string")
    .sort((a, b) => a.order - b.order)
    .map((item) => {
      const category = item.category as HomeCategoryShowcaseCategoryRef;
      return {
        key: item._id,
        title: category.name,
        image: category.image,
        href: `/category/${category.path}`,
      };
    });

  // Homepage dual banner carousels - admin-managed at /admin/offers. Each
  // side is its own ordered, active-only slide list.
  const toBannerSlides = (items: SiteSettingsHomeBannerCarouselItem[] | undefined): HomeBannerCarouselSlide[] =>
    (items ?? [])
      .filter((item) => item.isActive)
      .sort((a, b) => a.order - b.order)
      .map((item) => ({ key: item._id, image: item.image, href: item.href || undefined }));
  const homeBannerCarouselsLeft = toBannerSlides(siteSettings?.homeBannerCarousels?.left);
  const homeBannerCarouselsRight = toBannerSlides(siteSettings?.homeBannerCarousels?.right);

  // Mobile/tablet split of the banner pair: first carousel keeps the top
  // spot, the second renders after the Featured row (no back-to-back stack).
  // If the left list is empty the right one takes the top spot instead.
  const mobileFirstBanner =
    homeBannerCarouselsLeft.length > 0 ? homeBannerCarouselsLeft : homeBannerCarouselsRight;
  const mobileSecondBanner =
    homeBannerCarouselsLeft.length > 0 ? homeBannerCarouselsRight : [];

  const navCategories = categoryTree.map(toNavCategory);
  const navBrands: BrandLite[] = brandList.map((b) => ({
    name: b.name,
    slug: b.slug,
    logo: b.logo,
  }));

  const MAX_SUBCATEGORY_ROWS = 24;
  const subPairs = categoryTree
    .flatMap((parent) => (parent.children ?? []).map((sub) => ({ parent, sub })))
    .slice(0, MAX_SUBCATEGORY_ROWS);

  const subProducts = await Promise.all(
    subPairs.map(({ sub }) => fetchProductsByCategoryPath(sub.path, 8)),
  );

  const categorySections = (() => {
    const byParent = new Map<
      string,
      { parent: CategoryTreeNode; rows: { sub: CategoryTreeNode; products: ProductSummary[] }[] }
    >();
    subPairs.forEach(({ parent, sub }, i) => {
      const products = subProducts[i] ?? [];
      if (products.length === 0) return;
      if (!byParent.has(parent._id)) byParent.set(parent._id, { parent, rows: [] });
      byParent.get(parent._id)!.rows.push({ sub, products });
    });
    return Array.from(byParent.values()).filter((s) => s.rows.length > 0);
  })();

  const carouselOffers = liveOffers.filter((o) => o.showOnHomepage);

  const homepageBanners: OfferBanner[] = carouselOffers.flatMap((offer) =>
    offer.banners
      .filter((b) => b.isActive)
      .sort((a, b) => a.order - b.order)
      .map((b) => ({
        ...b,
        ctaHref: b.ctaHref || `/offers/${offer.slug}`,
        ctaLabel: b.ctaLabel || "Shop the offer",
      })),
  );

  return (
    <div className="flex min-h-screen flex-col bg-paper pb-[56px] text-ink lg:pb-0">
      {/* Desktop keeps the full navbar; on mobile its header rows are hidden
          and the Zepto-style MobileHomeHeader below takes over. MobileMenu
          (left sidebar) + CartDrawer stay mounted inside Navbar. */}
      <Navbar categories={navCategories} brands={navBrands} hideMobileHeader />

      {/* Mobile-only Zepto-style purple header: menu · delivery/location ·
          profile, sticky search + category tabs, offer banner. */}
      <MobileHomeHeader categories={navCategories} banners={homepageBanners} />

      {/* Shop-by-category strip - admin-managed at /admin/offers */}
      <HomeCategoryShowcase items={homeCategoryShowcaseTiles} />

      {/* Dual promo banner carousels - admin-managed at /admin/offers.
          Desktop (lg+): the original side-by-side pair. Mobile/tablet: only
          the first banner here - the second one renders after the Featured
          row instead of stacking back-to-back. */}
      <div className="hidden lg:block">
        <HomeBannerCarousels left={homeBannerCarouselsLeft} right={homeBannerCarouselsRight} />
      </div>
      <div className="lg:hidden">
        <HomeBannerCarousels left={mobileFirstBanner} right={[]} />
      </div>

      {/* Offer carousel - full bleed on desktop; on mobile it already renders
          inside the purple MobileHomeHeader block. */}
      {homepageBanners.length > 0 ? (
        <div className="hidden lg:block">
          <OfferBannerCarousel banners={homepageBanners} />
        </div>
      ) : null}

      <main className="container-screen flex flex-1 flex-col gap-4 py-3 md:gap-6 md:py-5">
        {/* Category collection tiles — "Shop by Collection" hidden on home page (kept for later use) */}
        {/* {categoryTree.length > 0 ? (
          <CategoryTiles categories={categoryTree} limit={8} />
        ) : null} */}

        {/* Featured products */}
        {featured.length > 0 ? (
          <ProductRow
            title="Featured"
            products={featured}
            viewAllHref="/all-products?sort=popular"
          />
        ) : null}

        {/* Second promo banner - mobile/tablet only, moved here from the
            banner pair up top so the two sliders don't stack back-to-back.
            Negative margins cancel main's container-screen gutters so it
            runs full-bleed like the first one. */}
        {mobileSecondBanner.length > 0 ? (
          <div className="-mx-4 md:-mx-6 lg:hidden">
            <HomeBannerCarousels left={mobileSecondBanner} right={[]} />
          </div>
        ) : null}

        {/* New arrivals */}
        {newArrivals.length > 0 ? (
          <ProductRow
            title="New Arrivals"
            products={newArrivals}
            viewAllHref="/all-products?sort=newest"
          />
        ) : null}

        {/* Per-category rows */}
        {categorySections.map(({ parent, rows }) => (
          <section key={parent._id} className="flex flex-col gap-2 md:gap-3">
            <h2 className="text-[22px] font-extrabold leading-tight text-ink sm:text-[26px]">{parent.name}</h2>
            {rows.map(({ sub, products }) => (
              <ProductRow
                key={sub._id}
                title={sub.name}
                products={products}
                viewAllHref={`/category/${sub.path}`}
              />
            ))}
          </section>
        ))}
      </main>

      <Footer />

      {/* Zepto-style fixed bottom nav - mobile only */}
      <MobileBottomNav />

      <OrganizationJsonLd
        url={SITE_URL}
        logo={`${SITE_URL}/logo.png`}
        sameAs={[...COMPANY.sameAs]}
      />
      <WebsiteJsonLd url={SITE_URL} />
    </div>
  );
}
