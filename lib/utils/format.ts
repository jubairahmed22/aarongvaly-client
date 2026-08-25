/**
 * Money + date formatting utilities - shared by cart, checkout, order pages.
 * BDT is the default storefront currency, and the Bangladeshi convention is
 * "Tk 1,23,456" (Indian-style grouping) which is what `en-IN` produces.
 */

export interface FormatPriceOptions {
  /**
   * Force two decimal places ("Tk 3,295.00"). Off by default because most
   * surfaces show whole taka; the collection grid opts in to match the
   * fashion-retail convention of always pricing to the paisa.
   */
  decimals?: boolean;
}

export function formatPrice(
  amount: number,
  currency = "BDT",
  opts: FormatPriceOptions = {},
): string {
  const fractionDigits = opts.decimals ? 2 : 0;
  if (currency === "BDT") {
    return `Tk ${amount.toLocaleString("en-IN", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })}`;
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      ...(opts.decimals ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : {}),
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function formatDate(input: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...opts,
  }).format(date);
}

export function formatDateTime(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
