module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/frontend/**/*.test.js'],
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/tests/frontend/setup-action-delegates.js'],
};
