import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const dist = (p: string) => resolve(root, 'dist', p);
const read = (p: string) => readFileSync(dist(p), 'utf8');

beforeAll(() => {
  execSync('npx astro build', { cwd: root, stdio: 'inherit' });
}, 180_000);

describe('build output', () => {
  it('emits the landing page and the 404 page', () => {
    expect(existsSync(dist('index.html'))).toBe(true);
    expect(existsSync(dist('404.html'))).toBe(true);
  });

  it('links the axi-design stylesheet from the CDN on every page', () => {
    for (const page of ['index.html', '404.html']) {
      expect(read(page)).toContain(
        'https://darkharasho.github.io/axi-design/v1/axi.css',
      );
    }
  });

  it('does not vendor a copy of axi.css', () => {
    expect(existsSync(resolve(root, 'public/axi.css'))).toBe(false);
    expect(existsSync(resolve(root, 'src/styles/axi.css'))).toBe(false);
  });
});

describe('landing page', () => {
  it('server-renders a card for every app', () => {
    const html = read('index.html');
    const cards = html.match(/data-slug="/g) ?? [];
    expect(cards.length).toBe(18);
  });

  it('gives every card the attributes the filter script reads', () => {
    const html = read('index.html');
    expect((html.match(/data-category="/g) ?? []).length).toBe(18);
    expect((html.match(/data-search="/g) ?? []).length).toBe(18);
  });

  it('strips stable and beta cards but not work-in-progress ones', () => {
    const html = read('index.html');
    expect(html).toContain('--axi-card-strip: var(--axi-ok)');
    expect(html).toContain('--axi-card-strip: var(--axi-warn)');
  });

  it('uses no colour literal outside the accent', () => {
    const css = readFileSync(resolve(root, 'src/styles/site.css'), 'utf8');
    const hexes = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(hexes).toEqual(['#b06bff']);
  });

  it('puts the featured apps first', () => {
    const html = read('index.html');
    expect(html.indexOf('data-section="featured"')).toBeLessThan(html.indexOf('data-section="combat-logs"'));
  });
});

describe('app detail pages', () => {
  const slugs = readdirSync(resolve(root, 'src/content/apps'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));

  it.each(slugs)('emits a page for %s unless it is hidden', (slug) => {
    const source = readFileSync(resolve(root, 'src/content/apps', `${slug}.md`), 'utf8');
    const hidden = /^hidden:\s*true\s*$/m.test(source);
    expect(existsSync(dist(`apps/${slug}/index.html`))).toBe(!hidden);
  });

  it('links back to the landing page and ships the stylesheet', () => {
    const html = read('apps/axiom/index.html');
    expect(html).toContain('https://darkharasho.github.io/axi-design/v1/axi.css');
    expect(html).toContain('href="/"');
    expect(html).toContain('axi-prose');
  });
});

describe('editorial pages', () => {
  it('emits a page for every entry in the pages collection', () => {
    const slugs = readdirSync(resolve(root, 'src/content/pages'))
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/\.md$/, ''));
    expect(slugs.length).toBeGreaterThan(0);
    for (const slug of slugs) expect(existsSync(dist(`${slug}/index.html`))).toBe(true);
  });

  it('does not shadow the /apps route', () => {
    expect(existsSync(resolve(root, 'src/content/pages/apps.md'))).toBe(false);
  });

  it('renders editorial bodies in axi-prose', () => {
    expect(read('about/index.html')).toContain('axi-prose');
  });
});

describe('progressive enhancement', () => {
  it('server-renders no search input — the script injects it', () => {
    const html = read('index.html');
    // Astro inlines the small filter script directly into the page, so its
    // template-literal source (which builds the real <input> at runtime)
    // legitimately contains this text. Strip <script> content first so the
    // check reflects what's actually server-rendered into the DOM.
    const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/g, '');
    expect(withoutScripts).not.toContain('id="app-search"');
    expect(html).toContain('data-filter-mount');
  });

  it('leaves every card visible and linked without JavaScript', () => {
    const html = read('index.html');
    expect(html).not.toMatch(/<(a|div)[^>]*data-filter-hidden/);
    expect((html.match(/href="\/apps\//g) ?? []).length).toBeGreaterThan(10);
  });
});
