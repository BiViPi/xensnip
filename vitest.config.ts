import fs from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

const studioImplPath = (() => {
  const privatePath = resolve(__dirname, './src/studio/private');
  const stubsPath = resolve(__dirname, './src/studio/stubs');
  const privateRenderer = resolve(privatePath, 'renderer/useStudioRenderer.ts');
  return fs.existsSync(privateRenderer) ? privatePath : stubsPath;
})();

export default defineConfig({
  resolve: {
    alias: {
      '@studio-impl': studioImplPath,
    },
  },
  test: {
    environment: 'jsdom',
    testTimeout: 15000,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    server: {
      deps: {
        // Allow node-canvas (native .node module) to run without transform
        external: ['canvas'],
      },
    },
  },
});
