import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import matter from 'gray-matter';
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

  it('serves a favicon so no page load 404s for one', () => {
    for (const icon of ['favicon.svg', 'favicon.ico']) {
      expect(existsSync(dist(icon))).toBe(true);
    }
    for (const page of ['index.html', '404.html']) {
      expect(read(page)).toContain('rel="icon"');
    }
  });

  it('does not vendor a copy of axi.css', () => {
    expect(existsSync(resolve(root, 'public/axi.css'))).toBe(false);
    expect(existsSync(resolve(root, 'src/styles/axi.css'))).toBe(false);
  });

  // The custom domain and the canonical base are two halves of one fact. If
  // they disagree, every canonical URL points at a domain Pages does not serve.
  it('serves one custom domain, and makes it the canonical base', () => {
    const cname = readFileSync(resolve(root, 'public/CNAME'), 'utf8').trim();
    const config = readFileSync(resolve(root, 'astro.config.mjs'), 'utf8');
    expect(cname).toBe('axi.wiki');
    expect(config).toContain(`site: 'https://${cname}'`);
  });
});

const appSlugs = readdirSync(resolve(root, 'src/content/apps'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''));

describe('landing page', () => {
  it('server-renders a card for every app', () => {
    const html = read('index.html');
    const cards = html.match(/data-slug="/g) ?? [];
    expect(cards.length).toBe(appSlugs.length);
  });

  it('gives every card the attributes the filter script reads', () => {
    const html = read('index.html');
    expect((html.match(/data-category="/g) ?? []).length).toBe(appSlugs.length);
    expect((html.match(/data-search="/g) ?? []).length).toBe(appSlugs.length);
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
  it.each(appSlugs)('emits a page for %s unless it is hidden', (slug) => {
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

  it('actually ships the filter script, not just its mount point', () => {
    const html = read('index.html');
    // The inverse of the check above: this string only exists inside
    // filter.client.ts's injected-markup template literal, so it can only
    // show up *inside* a <script> tag if the filter feature is bundled at
    // all. A mount div with no script behind it would fail this.
    const scripts = html.match(/<script[\s\S]*?<\/script>/g) ?? [];
    expect(scripts.some((s) => s.includes('Search the suite'))).toBe(true);
  });

  it('leaves every card visible and linked without JavaScript', () => {
    const html = read('index.html');
    expect(html).not.toMatch(/<(a|div)[^>]*data-filter-hidden/);
    expect((html.match(/href="\/apps\//g) ?? []).length).toBeGreaterThan(10);
  });

  it('never links to an app page that was not actually emitted', () => {
    const html = read('index.html');
    const hrefs = Array.from(html.matchAll(/href="\/apps\/([^"/]+)"/g)).map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const slug of hrefs) {
      expect(existsSync(dist(`apps/${slug}/index.html`)), `no dist page for /apps/${slug}`).toBe(true);
    }
  });
});

const frontmatter = (slug: string) =>
  matter(readFileSync(resolve(root, 'src/content/apps', `${slug}.md`), 'utf8')).data;
const visibleAppSlugs = appSlugs.filter((slug) => !frontmatter(slug).hidden);
const hiddenAppSlugs = appSlugs.filter((slug) => !visibleAppSlugs.includes(slug));
// addon-checker is served as static files, not as a redirect, so exclude it from alias tests
const staticServicedPaths = new Set(['addon-checker']);
const aliasPairs = visibleAppSlugs.flatMap((slug) =>
  ((frontmatter(slug).aliases as string[] | undefined) ?? [])
    .filter((alias) => !staticServicedPaths.has(alias))
    .map((alias) => [alias, slug]),
);

// The site only ever links the full /apps/<slug> form, so these URLs stayed
// broken for as long as nobody typed one by hand. Both are the shapes a
// person reaches for from memory, and both used to land on the 404 page.
describe('URLs people type rather than click', () => {
  it('serves the /apps directory URL instead of 404ing', () => {
    expect(existsSync(dist('apps/index.html'))).toBe(true);
    expect(read('apps/index.html')).toContain('url=/');
  });

  it('redirects a bare app slug to its detail page', () => {
    expect(visibleAppSlugs.length).toBeGreaterThan(0);
    for (const slug of visibleAppSlugs) {
      expect(existsSync(dist(`${slug}/index.html`)), `no /${slug} redirect`).toBe(true);
      expect(read(`${slug}/index.html`)).toContain(`/apps/${slug}`);
    }
  });

  it('never redirects to an app page that was not emitted', () => {
    for (const slug of hiddenAppSlugs) {
      expect(existsSync(dist(`${slug}/index.html`)), `/${slug} redirects to a 404`).toBe(false);
    }
  });

  it('leaves the editorial pages themselves, not redirects to them', () => {
    expect(read('about/index.html')).toContain('axi-prose');
    expect(read('getting-started/index.html')).toContain('axi-prose');
  });

  // An app's slug is not always what people call it. The risk guide is "the
  // addon checker" to everyone who uses it, so that name is the one they type.
  // The addon-checker is served as static files rather than as a redirect, so
  // it's excluded from this test (staticServicedPaths).
  it('redirects every name an app also goes by', () => {
    if (aliasPairs.length === 0) {
      // Skip if there are no remaining aliases after filtering out static-served paths
      return;
    }
    for (const [alias, slug] of aliasPairs) {
      expect(existsSync(dist(`${alias}/index.html`)), `no /${alias} redirect`).toBe(true);
      expect(read(`${alias}/index.html`)).toContain(`/apps/${slug}`);
    }
  });

  // A redirect stub IS dist/<name>/index.html, so the explicit-index form a
  // bookmark carries resolves without any extra work - as long as it stays true.
  it('serves the explicit /index.html form of a redirect', () => {
    for (const [alias] of aliasPairs) {
      expect(existsSync(dist(`${alias}/index.html`))).toBe(true);
    }
  });
});

// The addon checker is served as static files Astro copies rather than pages
// Astro renders, so nothing in the build would fail if the directory vanished.
// These assertions are the only thing standing between a bad move and a silent
// 404 on the app people actually use.
describe('the addon checker', () => {
  it('ships its pages', () => {
    for (const page of ['addon-checker/index.html', 'addon-checker/policy.html']) {
      expect(existsSync(dist(page)), `missing ${page}`).toBe(true);
    }
  });

  it('ships the data those pages fetch', () => {
    for (const file of ['catalog', 'conduct', 'overrides', 'policies']) {
      expect(existsSync(dist(`addon-checker/data/${file}.json`)), `missing ${file}.json`).toBe(true);
    }
  });

  // app.js fetches 'data/catalog.json' with no leading slash so the page works
  // from a subdirectory. An absolute path would resolve to the site root and
  // 404 - the exact bug the relative form was written to avoid.
  it('fetches its data by a relative path', () => {
    const app = readFileSync(resolve(root, 'public/addon-checker/app.js'), 'utf8');
    expect(app).toContain("fetch('data/catalog.json')");
    expect(app).not.toContain("fetch('/data/");
  });
});
