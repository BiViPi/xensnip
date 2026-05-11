import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    server: {
      deps: {
        // Allow node-canvas (native .node module) to run without transform
        external: ['canvas'],
      },
    },
  },
});
