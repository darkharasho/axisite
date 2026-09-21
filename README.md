# axisite

axisite is the web front door for the axi suite of Guild Wars 2 tools — a
static, data-driven hub that links out to every axi app and web property
(arcdps plugins, build tools, the ACRDPS wiki, the addon checker, and more),
styled with the shared axi-design system. axi-design is always linked from
its CDN (`https://darkharasho.github.io/axi-design/v1/axi.css`) — it is
never vendored into this repo.

It's the counterpart to **axiom**, the desktop launcher: axiom installs and
launches what you have installed; axisite is the browsable map of what
exists, including things axiom doesn't manage. Both list the same suite —
axisite just doesn't require you to have anything installed to see it.

## Adding an app

Adding an app to the hub costs exactly one Markdown file under
`src/content/apps/`. The filename becomes the app's slug. For example,
`src/content/apps/arcdps-axipulse.md`:

```markdown
---
name: arcdps_axipulse
tagline: An arcdps plugin that runs Elite Insights on every fight and renders WvW stats in-game.
category: combat-logs
status: beta
repo: darkharasho/arcdps-axipulse
platforms: [windows]
---

arcdps_axipulse is a Rust arcdps plugin that runs the bundled Elite Insights
CLI against each `.evtc` your client writes...
```

The body below the frontmatter is the app's detail-page description.

Available frontmatter fields (see `src/lib/schema.ts`):

| Field | Type | Required |
|---|---|---|
| `name` | string | yes |
| `tagline` | string | yes |
| `category` | one of the categories in `src/lib/categories.ts` (`combat-logs`, `guild-community`, `stream-overlays`, `builds`, `reference-web`, `suite`) | yes |
| `status` | `stable` \| `beta` \| `wip` | yes |
| `repo` | string, `owner/name` (used for GitHub release enrichment) | no |
| `site` | string, URL | no |
| `platforms` | array of `windows` \| `linux` \| `mac` \| `web` \| `discord` | no |
| `icon` | string, bare filename in `public/icons` (`.png`/`.svg`/`.webp`) | no |
| `featured` | boolean, default `false` | no |
| `hidden` | boolean, default `false` — set for private repos with no public listing | no |
| `links` | array of `{ label, url }` | no |

## Adding an editorial page

Editorial (hand-written) pages, like "About" or "Getting started", cost
exactly one Markdown file under `src/content/pages/`. The filename becomes
the page's slug (e.g. `src/content/pages/about.md` renders at `/about`),
and `Base.astro`'s nav bar is generated from this collection sorted by
`order`, so a new page also gets a nav entry automatically — no other file
needs to change.

Available frontmatter fields (see `src/lib/schema.ts`):

| Field | Type | Required |
|---|---|---|
| `title` | string | yes |
| `description` | string | yes |
| `order` | integer, controls nav position (default `100`) | no |

The body below the frontmatter is rendered as the page content.

## Release data

`data/releases.json` holds the latest published release (tag, publish date,
download count) per repo and is committed to the repo. A nightly GitHub
Actions workflow (`refresh-releases.yml`) re-runs the sweep and commits the
file only when a version actually moved. `npm run build` also refreshes it
at build time, but if the GitHub API is unreachable the build falls back to
the committed copy and never fails because GitHub was unreachable.

That nightly commit alone does not redeploy the live site: GitHub does not
trigger workflow runs from pushes made with the default `GITHUB_TOKEN`, so
`refresh-releases.yml`'s push to `main` would never fire `pages.yml`'s own
`push` trigger. `pages.yml` instead also listens for a completed
`refresh-releases` run via `workflow_run` (guarded to redeploy only when
that run succeeded) so the freshly committed release data actually reaches
the deployed site the same night.

## Catalog data

`public/addon-checker/data/catalog.json` is the GW2 addon catalog the checker
at `/addon-checker/` reads in the browser. It is built by the scraper in
`scripts/catalog/`: `discover.mjs` searches GitHub for candidate repos,
`enrich.mjs` and `signals.mjs` gather the observable metadata, `score.mjs`
turns that into a risk band, and `build-catalog.mjs` (`npm run catalog`) writes
the result. `conduct.json`, `overrides.json` and `policies.json` beside it are
hand-authored and the scraper never rewrites them. `tests/catalog/` covers all
of it and runs as part of `npm test`.

`refresh-catalog.yml` re-runs the scrape weekly and commits the catalog when it
moved. As with release data, that `GITHUB_TOKEN` commit cannot fire `pages.yml`
on its own, so `pages.yml` listens for a completed `refresh-catalog` run too.

`pages.yml` then stamps the deployed commit onto the checker's own asset URLs
(`app.js?v=<sha>` and friends) as it builds. The catalog and the modules that
read it change together, and GitHub Pages caches hard; without the stamp a
browser can pair a fresh catalog with a stale module.

## Commands

```bash
npm run dev     # local dev server
npm test        # vitest, capped at 2 workers
npm run build   # refresh release data, then build the static site into dist/
```

## Deployment

The site deploys to GitHub Pages on every push to `main` and lives at
`axi.wiki` (see `public/CNAME`). The domain's DNS is held in Cloudflare:
four `A` records on the apex pointing at `185.199.108.153`,
`185.199.109.153`, `185.199.110.153` and `185.199.111.153`, plus a `www`
`CNAME` to `darkharasho.github.io`. All of them are DNS-only — proxying
them through Cloudflare would break the Pages TLS certificate.

`axi.space` no longer reaches Pages (a Pages site serves exactly one
custom domain), so its zone redirects instead: its records *are* proxied,
and a single redirect rule sends `axi.space` and `www.axi.space` to the
same path on `axi.wiki` with a 301, query string intact. Proxying is what
makes that work — the rule runs at Cloudflare's edge, so no origin is ever
contacted.
