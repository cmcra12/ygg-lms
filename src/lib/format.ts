// Australian display conventions: AUD currency, DD/MM/YYYY dates,
// Australia/Sydney timezone. All amounts are ex-GST unless labelled otherwise.

const audFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

export function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return audFormatter.format(cents / 100);
}

export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const [y, m, d] = isoDate.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function formatDateTime(isoTimestamp: string | null | undefined): string {
  if (!isoTimestamp) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoTimestamp));
}

/** Today's date in Australia/Sydney as ISO YYYY-MM-DD. */
export function todaySydney(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Parse a user-entered dollar amount ("1,234.50") into integer cents. */
export function parseMoneyToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/** Standard 10% GST on an ex-GST amount, in cents. */
export function gstOn(exGstCents: number): number {
  return Math.round(exGstCents * 0.1);
}

export function titleCase(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
