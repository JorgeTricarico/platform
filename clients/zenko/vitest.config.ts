import { defineProject } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineProject({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    name: 'zenko',
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
  },
});
