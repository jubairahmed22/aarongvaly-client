import type { Metadata } from "next";
import axios from "axios";
import { Navbar, Footer, MobileHomeHeader, MobileBottomNav } from "@/components/layout";
import type {
  BrandLite,
  CategoryNode,
  SubCategory,
  ChildCategory,
} from "@/components/layout";
import { HomeCategoryShowcase, HomeBanner } from "@/components/composed";
import type { HomeCategoryShowcaseTile, HomeBannerSlide } from "@/components/composed";
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/seo";
import { homeMetadata } from "@/lib/seo/metadata";
import { COMPANY } from "@/lib/entity/company";
import { getSiteSettings } from "@/lib/siteSettings.server";
import type { ApiResponse } from "@/types/api";
import type { BrandDetail, CategoryTreeNode } from "@/types/catalog";
import type { Offer, OfferBanner, PublicListOffersResponse } from "@/types/offer";
import type { HomeCategoryShowcaseCategoryRef, SiteSettingsHomeBannerSlide } from "@/types/siteSettings";

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
  // The homepage is a cover page - banner plus the top-categories grid. It
  // deliberately lists no products, so nothing here fetches any: the previous
  // version fired up to 26 product requests per render to fill rows that are
  // now gone.
  const [categoryTree, brandList, liveOffers, siteSettings] = await Promise.all([
    fetchCategoryTree(),
    fetchBrands(),
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

  // The two homepage banner carousels, both admin-managed at /admin/offers:
  // one above the category grid, one below it. Active slides only, in the
  // order the admin arranged them.
  const toBannerSlides = (items: SiteSettingsHomeBannerSlide[] | undefined): HomeBannerSlide[] =>
    (items ?? [])
      .filter((item) => item.isActive && item.image)
      .sort((a, b) => a.order - b.order)
      .map((item) => ({ key: item._id, image: item.image, href: item.href || undefined }));

  const homeBannerSlides = toBannerSlides(siteSettings?.homeBanner);
  const homeBannerSecondarySlides = toBannerSlides(siteSettings?.homeBannerSecondary);

  const navCategories = categoryTree.map(toNavCategory);
  const navBrands: BrandLite[] = brandList.map((b) => ({
    name: b.name,
    slug: b.slug,
    logo: b.logo,
  }));


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

      {/* The whole page: banner, categories, second banner. No product rows and
          no offer carousel - browsing starts from a category, not from the
          homepage. Each block renders nothing when its admin list is empty, so
          the page collapses gracefully rather than leaving a hole. All three
          are managed at /admin/offers.

          Only the top banner loads eagerly: it is the LCP element. The lower
          one is below the fold on every realistic viewport, so it stays lazy
          instead of competing for bandwidth during first paint. */}
      <main className="flex flex-1 flex-col">
        <HomeBanner slides={homeBannerSlides} />
        <HomeCategoryShowcase items={homeCategoryShowcaseTiles} />
        <HomeBanner slides={homeBannerSecondarySlides} eager={false} />
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
