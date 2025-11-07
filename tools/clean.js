#!/usr/bin/env node

import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function remove(target) {
  await rm(path.join(projectRoot, target), { recursive: true, force: true });
}

await Promise.all([remove('build'), remove('dist')]);
