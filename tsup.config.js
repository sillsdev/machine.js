import { defineConfig } from 'tsup';
import { fixImportsPlugin } from 'esbuild-fix-imports-plugin';

export default defineConfig({
  entry: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/test-helpers.ts'],
  dts: true,
  clean: true,
  format: ['esm', 'cjs'],
  tsconfig: 'tsconfig.build.json',
  bundle: false,
  sourcemap: false,
  esbuildPlugins: [fixImportsPlugin()],
});
