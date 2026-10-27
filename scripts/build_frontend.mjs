import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, '..', 'frontend');
process.chdir(frontendDir);

import { build } from '../frontend/node_modules/vite/dist/node/index.js';

console.log('Starting Vite build in:', frontendDir);
try {
  await build({
    root: frontendDir,
  });
  console.log('Vite build completed successfully!');
} catch (err) {
  console.error('Vite build failed:', err);
  process.exit(1);
}
