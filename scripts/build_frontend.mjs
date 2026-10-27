import { build } from 'file:///C:/Users/naren/Downloads/Scenario-Training/frontend/node_modules/vite/dist/node/index.js';

console.log('Starting Vite build via JS API...');
try {
  await build({
    root: 'C:/Users/naren/Downloads/Scenario-Training/frontend',
  });
  console.log('Vite build completed successfully!');
} catch (err) {
  console.error('Vite build failed:', err);
  process.exit(1);
}
