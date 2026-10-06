import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    'dist',
    'coverage',
    'playwright-report',
    'test-results',
    'node_modules',
    // Android build output and the web build copied in by `npx cap sync`
    'android/**/build',
    'android/app/src/main/assets',
    'android/capacitor-cordova-android-plugins',
    // Windows desktop app: its own dependencies, the web build copied in, electron-builder output
    'desktop/node_modules',
    'desktop/web',
    'desktop/release',
    'dist-desktop',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['vite.config.ts', 'playwright.config.ts', 'scripts/**/*.ts', 'tests/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // The Windows desktop app's Electron shell (plain JavaScript, Node) and its smoke test.
    files: ['desktop/**/*.{cjs,mjs}', 'scripts/desktop-smoke.mjs'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node },
    },
  },
  {
    // Its page.evaluate() callbacks run in the app's window.
    files: ['scripts/desktop-smoke.mjs'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    // The question bank is data-heavy: long string literals and many small arrow functions.
    files: ['src/bank/**/*.ts'],
    rules: {
      'no-useless-escape': 'off',
    },
  },
]);
