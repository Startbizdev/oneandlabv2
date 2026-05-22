// @ts-check
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  {
    ignores: ['node_modules/', '.expo/', 'dist/'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
]);
