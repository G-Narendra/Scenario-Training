import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.resolve(rootDir, 'frontend');
const frontendDist = path.resolve(frontendDir, 'dist');
const rootDist = path.resolve(rootDir, 'dist');
process.chdir(frontendDir);

import { build } from '../frontend/node_modules/vite/dist/node/index.js';

console.log('Starting Vite build in:', frontendDir);
try {
  await build({
    root: frontendDir,
  });
  console.log('Vite build completed successfully!');

  // Sync to root dist directory as well
  if (fs.existsSync(frontendDist)) {
    fs.cpSync(frontendDist, rootDist, { recursive: true, force: true });
    console.log('Synced frontend/dist to root dist/ successfully!');
  }
} catch (err) {
  console.error('Vite build failed:', err);
  process.exit(1);
}
