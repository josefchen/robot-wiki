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
  // File-size policy inside the editor. lib/file-size.ts caps raw lines and
  // bytes for every committed file (enforced by npm run check:file-size in
  // prebuild, the pre-commit hook, and CI); max-lines caps *code* lines
  // (blank lines and comments excluded) for the files ESLint parses, so a
  // module that has outgrown one unit of work reports while it is being
  // written rather than at commit time. The code-line caps sit below the raw
  // caps in lib/file-size.ts by roughly the share of a file this repo spends
  // on the doc comments its conventions require.
  {
    files: [
      'app/**/*.{ts,tsx}',
      'components/**/*.{ts,tsx}',
      'lib/**/*.ts',
      'scripts/**/*.{ts,mjs}',
      'types/**/*.ts',
      '*.{ts,tsx,mts,mjs}',
    ],
    rules: {
      'max-lines': ['error', { max: 550, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // Append-only registries: length tracks the number of sources, and
    // data/companies.ts is generated from research/ by npm run
    // generate:companies.
    files: ['data/**/*.ts'],
    rules: {
      'max-lines': ['error', { max: 5000, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // Specs carry fixture setup, so they run longer than the code they cover;
    // past this a spec is testing several features and should be split.
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      'max-lines': ['error', { max: 650, skipBlankLines: true, skipComments: true }],
    },
  },
]);

export default eslintConfig;
