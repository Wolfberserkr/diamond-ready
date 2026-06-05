/**
 * Given a competitor's homepage URL, return the small set of pages most likely
 * to contain pricing, service catalogs, and active promotions. Order matters:
 * the runner stops once it has enough signal per section.
 */
export function candidatePaths(): string[] {
  return [
    '/',
    '/pricing',
    '/prices',
    '/rates',
    '/services',
    '/our-services',
    '/specials',
    '/offers',
    '/promotions',
    '/deals',
    '/coupons',
  ];
}

export function buildCandidateUrls(homepage: string): string[] {
  const base = normalizeBase(homepage);
  return candidatePaths().map((p) => `${base}${p}`);
}

function normalizeBase(url: string): string {
  const u = new URL(url);
  return `${u.protocol}//${u.host}`;
}
