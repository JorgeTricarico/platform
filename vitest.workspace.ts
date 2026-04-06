import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    extends: 'clients/zenko/vite.config.ts',
    test: {
      name: 'zenko',
      root: './clients/zenko',
    },
  },
  {
    extends: 'clients/damian/vite.config.ts',
    test: {
      name: 'damian',
      root: './clients/damian',
    },
  },
  {
    extends: 'backend/vitest.config.ts',
    test: {
      name: 'backend',
      root: './backend',
    },
  },
]);
