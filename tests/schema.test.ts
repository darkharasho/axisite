import { describe, expect, it } from 'vitest';
import { CATEGORIES, CATEGORY_META, chipClass, strip } from '../src/lib/categories';
import { appSchema, pageSchema } from '../src/lib/schema';

const valid = {
  name: 'AxiPulse',
  tagline: 'Personal GW2 combat analysis that runs beside your game.',
  category: 'stream-overlays',
  status: 'beta',
};

describe('appSchema', () => {
  it('accepts a minimal valid entry', () => {
    expect(appSchema.parse(valid)).toMatchObject({ name: 'AxiPulse', featured: false, hidden: false });
  });

  it('rejects an unknown category', () => {
    expect(() => appSchema.parse({ ...valid, category: 'made-up' })).toThrow();
  });

  it('rejects an unknown status', () => {
    expect(() => appSchema.parse({ ...valid, status: 'abandoned' })).toThrow();
  });

  it('rejects a repo that is not owner/name', () => {
    expect(() => appSchema.parse({ ...valid, repo: 'axipulse' })).toThrow();
  });

  it('rejects an unknown platform', () => {
    expect(() => appSchema.parse({ ...valid, platforms: ['android'] })).toThrow();
  });

  it('rejects an icon path outside public/icons', () => {
    expect(() => appSchema.parse({ ...valid, icon: '../secret.png' })).toThrow();
  });

  it('accepts links as label/url pairs', () => {
    const parsed = appSchema.parse({
      ...valid,
      links: [{ label: 'Discord', url: 'https://discord.gg/example' }],
    });
    expect(parsed.links?.[0].label).toBe('Discord');
  });
});

describe('pageSchema', () => {
  it('requires title and description', () => {
    expect(() => pageSchema.parse({ title: 'About' })).toThrow();
    expect(pageSchema.parse({ title: 'About', description: 'What axi is.' }).order).toBe(100);
  });
});

describe('categories', () => {
  it('gives every category display metadata with a unique order', () => {
    const orders = CATEGORIES.map((c) => CATEGORY_META[c].order);
    expect(new Set(orders).size).toBe(CATEGORIES.length);
    for (const c of CATEGORIES) expect(CATEGORY_META[c].label.length).toBeGreaterThan(0);
  });
});

describe('status presentation', () => {
  it('strips stable green, beta amber, and wip not at all', () => {
    expect(strip('stable')).toBe('var(--axi-ok)');
    expect(strip('beta')).toBe('var(--axi-warn)');
    expect(strip('wip')).toBeUndefined();
  });

  it('maps status to an axi-design chip modifier', () => {
    expect(chipClass('stable')).toBe('axi-chip axi-chip--ok');
    expect(chipClass('beta')).toBe('axi-chip axi-chip--warn');
    expect(chipClass('wip')).toBe('axi-chip');
  });
});
