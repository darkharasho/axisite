import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(root, 'data/releases.json');

/** Read every `repo:` value out of the apps collection without a YAML parser
 *  dependency — the field is always a single unquoted line. */
export function repoList() {
  const dir = resolve(root, 'src/content/apps');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => readFileSync(resolve(dir, f), 'utf8').match(/^repo:\s*(\S+)\s*$/m)?.[1])
    .filter(Boolean);
}

export async function collectReleases(repos, { fetchImpl = fetch, token } = {}) {
  const data = {};
  const failures = [];
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'axiwiki-build' };
  if (token) headers.authorization = `Bearer ${token}`;

  for (const repo of repos) {
    try {
      const res = await fetchImpl(`https://api.github.com/repos/${repo}/releases/latest`, { headers });
      if (!res.ok) {
        failures.push(repo);
        continue;
      }
      const body = await res.json();
      data[repo] = {
        tag: body.tag_name,
        publishedAt: body.published_at,
        downloads: (body.assets ?? []).reduce((n, a) => n + (a.download_count ?? 0), 0),
      };
    } catch {
      failures.push(repo);
    }
  }
  return { data, failures };
}

/** Refreshed repos win; everything else keeps its last known value. An empty
 *  fetch result is a no-op, so a total outage cannot blank the file. */
export function mergeReleases(previous, fetched) {
  return { ...previous, ...fetched };
}

function readPrevious() {
  try {
    return JSON.parse(readFileSync(OUT, 'utf8'));
  } catch {
    return {};
  }
}

async function main() {
  const previous = readPrevious();
  const repos = repoList();
  const { data, failures } = await collectReleases(repos, { token: process.env.GITHUB_TOKEN });

  if (failures.length) {
    console.warn(`[releases] kept committed data for ${failures.length} repo(s): ${failures.join(', ')}`);
  }

  const merged = mergeReleases(previous, data);
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`[releases] ${Object.keys(merged).length} repo(s) in data/releases.json`);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
