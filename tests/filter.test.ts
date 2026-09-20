import { describe, expect, it } from 'vitest';
import { matches } from '../src/lib/filter';

const card = { search: 'axipulse personal gw2 combat analysis windows', category: 'stream-overlays' };

describe('matches', () => {
  it('shows everything with no query and no active category', () => {
    expect(matches(card, '', null)).toBe(true);
  });

  it('matches on a substring of the name', () => {
    expect(matches(card, 'pulse', null)).toBe(true);
  });

  it('is case insensitive and trims', () => {
    expect(matches(card, '  PULSE ', null)).toBe(true);
  });

  it('matches on a platform', () => {
    expect(matches(card, 'windows', null)).toBe(true);
  });

  it('rejects a non-match', () => {
    expect(matches(card, 'roster', null)).toBe(false);
  });

  it('requires every whitespace-separated term', () => {
    expect(matches(card, 'combat windows', null)).toBe(true);
    expect(matches(card, 'combat linux', null)).toBe(false);
  });

  it('filters by active category', () => {
    expect(matches(card, '', 'stream-overlays')).toBe(true);
    expect(matches(card, '', 'builds')).toBe(false);
  });

  it('applies query and category together', () => {
    expect(matches(card, 'pulse', 'stream-overlays')).toBe(true);
    expect(matches(card, 'pulse', 'builds')).toBe(false);
  });
});
