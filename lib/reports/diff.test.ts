import { describe, expect, it } from 'vitest';
import { diffFindings, diffItems } from './diff';
import type { FindingPayload } from '@/lib/supabase/types';

const pricing = (items: { service: string; price: string }[]): FindingPayload => ({
  kind: 'pricing',
  items,
});

describe('diffFindings', () => {
  it('returns unchanged when both null', () => {
    expect(diffFindings(null, null)).toBe('unchanged');
  });

  it('returns new when previous is null', () => {
    expect(
      diffFindings(null, pricing([{ service: 'AC tune-up', price: '$89' }])),
    ).toBe('new');
  });

  it('returns removed when current is null', () => {
    expect(
      diffFindings(pricing([{ service: 'AC tune-up', price: '$89' }]), null),
    ).toBe('removed');
  });

  it('returns unchanged when items are equal regardless of order', () => {
    const a = pricing([
      { service: 'AC tune-up', price: '$89' },
      { service: 'Furnace check', price: '$129' },
    ]);
    const b = pricing([
      { service: 'Furnace check', price: '$129' },
      { service: 'AC tune-up', price: '$89' },
    ]);
    expect(diffFindings(a, b)).toBe('unchanged');
  });

  it('returns changed when a price moved', () => {
    const a = pricing([{ service: 'AC tune-up', price: '$89' }]);
    const b = pricing([{ service: 'AC tune-up', price: '$99' }]);
    expect(diffFindings(a, b)).toBe('changed');
  });

  it('returns changed when a service was added', () => {
    const a = pricing([{ service: 'AC tune-up', price: '$89' }]);
    const b = pricing([
      { service: 'AC tune-up', price: '$89' },
      { service: 'Duct cleaning', price: '$249' },
    ]);
    expect(diffFindings(a, b)).toBe('changed');
  });
});

describe('diffItems', () => {
  it('itemizes added / removed / modified', () => {
    const prev = pricing([
      { service: 'AC tune-up', price: '$89' },
      { service: 'Furnace check', price: '$129' },
    ]);
    const next = pricing([
      { service: 'AC tune-up', price: '$99' },
      { service: 'Duct cleaning', price: '$249' },
    ]);
    const d = diffItems(prev, next);
    expect(d.added).toEqual(['duct cleaning']);
    expect(d.removed).toEqual(['furnace check']);
    expect(d.modified).toEqual(['ac tune-up']);
  });
});
