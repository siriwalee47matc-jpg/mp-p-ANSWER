import { defineConfig } from 'vite';
import { resolve } from 'path';

// Chrome content scripts are classic scripts. Building this entry separately as
// an IIFE prevents Rollup from emitting shared ES-module imports that Chrome
// rejects with "Cannot use import statement outside a module".
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/content.ts'),
      name: 'SentinelAdsContent',
      formats: ['iife'],
      fileName: () => 'assets/content.js',
    },
  },
});
