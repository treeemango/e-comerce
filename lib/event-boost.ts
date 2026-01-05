import type { Product } from '@/types';

export interface EventBoostOptions {
  topN?: number;
  maxBoostedInTopN?: number;
  minTermLength?: number;
  maxTerms?: number;
}

const DEFAULTS: Required<EventBoostOptions> = {
  topN: 20,
  maxBoostedInTopN: 6,
  minTermLength: 3,
  maxTerms: 6,
};

const normalizeTerm = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

export const extractEventBoostTerms = (
  rawQuery: string | null | undefined,
  extraCandidates: Array<string | null | undefined> = [],
  options?: EventBoostOptions
): string[] => {
  const cfg = { ...DEFAULTS, ...(options || {}) };
  const seen = new Set<string>();
  const terms: string[] = [];

  const push = (candidate: string) => {
    const term = normalizeTerm(candidate);
    if (term.length < cfg.minTermLength) return;
    if (seen.has(term)) return;
    seen.add(term);
    terms.push(term);
  };

  const query = (rawQuery || '').trim();
  if (query) {
    // Supports our OR-token convention `term1|term2|term3`
    query
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach(push);

    if (!query.includes('|')) {
      push(query);
    }
  }

  extraCandidates
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .forEach(push);

  return terms.slice(0, cfg.maxTerms);
};

const textHaystackForProduct = (p: Product): string => {
  const parts = [
    p.title,
    p.description,
    p.promoText,
    p.promoCode,
    p.coupon_name,
    p.activeCoupon?.label,
    p.activeCoupon?.code,
    Array.isArray(p.tags) ? p.tags.join(' ') : '',
  ]
    .filter(Boolean)
    .map((s) => String(s));

  return normalizeTerm(parts.join(' '));
};

const isDealActiveNow = (p: Product): boolean => {
  const now = Date.now();
  const parse = (iso?: string) => {
    if (!iso) return null;
    const t = Date.parse(iso);
    return Number.isFinite(t) ? t : null;
  };

  const couponEnd = parse(p.activeCoupon?.endsAt || p.coupon_end);
  if (couponEnd !== null) return couponEnd > now;

  const lightningEnd = parse(p.lightning_ends_at);
  if (p.is_lightning_deal && lightningEnd !== null) return lightningEnd > now;

  const flashEnd = parse(p.flash_sale_end);
  if (p.is_flash_sale && flashEnd !== null) return flashEnd > now;

  // Fallback: allow boost only if it already looks like a deal.
  return p.deal_type !== undefined && p.deal_type !== 'standard';
};

const computeMatchScore = (p: Product, terms: string[]): number => {
  if (!terms.length) return 0;
  if (!isDealActiveNow(p)) return 0;

  const haystack = textHaystackForProduct(p);
  if (!haystack) return 0;

  let hits = 0;
  for (const term of terms) {
    if (haystack.includes(term)) hits += 1;
  }

  // Normalize to 0..1
  return hits > 0 ? Math.min(1, hits / Math.max(terms.length, 1)) : 0;
};

/**
 * Applies a small, bounded event-context boost:
 * - Leaves baseline ordering intact unless in event context
 * - Promotes at most `maxBoostedInTopN` matching items into the first `topN`
 */
export const applyEventBoostRanking = (
  products: Product[],
  terms: string[],
  options?: EventBoostOptions
): Product[] => {
  const cfg = { ...DEFAULTS, ...(options || {}) };
  if (!products.length) return products;
  if (!terms.length) return products;

  const scored = products.map((p, index) => ({
    p,
    index,
    matchScore: computeMatchScore(p, terms),
  }));

  const top = scored.slice(0, cfg.topN);
  const rest = scored.slice(cfg.topN);

  const topMatched = top
    .filter((x) => x.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || a.index - b.index);
  const topUnmatched = top.filter((x) => x.matchScore <= 0);

  const boosted = topMatched.slice(0, cfg.maxBoostedInTopN);

  // Fill the remainder of topN preferring unmatched items first (guardrail)
  // If we don't have enough unmatched in the original topN, pull from rest.
  const fillNeeded = Math.max(0, cfg.topN - boosted.length);
  const fillerCandidates = [...topUnmatched, ...rest]
    .filter((x) => x.matchScore <= 0)
    .sort((a, b) => a.index - b.index);
  const filler = fillerCandidates.slice(0, fillNeeded);

  const used = new Set<number>([...boosted, ...filler].map((x) => x.index));
  const tail = scored.filter((x) => !used.has(x.index)).sort((a, b) => a.index - b.index);

  return [...boosted, ...filler, ...tail].map((x) => x.p);
};
