# Addon Checker Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the GW2 Addon Risk Guide natively at `https://axi.wiki/addon-checker/` out of the `axisite` repository, and make `axi.wiki` the canonical domain.

**Architecture:** The guide is vanilla HTML/CSS/JS over four JSON files, with every internal path already relative so it survives being served from a subdirectory. It therefore moves into `axisite/public/addon-checker/` as a verbatim copy rather than a rewrite. Its scraper moves to `scripts/catalog/`, its tests to `tests/catalog/`, and its scheduled refresh becomes a second `workflow_run` producer feeding the existing `pages.yml`. The domain swap reverses the current Cloudflare arrangement so `axi.space` redirects to `axi.wiki` instead of the other way round.

**Tech Stack:** Astro 5 (static output), vitest (forks pool, max 2), GitHub Pages, Cloudflare DNS and dynamic redirect rules, Node 22.

**Spec:** `docs/superpowers/specs/2026-09-20-addon-checker-migration-design.md`

## Global Constraints

- Canonical domain after Task 2 is `https://axi.wiki`. Every absolute URL written into content, config or docs uses it.
- The guide keeps its own `style.css`. Do NOT restyle it onto axi-design; that is a separate, already-specced stage.
- Vitest parallelism is capped at 2 forks. Run tests with `npm test`, which already carries `--pool=forks --poolOptions.forks.maxForks=2`. Never raise it.
- Everything under `public/addon-checker/` uses relative paths only. An absolute path or an import escaping that directory breaks the deployed page.
- Cloudflare zone IDs: `axi.wiki` is `926be8798c7e9d692ebf19d86d8070a4`, `axi.space` is `0c9d6f10e5cb58fa22bc818b2bdf9135`.
- Commit messages end with the line `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Source repo for all moved files: `/home/mstephens/Documents/GitHub/gw2-addon-risk-guide`. Referred to below as `$GUIDE`.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `public/CNAME` | The single custom domain GitHub Pages serves. Becomes `axi.wiki`. |
| `astro.config.mjs` | `site` (canonical URL base) and the `redirects` map built from app slugs and aliases. |
| `public/addon-checker/` | The guide, served verbatim. `index.html`, `policy.html`, `style.css`, `favicon.svg`, `app.js`, `render.js`, `search.js`, `conduct.mjs`. |
| `public/addon-checker/data/` | `catalog.json`, `conduct.json`, `overrides.json`, `policies.json`. Committed, refreshed on a schedule. |
| `scripts/catalog/` | The scraper: `build-catalog.mjs`, `discover.mjs`, `enrich.mjs`, `github.mjs`, `score.mjs`, `signals.mjs`. |
| `tests/catalog/` | The scraper's and the guide's twelve vitest files. |
| `.github/workflows/refresh-catalog.yml` | Weekly scrape, shrink guard, commit, test. |
| `.github/workflows/pages.yml` | Gains `refresh-catalog` as a `workflow_run` producer and the asset-stamping step. |
| `src/content/apps/gw2-addon-risk-guide.md` | Loses its alias, gains the new `site` URL. |
| `tests/content.test.ts` | Gains the `public/` collision guard. |
| `tests/build.test.ts` | Gains assertions that the guide is present in `dist/`. |

---

### Task 1: Point the repository at axi.wiki

Repo-side half of the domain swap. Lands first so the Cloudflare change in Task 2 has something correct to flip to. Between this task's deploy and Task 2 completing, `axi.space` will 404 — the two tasks are meant to run back to back.

**Files:**
- Modify: `public/CNAME`
- Modify: `astro.config.mjs`
- Modify: `README.md`
- Test: `tests/build.test.ts`

**Interfaces:**
- Produces: canonical base `https://axi.wiki` in `astro.config.mjs`'s `site`, which Astro stamps into every redirect stub's `<link rel="canonical">`.

- [ ] **Step 1: Write the failing test**

Append to the `describe('build output', ...)` block in `tests/build.test.ts`:

```ts
  // The custom domain and the canonical base are two halves of one fact. If
  // they disagree, every canonical URL points at a domain Pages does not serve.
  it('serves one custom domain, and makes it the canonical base', () => {
    const cname = readFileSync(resolve(root, 'public/CNAME'), 'utf8').trim();
    const config = readFileSync(resolve(root, 'astro.config.mjs'), 'utf8');
    expect(cname).toBe('axi.wiki');
    expect(config).toContain(`site: 'https://${cname}'`);
  });
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- tests/build.test.ts`
Expected: FAIL — `expected 'axi.space' to be 'axi.wiki'`.

- [ ] **Step 3: Change the domain**

```bash
echo 'axi.wiki' > public/CNAME
```

In `astro.config.mjs`, change the `site` line inside `defineConfig`:

```js
  site: 'https://axi.wiki',
```

- [ ] **Step 4: Rewrite the README's Deployment section**

Replace the two paragraphs under `## Deployment` with:

```markdown
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
```

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS, all files.

- [ ] **Step 6: Commit and push**

```bash
git add public/CNAME astro.config.mjs README.md tests/build.test.ts
git commit -m "$(cat <<'MSG'
feat(domain): make axi.wiki the domain the site serves from

axi.wiki is the name the suite goes by, but it was a redirect to
axi.space rather than the site itself. Swap which of the two Pages
serves, and pin the pairing in a test: the custom domain and the
canonical base are two halves of one fact, and a disagreement between
them points every canonical URL at a domain Pages does not answer for.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
git push origin main
```

---

### Task 2: Reverse the Cloudflare arrangement

Operational, not code. Order matters and is not the obvious one: `axi.wiki`'s DNS must stop being proxied *before* Pages can issue it a certificate, and `axi.space`'s redirect must exist *soon after* Task 1's deploy, because the moment `CNAME` changes, Pages stops answering for `axi.space`.

Use the Cloudflare API tooling. Every call is against the zone IDs in Global Constraints.

**Files:** none in the repository.

**Interfaces:**
- Consumes: `public/CNAME` containing `axi.wiki` (Task 1), already deployed.
- Produces: `axi.wiki` serving the site over valid TLS; `axi.space/*` 301ing to `axi.wiki/*`.

- [ ] **Step 1: Record the current state so it can be put back**

List both zones' DNS records and both zones' `http_request_dynamic_redirect` rulesets, and save the JSON to `/tmp/cf-before.json`. This is the rollback reference; do not skip it.

- [ ] **Step 2: Delete the axi.wiki redirect rule**

Delete rule `1dda699172a046ccaaaabd9150e78914` from ruleset `48507df69d5e4bc5a9a48e2c1b86b304` in zone `926be8798c7e9d692ebf19d86d8070a4`.

Verify: `curl -sI https://axi.wiki/ | head -1` no longer shows a 301 to `axi.space`.

- [ ] **Step 3: Unproxy axi.wiki**

Set `proxied: false` on all four `A` records for `axi.wiki` and on the `www.axi.wiki` `CNAME`. Proxying is incompatible with the Pages certificate.

- [ ] **Step 4: Wait for the Pages certificate**

Poll until TLS is valid:

```bash
until curl -sSf https://axi.wiki/ -o /dev/null 2>/dev/null; do sleep 30; done; echo 'axi.wiki serving'
```

Expected: this takes minutes, occasionally up to an hour. During it, `axi.wiki` throws certificate warnings. That is the known cost recorded in the spec, not a fault.

- [ ] **Step 5: Proxy axi.space**

Set `proxied: true` on all four `A` records for `axi.space` and on the `www.axi.space` `CNAME`.

- [ ] **Step 6: Add the mirror redirect rule**

Create a rule in zone `0c9d6f10e5cb58fa22bc818b2bdf9135`, phase `http_request_dynamic_redirect`:

```json
{
  "action": "redirect",
  "description": "axi.space and www.axi.space -> axi.wiki, same path",
  "enabled": true,
  "expression": "(http.host eq \"axi.space\") or (http.host eq \"www.axi.space\")",
  "action_parameters": {
    "from_value": {
      "preserve_query_string": true,
      "status_code": 301,
      "target_url": {
        "expression": "concat(\"https://axi.wiki\", http.request.uri.path)"
      }
    }
  }
}
```

- [ ] **Step 7: Verify end to end**

```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' 'https://axi.space/apps/gw2-addon-risk-guide?x=1'
curl -s -o /dev/null -w '%{http_code}\n' https://axi.wiki/
```

Expected: the first prints `301 https://axi.wiki/apps/gw2-addon-risk-guide?x=1` — query string intact. The second prints `200`.

Then load `https://axi.wiki/` in a real browser and confirm the landing page renders. `curl` proves the transport; only a browser proves the page.

---

### Task 3: Move the guide's files into public/addon-checker/

A verbatim copy. No file contents change in this task — the guide's paths are already relative, which is precisely what makes that possible.

**Files:**
- Create: `public/addon-checker/{index.html,policy.html,style.css,favicon.svg,app.js,render.js,search.js,conduct.mjs}`
- Create: `public/addon-checker/data/{catalog.json,conduct.json,overrides.json,policies.json}`
- Test: `tests/build.test.ts`

**Interfaces:**
- Produces: `dist/addon-checker/index.html` and `dist/addon-checker/data/catalog.json` in the built site. Task 4's scripts read and write `public/addon-checker/data/*.json`. Task 6 links to `/addon-checker/`.

- [ ] **Step 1: Write the failing test**

Append a new block to `tests/build.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- tests/build.test.ts`
Expected: FAIL — `missing addon-checker/index.html`.

- [ ] **Step 3: Copy the files**

```bash
GUIDE=/home/mstephens/Documents/GitHub/gw2-addon-risk-guide
mkdir -p public/addon-checker/data
cp "$GUIDE"/site/* public/addon-checker/
cp "$GUIDE"/data/*.json public/addon-checker/data/
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- tests/build.test.ts`
Expected: PASS.

- [ ] **Step 5: Check it in a browser**

```bash
npm run build && npx astro preview
```

Open `http://localhost:4321/addon-checker/`. The catalog must render with repo cards, the search box must filter them, and the Policy link must reach `/addon-checker/policy.html`. An empty catalog means the relative data fetch broke — stop and fix before committing.

- [ ] **Step 6: Commit**

```bash
git add public/addon-checker tests/build.test.ts
git commit -m "$(cat <<'MSG'
feat(addon-checker): serve the guide from this site, not github.io

Every path the guide references is relative - app.js carries a comment
explaining this was done so the page survives being served from a
subdirectory on a project site. That accommodation is what lets the
whole thing arrive here as a copy instead of a rewrite.

Nothing in an Astro build fails when a public/ directory goes missing,
so the tests assert the pages and their data reach dist/ and that the
data fetch stays relative.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 4: Move the scraper and its tests

The scraper lands in `scripts/catalog/` so it does not share a namespace with the existing `scripts/build-releases.mjs`. Two path families change: the data files the scraper reads and writes, and the test imports.

Note the coupling you are preserving: `build-catalog.mjs` imports `../site/conduct.mjs`, a module that lives inside the site tree. It becomes `../../public/addon-checker/conduct.mjs`. This is pre-existing, and not yours to redesign here.

**Files:**
- Create: `scripts/catalog/{build-catalog.mjs,discover.mjs,enrich.mjs,github.mjs,score.mjs,signals.mjs}`
- Create: `tests/catalog/` — the twelve `.test.mjs` files from `$GUIDE/tests/`
- Modify: `package.json` (add the `catalog` script)

**Interfaces:**
- Consumes: `public/addon-checker/data/*.json` and `public/addon-checker/conduct.mjs` from Task 3.
- Produces: `npm run catalog` rewrites `public/addon-checker/data/catalog.json`. Task 5's workflow calls it.

- [ ] **Step 1: Copy the files**

```bash
GUIDE=/home/mstephens/Documents/GitHub/gw2-addon-risk-guide
mkdir -p scripts/catalog tests/catalog
cp "$GUIDE"/scripts/*.mjs scripts/catalog/
cp "$GUIDE"/tests/*.test.mjs tests/catalog/
```

- [ ] **Step 2: Run the moved tests and watch them fail**

Run: `npm test -- tests/catalog`
Expected: FAIL — every file that imports `../scripts/...` or `../site/...` fails to resolve.

- [ ] **Step 3: Repoint the test imports**

In `tests/catalog/*.test.mjs`, rewrite the two relative import families:

```bash
sed -i "s#from '\.\./scripts/#from '../../scripts/catalog/#g" tests/catalog/*.test.mjs
sed -i "s#from '\.\./site/#from '../../public/addon-checker/#g" tests/catalog/*.test.mjs
```

- [ ] **Step 4: Repoint the scraper's data paths**

In `scripts/catalog/build-catalog.mjs`, the four `data/…` string literals are CWD-relative and vitest runs from the repo root, so they must name the new location:

```bash
sed -i "s#'data/#'public/addon-checker/data/#g" scripts/catalog/build-catalog.mjs
sed -i "s#data/catalog.json\`#public/addon-checker/data/catalog.json\`#g" scripts/catalog/build-catalog.mjs
```

Then fix the one relative import by hand — in `scripts/catalog/build-catalog.mjs`, line 8:

```js
import { indexAssessments, assessmentFor } from '../../public/addon-checker/conduct.mjs'
```

- [ ] **Step 5: Retarget the deploy-tree test**

`tests/catalog/deploy-tree.test.mjs` guards against a module inside the deployed tree importing something outside it — still exactly the right guard, because Astro copies `public/` verbatim and gives those files no bundling. Change its directory constant and its comment:

Replace `const SITE_DIR = resolve('site')` with:

```js
const SITE_DIR = resolve('public/addon-checker')
```

Replace the header comment with:

```js
// Astro copies public/ into dist/ verbatim - no bundling, no rewriting. So a
// module under public/addon-checker/ that imports something outside that
// directory resolves fine under vitest (which runs from the repo root) and
// 404s in the browser. This test statically walks every module there and fails
// if any relative import specifier escapes.
```

Replace `describe('site/ deploy tree', ...)` with `describe('public/addon-checker/ deploy tree', ...)`.

- [ ] **Step 6: Add the catalog script**

In `package.json`, add to `scripts`:

```json
    "catalog": "node scripts/catalog/build-catalog.mjs",
```

- [ ] **Step 7: Run the whole suite**

Run: `npm test`
Expected: PASS. The catalog tests now number twelve files on top of the existing five.

- [ ] **Step 8: Commit**

```bash
git add scripts/catalog tests/catalog package.json
git commit -m "$(cat <<'MSG'
feat(catalog): bring the scraper along with the site it feeds

The scraper gets its own directory rather than joining
build-releases.mjs at the top of scripts/, so two unrelated data
pipelines do not share one namespace.

deploy-tree.test.mjs moves with it and keeps its job: Astro copies
public/ verbatim, so a module there that imports outside its own
directory still resolves under vitest and still 404s in a browser. Only
the directory it guards has changed.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 5: Schedule the refresh and stamp the assets

Two deploy concerns. The weekly scrape becomes a second `workflow_run` producer for `pages.yml`, alongside the existing `refresh-releases`. And the guide's cache-busting stamp has to survive the move, because Astro content-hashes only what it builds — files under `public/` are copied untouched.

**Files:**
- Create: `.github/workflows/refresh-catalog.yml`
- Modify: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: `npm run catalog` from Task 4.
- Produces: a scheduled commit to `public/addon-checker/data/catalog.json` that redeploys the site.

- [ ] **Step 1: Write the refresh workflow**

Create `.github/workflows/refresh-catalog.yml`. It is the guide's workflow with three paths changed and nothing else:

```yaml
name: refresh-catalog
on:
  schedule: [{ cron: '17 4 * * 1' }]
  workflow_dispatch:
permissions:
  contents: write
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: npm }
      - run: npm ci
      # The workflow GITHUB_TOKEN gets 1,000 REST calls an hour and enrichment
      # costs 5 per repo, so a run may re-read at most ~190 repos. 150 leaves
      # headroom for discovery and retries. Repos beyond the budget keep serving
      # their cached content; their metadata signals are still recomputed free.
      - run: npm run catalog
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          ENRICH_BUDGET: '150'
      - name: Guard against a catastrophically shrunken catalog
        run: |
          node -e "
            const fs = require('node:fs');
            const { execSync } = require('node:child_process');
            const path = 'public/addon-checker/data/catalog.json';
            const next = JSON.parse(fs.readFileSync(path, 'utf8'));
            const nextCount = next.repos.length;
            let prevCount;
            try {
              const prevRaw = execSync('git show HEAD:' + path).toString();
              prevCount = JSON.parse(prevRaw).repos.length;
            } catch {
              console.log('No previous catalog to compare against; skipping guard.');
              process.exit(0);
            }
            const threshold = prevCount * 0.8;
            if (nextCount < threshold) {
              console.error(\`Refusing to publish: new catalog has \${nextCount} repos, previous had \${prevCount} (threshold \${threshold}).\`);
              process.exit(1);
            }
            console.log(\`Catalog size ok: \${nextCount} repos (previous \${prevCount}).\`);
          "
      - name: Commit refreshed catalog
        run: |
          git config user.name  'github-actions[bot]'
          git config user.email 'github-actions[bot]@users.noreply.github.com'
          git add public/addon-checker/data/catalog.json
          git diff --staged --quiet || git commit -m "chore: refresh catalog"
          git pull --rebase
          git push
      # Runs after the catalog build/commit, not before: a hand-authored
      # conduct.json verdict can go orphaned the moment its repo goes private
      # or is deleted upstream (tests/catalog/conduct-data.test.mjs fails on
      # that). If npm test ran first, that failure would block the refresh
      # every single week until a human fixed conduct.json, freezing it
      # indefinitely. Building and committing first means an orphaned verdict
      # still turns this run red, but can no longer stop the catalog
      # refreshing.
      - run: npm test
```

- [ ] **Step 2: Let a finished refresh redeploy the site**

In `.github/workflows/pages.yml`, change the `workflow_run` trigger to name both producers:

```yaml
  workflow_run:
    workflows: [refresh-releases, refresh-catalog]
    types: [completed]
```

- [ ] **Step 3: Add the stamping step**

In `pages.yml`, between `- run: npm run build` and `- uses: actions/configure-pages@v5`, insert:

```yaml
      # Browsers hold on to style.css and JS modules far longer than they hold
      # on to index.html, so a deploy can pair fresh HTML with a stale module -
      # and a module reaching for an element the new HTML no longer has takes
      # the whole page down. Astro content-hashes what it builds, but public/
      # is copied verbatim, so the addon checker needs this done for it.
      # Scoped to its directory: nothing Astro generated is touched.
      - name: Stamp the addon checker's assets with the deployed commit
        run: |
          v=$(git rev-parse --short HEAD)
          find dist/addon-checker \( -name '*.html' -o -name '*.js' -o -name '*.mjs' \) -print0 |
            xargs -0 sed -i -E \
              -e "s/(href|src)=\"([A-Za-z0-9_.-]+\.(css|js|mjs))\"/\\1=\"\\2?v=$v\"/g" \
              -e "s/from '\\.\/([A-Za-z0-9_.-]+\.(js|mjs))'/from '.\/\\1?v=$v'/g"
```

- [ ] **Step 4: Check the stamp does what it claims, locally**

```bash
npm run build
v=$(git rev-parse --short HEAD)
find dist/addon-checker \( -name '*.html' -o -name '*.js' -o -name '*.mjs' \) -print0 |
  xargs -0 sed -i -E \
    -e "s/(href|src)=\"([A-Za-z0-9_.-]+\.(css|js|mjs))\"/\1=\"\2?v=$v\"/g" \
    -e "s/from '\.\/([A-Za-z0-9_.-]+\.(js|mjs))'/from '.\/\1?v=$v'/g"
grep -o 'style.css?v=[a-z0-9]*' dist/addon-checker/index.html
npx astro preview
```

Expected: the `grep` prints `style.css?v=<sha>`. Then open `http://localhost:4321/addon-checker/` and confirm the page is still styled and the catalog still loads — a stamp that breaks a path would show as an unstyled page.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/refresh-catalog.yml .github/workflows/pages.yml
git commit -m "$(cat <<'MSG'
ci(catalog): refresh the catalog weekly and redeploy from it

refresh-catalog joins refresh-releases as a workflow_run producer for
pages, for the same reason that pattern exists: a commit made with the
default GITHUB_TOKEN does not fire the push trigger, so without it the
refreshed catalog would sit in main unpublished.

The asset stamp comes across from the old deploy because Astro
content-hashes only what it builds. public/ is copied verbatim, so the
checker's modules would otherwise keep their bare names forever and a
browser could pair new HTML with a cached module.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
```

---

### Task 6: Wire the URLs

The alias has to go: a real page and a redirect stub cannot both own `dist/addon-checker/index.html`. The collision guards that would have caught this do not know `public/` exists, so they learn.

**Files:**
- Modify: `src/content/apps/gw2-addon-risk-guide.md`
- Modify: `tests/content.test.ts`
- Test: `tests/build.test.ts`

**Interfaces:**
- Consumes: `public/addon-checker/` from Task 3.
- Produces: the app card linking to `https://axi.wiki/addon-checker/`.

- [ ] **Step 1: Write the failing guard**

Add to the `describe('app aliases', ...)` block in `tests/content.test.ts`:

```ts
  // public/ is copied into the site verbatim, so a top-level directory there is
  // a URL just as much as an app slug is. An alias colliding with one would put
  // a redirect stub and a real page at the same path.
  it('never shadows something served out of public/', () => {
    const served = new Set(
      readdirSync(resolve(root, 'public'), { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name),
    );
    for (const { alias } of aliases) {
      expect(served.has(alias), `alias ${alias} shadows public/${alias}`).toBe(false);
    }
  });
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- tests/content.test.ts`
Expected: FAIL — `alias addon-checker shadows public/addon-checker`.

- [ ] **Step 3: Drop the alias and repoint the link**

In `src/content/apps/gw2-addon-risk-guide.md`, delete the `aliases: [addon-checker]` line and change `site`:

```yaml
site: https://axi.wiki/addon-checker/
```

- [ ] **Step 4: Keep the alias suite honest**

The block opens with a test asserting at least one alias exists, so the rest has something to guard. Removing the only alias makes that test fail — correctly. Change it to state the weaker thing that is still true, and say why:

```ts
  // No app declares an alias today: the addon checker's became a real page.
  // The guards below are still live - they run against whatever the next
  // alias is - so this asserts the shape rather than a count.
  it('is a list, empty or not', () => {
    expect(Array.isArray(aliases)).toBe(true);
  });
```

- [ ] **Step 5: Assert the URL people type still lands**

Add to the `describe('the addon checker', ...)` block in `tests/build.test.ts`:

```ts
  // The alias redirect is gone because the real page took its path. The
  // explicit-index form a bookmark carries has to keep resolving - and now it
  // resolves to the page itself rather than to a stub.
  it('answers the URL a bookmark carries', () => {
    expect(read('addon-checker/index.html')).toContain('GW2');
  });
```

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit and push**

```bash
git add src/content/apps/gw2-addon-risk-guide.md tests/content.test.ts tests/build.test.ts
git commit -m "$(cat <<'MSG'
feat(routes): let the real page take /addon-checker

The alias existed to send a name people type somewhere useful. That name
now names a page, and an alias would put a redirect stub at the exact
path the page occupies.

The collision guards did not catch this, because they knew about app
slugs and editorial pages but not about public/ - which Astro copies
verbatim, making a directory there every bit as much a URL. They know
now.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
git push origin main
```

- [ ] **Step 8: Verify live, in a browser**

Once the deploy finishes, open each of these and confirm the catalog renders with data:

- `https://axi.wiki/addon-checker/`
- `https://axi.wiki/addon-checker/index.html`
- `https://axi.wiki/addon-checker` — no trailing slash

The third is the one that can fail: the guide's paths only resolve under a trailing slash, and Pages must 301 the bare form. If it does not, add `'/addon-checker': '/addon-checker/'` to the `redirects` map in `astro.config.mjs` and ship that.

Then check `https://axi.wiki/apps/gw2-addon-risk-guide` — the card's primary link must now point at `/addon-checker/`, not github.io.

---

### Task 7: Tombstone the old repository

Done in `$GUIDE`, not in `axisite`. The repository keeps its history and its URL, and stops being a running system.

**Files (all in `$GUIDE`):**
- Delete: `site/*` except the replacement below
- Create: `site/index.html`
- Delete: `.github/workflows/refresh-catalog.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: a live `https://axi.wiki/addon-checker/` from Task 6.

- [ ] **Step 1: Confirm the destination is live before pointing at it**

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://axi.wiki/addon-checker/
```

Expected: `200`. If it is not, stop — a tombstone pointing at a 404 is worse than no tombstone.

- [ ] **Step 2: Replace the site with a tombstone**

```bash
cd /home/mstephens/Documents/GitHub/gw2-addon-risk-guide
git rm -r --quiet site data scripts tests vitest.config.mjs
# package.json's scripts and devDependencies all name files that just went
# away; an archived repo should not ship a build that cannot run.
node -e "
  const fs = require('node:fs');
  const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  delete p.scripts; delete p.devDependencies;
  fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
"
rm -f package-lock.json
mkdir -p site
cat > site/index.html <<'HTML'
<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Moved — GW2 Addon Risk Guide</title>
<meta http-equiv="refresh" content="0;url=https://axi.wiki/addon-checker/">
<link rel="canonical" href="https://axi.wiki/addon-checker/">
<style>
  body { background:#0e1116; color:#c9d1d9; font:16px/1.6 system-ui, sans-serif;
         display:grid; place-content:center; min-height:100vh; margin:0; text-align:center }
  a { color:#7ab7ff }
</style>
<body>
  <p>The GW2 Addon Risk Guide has moved.</p>
  <p><a href="https://axi.wiki/addon-checker/">axi.wiki/addon-checker</a></p>
</body>
</html>
HTML
```

- [ ] **Step 3: Stop the scraper running in two places**

```bash
git rm --quiet .github/workflows/refresh-catalog.yml
```

`pages.yml` stays: it is what publishes the tombstone. Remove its `workflow_run` trigger, since the workflow it names no longer exists:

In `.github/workflows/pages.yml`, delete these three lines:

```yaml
  workflow_run:
    workflows: [Refresh catalog]
    types: [completed]
```

and delete the `if:` line on the `deploy` job that references `github.event.workflow_run.conclusion`, along with its explanatory comment.

- [ ] **Step 4: Say so in the README**

Replace the README's contents with:

```markdown
# GW2 Addon Risk Guide — moved

This project now lives in [darkharasho/axisite](https://github.com/darkharasho/axisite)
and is served at **<https://axi.wiki/addon-checker/>**.

The site, its catalog data, the scraper and its tests all moved there. This
repository is archived and kept for its history;
<https://darkharasho.github.io/gw2-addon-risk-guide/> redirects to the new
address so existing links keep working.
```

- [ ] **Step 5: Commit and push**

```bash
git add -A
git commit -m "$(cat <<'MSG'
chore: move the guide to axisite and leave a forwarding address

The site, its data, the scraper and the tests now live in axisite and
serve at axi.wiki/addon-checker. What stays here is a redirect, because
the github.io URL is the one anyone who found this project already has,
and it costs one file to keep it working.

refresh-catalog goes too: with the scraper running in axisite, leaving
it here would mean two repositories scraping and committing the same
catalog every week.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
)"
git push origin main
```

- [ ] **Step 6: Verify the forwarding address in a browser**

Once the deploy finishes, open `https://darkharasho.github.io/gw2-addon-risk-guide/`. It must land on `https://axi.wiki/addon-checker/` with the catalog rendered. `curl` will not follow the meta-refresh, so a 200 there proves only that the tombstone was served.

- [ ] **Step 7: Archive the repository**

```bash
gh repo archive darkharasho/gw2-addon-risk-guide --yes
```

Do this last. Archiving makes the repository read-only, so every step above must already be pushed.
