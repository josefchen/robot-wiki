import { defineConfig } from '@playwright/test';
import base from './playwright.brand-v2.config';

export default defineConfig({
  ...base,
  testMatch: /economics-release-evidence\.spec\.ts/,
});
