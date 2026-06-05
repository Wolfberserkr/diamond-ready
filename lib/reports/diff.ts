import type { ChangeFlag, FindingPayload } from '@/lib/supabase/types';

/**
 * Classify how a competitor's section has changed since the previous report.
 * Same logic powers all four sections — we serialize the payload to a normalized
 * string and compare. Empty current + empty previous → `unchanged`.
 */
export function diffFindings(
  previous: FindingPayload | null,
  current: FindingPayload | null,
): ChangeFlag {
  const prev = normalize(previous);
  const next = normalize(current);
  if (prev === '' && next === '') return 'unchanged';
  if (prev === '' && next !== '') return 'new';
  if (prev !== '' && next === '') return 'removed';
  if (prev === next) return 'unchanged';
  return 'changed';
}

/**
 * Compute the per-item change set so the report can show "3 new prices, 1 removed".
 * Items are matched on a section-appropriate key.
 */
export function diffItems(
  previous: FindingPayload | null,
  current: FindingPayload | null,
): { added: string[]; removed: string[]; modified: string[] } {
  const prevItems = itemKeys(previous);
  const nextItems = itemKeys(current);
  const prevSet = new Map(prevItems);
  const nextSet = new Map(nextItems);

  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  for (const [key, value] of nextSet) {
    if (!prevSet.has(key)) added.push(key);
    else if (prevSet.get(key) !== value) modified.push(key);
  }
  for (const [key] of prevSet) {
    if (!nextSet.has(key)) removed.push(key);
  }
  return { added, removed, modified };
}

function normalize(payload: FindingPayload | null): string {
  if (!payload) return '';
  return JSON.stringify(canonicalize(payload));
}

function canonicalize(payload: FindingPayload): unknown {
  switch (payload.kind) {
    case 'pricing':
      return payload.items
        .map((i) => ({ s: i.service.toLowerCase().trim(), p: i.price.trim() }))
        .sort((a, b) => a.s.localeCompare(b.s));
    case 'promotions':
      return payload.items
        .map((i) => ({ t: i.title.toLowerCase().trim(), d: i.description.trim() }))
        .sort((a, b) => a.t.localeCompare(b.t));
    case 'new_services':
      return payload.items
        .map((i) => i.name.toLowerCase().trim())
        .sort();
    case 'complaints':
      return payload.themes
        .map((t) => ({ theme: t.theme.toLowerCase().trim(), count: t.count }))
        .sort((a, b) => a.theme.localeCompare(b.theme));
  }
}

function itemKeys(payload: FindingPayload | null): [string, string][] {
  if (!payload) return [];
  switch (payload.kind) {
    case 'pricing':
      return payload.items.map((i) => [
        i.service.toLowerCase().trim(),
        i.price.trim(),
      ]);
    case 'promotions':
      return payload.items.map((i) => [
        i.title.toLowerCase().trim(),
        i.description.trim(),
      ]);
    case 'new_services':
      return payload.items.map((i) => [i.name.toLowerCase().trim(), '1']);
    case 'complaints':
      return payload.themes.map((t) => [t.theme.toLowerCase().trim(), String(t.count)]);
  }
}
