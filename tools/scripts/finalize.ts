/**
 * Finalize pipeline — runs lint, tests, security checks, and build in sequence.
 * Stop on first failure.
 *
 * Usage:
 *   ts-node tools/scripts/finalize.ts              # affected targets only
 *   ts-node tools/scripts/finalize.ts --full        # all targets + e2e
 *   ts-node tools/scripts/finalize.ts --lint-only   # lint only (used in pre-commit)
 */

import { execSync, ExecSyncOptions } from 'child_process';

const args = process.argv.slice(2);
const isFull = args.includes('--full');
const isLintOnly = args.includes('--lint-only');

const scope = isFull ? '' : ':affected';

function run(label: string, cmd: string): void {
  console.log(`\n▶ ${label}`);
  const opts: ExecSyncOptions = { stdio: 'inherit', cwd: process.cwd() };
  try {
    execSync(cmd, opts);
    console.log(`✓ ${label}`);
  } catch {
    console.error(`✗ ${label} — FAILED`);
    process.exit(1);
  }
}

// ── 1. Lint ──────────────────────────────────────────────────────────────────
run('Lint', `npx nx${scope === '' ? '' : ' affected'}:lint${scope === '' ? ' --all' : ''}`);

if (isLintOnly) {
  console.log('\n✅ Lint-only pass complete.');
  process.exit(0);
}

// ── 2. Unit tests ────────────────────────────────────────────────────────────
run(
  'Unit tests',
  `npx nx${scope === '' ? '' : ' affected'}:test${scope === '' ? ' --all' : ''}`
);

// ── 3. Integration tests ─────────────────────────────────────────────────────
run(
  'Integration tests',
  `npx nx${scope === '' ? '' : ' affected'}:test${scope === '' ? ' --all' : ''} --testPathPattern=integration`
);

// ── 4. Secret scan ───────────────────────────────────────────────────────────
run('Secret scan (trufflehog)', 'trufflehog filesystem . --only-verified --fail');

// ── 5. Dependency audit ──────────────────────────────────────────────────────
run('Dependency audit (audit-ci)', 'npx audit-ci --config audit-ci.json');

// ── 6. E2E (full mode only) ──────────────────────────────────────────────────
if (isFull) {
  run('E2E tests', 'npx nx affected:e2e');
}

// ── 7. Build ─────────────────────────────────────────────────────────────────
run(
  'Build',
  `npx nx${scope === '' ? '' : ' affected'}:build${scope === '' ? ' --all' : ''}`
);

// ── 8. Bundle size check ─────────────────────────────────────────────────────
run('Bundle size check', 'ts-node tools/scripts/check-bundle-sizes.ts');

console.log('\n✅ Finalize pipeline complete.');
