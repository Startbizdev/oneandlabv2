// @ts-check
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const { defineConfig } = require('eslint/config');
const noRawFlexRow = require('./eslint-rules/no-raw-flex-row');
const noStaticColorsImport = require('./eslint-rules/no-static-colors-import');

module.exports = defineConfig([
  {
    ignores: ['node_modules/', '.expo/', 'dist/', 'eslint-rules/'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'oneandlab': {
        rules: {
          'no-raw-flex-row': noRawFlexRow,
          'no-static-colors-import': noStaticColorsImport,
        },
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'oneandlab/no-raw-flex-row': 'error',
      'oneandlab/no-static-colors-import': 'error',
    },
  },
]);
