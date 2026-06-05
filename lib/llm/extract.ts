import { anthropic, EXTRACTION_MODEL } from './client';
import type {
  PricingItem,
  PromotionItem,
  ServiceItem,
  ComplaintTheme,
} from '@/lib/supabase/types';

interface ExtractInput {
  competitorName: string;
  pages: { url: string; html: string }[];
}

const SHARED_RULES = `
Rules:
- Output only valid JSON matching the schema below. No markdown fences. No prose.
- Use exactly the field names given. Strings only, no nested objects beyond what's specified.
- If you cannot find evidence in the page text, return an empty array. Do NOT invent items.
`.trim();

function combinePages(pages: { url: string; html: string }[]): string {
  return pages
    .map((p) => `--- PAGE: ${p.url} ---\n${stripTags(p.html)}`)
    .join('\n\n')
    .slice(0, 80_000);
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function extractJson<T>(prompt: string, system: string): Promise<T> {
  const res = await anthropic().messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');
  return JSON.parse(text) as T;
}

export async function extractPricing(input: ExtractInput): Promise<PricingItem[]> {
  const prompt = `Competitor: ${input.competitorName}

Pages:
${combinePages(input.pages)}

Extract every concrete pricing item you can find (service name + price). Use the JSON shape:
{"items":[{"service":"string","price":"string","notes":"optional string"}]}

${SHARED_RULES}`;
  const result = await extractJson<{ items: PricingItem[] }>(
    prompt,
    'You extract structured pricing data from scraped competitor websites.',
  );
  return result.items ?? [];
}

export async function extractPromotions(input: ExtractInput): Promise<PromotionItem[]> {
  const prompt = `Competitor: ${input.competitorName}

Pages:
${combinePages(input.pages)}

Extract active promotions, specials, discounts, or limited-time offers. JSON shape:
{"items":[{"title":"string","description":"string","expires":"optional ISO date or human string"}]}

${SHARED_RULES}`;
  const result = await extractJson<{ items: PromotionItem[] }>(
    prompt,
    'You extract active promotional offers from scraped competitor websites.',
  );
  return result.items ?? [];
}

export async function extractServices(input: ExtractInput): Promise<ServiceItem[]> {
  const prompt = `Competitor: ${input.competitorName}

Pages:
${combinePages(input.pages)}

Extract the catalog of services this business offers. JSON shape:
{"items":[{"name":"string","description":"optional string"}]}

${SHARED_RULES}`;
  const result = await extractJson<{ items: ServiceItem[] }>(
    prompt,
    'You extract a clean catalog of services offered from scraped competitor websites.',
  );
  return result.items ?? [];
}

export async function clusterComplaints(
  competitorName: string,
  reviews: { rating: number; text: string }[],
): Promise<ComplaintTheme[]> {
  if (reviews.length === 0) return [];
  const prompt = `Competitor: ${competitorName}

Recent low-rated reviews (rating <= 3, last 30 days):
${reviews.map((r) => `[${r.rating}★] ${r.text}`).join('\n\n')}

Cluster these into the recurring complaint themes (e.g. "slow response time", "hidden fees", "rude technician"). JSON shape:
{"themes":[{"theme":"string","example_quotes":["string"],"count": number}]}

${SHARED_RULES}`;
  const result = await extractJson<{ themes: ComplaintTheme[] }>(
    prompt,
    'You cluster negative customer reviews into recurring complaint themes.',
  );
  return result.themes ?? [];
}
