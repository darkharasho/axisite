import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const dist = (p: string) => resolve(root, 'dist', p);
const read = (p: string) => readFileSync(dist(p), 'utf8');

beforeAll(() => {
  execSync('npx astro build', { cwd: root, stdio: 'inherit' });
}, 180_000);

describe('build output', () => {
  it('emits the landing page and the 404 page', () => {
    expect(existsSync(dist('index.html'))).toBe(true);
    expect(existsSync(dist('404.html'))).toBe(true);
  });

  it('links the axi-design stylesheet from the CDN on every page', () => {
    for (const page of ['index.html', '404.html']) {
      expect(read(page)).toContain(
        'https://darkharasho.github.io/axi-design/v1/axi.css',
      );
    }
  });

  it('does not vendor a copy of axi.css', () => {
    expect(existsSync(resolve(root, 'public/axi.css'))).toBe(false);
    expect(existsSync(resolve(root, 'src/styles/axi.css'))).toBe(false);
  });
});
