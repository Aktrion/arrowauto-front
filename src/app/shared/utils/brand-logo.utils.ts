const LOGO_BASE_URL = 'https://vl.imgix.net/img';

/**
 * Normalizes a vehicle make to the key format used by vehicle-logotypes
 * (avto-dev). Keys are lowercase with spaces/special chars replaced by hyphens.
 * Examples: "BMW" -> "bmw", "Alfa Romeo" -> "alfa-romeo", "Mercedes-Benz" -> "mercedes-benz"
 */
export function normalizeMakeForLogo(make: string | null | undefined): string {
  if (!make || typeof make !== 'string') return '';
  return make
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Returns the brand logo URL for a given make, using the avto-dev vehicle-logotypes
 * imgix CDN. Returns empty string if make is empty. Caller should handle image load errors
 * (e.g. 404 for unknown brands) with a fallback.
 */
export function getBrandLogoUrl(make: string | null | undefined): string {
  const key = normalizeMakeForLogo(make);
  if (!key) return '';
  return `${LOGO_BASE_URL}/${key}-logo.png`;
}
