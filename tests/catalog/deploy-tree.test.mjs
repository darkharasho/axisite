import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname, relative, resolve } from 'node:path'

// Astro copies public/ into dist/ verbatim - no bundling, no rewriting. So a
// module under public/addon-checker/ that imports something outside that
// directory resolves fine under vitest (which runs from the repo root) and
// 404s in the browser. This test statically walks every module there and fails
// if any relative import specifier escapes.

const SITE_DIR = resolve('public/addon-checker')

function collectFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectFiles(full))
    else if (/\.(m?js)$/.test(entry.name)) out.push(full)
  }
  return out
}

// Three forms reach a module: `from '...'`, a side-effect `import '...'`, and
// a dynamic `import('...')`. Matching only the first would let the other two
// escape site/ unnoticed, which is the whole thing this guard exists to catch.
function importSpecifiers(source) {
  const specifiers = []
  const re = /(?:from\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g
  let m
  while ((m = re.exec(source))) specifiers.push(m[1])
  return specifiers
}

describe('public/addon-checker/ deploy tree', () => {
  it('has no relative import that escapes site/', () => {
    const files = collectFiles(SITE_DIR)
    const escapes = []
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      for (const spec of importSpecifiers(source)) {
        if (!spec.startsWith('.')) continue // bare/package specifiers aren't file-relative
        const resolved = resolve(dirname(file), spec)
        const rel = relative(SITE_DIR, resolved)
        if (rel.startsWith('..')) {
          escapes.push(`${relative(process.cwd(), file)} imports '${spec}', which resolves outside site/`)
        }
      }
    }
    expect(escapes, escapes.join('\n')).toEqual([])
  })
})
