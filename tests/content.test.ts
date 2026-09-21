import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CATEGORIES, platformLabel } from '../src/lib/categories';
import { appSchema } from '../src/lib/schema';

const root = resolve(__dirname, '..');
const dir = resolve(root, 'src/content/apps');
const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
const entries = files.map((f) => ({
  slug: f.replace(/\.md$/, ''),
  ...matter(readFileSync(resolve(dir, f), 'utf8')),
}));

describe('app entries', () => {
  it('the suite inventory is 17 properties (bump this deliberately when adding one)', () => {
    expect(files.length).toBe(17);
  });

  it.each(entries)('$slug validates against the schema', (entry) => {
    expect(() => appSchema.parse(entry.data)).not.toThrow();
  });

  it('has unique slugs', () => {
    expect(new Set(entries.map((e) => e.slug)).size).toBe(entries.length);
  });

  it('covers every category at least once', () => {
    const used = new Set(entries.map((e) => e.data.category));
    for (const c of CATEGORIES) expect(used).toContain(c);
  });

  it.each(entries)('$slug references an icon that exists on disk', (entry) => {
    if (!entry.data.icon) return;
    expect(existsSync(resolve(root, 'public/icons', entry.data.icon))).toBe(true);
  });

  it.each(entries)('$slug has a body', (entry) => {
    expect(entry.content.trim().length).toBeGreaterThan(40);
  });

  it('gives a visible app an outbound destination', () => {
    for (const e of entries) {
      if (e.data.hidden) continue;
      expect(Boolean(e.data.repo || e.data.site), `${e.slug} has neither repo nor site`).toBe(true);
    }
  });

  it('features exactly three apps', () => {
    expect(entries.filter((e) => e.data.featured === true).length).toBe(3);
  });

  it('excludes OSRS projects', () => {
    const banned = ['combat-skill-calculator', 'runelite-resize-plugin', 'wise-old-claude'];
    for (const b of banned) expect(entries.map((e) => e.slug)).not.toContain(b);
  });
});

describe('platformLabel', () => {
  it('capitalises an ordinary platform slug', () => {
    expect(platformLabel('windows')).toBe('Windows');
  });

  it('spells the irregular ones the way they are written', () => {
    expect(platformLabel('macos')).toBe('macOS');
  });
});

// An alias becomes a top-level URL, so it competes for the same namespace as
// every app slug and every editorial page. A collision would silently shadow a
// real page with a redirect, which is worse than the 404 aliases exist to fix.
describe('app aliases', () => {
  const editorial = readdirSync(resolve(root, 'src/content/pages'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
  const aliases = entries.flatMap((e) =>
    ((e.data.aliases as string[] | undefined) ?? []).map((alias) => ({ alias, slug: e.slug })),
  );

  it('declares at least one, so the rest of this suite has something to guard', () => {
    expect(aliases.length).toBeGreaterThan(0);
  });

  it('never shadows an app slug or an editorial page', () => {
    const taken = new Set([...entries.map((e) => e.slug), ...editorial, 'apps']);
    for (const { alias } of aliases) {
      expect(taken.has(alias), `alias ${alias} shadows a real page`).toBe(false);
    }
  });

  it('never claims the same alias for two apps', () => {
    const names = aliases.map((a) => a.alias);
    expect(new Set(names).size, `duplicate alias among ${names.join(', ')}`).toBe(names.length);
  });

  it('never points at a hidden app, which has no page to reach', () => {
    for (const { alias, slug } of aliases) {
      const hidden = entries.find((e) => e.slug === slug)?.data.hidden === true;
      expect(hidden, `alias ${alias} redirects to hidden ${slug}`).toBe(false);
    }
  });
});
