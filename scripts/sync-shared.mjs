#!/usr/bin/env node
// Copies the pure TypeScript the Discord Edge Function shares with the web app (packages/core/src) into
// supabase/functions/_shared/lib, so both run the exact same scoring, ranking, records and message code.
// The copies are generated and committed; CI runs `--check` and fails if they drift from the source.
//
//   node scripts/sync-shared.mjs          regenerate
//   node scripts/sync-shared.mjs --check  fail if the committed copies are out of date
//
// Only the listed files are copied (explicit, so a new import that isn't listed fails `deno check`, not silently).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(root, 'packages/core/src')
const DEST = path.join(root, 'supabase/functions/_shared/lib')

const FILES = [
  'dates.ts',
  'periods.ts',
  'format.ts',
  'stats.ts',
  'score/index.ts',
  'score/apple.ts',
  'score/time.ts',
  'score/types.ts',
  'league/columns.ts',
  'league/device.ts',
  'league/eligibility.ts',
  'league/podiums.ts',
  'league/prepare.ts',
  'league/rank.ts',
  'league/records.ts',
  'league/types.ts',
  'league/windows.ts',
  'discord/format.ts',
  'discord/plan.ts',
  'discord/tick.ts',
]

const banner = (file) =>
  `// GENERATED from packages/core/src/${file} by scripts/sync-shared.mjs. Do not edit here: change the source and run\n` +
  `//   node scripts/sync-shared.mjs\n`

const expected = new Map(FILES.map((f) => [f, banner(f) + fs.readFileSync(path.join(SRC, f), 'utf8')]))

function listDest(dir = DEST, prefix = '') {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listDest(path.join(dir, e.name), `${prefix}${e.name}/`) : [`${prefix}${e.name}`],
  )
}

if (process.argv.includes('--check')) {
  const problems = []
  for (const [file, content] of expected) {
    const p = path.join(DEST, file)
    if (!fs.existsSync(p)) problems.push(`missing: ${file}`)
    else if (fs.readFileSync(p, 'utf8') !== content) problems.push(`out of date: ${file}`)
  }
  for (const f of listDest()) if (!expected.has(f)) problems.push(`unexpected file: ${f}`)
  if (problems.length) {
    console.error(`supabase/functions/_shared/lib is out of sync with packages/core/src:\n  ${problems.join('\n  ')}\nRun: node scripts/sync-shared.mjs`)
    process.exit(1)
  }
  console.log(`shared code in sync (${expected.size} files)`)
} else {
  for (const f of listDest()) if (!expected.has(f)) fs.rmSync(path.join(DEST, f))
  for (const [file, content] of expected) {
    const p = path.join(DEST, file)
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, content)
  }
  console.log(`copied ${expected.size} files to supabase/functions/_shared/lib`)
}
