function normalizeSiteUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  return withProtocol.endsWith("/") ? withProtocol.slice(0, -1) : withProtocol;
}

/**
 * The site's absolute origin, for metadata that cannot be relative: Open Graph
 * images, canonical URLs, robots and the sitemap.
 *
 * Falls back through Vercel's own variables so a preview deployment describes
 * itself rather than pointing every card at production, and finally to
 * localhost so a dev build does not emit half-formed URLs.
 */
export function getSiteUrl() {
  const siteUrl =
    normalizeSiteUrl(process.env.SITE_URL ?? "") ??
    normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL ?? "") ??
    normalizeSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "") ??
    normalizeSiteUrl(process.env.VERCEL_URL ?? "");

  return siteUrl ?? "http://localhost:3000";
}
