# axiwiki — design

**Date:** 2026-09-20
**Status:** approved, pending implementation plan

## Purpose

axiwiki is the web front door to the axi suite: one page that shows every axi
app and web property, and one subpage per property with enough detail to decide
whether to install it. It is the web counterpart to **axiom**, the desktop
launcher ("one launcher for every Axi app"). axiom launches what you have
installed; axiwiki shows what exists. Both list the same suite, so the app
inventory here is the canonical public description of it.

Adding a new app to the hub must cost one file and nothing else.

## Non-goals

- Not a replacement for arcdps-wiki, which stays its own Astro + Starlight site.
  axiwiki links to it as one of the listed properties.
- Not a documentation host. Long-form docs live in each app's own repo or site.
- No runtime health checks. See "Release enrichment" for what is shown instead.
- No OSRS or non-axi projects. combat-skill-calculator, runelite-resize-plugin
  and wise-old-claude are explicitly out of scope.

## Stack

**Astro**, static output, deployed to GitHub Pages at `axi.wiki`.

Astro is the house pattern for multi-page axi sites (arcdps-wiki uses it), it
emits zero JavaScript by default, and it does not impose a design system.

**Starlight is deliberately not used.** It ships its own visual language, which
would compete with axi-design on what is a landing site rather than a docs site.

**Styling is axi-design v1, consumed from the CDN:**

```html
<link rel="stylesheet" href="https://darkharasho.github.io/axi-design/v1/axi.css">
```

The stylesheet is never vendored or copied. `v1/` is append-only by axi-design's
own versioning contract, so linking it is safe indefinitely. The hub sets
`--axi-accent` once in `:root` and otherwise uses stock components: `.axi-page`,
`.axi-mast`, `.axi-grid`, `.axi-card--strip`, `.axi-chip--*`, `.axi-search`,
`.axi-pill`, `.axi-prose`, `.axi-sigil`.

Custom CSS is confined to a single small file for what axi-design does not
cover. Anything that feels like a reusable component belongs upstream in
axi-design, not here. No Tailwind, no UI framework, no component library.

## Content model

Two Astro content collections, both Zod-validated. A malformed entry fails the
build rather than rendering a broken card.

### `src/content/apps/<slug>.md`

Frontmatter:

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Display name, e.g. `AxiPulse` |
| `tagline` | string | yes | One line, shown on the card |
| `category` | enum | yes | Must be one of the categories below |
| `repo` | string | no | `owner/name`; drives release enrichment |
| `site` | url | no | Live site or marketing page |
| `platforms` | string[] | no | `windows`, `linux`, `mac`, `web`, `discord` |
| `status` | enum | yes | `stable` \| `beta` \| `wip` |
| `icon` | string | no | Path under `public/icons/`; falls back to `.axi-sigil` |
| `featured` | boolean | no | Pins to the top of the landing page |
| `hidden` | boolean | no | Renders a "coming soon" card with no outbound link |
| `links` | `{label,url}[]` | no | Extra actions: docs, Discord, releases |

The Markdown body is the long description, rendered on the detail page inside
`.axi-prose`.

`hidden` exists so an unreleased or private repo can appear without producing a
dead link.

### `src/content/pages/<slug>.md`

Hand-written editorial pages — about the suite, getting started, how the apps
relate. Frontmatter is `title`, `description`, `order`. Body renders through
`.axi-prose`. These are written by hand; nothing generates them.

### Categories

Each category owns a `--axi-card-strip` colour, which is what makes the grid
scannable at a glance.

| Category | Properties |
|---|---|
| Combat & logs | axidps, axilog, arcdps-axipulse, arcdps-team-breakdown, arcdps-player-outline |
| Guild & community | axiroster, axitools, axiam, axivale |
| Stream & overlays | axistream, axibridge, axipulse |
| Builds | axiforge, axicode |
| Reference & web | arcdps-wiki, gw2-addon-risk-guide, axi-design |
| Suite | axiom |

The category list is a closed enum in the schema. Adding a category is a
deliberate edit to the schema plus a strip colour, not an accident of typing a
new string in frontmatter.

## Release enrichment

`scripts/build-releases.mjs` runs before `astro build`. For every app with a
`repo`, it fetches the latest GitHub release and records tag, publish date and
total download count into `data/releases.json`.

Three rules keep this from becoming a liability:

1. **`data/releases.json` is committed.** The site builds from a real file, not
   from a live API call.
2. **Failure falls back to the committed copy.** Rate limiting, network failure
   or a repo with no releases degrades to the last known data and logs a
   warning. A build never fails because GitHub was unreachable.
3. **A nightly scheduled workflow refreshes it** and commits the result if it
   changed, so the data stays current without anyone running a command.

Cards show version and recency as an `.axi-chip--meta`, e.g. `v2.3.1 · 3d ago`.
Apps with no `repo` or no releases simply omit the chip.

This is deliberately *not* a live status check. For desktop apps and static
sites, "what version is current" is a more useful signal than "is it up", and a
baked-in value cannot show a false red state to a visitor because a CDN blipped.

## Pages

| Route | Source | Contents |
|---|---|---|
| `/` | landing | `.axi-mast`, short hero, search + category pills, `.axi-grid` of cards |
| `/apps/<slug>` | `apps` collection | icon, status, version, platforms, body, action buttons |
| `/<slug>` | `pages` collection | editorial content in `.axi-prose` |
| `/404` | static | styled not-found |

Featured apps sort first on the landing page; the rest are grouped by category.

## Interaction

Search and category filtering are roughly forty lines of vanilla JavaScript,
written as **progressive enhancement**: the server renders every card, and the
script only hides non-matching ones. With JavaScript disabled the page is
complete and fully usable — every app visible, every link live. The filter
controls are injected by the script rather than server-rendered, so no dead
controls appear when the script does not run.

## Testing

Vitest, run as `vitest run --pool=forks --poolOptions.forks.maxForks=2` per the
machine's global parallelism limit.

- Every `apps` entry validates against the schema.
- Slugs are unique; every `category` is a known enum member.
- Every `icon` path referenced in frontmatter exists on disk.
- Release enrichment falls back to the committed JSON when the fetch fails, and
  does not corrupt the file on partial failure.
- Build smoke test: every expected route is emitted, and the axi-design
  stylesheet link is present on each page.

## Deployment

- `.github/workflows/ci.yml` — test + build on pull request.
- `.github/workflows/pages.yml` — build and deploy on push to `main`.
- `.github/workflows/refresh-releases.yml` — nightly cron; refreshes
  `data/releases.json` and commits on change.
- `public/CNAME` containing `axi.wiki`.

## Open questions

These do not block implementation; each has a defined fallback.

1. **DNS.** Whether `axi.wiki` already points at GitHub Pages is unverified.
   If it does not, the site still deploys to `darkharasho.github.io/axiwiki/`
   and the CNAME is added when DNS is ready.
2. **Icons and screenshots.** axipulse, axibridge, axilog, axiom and axiam have
   logos in-repo that can be copied into `public/icons/`. Anything without one
   uses the `.axi-sigil` letterform placeholder.
3. **Repo visibility.** Any property whose repo is private gets `hidden: true`
   until it is public.
