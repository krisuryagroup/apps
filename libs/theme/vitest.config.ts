import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

// node_modules live at the workspace root, not in the worktree itself.
// process.cwd() is the worktree root (agent-ab7f6140/), so we walk up to
// the real apps/ root via the symlinked package.json or via the lock.
// The simplest robust approach: walk up until we find node_modules/@angular.
import { realpathSync, existsSync } from 'fs';

function findNodeModules(start: string): string {
  let dir = start;
  for (let i = 0; i < 10; i++) {
    const candidate = resolve(dir, 'node_modules');
    if (existsSync(resolve(candidate, '@angular', 'core'))) {
      return candidate;
    }
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(start, 'node_modules');
}

const nodeModules = findNodeModules(process.cwd());

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['libs/theme/src/**/*.{test,spec}.{ts,mts}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@angular/core': resolve(nodeModules, '@angular/core'),
      '@angular/common': resolve(nodeModules, '@angular/common'),
    },
  },
});
