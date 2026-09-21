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

  // No app declares an alias today: the addon checker's became a real page.
  // With an empty list every guard below passes without testing anything, so
  // the canary runs the same collision check against a name that IS taken. A
  // guard that quietly stopped working fails there whether or not a real alias
  // exists to catch it.
  const collisions = (names: string[], taken: Set<string>) => names.filter((n) => taken.has(n));

  // public/ is copied into the site verbatim, so a top-level directory there is
  // a URL just as much as an app slug or an editorial page is.
  const servedFromPublic = () =>
    readdirSync(resolve(root, 'public'), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);

  const taken = () => new Set([...entries.map((e) => e.slug), ...editorial, 'apps', ...servedFromPublic()]);

  it('catches a collision when there is one to catch', () => {
    expect(collisions(['about', 'addon-checker', 'a-name-nothing-uses'], taken())).toEqual([
      'about',
      'addon-checker',
    ]);
  });

  it('never shadows an app slug, an editorial page, or something served out of public/', () => {
    const names = aliases.map((a) => a.alias);
    expect(collisions(names, taken()), `alias shadows a real page`).toEqual([]);
  });

  // astro.config.mjs emits a top-level redirect for the bare slug too, not only
  // for aliases, so a slug collides with public/ the same way an alias would.
  it('never lets an app slug shadow something served out of public/', () => {
    const redirecting = entries
      .filter((e) => e.data.hidden !== true && !editorial.includes(e.slug))
      .map((e) => e.slug);
    expect(collisions(redirecting, new Set(servedFromPublic()))).toEqual([]);
  });

  const duplicates = (names: string[]) => names.filter((n, i) => names.indexOf(n) !== i);

  it('catches a duplicate when there is one to catch', () => {
    expect(duplicates(['a', 'b', 'a'])).toEqual(['a']);
  });

  it('never claims the same alias for two apps', () => {
    const names = aliases.map((a) => a.alias);
    expect(duplicates(names), `duplicate alias among ${names.join(', ')}`).toEqual([]);
  });

  it('never points at a hidden app, which has no page to reach', () => {
    const hidden = new Set(entries.filter((e) => e.data.hidden === true).map((e) => e.slug));
    const dangling = aliases.filter((a) => hidden.has(a.slug)).map((a) => a.alias);
    expect(dangling, 'alias redirects to a hidden app').toEqual([]);
  });
});
