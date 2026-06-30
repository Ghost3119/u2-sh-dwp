module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/unit/**/*.test.ts',
    '**/__tests__/e2e/**/*.test.ts'
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/**/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  testTimeout: 15000,
  verbose: true
};
