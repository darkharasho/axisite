import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

const contentDir = (name) =>
  fileURLToPath(new URL(`./src/content/${name}/`, import.meta.url));

const slugsIn = (name) =>
  readdirSync(contentDir(name))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));

const isHidden = (slug) =>
  /^hidden:\s*true\s*$/m.test(
    readFileSync(`${contentDir('apps')}${slug}.md`, 'utf8'),
  );

// The suite is only ever linked as /apps/<slug>, so the two URL shapes a
// person types from memory - the bare slug, and the /apps directory itself -
// used to fall through to the 404 page. Redirect both instead. A hidden app
// has no detail page to reach, so it gets no redirect; an editorial slug
// already owns its route and must not be shadowed.
const editorial = new Set(slugsIn('pages'));
const appRedirects = Object.fromEntries(
  slugsIn('apps')
    .filter((slug) => !isHidden(slug) && !editorial.has(slug))
    .map((slug) => [`/${slug}`, `/apps/${slug}`]),
);

export default defineConfig({
  site: 'https://axi.space',
  output: 'static',
  trailingSlash: 'ignore',
  redirects: {
    ...appRedirects,
    // The landing page is the app listing; a second one would be a
    // duplicate to keep in sync.
    '/apps': '/',
  },
});
