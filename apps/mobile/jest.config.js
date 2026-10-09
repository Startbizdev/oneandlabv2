/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '**/src/lib/**/__tests__/**/*.test.ts',
    '**/src/features/ai-hub/**/__tests__/**/*.test.{ts,tsx}',
  ],
};
