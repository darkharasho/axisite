import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import matter from 'gray-matter';

const contentDir = (name) =>
  fileURLToPath(new URL(`./src/content/${name}/`, import.meta.url));

const slugsIn = (name) =>
  readdirSync(contentDir(name))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));

const frontmatter = (slug) =>
  matter(readFileSync(`${contentDir('apps')}${slug}.md`, 'utf8')).data;

// The suite is only ever linked as /apps/<slug>, so the URL shapes a person
// types from memory - the bare slug, a name the app goes by, and the /apps
// directory itself - used to fall through to the 404 page. Redirect them all
// instead. A hidden app has no detail page to reach, so it gets no redirect;
// an editorial slug already owns its route and must not be shadowed.
const editorial = new Set(slugsIn('pages'));
const appRedirects = Object.fromEntries(
  slugsIn('apps')
    .filter((slug) => !frontmatter(slug).hidden && !editorial.has(slug))
    .flatMap((slug) => [slug, ...(frontmatter(slug).aliases ?? [])].map((from) => [`/${from}`, `/apps/${slug}`])),
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
