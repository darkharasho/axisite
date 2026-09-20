# axiwiki

axiwiki is the web front door for the axi suite of Guild Wars 2 tools — a
static, data-driven hub that links out to every axi app and web property
(arcdps plugins, build tools, the ACRDPS wiki, the addon checker, and more),
styled with the shared axi-design system.

It's the counterpart to **axiom**, the desktop launcher: axiom installs and
launches what you have installed; axiwiki is the browsable map of what
exists, including things axiom doesn't manage. Both list the same suite —
axiwiki just doesn't require you to have anything installed to see it.

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

## Release data

`data/releases.json` holds the latest published release (tag, publish date,
download count) per repo and is committed to the repo. A nightly GitHub
Actions workflow (`refresh-releases.yml`) re-runs the sweep and commits the
file only when a version actually moved. `npm run build` also refreshes it
at build time, but if the GitHub API is unreachable the build falls back to
the committed copy and never fails because GitHub was unreachable.

## Commands

```bash
npm run dev     # local dev server
npm test        # vitest, capped at 2 workers
npm run build   # refresh release data, then build the static site into dist/
```

## Deployment

The site deploys to GitHub Pages on every push to `main` and is meant to
live at `axi.wiki` (see `public/CNAME`). Until `axi.wiki`'s DNS points at
GitHub Pages — an `A` record set to `185.199.108.153`, `185.199.109.153`,
`185.199.110.153` and `185.199.111.153`, or a `CNAME` to
`darkharasho.github.io` — the deploy will publish successfully but the
domain will not resolve to it.
