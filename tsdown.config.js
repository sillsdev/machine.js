import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/test-helpers.ts'],
  dts: true,
  clean: true,
  format: ['esm', 'cjs'],
  tsconfig: 'tsconfig.build.json',
  unbundle: true,
  sourcemap: false,
  shims: false,
});
