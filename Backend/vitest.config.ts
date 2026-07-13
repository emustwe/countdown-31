import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// NestJS's DI resolves constructor params via emitDecoratorMetadata, which esbuild (Vite's
// default transform) cannot produce accurately since it transpiles per-file without type
// information. SWC's decorator-metadata output is accurate, so we swap the transform for
// this project only where Nest modules are under test.
export default defineConfig({
  plugins: [
    swc.vite({
      jsc: {
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    }),
  ],
  test: {
    globals: false,
    testTimeout: 30_000,
  },
});
