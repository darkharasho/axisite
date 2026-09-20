import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../src/lib/categories';
import { appSchema } from '../src/lib/schema';

const root = resolve(__dirname, '..');
const dir = resolve(root, 'src/content/apps');
const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
const entries = files.map((f) => ({
  slug: f.replace(/\.md$/, ''),
  ...matter(readFileSync(resolve(dir, f), 'utf8')),
}));

describe('app entries', () => {
  it('has an entry for every property in the suite', () => {
    expect(files.length).toBe(18);
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
