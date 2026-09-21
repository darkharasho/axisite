export const CATEGORIES = [
  'combat-logs',
  'guild-community',
  'stream-overlays',
  'builds',
  'reference-web',
  'suite',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_META: Record<Category, { label: string; blurb: string; order: number }> = {
  suite: { label: 'Suite', blurb: 'The launcher that ties the rest together.', order: 1 },
  'combat-logs': { label: 'Combat & logs', blurb: 'Parsing, metrics and in-game overlays for arcdps.', order: 2 },
  'stream-overlays': { label: 'Stream & overlays', blurb: 'Going live, and getting fights in front of your squad.', order: 3 },
  'guild-community': { label: 'Guild & community', blurb: 'Rosters, accounts and Discord.', order: 4 },
  builds: { label: 'Builds', blurb: 'Making, encoding and publishing build sets.', order: 5 },
  'reference-web': { label: 'Reference & web', blurb: 'Documentation and the shared design language.', order: 6 },
};

export const STATUSES = ['stable', 'beta', 'wip'] as const;
export type Status = (typeof STATUSES)[number];

/** The card's top strip. It encodes shipping status; anything with nothing to
 *  say gets no strip at all, per axi-design's rule that a strip must mean something. */
export function strip(status: Status): string | undefined {
  if (status === 'stable') return 'var(--axi-ok)';
  if (status === 'beta') return 'var(--axi-warn)';
  return undefined;
}

export function chipClass(status: Status): string {
  if (status === 'stable') return 'axi-chip axi-chip--ok';
  if (status === 'beta') return 'axi-chip axi-chip--warn';
  return 'axi-chip';
}

export const STATUS_LABEL: Record<Status, string> = {
  stable: 'Stable',
  beta: 'Beta',
  wip: 'In progress',
};

/** Platform slugs are stored lowercase in frontmatter. Cards uppercase them in
 *  CSS; anywhere they appear as running text they need capitalising properly,
 *  with the two that are not ordinary words spelled the way they are written. */
const PLATFORM_LABEL: Record<string, string> = { macos: 'macOS', ios: 'iOS' };

export function platformLabel(platform: string): string {
  return PLATFORM_LABEL[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1);
}
