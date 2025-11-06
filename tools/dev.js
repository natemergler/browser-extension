#!/usr/bin/env node

import chokidar from 'chokidar';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildExtension } from './build-extension.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const settingsPath = process.env.EXTENSION_SETTINGS;

const watcher = chokidar.watch(
  [
    path.join(projectRoot, 'src'),
    path.join(projectRoot, 'settings'),
    path.join(projectRoot, 'node_modules', 'hypothesis', 'build'),
  ],
  {
    ignoreInitial: true,
    ignored: [path.join(projectRoot, 'build')],
  },
);

let building = false;
let rebuildRequested = false;
let pendingReason = 'initial build';

async function runBuild(reason) {
  if (building) {
    rebuildRequested = true;
    pendingReason = reason;
    return;
  }

  building = true;
  const started = performance.now();
  const label = reason ?? 'change detected';
  console.log(`[dev] Running build (${label})...`);

  try {
    await buildExtension({ settingsPath });
    const duration = ((performance.now() - started) / 1000).toFixed(2);
    console.log(`[dev] Build finished in ${duration}s.`);
  } catch (error) {
    console.error('[dev] Build failed:', error);
  } finally {
    building = false;
    if (rebuildRequested) {
      rebuildRequested = false;
      const nextReason = pendingReason;
      pendingReason = 'file change';
      await runBuild(nextReason);
    }
  }
}

watcher.on('all', (event, filePath) => {
  const reason = `${event} ${path.relative(projectRoot, filePath)}`;
  runBuild(reason).catch(error => {
    console.error('[dev] Unexpected error while scheduling build:', error);
  });
});

watcher.on('error', error => {
  console.error('[dev] Watcher error:', error);
});

console.log('[dev] Starting development build...');
runBuild(pendingReason).catch(error => {
  console.error('[dev] Initial build failed:', error);
});

watcher.on('ready', () => {
  console.log('[dev] Watching for changes. Press Ctrl+C to stop.');
});

process.on('SIGINT', async () => {
  console.log('\n[dev] Shutting down watcher...');
  await watcher.close();
  process.exit(0);
});
