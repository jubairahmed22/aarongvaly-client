/**
 * Storefront site settings - singleton company profile, delivery charges,
 * contact card, and the long-form policy pages (terms, returns, shipping).
 *
 * Mirrors backend/src/models/SiteSettings.ts. The public read endpoint and
 * the admin read endpoint return the same shape; the only difference is who
 * may call the PUT.
 */
export interface SiteSettingsFaq {
  _id?: string;
  question: string;
  answer: string;
}

export interface SiteSettingsContact {
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
}

export interface SiteSettingsDelivery {
  insideDhaka: number;
  outsideDhaka: number;
  /** Order subtotal at or above which delivery is free (0 disables). */
  freeShippingThreshold: number;
}

export interface SiteSettingsAnnouncementBar {
  /** Editable ticker items. Free-delivery text is injected automatically from the threshold. */
  items: string[];
}

/**
 * Product ref populated onto the homepage hero's showcase carousel - a
 * superset of what the card needs to render (image, price, discount %,
 * and the seller/store badge).
 */
export interface HeroBannerProductRef {
  _id: string;
  title: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  stock: number;
  images?: Array<{ url: string; alt?: string }>;
  seller?: { _id: string; name: string; storeSlug?: string | null; avatar?: string };
}

/**
 * Homepage hero banner - retired. Neither the admin editor nor the
 * storefront render this anymore (replaced by the category showcase +
 * dual banner carousels below); the type/field are kept only so any data
 * still sitting in an existing SiteSettings document round-trips cleanly
 * through reads instead of silently dropping.
 */
export interface SiteSettingsHeroBanner {
  badgeText: string;
  headline: string;
  subheadline: string;
  products: Array<HeroBannerProductRef | string>;
  backgroundImage?: string;
  backgroundImagePublicId?: string;
  backgroundVideo?: string;
  backgroundVideoPublicId?: string;
}

/**
 * Category ref populated onto a homeCategoryShowcase tile - everything the
 * storefront needs to render + link the tile: `name` is the tile title,
 * `image` is the tile image, `path` drives `/category/:path`. There's no
 * separate tile-level image/title - the category's own fields are always
 * used, so editing a category's photo/name in Categories admin updates every
 * homepage tile pointing at it automatically.
 */
export interface HomeCategoryShowcaseCategoryRef {
  _id: string;
  name: string;
  slug: string;
  path: string;
  image?: string;
}

/**
 * One tile in the homepage "shop by category" strip - a Zepto-style row of
 * image + title cards rendered right under the navbar. `category` can point
 * at any node in the tree (top-level, sub-category, or child category); the
 * storefront just follows its `path` and reads its `name`/`image`. `category`
 * is a plain id on write, a populated `HomeCategoryShowcaseCategoryRef` on
 * read (same list-vs-detail split as `heroBanner.products`). Populates to
 * `null` (rather than a string) if the referenced category was since deleted
 * - consumers should treat a falsy `category` the same as a dangling ref.
 */
export interface SiteSettingsHomeCategoryShowcaseItem {
  _id: string;
  category: HomeCategoryShowcaseCategoryRef | string | null;
  order: number;
  isActive: boolean;
}

/**
 * One slide in the homepage banner - the single full-width carousel that sits
 * directly under the navbar. Deliberately just an image + a link - no
 * title/subtitle/CTA text - since the whole banner is the click target and any
 * copy lives inside the uploaded artwork itself. `href` empty means the slide
 * isn't clickable.
 */
export interface SiteSettingsHomeBannerSlide {
  _id: string;
  image: string;
  imagePublicId?: string;
  href: string;
  order: number;
  isActive: boolean;
}

export interface SiteSettingsIntegrations {
  gtmId?: string;
  ga4Id?: string;
  googleAdsId?: string;
  googleAdsLabel?: string;
  metaPixelId?: string;
  tiktokPixelId?: string;
  snapchatPixelId?: string;
  pinterestTagId?: string;
  twitterPixelId?: string;
  hotjarSiteId?: string;
}

export type WhatsAppProvider = "twilio" | "wati" | "ultramsg" | "webhook" | "";

export interface SiteSettingsWhatsApp {
  provider: WhatsAppProvider;
  enabled: boolean;
  /* Twilio */
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioFrom: string;
  /* WATI */
  watiApiUrl: string;
  watiApiToken: string;
  /* UltraMsg */
  ultraMsgInstanceId: string;
  ultraMsgToken: string;
  /* Generic webhook */
  webhookUrl: string;
  webhookToken: string;
  /* Triggers */
  notifyOnConfirmed: boolean;
  notifyOnShipped: boolean;
  notifyOnDelivered: boolean;
}

export interface SiteSettings {
  _id: string;
  key: string;
  companyName: string;
  companyTitle: string;
  companyLogo: string;
  /** Separate logo shown on printed invoices only - falls back to companyLogo when unset. */
  invoiceLogo: string;
  shortDescription: string;
  delivery: SiteSettingsDelivery;
  announcementBar?: SiteSettingsAnnouncementBar;
  heroBanner?: SiteSettingsHeroBanner;
  homeCategoryShowcase?: SiteSettingsHomeCategoryShowcaseItem[];
  homeBanner?: SiteSettingsHomeBannerSlide[];
  contact: SiteSettingsContact;
  termsAndConditions: string;
  returnPolicy: string;
  shippingDetails: string;
  faqs: SiteSettingsFaq[];
  integrations?: SiteSettingsIntegrations;
  whatsappNotifications?: SiteSettingsWhatsApp;
  enabledPaymentMethods?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * PUT body - every field is optional so the admin form can submit a partial
 * patch (just the delivery charge, for example) without re-sending every
 * other field. Nested objects are merged sub-document-deep on the server.
 */
export interface UpdateSiteSettingsBody {
  companyName?: string;
  companyTitle?: string;
  companyLogo?: string;
  invoiceLogo?: string;
  shortDescription?: string;
  delivery?: Partial<SiteSettingsDelivery>;
  announcementBar?: Partial<SiteSettingsAnnouncementBar>;
  heroBanner?: {
    badgeText?: string;
    headline?: string;
    subheadline?: string;
    products?: string[];
    backgroundImage?: string;
    backgroundImagePublicId?: string;
    backgroundVideo?: string;
    backgroundVideoPublicId?: string;
  };
  /** Full ordered replace - the admin section always submits the whole list, same contract as offer banners. */
  homeCategoryShowcase?: Array<{
    _id?: string;
    category: string;
    isActive?: boolean;
  }>;
  /** Full ordered replace - the whole slide list is submitted on every save. */
  homeBanner?: Array<{ _id?: string; image: string; imagePublicId?: string; href?: string; isActive?: boolean }>;
  contact?: Partial<SiteSettingsContact>;
  termsAndConditions?: string;
  returnPolicy?: string;
  shippingDetails?: string;
  faqs?: Array<{ question: string; answer: string }>;
  integrations?: Partial<SiteSettingsIntegrations>;
  whatsappNotifications?: Partial<SiteSettingsWhatsApp>;
  enabledPaymentMethods?: string[];
}
