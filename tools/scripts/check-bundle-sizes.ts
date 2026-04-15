/**
 * Bundle size check — fails if any Angular app's initial JS bundle exceeds 500 KB.
 * Reads stats.json files produced by `nx build`.
 */

import * as fs from 'fs';
import * as path from 'path';

const LIMIT_BYTES = 500 * 1024; // 500 KB

const distRoot = path.join(process.cwd(), 'dist');

if (!fs.existsSync(distRoot)) {
  console.log('No dist/ folder found — skipping bundle size check.');
  process.exit(0);
}

let failed = false;

function checkApp(appDistPath: string, appName: string): void {
  const statsPath = path.join(appDistPath, 'browser', 'stats.json');
  if (!fs.existsSync(statsPath)) return;

  const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8')) as {
    assets?: Array<{ name: string; size: number; chunkNames?: string[] }>;
  };

  const assets = stats.assets ?? [];
  for (const asset of assets) {
    const isInitialJs =
      asset.name.endsWith('.js') &&
      (asset.chunkNames?.includes('main') ||
        asset.chunkNames?.includes('polyfills') ||
        asset.name.startsWith('main.') ||
        asset.name.startsWith('polyfills.'));

    if (isInitialJs && asset.size > LIMIT_BYTES) {
      const kb = (asset.size / 1024).toFixed(1);
      const limitKb = (LIMIT_BYTES / 1024).toFixed(0);
      console.error(
        `✗ [${appName}] ${asset.name} is ${kb} KB — exceeds ${limitKb} KB limit`
      );
      failed = true;
    }
  }
}

const appsDir = path.join(distRoot, 'apps');
if (fs.existsSync(appsDir)) {
  for (const entry of fs.readdirSync(appsDir)) {
    const appDistPath = path.join(appsDir, entry);
    if (fs.statSync(appDistPath).isDirectory()) {
      checkApp(appDistPath, entry);
    }
  }
}

if (failed) {
  console.error('\n✗ Bundle size check failed — reduce initial bundle size.');
  process.exit(1);
} else {
  console.log('✓ All bundles within 500 KB limit.');
}
