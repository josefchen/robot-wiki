import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    // Isolated build dir of the draft-probe propagation test
    // (tests/propagation/); transient build output like .next.
    '.next-probe/**',
    'out/**',
    'node_modules/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
    'research/**',
    // Vendored third-party runtime assets (Draco decoder for GLTFLoader).
    'public/draco/**',
  ]),
]);

export default eslintConfig;
