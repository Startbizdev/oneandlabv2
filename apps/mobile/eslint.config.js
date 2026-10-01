// @ts-check
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const reactHooks = require('eslint-plugin-react-hooks');
const { defineConfig } = require('eslint/config');
const noRawColors = require('./eslint-rules/no-raw-colors');
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
      'react-hooks': reactHooks,
      'oneandlab': {
        rules: {
          'no-raw-colors': noRawColors,
          'no-static-colors-import': noStaticColorsImport,
        },
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'oneandlab/no-static-colors-import': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    rules: {
      'oneandlab/no-raw-colors': 'error',
    },
  },
]);
