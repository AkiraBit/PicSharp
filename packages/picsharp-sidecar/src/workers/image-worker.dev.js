// Dev wrapper to load TypeScript worker via esbuild-register
require('esbuild-register/dist/node').register();
require('./image-worker.ts');
