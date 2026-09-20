import { describe, expect, it } from 'vitest';
import { collectReleases, mergeReleases } from '../scripts/build-releases.mjs';
import { releaseChip } from '../src/lib/releases';

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const fail = () => ({ ok: false, status: 403, json: async () => ({}) });

const release = (tag: string) => ({
  tag_name: tag,
  published_at: '2026-09-17T00:00:00Z',
  assets: [{ download_count: 40 }, { download_count: 2 }],
});

describe('collectReleases', () => {
  it('maps a successful fetch to tag, date and summed downloads', async () => {
    const { data, failures } = await collectReleases(['darkharasho/axilog'], {
      fetchImpl: async () => ok(release('v2.3.1')),
    });
    expect(failures).toEqual([]);
    expect(data['darkharasho/axilog']).toEqual({
      tag: 'v2.3.1',
      publishedAt: '2026-09-17T00:00:00Z',
      downloads: 42,
    });
  });

  it('records a failure instead of throwing', async () => {
    const { data, failures } = await collectReleases(['darkharasho/axidps'], {
      fetchImpl: async () => fail(),
    });
    expect(data).toEqual({});
    expect(failures).toEqual(['darkharasho/axidps']);
  });

  it('keeps the successes when only some repos fail', async () => {
    const { data, failures } = await collectReleases(
      ['darkharasho/axilog', 'darkharasho/axidps'],
      { fetchImpl: async (url: string) => (url.includes('axilog') ? ok(release('v1.0.0')) : fail()) },
    );
    expect(Object.keys(data)).toEqual(['darkharasho/axilog']);
    expect(failures).toEqual(['darkharasho/axidps']);
  });
});

describe('mergeReleases', () => {
  const previous = {
    'darkharasho/axilog': { tag: 'v2.3.0', publishedAt: '2026-08-01T00:00:00Z', downloads: 10 },
    'darkharasho/axidps': { tag: 'v0.1.0', publishedAt: '2026-07-01T00:00:00Z', downloads: 3 },
  };

  it('overwrites refreshed repos and preserves the rest', () => {
    const merged = mergeReleases(previous, {
      'darkharasho/axilog': { tag: 'v2.3.1', publishedAt: '2026-09-17T00:00:00Z', downloads: 42 },
    });
    expect(merged['darkharasho/axilog'].tag).toBe('v2.3.1');
    expect(merged['darkharasho/axidps'].tag).toBe('v0.1.0');
  });

  it('never empties the file when every fetch failed', () => {
    expect(mergeReleases(previous, {})).toEqual(previous);
  });
});

describe('releaseChip', () => {
  const now = new Date('2026-09-20T00:00:00Z');

  it('renders tag and recency', () => {
    expect(releaseChip({ tag: 'v2.3.1', publishedAt: '2026-09-17T00:00:00Z', downloads: 42 }, now))
      .toBe('v2.3.1 · 3d ago');
  });

  it('renders today as today', () => {
    expect(releaseChip({ tag: 'v9', publishedAt: '2026-09-20T00:00:00Z', downloads: 0 }, now))
      .toBe('v9 · today');
  });

  it('switches to months past 60 days', () => {
    expect(releaseChip({ tag: 'v1', publishedAt: '2026-03-20T00:00:00Z', downloads: 0 }, now))
      .toBe('v1 · 6mo ago');
  });

  it('returns undefined when there is no release', () => {
    expect(releaseChip(undefined, now)).toBeUndefined();
  });
});
