# Bringing the addon checker home

**Date:** 2026-09-20
**Status:** approved, not yet implemented

## The problem

The GW2 Addon Risk Guide is one of the axi apps, but it is the only one
that does not live on an axi domain. `axi.space/apps/gw2-addon-risk-guide`
is a detail page whose primary link sends the reader to
`darkharasho.github.io/gw2-addon-risk-guide/`. A person who types
`axi.space/addon-checker` reaches a redirect to a page that redirects them
off the site entirely.

Two separate facts sit behind that. The guide lives in its own repository
with its own GitHub Pages deploy, and the suite's canonical domain is
`axi.space` while the name in use is `axi.wiki`.

This design moves the guide into `axisite` so it serves natively at
`/addon-checker/`, and makes `axi.wiki` the canonical domain so that is the
URL it serves from.

## What this is not

The guide keeps its own stylesheet. It will not match the axi design
language when this work lands, and making it match is deliberately out of
scope: that is Stage 3 of the axi-design arc, which has its own spec. Doing
the retrofit as part of the migration would mean rewriting the site and
relocating it in the same change, with no intermediate state that can be
verified. Moving it first means Stage 3 starts with the code already in its
destination repository.

## Phases

The four phases are strictly ordered. Each one ends in a state that can be
verified in a browser before the next begins.

### Phase 0 — Make axi.wiki canonical

`axi.space` is the Pages custom domain. `axi.wiki` is proxied through
Cloudflare and carries a single dynamic-redirect rule sending itself and
`www.axi.wiki` to the same path on `axi.space`. Both zones already hold the
four GitHub Pages `A` records, so this is a reversal, not new DNS.

In the repository:

- `public/CNAME` becomes `axi.wiki`.
- `astro.config.mjs` `site` becomes `https://axi.wiki`. This also corrects
  the `<link rel="canonical">` in every redirect stub Astro emits.
- The README's Deployment section is rewritten to describe the new
  arrangement.

In Cloudflare, zone `axi.wiki` is `926be8798c7e9d692ebf19d86d8070a4` and
zone `axi.space` is `0c9d6f10e5cb58fa22bc818b2bdf9135`:

- Delete rule `1dda699172a046ccaaaabd9150e78914` from ruleset
  `48507df69d5e4bc5a9a48e2c1b86b304` on `axi.wiki`.
- Set the four `axi.wiki` `A` records and the `www.axi.wiki` `CNAME` to
  DNS-only. Proxying them would break the Pages TLS certificate.
- Set the `axi.space` records to proxied. Proxying is what lets a redirect
  rule run at Cloudflare's edge without an origin being contacted.
- Add a dynamic-redirect rule on `axi.space` matching
  `(http.host eq "axi.space") or (http.host eq "www.axi.space")`, targeting
  `concat("https://axi.wiki", http.request.uri.path)` with a 301 and
  `preserve_query_string` set.

**Known cost.** GitHub Pages issues one certificate per custom domain, so it
must request a fresh one for `axi.wiki` after the domain changes. Between
the DNS change and that certificate being issued, `axi.wiki` serves TLS
warnings — usually minutes, occasionally up to an hour. `axi.space` keeps
working throughout as the redirect source.

**Verification.** `axi.wiki` serves the site over valid TLS;
`axi.space/apps/gw2-addon-risk-guide` returns a 301 to the same path on
`axi.wiki`; a query string survives the redirect.

### Phase 1 — Move the guide into axisite

The guide is vanilla HTML, CSS and JavaScript over four JSON files. Every
path it references is relative — `data/catalog.json`, `style.css`,
`index.html` — and `app.js` carries a comment explaining that this was done
so the site would survive being served from a subdirectory on a GitHub Pages
project site. That accommodation is what makes this a copy rather than a
rewrite.

| From (`gw2-addon-risk-guide`) | To (`axisite`) |
| --- | --- |
| `site/*` | `public/addon-checker/` |
| `data/*.json` | `public/addon-checker/data/` |
| `scripts/*.mjs` | `scripts/catalog/` |
| `tests/*` | `tests/catalog/` |
| `.github/workflows/refresh-catalog.yml` | `.github/workflows/refresh-catalog.yml` |

The scraper's scripts get their own directory because `axisite/scripts`
already holds `build-releases.mjs`; a flat merge would put two unrelated
data pipelines in one namespace. `refresh-catalog.yml` keeps its schedule
and its commit-the-result behaviour, with paths updated to the new data
location.

One piece of the old deploy must travel with the site. The guide's
`pages.yml` stamps every internal `.css`, `.js` and `.mjs` reference with
the deployed commit, because browsers cache JavaScript modules far longer
than they cache HTML, and a module that reaches for an element the new HTML
no longer has takes the whole page down. Astro content-hashes its own
assets, but files under `public/` are copied verbatim and get no such
treatment. The stamping step is therefore ported into `axisite`'s
`pages.yml`, scoped to `public/addon-checker/` so it cannot touch anything
Astro generated.

**Verification.** `npm run build` produces `dist/addon-checker/index.html`
and `dist/addon-checker/data/catalog.json`; the catalog renders and filters
in a browser against the local preview.

### Phase 2 — Wire the URLs

`aliases: [addon-checker]` is removed from
`src/content/apps/gw2-addon-risk-guide.md`. An alias emits a redirect stub
at `dist/<alias>/index.html`, which is the same path the real page now
occupies — they cannot both own it.

The collision guards in `tests/content.test.ts` currently check that an
alias does not shadow an app slug, an editorial page, or `/apps`. They do
not know about `public/`. A further guard is added asserting that no alias
matches a top-level directory under `public/`, so the next alias cannot
silently shadow a real asset.

The app entry's `site` becomes `https://axi.wiki/addon-checker/`. The detail
page at `/apps/gw2-addon-risk-guide` stays — the guide is still one of the
apps, and the directory should still list it.

The trailing slash is load-bearing: the guide's relative paths only resolve
under `/addon-checker/`. GitHub Pages normally answers a directory request
without a trailing slash with a 301 to the slashed form, which would make
this work, but the site is configured `trailingSlash: 'ignore'` and the
behaviour is worth confirming rather than assuming. If the bare form does
not redirect, an explicit entry in the `redirects` map covers it.

**Verification.** In a browser, `axi.wiki/addon-checker` and
`axi.wiki/addon-checker/index.html` both load the catalog with data; the
app card in the directory links to the new URL.

### Phase 3 — Tombstone the old repository

`gw2-addon-risk-guide` keeps its history and its URL, and stops being a
running system.

- `site/` is replaced by a single page that meta-refreshes to
  `https://axi.wiki/addon-checker/`, with a visible link for anyone whose
  browser does not follow it.
- `refresh-catalog.yml` is deleted, so the scraper cannot run in two
  repositories at once, committing the same catalog to both.
- One final Pages deploy publishes the tombstone.
- The repository is archived.

`darkharasho.github.io/gw2-addon-risk-guide/` keeps working for every
bookmark that already exists. This is the same reasoning that produced the
alias redirects: a URL someone already holds should keep resolving.

**Verification.** In a browser, the old URL lands on
`axi.wiki/addon-checker/`.

## Testing

- `tests/build.test.ts` gains assertions that the built site contains
  `addon-checker/index.html` and `addon-checker/data/catalog.json`.
- `tests/content.test.ts` gains the `public/` collision guard described in
  Phase 2.
- The guide's existing scorer and signal tests move to `tests/catalog/` and
  run as part of `npm test`, which is already capped at two forks.
- Every phase is checked in a real browser. `curl` does not follow a
  meta-refresh, so a 200 on a redirect URL proves only that a stub was
  served.

## Risks

- **TLS gap.** Phase 0 leaves `axi.wiki` without a valid certificate until
  Pages issues one. Accepted; `axi.space` covers the gap.
- **Repository churn.** `axisite` gains a scheduled commit that rewrites a
  900KB JSON file. This is the existing behaviour of the guide's repository,
  moved rather than introduced, and it is what makes the site resilient: the
  last good catalog is always in git, so a failed scrape degrades to stale
  rather than broken.
- **Two crons.** Between Phase 1 and Phase 3 both repositories have a
  refresh workflow. Phase 3 deletes the old one; the window is short and the
  worst case is a redundant scrape.
