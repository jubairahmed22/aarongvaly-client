import type { SiteSettings } from "@/types/siteSettings";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export interface CompanyEntity {
  name: string;
  legalName: string;
  url: string;
  logo: string;
  description: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  sameAs: string[];
  areaServed: string;
  currency: string;
  policies: {
    terms?: string;
    returns?: string;
    shipping?: string;
  };
  faqs: Array<{ question: string; answer: string }>;
}

export const COMPANY = {
  name: "aarongvaly",
  legalName: "aarongvaly",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    "Your one-stop online marketplace for everything - electronics, fashion, home & living, beauty and more, all in one place. Fast delivery nationwide, easy returns, and prices you can count on.",
  areaServed: "BD",
  currency: "BDT",
  sameAs: [
    "https://facebook.com/aarongvaly",
    "https://instagram.com/aarongvaly",
  ],
  email: "support@aarongvaly.com",
  /**
   * Support opening hours shown in the footer's Customer Service column.
   *
   * PLACEHOLDER - SiteSettings has no business-hours field, so this is not
   * admin-editable yet. Edit it here, or ask for a `contact.supportHours`
   * field to be added to SiteSettings + the admin form.
   */
  supportHours: "Sunday–Thursday (10:30 AM–5:00 PM)",
} as const;

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const v of values) {
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

export function resolveCompany(settings?: SiteSettings | null): CompanyEntity {
  const c = settings?.contact;
  const social = [c?.facebook, c?.instagram, c?.youtube].filter(
    (u): u is string => !!u && u.trim().length > 0,
  );
  return {
    name: firstNonEmpty(settings?.companyName, COMPANY.name) ?? COMPANY.name,
    legalName: COMPANY.legalName,
    url: COMPANY.url,
    logo: firstNonEmpty(settings?.companyLogo, COMPANY.logo) ?? COMPANY.logo,
    description: firstNonEmpty(settings?.shortDescription, COMPANY.description) ?? COMPANY.description,
    email: firstNonEmpty(c?.email, COMPANY.email),
    phone: firstNonEmpty(c?.phone),
    whatsapp: firstNonEmpty(c?.whatsapp),
    address: firstNonEmpty(c?.address),
    sameAs: social.length > 0 ? social : [...COMPANY.sameAs],
    areaServed: COMPANY.areaServed,
    currency: COMPANY.currency,
    policies: {
      terms: firstNonEmpty(settings?.termsAndConditions),
      returns: firstNonEmpty(settings?.returnPolicy),
      shipping: firstNonEmpty(settings?.shippingDetails),
    },
    faqs: (settings?.faqs ?? [])
      .filter((f) => f.question && f.answer)
      .map((f) => ({ question: f.question, answer: f.answer })),
  };
}

export function reportEntityInconsistencies(settings?: SiteSettings | null): string[] {
  const issues: string[] = [];

  if (settings?.companyName && settings.companyName.trim() !== COMPANY.name) {
    issues.push(
      `Company name mismatch: SiteSettings="${settings.companyName}" vs COMPANY.name="${COMPANY.name}". Update lib/entity/company.ts to match.`,
    );
  }

  const resolved = resolveCompany(settings);
  if (!resolved.email) issues.push("No contact email set.");
  if (!resolved.phone) issues.push("No contact phone set.");
  if (!resolved.address) issues.push("No business address set.");
  if (resolved.sameAs.length === 0) issues.push("No social profiles configured.");
  if (!resolved.policies.returns) issues.push("Return policy text is empty.");
  if (!resolved.policies.shipping) issues.push("Shipping details text are empty.");

  return issues;
}
