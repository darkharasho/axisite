import releases from '../../data/releases.json';

export type ReleaseInfo = { tag: string; publishedAt: string; downloads: number };
export type ReleaseMap = Record<string, ReleaseInfo>;

export function loadReleases(): ReleaseMap {
  return releases as ReleaseMap;
}

function ago(published: string, now: Date): string {
  const days = Math.floor((now.getTime() - new Date(published).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days <= 60) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}

export type RecentRelease = { repo: string; tag: string; publishedAt: string; when: string };

/** The newest releases across the whole suite, for the landing page's feed.
 *  Sorted by publish date rather than by app, so the panel reads as a
 *  changelog. A repo with no tag yet has nothing to announce and is skipped. */
export function recentReleases(map: ReleaseMap, limit = 4, now = new Date()): RecentRelease[] {
  return Object.entries(map)
    .filter(([, info]) => Boolean(info?.tag))
    .sort((a, b) => Date.parse(b[1].publishedAt) - Date.parse(a[1].publishedAt))
    .slice(0, limit)
    .map(([repo, info]) => ({
      repo,
      tag: info.tag,
      publishedAt: info.publishedAt,
      when: ago(info.publishedAt, now),
    }));
}

export function releaseChip(info: ReleaseInfo | undefined, now = new Date()): string | undefined {
  if (!info?.tag) return undefined;
  return `${info.tag} · ${ago(info.publishedAt, now)}`;
}
