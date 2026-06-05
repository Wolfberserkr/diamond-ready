import { describe, expect, it } from 'vitest';
import { buildCandidateUrls } from './candidates';

describe('buildCandidateUrls', () => {
  it('normalizes to scheme + host and appends candidate paths', () => {
    const urls = buildCandidateUrls('https://acme-hvac.com/some/path?x=1');
    expect(urls).toContain('https://acme-hvac.com/');
    expect(urls).toContain('https://acme-hvac.com/pricing');
    expect(urls).toContain('https://acme-hvac.com/services');
    expect(urls).toContain('https://acme-hvac.com/specials');
  });

  it('preserves the port if present', () => {
    const urls = buildCandidateUrls('http://localhost:3000');
    expect(urls[0]).toBe('http://localhost:3000/');
  });
});
