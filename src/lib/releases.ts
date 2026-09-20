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

export function releaseChip(info: ReleaseInfo | undefined, now = new Date()): string | undefined {
  if (!info?.tag) return undefined;
  return `${info.tag} · ${ago(info.publishedAt, now)}`;
}
